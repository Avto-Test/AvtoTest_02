'use client';

import Image from 'next/image';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/common/LoadingButton';
import {
    createAnswerOption,
    createQuestionCategory,
    createQuestion,
    deleteAnswerOption,
    deleteQuestion,
    getErrorMessage,
    getQuestionCategories,
    getQuestions,
    updateAnswerOption,
    updateQuestion,
    uploadQuestionImage,
} from '@/lib/admin';
import {
    AdminAnswerOption,
    AdminQuestion,
    AdminQuestionCategory,
    questionFormSchema,
    QuestionFormData,
} from '@/schemas/admin.schema';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionWithOptions extends AdminQuestion {
    answer_options: AdminAnswerOption[];
}

const EMPTY_FORM: QuestionFormData = {
    text: '',
    image_url: '',
    video_url: '',
    media_type: 'text',
    topic: '',
    category: '',
    category_id: '',
    difficulty: 'medium',
    difficulty_percent: 50,
};

type GroupByMode = 'category' | 'topic' | 'difficulty' | 'media_type' | 'correctness' | 'question_length' | 'none';
type SortByMode = 'text' | 'difficulty_percent' | 'difficulty' | 'topic' | 'category' | 'options_count' | 'media_type' | 'question_length';
type SortOrderMode = 'asc' | 'desc';
type GroupOrderMode = 'asc' | 'desc';
type CorrectFilterMode = 'all' | 'has_correct' | 'no_correct' | 'no_options';

const DEFAULT_GROUP_BY: GroupByMode = 'category';
const DEFAULT_SORT_BY: SortByMode = 'difficulty_percent';
const DEFAULT_SORT_ORDER: SortOrderMode = 'asc';
const DEFAULT_GROUP_ORDER: GroupOrderMode = 'asc';
const DEFAULT_CORRECT_FILTER: CorrectFilterMode = 'all';

