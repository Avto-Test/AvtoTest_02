'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { LoadingButton } from '@/components/common/LoadingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
    createLesson,
    deleteLesson,
    getErrorMessage,
    getLessons,
    updateLesson,
    uploadLessonFile,
} from '@/lib/admin';
import {
    AdminLesson,
    LessonFormData,
    lessonFormSchema,
} from '@/schemas/admin.schema';

const CONTENT_TYPE_OPTIONS = ['video', 'audio', 'document', 'image', 'link', 'text'] as const;
const LESSON_CATEGORY_STORAGE_KEY = 'admin-lesson-categories';
type ContentTypeOption = (typeof CONTENT_TYPE_OPTIONS)[number];

function isContentTypeOption(value: string): value is ContentTypeOption {
    return CONTENT_TYPE_OPTIONS.some((option) => option === value);
}

export default function AdminLessonsPage() {
    const [lessons, setLessons] = useState<AdminLesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminLesson | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const form = useForm<LessonFormData>({
        resolver: zodResolver(lessonFormSchema),
        defaultValues: {
            title: '',
            description: '',
            content_type: 'link',
            content_url: '',
            thumbnail_url: '',
            topic: '',
            section: '',
            is_active: true,
            is_premium: false,
            sort_order: 0,
        },
    });

    const loadLessons = async () => {
        setIsLoading(true);
        try {
            const data = await getLessons();
            setLessons(data);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLessons();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(LESSON_CATEGORY_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            const normalized = parsed
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
            setCustomCategories(Array.from(new Set(normalized)));
        } catch {
            // Ignore bad local storage payload
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(LESSON_CATEGORY_STORAGE_KEY, JSON.stringify(customCategories));
    }, [customCategories]);

    const resetForm = () => {
        form.reset({
            title: '',
            description: '',
            content_type: 'link',
            content_url: '',
            thumbnail_url: '',
            topic: '',
            section: '',
            is_active: true,
            is_premium: false,
            sort_order: 0,
        });
        setEditingLesson(null);
    };

    const handleCreate = () => {
        resetForm();
        setShowForm(true);
    };

    const handleCreateInCategory = (categoryName: string) => {
        resetForm();
        const normalizedCategory = categoryName.trim();
        if (normalizedCategory && normalizedCategory !== 'Uncategorized') {
            form.setValue('section', normalizedCategory, { shouldDirty: true });
            form.setValue('topic', normalizedCategory, { shouldDirty: true });
        }
        setShowForm(true);
    };

    const handleEdit = (lesson: AdminLesson) => {
        setEditingLesson(lesson);
        form.reset({
            title: lesson.title,
            description: lesson.description || '',
            content_type: isContentTypeOption(lesson.content_type) ? lesson.content_type : 'link',
            content_url: lesson.content_url,
            thumbnail_url: lesson.thumbnail_url || '',
            topic: lesson.topic || '',
            section: lesson.section || '',
            is_active: lesson.is_active,
            is_premium: lesson.is_premium,
            sort_order: lesson.sort_order,
        });
        setShowForm(true);
    };

    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploaded = await uploadLessonFile(file);
            form.setValue('content_url', uploaded.url, { shouldDirty: true, shouldValidate: true });
            const mappedType = isContentTypeOption(uploaded.content_type)
                ? uploaded.content_type
                : 'document';
            form.setValue('content_type', mappedType, { shouldDirty: true, shouldValidate: true });
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleSubmit = async (values: LessonFormData) => {
        setIsSubmitting(true);
        try {
            if (editingLesson) {
                await updateLesson(editingLesson.id, values);
            } else {
                await createLesson(values);
            }
            await loadLessons();
            setShowForm(false);
            resetForm();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteLesson(deleteTarget.id);
            await loadLessons();
            setDeleteTarget(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
        }
    };

    const groupedLessons = useMemo(() => {
        const groups = new Map<string, AdminLesson[]>();
        for (const lesson of lessons) {
            const key = (lesson.section || lesson.topic || 'Uncategorized').trim() || 'Uncategorized';
            const list = groups.get(key) ?? [];
            list.push(lesson);
            groups.set(key, list);
        }
        for (const customCategory of customCategories) {
            const normalized = customCategory.trim();
            if (!normalized) continue;
            if (!groups.has(normalized)) {
                groups.set(normalized, []);
            }
        }
        return Array.from(groups.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([group, groupLessons]) => ({
                group,
                lessons: [...groupLessons].sort((a, b) => {
                    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                    return a.title.localeCompare(b.title);
                }),
            }));
    }, [lessons, customCategories]);

    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    const handleAddCategory = () => {
        const normalized = newCategoryName.trim();
        if (!normalized) {
            setError('Category name is required.');
            return;
        }

        const hasCategory = groupedLessons.some(
            (entry) => entry.group.toLowerCase() === normalized.toLowerCase()
        );
        if (hasCategory) {
            setError('Category already exists.');
            return;
        }

        setCustomCategories((prev) => [...prev, normalized]);
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            next.add(normalized);
            return next;
        });
        setNewCategoryName('');
        setShowAddCategoryForm(false);
        setError(null);
    };

    return (
        <AdminLayout
            title="Lessons"
            description="Darslarni yuklash, formatini belgilash va premium segmentlar bo'yicha boshqarish"
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadLessons}>Refresh</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowAddCategoryForm((prev) => !prev);
                            setError(null);
                        }}
                    >
                        Add Category
                    </Button>
                    <Button onClick={handleCreate}>Add Lesson</Button>
                </div>
            }
        >
            {error ? (
                <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {showForm ? (
                <div className="mb-6 rounded-lg border bg-card p-6">
                    <h2 className="mb-4 text-lg font-semibold">
                        {editingLesson ? 'Edit Lesson' : 'Create Lesson'}
                    </h2>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" {...form.register('title')} />
                            {form.formState.errors.title ? (
                                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                {...form.register('description')}
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="content_type">Content Type</Label>
                                <select
                                    id="content_type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    {...form.register('content_type')}
                                >
                                    {CONTENT_TYPE_OPTIONS.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort Order</Label>
                                <Input id="sort_order" type="number" {...form.register('sort_order', { valueAsNumber: true })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content_url">Content URL *</Label>
                            <Input id="content_url" placeholder="https://... or uploaded file URL" {...form.register('content_url')} />
                            <div className="flex items-center gap-3">
                                <Input
                                    id="lesson_file"
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                {isUploading ? <span className="text-xs text-muted-foreground">Uploading...</span> : null}
                            </div>
                            {form.formState.errors.content_url ? (
                                <p className="text-xs text-destructive">{form.formState.errors.content_url.message}</p>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                            <Input id="thumbnail_url" placeholder="https://..." {...form.register('thumbnail_url')} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="topic">Topic</Label>
                                <Input id="topic" placeholder="Road signs" {...form.register('topic')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="section">Section</Label>
                                <Input id="section" placeholder="Beginner module" {...form.register('section')} />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" {...form.register('is_active')} />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" {...form.register('is_premium')} />
                                Premium-only lesson
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <LoadingButton type="submit" isLoading={isSubmitting}>
                                {editingLesson ? 'Save changes' : 'Create lesson'}
                            </LoadingButton>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            ) : null}

            {showAddCategoryForm ? (
                <div className="mb-6 rounded-lg border bg-card p-4">
                    <h3 className="mb-3 text-base font-semibold">Create Lesson Category</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Category name (e.g. Road signs)"
                            value={newCategoryName}
                            onChange={(event) => setNewCategoryName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleAddCategory();
                                }
                            }}
                            className="max-w-md"
                        />
                        <Button type="button" onClick={handleAddCategory}>
                            Save Category
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowAddCategoryForm(false);
                                setNewCategoryName('');
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : null}

            {isLoading ? (
                <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                    Loading lessons...
                </div>
            ) : groupedLessons.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center">
                    <p className="text-sm text-muted-foreground">No lessons yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groupedLessons.map(({ group, lessons: groupLessons }) => {
                        const isExpanded = expandedGroups.has(group);
                        return (
                            <Card key={group}>
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group)}
                                            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                                        >
                                            <div className="min-w-0">
                                                <CardTitle className="truncate text-lg">{group}</CardTitle>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {groupLessons.length} lesson{groupLessons.length === 1 ? '' : 's'}
                                                </p>
                                            </div>
                                            <span className="text-muted-foreground">
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </span>
                                        </button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCreateInCategory(group)}
                                        >
                                            Add Lesson
                                        </Button>
                                    </div>
                                </CardHeader>
                                {isExpanded ? (
                                    <CardContent className="space-y-3 pt-0">
                                        {groupLessons.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                                                Bu kategoriyada hozircha dars yo&apos;q.
                                            </div>
                                        ) : null}
                                        {groupLessons.map((lesson) => (
                                            <div key={lesson.id} className="rounded-lg border border-border bg-background p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate font-medium">{lesson.title}</p>
                                                            <Badge variant="outline">{lesson.content_type}</Badge>
                                                            <Badge variant={lesson.is_premium ? 'default' : 'secondary'}>
                                                                {lesson.is_premium ? 'Premium' : 'All users'}
                                                            </Badge>
                                                            <Badge variant={lesson.is_active ? 'default' : 'secondary'}>
                                                                {lesson.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                            <Badge variant="outline">Order: {lesson.sort_order}</Badge>
                                                        </div>
                                                        {lesson.description ? (
                                                            <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
                                                        ) : null}
                                                        <p className="text-xs text-muted-foreground">
                                                            Topic: {lesson.topic || 'No topic'} | Section: {lesson.section || 'No section'}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleEdit(lesson)}>
                                                            Edit
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(lesson)}>
                                                            Delete
                                                        </Button>
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <a href={lesson.content_url} target="_blank" rel="noreferrer">
                                                                Open
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCreateInCategory(group)}
                                            >
                                                Add Lesson in {group}
                                            </Button>
                                        </div>
                                    </CardContent>
                                ) : null}
                            </Card>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete lesson"
                description="This lesson will be deleted permanently."
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />
        </AdminLayout>
    );
}