export default function AdminQuestionsPage() {
    const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
    const [categories, setCategories] = useState<AdminQuestionCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionWithOptions | null>(null);
    const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [addingOptionToQuestion, setAddingOptionToQuestion] = useState<string | null>(null);
    const [newOptionText, setNewOptionText] = useState('');
    const [isSubmittingOption, setIsSubmittingOption] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<QuestionWithOptions | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [groupBy, setGroupBy] = useState<GroupByMode>(DEFAULT_GROUP_BY);
    const [groupOrder, setGroupOrder] = useState<GroupOrderMode>(DEFAULT_GROUP_ORDER);
    const [sortBy, setSortBy] = useState<SortByMode>(DEFAULT_SORT_BY);
    const [sortOrder, setSortOrder] = useState<SortOrderMode>(DEFAULT_SORT_ORDER);
    const [correctFilter, setCorrectFilter] = useState<CorrectFilterMode>(DEFAULT_CORRECT_FILTER);
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [mediaFilter, setMediaFilter] = useState<'all' | 'text' | 'image' | 'video'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const questionEditorRef = useRef<HTMLDivElement | null>(null);

    const questionForm = useForm<QuestionFormData>({
        resolver: zodResolver(questionFormSchema),
        defaultValues: EMPTY_FORM,
    });

    const currentImageUrl = questionForm.watch('image_url');

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [questionsData, categoriesData] = await Promise.all([
                getQuestions(),
                getQuestionCategories(),
            ]);
            setQuestions((questionsData as QuestionWithOptions[]) ?? []);
            setCategories(categoriesData);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const categoryMap = useMemo(() => {
        const map = new Map<string, AdminQuestionCategory>();
        for (const category of categories) {
            map.set(category.id, category);
        }
        return map;
    }, [categories]);

    const getCategoryName = useCallback((question: QuestionWithOptions) => {
        const fromCategory = question.category_id ? categoryMap.get(question.category_id)?.name : null;
        return (fromCategory || question.category || question.topic || 'Uncategorized').trim();
    }, [categoryMap]);

    const getGroupingKey = useCallback((question: QuestionWithOptions): string => {
        if (groupBy === 'none') return 'All Questions';
        if (groupBy === 'category') return getCategoryName(question);
        if (groupBy === 'topic') return (question.topic || 'No topic').trim();
        if (groupBy === 'difficulty') return (question.difficulty || 'unknown').trim();
        if (groupBy === 'media_type') return (question.media_type || 'text').trim();
        if (groupBy === 'question_length') {
            const questionLength = question.text.trim().length;
            if (questionLength < 60) return 'Short (<60 chars)';
            if (questionLength < 120) return 'Medium (60-119 chars)';
            return 'Long (120+ chars)';
        }

        const optionCount = question.answer_options.length;
        const hasCorrect = question.answer_options.some((item) => item.is_correct);
        if (optionCount === 0) return 'No options';
        return hasCorrect ? 'Has correct option' : 'No correct option';
    }, [getCategoryName, groupBy]);

    const filteredAndGroupedQuestions = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        const filtered = questions.filter((question) => {
            const categoryName = getCategoryName(question);
            const optionCount = question.answer_options.length;
            const hasCorrect = question.answer_options.some((item) => item.is_correct);

            if (difficultyFilter !== 'all' && (question.difficulty || '').toLowerCase() !== difficultyFilter) {
                return false;
            }

            if (mediaFilter !== 'all' && (question.media_type || '').toLowerCase() !== mediaFilter) {
                return false;
            }

            if (categoryFilter !== 'all' && categoryName !== categoryFilter) {
                return false;
            }

            if (correctFilter === 'has_correct' && !hasCorrect) {
                return false;
            }
            if (correctFilter === 'no_correct' && (hasCorrect || optionCount === 0)) {
                return false;
            }
            if (correctFilter === 'no_options' && optionCount !== 0) {
                return false;
            }

            if (!normalizedQuery) return true;

            const optionText = question.answer_options.map((item) => item.text).join(' ').toLowerCase();
            const haystack = [
                question.text,
                question.topic || '',
                question.category || '',
                categoryName,
                question.difficulty || '',
                question.media_type || '',
                optionText,
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });

        const difficultyRank: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

        const sorted = [...filtered].sort((a, b) => {
            let left: string | number = '';
            let right: string | number = '';

            if (sortBy === 'text') {
                left = a.text.toLowerCase();
                right = b.text.toLowerCase();
            } else if (sortBy === 'difficulty_percent') {
                left = a.difficulty_percent ?? 0;
                right = b.difficulty_percent ?? 0;
            } else if (sortBy === 'difficulty') {
                left = difficultyRank[(a.difficulty || '').toLowerCase()] ?? 99;
                right = difficultyRank[(b.difficulty || '').toLowerCase()] ?? 99;
            } else if (sortBy === 'topic') {
                left = (a.topic || '').toLowerCase();
                right = (b.topic || '').toLowerCase();
            } else if (sortBy === 'category') {
                left = getCategoryName(a).toLowerCase();
                right = getCategoryName(b).toLowerCase();
            } else if (sortBy === 'media_type') {
                left = (a.media_type || '').toLowerCase();
                right = (b.media_type || '').toLowerCase();
            } else if (sortBy === 'question_length') {
                left = (a.text || '').trim().length;
                right = (b.text || '').trim().length;
            } else {
                left = a.answer_options.length;
                right = b.answer_options.length;
            }

            if (typeof left === 'number' && typeof right === 'number') {
                return sortOrder === 'asc' ? left - right : right - left;
            }

            const compared = String(left).localeCompare(String(right));
            return sortOrder === 'asc' ? compared : -compared;
        });

        if (groupBy === 'none') {
            return [['All Questions', sorted]] as Array<[string, QuestionWithOptions[]]>;
        }

        const groups = new Map<string, QuestionWithOptions[]>();
        for (const question of sorted) {
            const key = getGroupingKey(question);
            const list = groups.get(key) ?? [];
            list.push(question);
            groups.set(key, list);
        }

        if (groupBy === 'category' && !normalizedQuery && categoryFilter === 'all') {
            for (const category of categories) {
                if (!groups.has(category.name)) {
                    groups.set(category.name, []);
                }
            }
        }

        return Array.from(groups.entries()).sort((a, b) => {
            const compared = a[0].localeCompare(b[0]);
            return groupOrder === 'asc' ? compared : -compared;
        });
    }, [
        questions,
        searchQuery,
        groupBy,
        groupOrder,
        sortBy,
        sortOrder,
        correctFilter,
        difficultyFilter,
        mediaFilter,
        categoryFilter,
        categories,
        getCategoryName,
        getGroupingKey,
    ]);

    const visibleQuestionCount = useMemo(
        () => filteredAndGroupedQuestions.reduce((acc, [, list]) => acc + list.length, 0),
        [filteredAndGroupedQuestions]
    );

    useEffect(() => {
        if (filteredAndGroupedQuestions.length === 0) return;
        setExpandedGroups((prev) => {
            if (prev.size > 0) return prev;
            return new Set(filteredAndGroupedQuestions.map(([groupName]) => groupName));
        });
    }, [filteredAndGroupedQuestions]);

    const resetViewControls = () => {
        setSearchQuery('');
        setGroupBy(DEFAULT_GROUP_BY);
        setGroupOrder(DEFAULT_GROUP_ORDER);
        setSortBy(DEFAULT_SORT_BY);
        setSortOrder(DEFAULT_SORT_ORDER);
        setCorrectFilter(DEFAULT_CORRECT_FILTER);
        setDifficultyFilter('all');
        setMediaFilter('all');
        setCategoryFilter('all');
    };

    const resetForm = () => {
        setEditingQuestion(null);
        questionForm.reset(EMPTY_FORM);
        setShowForm(false);
    };

    const handleAddQuestion = () => {
        setEditingQuestion(null);
        questionForm.reset(EMPTY_FORM);
        setShowForm(true);
    };

    const handleAddQuestionInCategory = (categoryName: string) => {
        const normalizedCategory = categoryName.trim();
        const category = categories.find((item) => item.name.toLowerCase() === normalizedCategory.toLowerCase());
        setEditingQuestion(null);
        questionForm.reset({
            ...EMPTY_FORM,
            category_id: category?.id || '',
            category: normalizedCategory === 'Uncategorized' ? '' : normalizedCategory,
            topic: normalizedCategory === 'Uncategorized' ? '' : normalizedCategory,
        });
        setShowForm(true);
    };

    const handleEditQuestion = (question: QuestionWithOptions) => {
        setEditingQuestion(question);
        questionForm.reset({
            text: question.text,
            image_url: question.image_url || '',
            video_url: question.video_url || '',
            media_type: (question.media_type || 'text') as QuestionFormData['media_type'],
            topic: question.topic || '',
            category: question.category || '',
            category_id: question.category_id || '',
            difficulty: (question.difficulty || 'medium') as QuestionFormData['difficulty'],
            difficulty_percent: question.difficulty_percent ?? 50,
        });
        setError(null);
        setShowForm(true);
    };

    useEffect(() => {
        if (!showForm) return;
        const rafId = window.requestAnimationFrame(() => {
            questionEditorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            questionForm.setFocus('text');
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [showForm, editingQuestion?.id, questionForm]);

    const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(true);
        try {
            const imageUrl = await uploadQuestionImage(file);
            questionForm.setValue('image_url', imageUrl, { shouldValidate: true, shouldDirty: true });
            questionForm.setValue('media_type', 'image', { shouldValidate: true, shouldDirty: true });
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsUploadingImage(false);
            event.target.value = '';
        }
    };

    const handleQuestionSubmit = async (data: QuestionFormData) => {
        setIsSubmittingQuestion(true);
        try {
            if (editingQuestion) {
                await updateQuestion(editingQuestion.id, data);
            } else {
                await createQuestion(data);
            }
            await loadData();
            resetForm();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmittingQuestion(false);
        }
    };

    const handleDeleteQuestion = async () => {
        if (!questionToDelete) return;
        setIsDeleting(true);
        try {
            await deleteQuestion(questionToDelete.id);
            await loadData();
            setDeleteDialogOpen(false);
            setQuestionToDelete(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddOption = async (questionId: string) => {
        if (!newOptionText.trim()) return;
        setIsSubmittingOption(true);
        try {
            await createAnswerOption(questionId, { text: newOptionText, is_correct: false });
            await loadData();
            setNewOptionText('');
            setAddingOptionToQuestion(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmittingOption(false);
        }
    };

    const handleSetCorrectOption = async (option: AdminAnswerOption, question: QuestionWithOptions) => {
        try {
            const currentCorrect = question.answer_options.find((item) => item.is_correct);
            if (currentCorrect && currentCorrect.id !== option.id) {
                await updateAnswerOption(currentCorrect.id, { is_correct: false });
            }
            await updateAnswerOption(option.id, { is_correct: true });
            await loadData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleDeleteOption = async (optionId: string) => {
        try {
            await deleteAnswerOption(optionId);
            await loadData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const toggleGroup = (groupName: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    const handleAddCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) {
            setError('Category name is required.');
            return;
        }
        if (categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
            setError('Category already exists.');
            return;
        }
        try {
            await createQuestionCategory({
                name,
                description: newCategoryDescription.trim(),
                is_active: true,
            });
            setShowAddCategoryForm(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
            await loadData();
            setExpandedGroups((prev) => {
                const next = new Set(prev);
                next.add(name);
                return next;
            });
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const toggleQuestionExpanded = (questionId: string) => {
        if (expandedQuestionIds.has(questionId) && addingOptionToQuestion === questionId) {
            setAddingOptionToQuestion(null);
            setNewOptionText('');
        }
        setExpandedQuestionIds((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });
    };

    return (
        <AdminLayout
            title="Question Bank"
            description="Manage question categories and question base without separate test blocks."
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData}>Refresh</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowAddCategoryForm((prev) => !prev);
                            setError(null);
                        }}
                    >
                        Add Category
                    </Button>
                    <Button onClick={handleAddQuestion}>
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Question
                    </Button>
                </div>
            }
        >
            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {showForm && (
                <div ref={questionEditorRef}>
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{editingQuestion ? 'Edit Question' : 'New Question'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={questionForm.handleSubmit(handleQuestionSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="text">Question Text *</Label>
                                <textarea
                                    id="text"
                                    className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Enter question text"
                                    {...questionForm.register('text')}
                                />
                                {questionForm.formState.errors.text && (
                                    <p className="text-sm text-destructive">{questionForm.formState.errors.text.message}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="category_id">Category</Label>
                                    <select
                                        id="category_id"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...questionForm.register('category_id')}
                                    >
                                        <option value="">Uncategorized</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="difficulty">Difficulty Label</Label>
                                    <select
                                        id="difficulty"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        {...questionForm.register('difficulty')}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="difficulty_percent">Difficulty Percent (0-100)</Label>
                                <Input
                                    id="difficulty_percent"
                                    type="number"
                                    min={0}
                                    max={100}
                                    {...questionForm.register('difficulty_percent', { valueAsNumber: true })}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="topic">Topic</Label>
                                    <Input id="topic" placeholder="Road signs" {...questionForm.register('topic')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Legacy Category Text (optional)</Label>
                                    <Input id="category" placeholder="Urban zone" {...questionForm.register('category')} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image_url">Image URL (optional)</Label>
                                <Input id="image_url" placeholder="https://..." {...questionForm.register('image_url')} />
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="image_file"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        onChange={handleImageUpload}
                                        disabled={isUploadingImage}
                                    />
                                    {isUploadingImage ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
                                </div>
                                {currentImageUrl ? (
                                    <Image
                                        src={currentImageUrl}
                                        alt="Uploaded question image preview"
                                        width={960}
                                        height={480}
                                        className="max-h-48 rounded-md border"
                                    />
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="video_url">Video URL (optional)</Label>
                                <Input id="video_url" placeholder="https://..." {...questionForm.register('video_url')} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="media_type">Media Type</Label>
                                <select
                                    id="media_type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    {...questionForm.register('media_type')}
                                >
                                    <option value="text">Text</option>
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <LoadingButton type="submit" isLoading={isSubmittingQuestion}>
                                    {editingQuestion ? 'Save' : 'Add Question'}
                                </LoadingButton>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                </div>
            )}

            {showAddCategoryForm ? (
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Create Question Category</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="new_category_name">Category name</Label>
                                <Input
                                    id="new_category_name"
                                    placeholder="Road signs"
                                    value={newCategoryName}
                                    onChange={(event) => setNewCategoryName(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new_category_description">Description (optional)</Label>
                                <Input
                                    id="new_category_description"
                                    placeholder="Category note for admin team"
                                    value={newCategoryDescription}
                                    onChange={(event) => setNewCategoryDescription(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" onClick={() => void handleAddCategory()}>
                                Save Category
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddCategoryForm(false);
                                    setNewCategoryName('');
                                    setNewCategoryDescription('');
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {isLoading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-muted rounded-lg" />
                    <div className="h-40 bg-muted rounded-lg" />
                </div>
            ) : filteredAndGroupedQuestions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                        <p className="text-muted-foreground mb-4">Start by adding categories and question bank entries.</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" onClick={() => setShowAddCategoryForm(true)}>
                                Add Category
                            </Button>
                            <Button onClick={handleAddQuestion}>Add Question</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Sort / Filter</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="space-y-2 xl:col-span-2">
                                    <Label htmlFor="search_query">Search</Label>
                                    <Input
                                        id="search_query"
                                        placeholder="Search by text, topic, category, option..."
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sort_by">Sort by</Label>
                                    <select
                                        id="sort_by"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={sortBy}
                                        onChange={(event) => setSortBy(event.target.value as SortByMode)}
                                    >
                                        <option value="difficulty_percent">Difficulty %</option>
                                        <option value="difficulty">Difficulty label</option>
                                        <option value="text">Question text</option>
                                        <option value="topic">Topic</option>
                                        <option value="category">Category</option>
                                        <option value="media_type">Media type</option>
                                        <option value="question_length">Question length</option>
                                        <option value="options_count">Options count</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                                <div className="space-y-2">
                                    <Label htmlFor="group_order">Category order</Label>
                                    <select
                                        id="group_order"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={groupOrder}
                                        onChange={(event) => setGroupOrder(event.target.value as GroupOrderMode)}
                                    >
                                        <option value="asc">A -&gt; Z</option>
                                        <option value="desc">Z -&gt; A</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Order</Label>
                                    <select
                                        id="sort_order"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={sortOrder}
                                        onChange={(event) => setSortOrder(event.target.value as SortOrderMode)}
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="correct_filter">Correct option filter</Label>
                                    <select
                                        id="correct_filter"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={correctFilter}
                                        onChange={(event) => setCorrectFilter(event.target.value as CorrectFilterMode)}
                                    >
                                        <option value="all">All</option>
                                        <option value="has_correct">Has correct</option>
                                        <option value="no_correct">No correct</option>
                                        <option value="no_options">No options</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="difficulty_filter">Difficulty filter</Label>
                                    <select
                                        id="difficulty_filter"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={difficultyFilter}
                                        onChange={(event) => setDifficultyFilter(event.target.value as 'all' | 'easy' | 'medium' | 'hard')}
                                    >
                                        <option value="all">All</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="media_filter">Media filter</Label>
                                    <select
                                        id="media_filter"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={mediaFilter}
                                        onChange={(event) => setMediaFilter(event.target.value as 'all' | 'text' | 'image' | 'video')}
                                    >
                                        <option value="all">All</option>
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category_filter">Category filter</Label>
                                    <select
                                        id="category_filter"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={categoryFilter}
                                        onChange={(event) => setCategoryFilter(event.target.value)}
                                    >
                                        <option value="all">All categories</option>
                                        {Array.from(new Set(questions.map((question) => getCategoryName(question))))
                                            .sort((a, b) => a.localeCompare(b))
                                            .map((categoryName) => (
                                                <option key={categoryName} value={categoryName}>
                                                    {categoryName}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground">
                                    Showing {visibleQuestionCount} of {questions.length} questions.
                                </p>
                                <Button type="button" variant="outline" size="sm" onClick={resetViewControls}>
                                    Reset view
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {filteredAndGroupedQuestions.map(([groupName, groupQuestions]) => (
                        <Card key={groupName}>
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(groupName)}
                                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                                    >
                                        <div className="min-w-0">
                                            <CardTitle className="truncate text-lg">{groupName}</CardTitle>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {groupQuestions.length} question{groupQuestions.length === 1 ? '' : 's'}
                                            </p>
                                        </div>
                                        <span className="text-muted-foreground">
                                            {expandedGroups.has(groupName) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </span>
                                    </button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddQuestionInCategory(groupName)}
                                    >
                                        Add Question
                                    </Button>
                                </div>
                            </CardHeader>
                            {expandedGroups.has(groupName) ? (
                                <CardContent className="space-y-3 pt-0">
                                    {groupQuestions.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                                            Bu kategoriyada hozircha savol yo&apos;q.
                                        </div>
                                    ) : null}
                                    {groupQuestions.map((question, index) => (
                                        <Card key={question.id}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline">Q{index + 1}</Badge>
                                                            <Badge variant="secondary">
                                                                Type: {question.media_type || 'text'}
                                                            </Badge>
                                                        </div>
                                                        <p className="font-medium">{question.text}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleQuestionExpanded(question.id)}
                                                        >
                                                            {expandedQuestionIds.has(question.id) ? "Yig'ish" : 'Ochish'}
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleEditQuestion(question)}>
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => {
                                                                setQuestionToDelete(question);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            {expandedQuestionIds.has(question.id) ? (
                                                <CardContent className="pt-0">
                                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                                        {question.answer_options.some((item) => item.is_correct) ? (
                                                            <Badge variant="default">Has Correct</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">No Correct Option</Badge>
                                                        )}
                                                        <Badge variant="secondary">{question.difficulty}</Badge>
                                                        <Badge variant="outline">Difficulty %: {question.difficulty_percent}</Badge>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-muted-foreground">Answer Options</h4>
                                                        {question.answer_options.length === 0 ? (
                                                            <p className="text-sm italic text-muted-foreground">No options added yet.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {question.answer_options.map((option) => (
                                                                    <div
                                                                        key={option.id}
                                                                        className={`flex items-center gap-3 rounded-lg border p-3 ${option.is_correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'
                                                                            }`}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${option.is_correct ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'
                                                                                }`}
                                                                            onClick={() => handleSetCorrectOption(option, question)}
                                                                        >
                                                                            {option.is_correct ? <span className="text-[10px] leading-none text-white">OK</span> : null}
                                                                        </button>
                                                                        <span className="flex-1 text-sm">{option.text}</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                            onClick={() => handleDeleteOption(option.id)}
                                                                        >
                                                                            X
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {addingOptionToQuestion === question.id ? (
                                                            <div className="mt-3 flex gap-2">
                                                                <Input
                                                                    placeholder="Enter option text"
                                                                    value={newOptionText}
                                                                    onChange={(event) => setNewOptionText(event.target.value)}
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === 'Enter') {
                                                                            event.preventDefault();
                                                                            void handleAddOption(question.id);
                                                                        }
                                                                    }}
                                                                />
                                                                <LoadingButton
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        void handleAddOption(question.id);
                                                                    }}
                                                                    isLoading={isSubmittingOption}
                                                                >
                                                                    Add
                                                                </LoadingButton>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setAddingOptionToQuestion(null);
                                                                        setNewOptionText('');
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-2"
                                                                onClick={() => setAddingOptionToQuestion(question.id)}
                                                            >
                                                                + Add Option
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            ) : null}
                                        </Card>
                                    ))}
                                    <div className="pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddQuestionInCategory(groupName)}
                                        >
                                            Add Question in {groupName}
                                        </Button>
                                    </div>
                                </CardContent>
                            ) : null}
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Question"
                description="Are you sure? All answer options for this question will also be deleted."
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDeleteQuestion}
            />
        </AdminLayout>
    );
}
