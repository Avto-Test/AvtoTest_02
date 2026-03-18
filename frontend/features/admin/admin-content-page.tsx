"use client";

import { BookCopy, FileImage, FileText, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createAdminAnswerOption,
  createAdminLesson,
  createAdminQuestion,
  createAdminQuestionCategory,
  createAdminTest,
  deleteAdminAnswerOption,
  deleteAdminLesson,
  deleteAdminQuestion,
  deleteAdminQuestionCategory,
  deleteAdminTest,
  getAdminContentData,
  updateAdminAnswerOption,
  updateAdminLesson,
  updateAdminQuestion,
  updateAdminQuestionCategory,
  updateAdminTest,
  uploadAdminLessonFile,
  uploadAdminQuestionImage,
} from "@/api/admin";
import type {
  AdminLesson,
  AdminLessonPayload,
  AdminQuestionCategory,
  AdminQuestionCategoryPayload,
  AdminQuestionListItem,
  AdminQuestionPayload,
  AdminTestListItem,
  AdminTestPayload,
} from "@/types/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { toNullableString, toRequiredNumber } from "@/features/admin/utils";

type TestDraft = {
  title: string;
  description: string;
  difficulty: string;
  is_active: boolean;
  is_premium: boolean;
  duration: string;
};

type CategoryDraft = {
  name: string;
  description: string;
  is_active: boolean;
};

type LessonDraft = {
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  thumbnail_url: string;
  topic: string;
  section: string;
  is_active: boolean;
  is_premium: boolean;
  sort_order: string;
};

type QuestionOptionDraft = {
  id?: string;
  text: string;
  is_correct: boolean;
};

type QuestionDraft = {
  text: string;
  image_url: string;
  video_url: string;
  media_type: string;
  topic: string;
  category: string;
  category_id: string;
  difficulty: string;
  difficulty_percent: string;
  answer_options: QuestionOptionDraft[];
};

function makeTestDraft(test?: AdminTestListItem): TestDraft {
  return {
    title: test?.title ?? "",
    description: test?.description ?? "",
    difficulty: test?.difficulty ?? "medium",
    is_active: test?.is_active ?? true,
    is_premium: test?.is_premium ?? false,
    duration: String(test?.duration ?? 25),
  };
}

function makeCategoryDraft(category?: AdminQuestionCategory): CategoryDraft {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    is_active: category?.is_active ?? true,
  };
}

function makeLessonDraft(lesson?: AdminLesson): LessonDraft {
  return {
    title: lesson?.title ?? "",
    description: lesson?.description ?? "",
    content_type: lesson?.content_type ?? "link",
    content_url: lesson?.content_url ?? "",
    thumbnail_url: lesson?.thumbnail_url ?? "",
    topic: lesson?.topic ?? "",
    section: lesson?.section ?? "",
    is_active: lesson?.is_active ?? true,
    is_premium: lesson?.is_premium ?? false,
    sort_order: String(lesson?.sort_order ?? 0),
  };
}

function makeQuestionDraft(question?: AdminQuestionListItem): QuestionDraft {
  return {
    text: question?.text ?? "",
    image_url: question?.image_url ?? "",
    video_url: question?.video_url ?? "",
    media_type: question?.media_type ?? "text",
    topic: question?.topic ?? "",
    category: question?.category ?? "",
    category_id: question?.category_id ?? "",
    difficulty: question?.difficulty ?? "medium",
    difficulty_percent: String(question?.difficulty_percent ?? 50),
    answer_options:
      question?.answer_options?.map((option) => ({
        id: option.id,
        text: option.text,
        is_correct: option.is_correct,
      })) ?? [
        { text: "", is_correct: true },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
  };
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[26rem] rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-[26rem] rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
      <Skeleton className="h-[32rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminContentPage() {
  const resource = useAsyncResource(getAdminContentData, [], true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<AdminTestListItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<AdminQuestionCategory | null>(null);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestionListItem | null>(null);
  const [testDraft, setTestDraft] = useState<TestDraft>(makeTestDraft());
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(makeCategoryDraft());
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(makeLessonDraft());
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(makeQuestionDraft());
  const categoryOptions = useMemo(() => resource.data?.categories ?? [], [resource.data?.categories]);

  const refresh = async () => {
    await resource.reload();
  };

  const openTestModal = (test?: AdminTestListItem) => {
    setEditingTest(test ?? null);
    setTestDraft(makeTestDraft(test));
    setTestModalOpen(true);
  };

  const openCategoryModal = (category?: AdminQuestionCategory) => {
    setEditingCategory(category ?? null);
    setCategoryDraft(makeCategoryDraft(category));
    setCategoryModalOpen(true);
  };

  const openLessonModal = (lesson?: AdminLesson) => {
    setEditingLesson(lesson ?? null);
    setLessonDraft(makeLessonDraft(lesson));
    setLessonModalOpen(true);
  };

  const openQuestionModal = (question?: AdminQuestionListItem) => {
    setEditingQuestion(question ?? null);
    setQuestionDraft(makeQuestionDraft(question));
    setQuestionModalOpen(true);
  };

  const saveTest = async () => {
    setBusy("test");
    setNotice(null);
    const payload: AdminTestPayload = {
      title: testDraft.title.trim(),
      description: toNullableString(testDraft.description),
      difficulty: testDraft.difficulty,
      is_active: testDraft.is_active,
      is_premium: testDraft.is_premium,
      duration: toRequiredNumber(testDraft.duration, 25),
    };

    try {
      if (editingTest) {
        await updateAdminTest(editingTest.id, payload);
      } else {
        await createAdminTest(payload);
      }
      setTestModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Test saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveCategory = async () => {
    setBusy("category");
    setNotice(null);
    const payload: AdminQuestionCategoryPayload = {
      name: categoryDraft.name.trim(),
      description: toNullableString(categoryDraft.description),
      is_active: categoryDraft.is_active,
    };

    try {
      if (editingCategory) {
        await updateAdminQuestionCategory(editingCategory.id, payload);
      } else {
        await createAdminQuestionCategory(payload);
      }
      setCategoryModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Kategoriya saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveLesson = async () => {
    setBusy("lesson");
    setNotice(null);
    const payload: AdminLessonPayload = {
      title: lessonDraft.title.trim(),
      description: toNullableString(lessonDraft.description),
      content_type: lessonDraft.content_type,
      content_url: lessonDraft.content_url.trim(),
      thumbnail_url: toNullableString(lessonDraft.thumbnail_url),
      topic: toNullableString(lessonDraft.topic),
      section: toNullableString(lessonDraft.section),
      is_active: lessonDraft.is_active,
      is_premium: lessonDraft.is_premium,
      sort_order: toRequiredNumber(lessonDraft.sort_order, 0),
    };

    try {
      if (editingLesson) {
        await updateAdminLesson(editingLesson.id, payload);
      } else {
        await createAdminLesson(payload);
      }
      setLessonModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lesson saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const syncQuestionOptions = async (
    questionId: string,
    previous: QuestionOptionDraft[],
    next: QuestionOptionDraft[],
  ) => {
    const previousIds = new Set(previous.map((option) => option.id).filter(Boolean) as string[]);
    const nextIds = new Set(next.map((option) => option.id).filter(Boolean) as string[]);

    for (const option of next) {
      if (!option.text.trim()) {
        continue;
      }

      if (option.id) {
        await updateAdminAnswerOption(option.id, {
          text: option.text.trim(),
          is_correct: option.is_correct,
        });
      } else {
        await createAdminAnswerOption(questionId, {
          text: option.text.trim(),
          is_correct: option.is_correct,
        });
      }
    }

    for (const optionId of previousIds) {
      if (!nextIds.has(optionId)) {
        await deleteAdminAnswerOption(optionId);
      }
    }
  };

  const saveQuestion = async () => {
    setBusy("question");
    setNotice(null);
    const options = questionDraft.answer_options.filter((option) => option.text.trim().length > 0);

    if (options.length < 2) {
      setNotice("Savol uchun kamida 2 ta variant kerak.");
      setBusy(null);
      return;
    }

    if (!options.some((option) => option.is_correct)) {
      setNotice("Kamida bitta to'g'ri javob belgilang.");
      setBusy(null);
      return;
    }

    const payload: AdminQuestionPayload = {
      text: questionDraft.text.trim(),
      image_url: toNullableString(questionDraft.image_url),
      video_url: toNullableString(questionDraft.video_url),
      media_type: questionDraft.media_type,
      topic: toNullableString(questionDraft.topic),
      category: toNullableString(questionDraft.category),
      category_id: toNullableString(questionDraft.category_id),
      difficulty: questionDraft.difficulty,
      difficulty_percent: toRequiredNumber(questionDraft.difficulty_percent, 50),
    };

    try {
      const saved = editingQuestion
        ? await updateAdminQuestion(editingQuestion.id, payload)
        : await createAdminQuestion(payload);

      await syncQuestionOptions(
        saved.id,
        editingQuestion?.answer_options.map((option) => ({
          id: option.id,
          text: option.text,
          is_correct: option.is_correct,
        })) ?? [],
        options,
      );
      setQuestionModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Savol saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (action: () => Promise<unknown>, key: string, fallback: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await action();
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(null);
    }
  };

  const uploadLessonAsset = async (file: File) => {
    setBusy("lesson-upload");
    setNotice(null);
    try {
      const uploaded = await uploadAdminLessonFile(file);
      setLessonDraft((draft) => ({ ...draft, content_url: uploaded.url }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lesson fayli yuklanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const uploadQuestionAsset = async (file: File) => {
    setBusy("question-upload");
    setNotice(null);
    try {
      const uploaded = await uploadAdminQuestionImage(file);
      setQuestionDraft((draft) => ({ ...draft, image_url: uploaded.url, media_type: "image" }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Savol rasmi yuklanmadi.");
    } finally {
      setBusy(null);
    }
  };

  if (resource.loading) {
    return <LoadingState />;
  }

  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Kontent banki yuklanmadi"
        description="Kontent ma'lumotini olib bo'lmadi."
        error={resource.error}
        onRetry={() => void resource.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kontent banki"
        description="Testlar, lessonlar, savollar va kategoriyalarni yagona admin boshqaruv oqimida tahrirlang."
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Testlar</CardTitle>
              <CardDescription>{resource.data.tests.length} ta test</CardDescription>
            </div>
            <Button onClick={() => openTestModal()}>
              <Plus className="h-4 w-4" />
              Yangi test
            </Button>
          </CardHeader>
          <CardContent>
            {resource.data.tests.length === 0 ? (
              <EmptyState title="Testlar yo'q" description="Admin test CRUD orqali yangi test yarating." />
            ) : (
              <div className="space-y-3">
                {resource.data.tests.map((test) => (
                  <div key={test.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{test.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{test.description ?? "No description"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={test.is_active ? "success" : "outline"}>{test.is_active ? "Active" : "Inactive"}</Badge>
                        {test.is_premium ? <Badge variant="warning">Premium</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openTestModal(test)}>Tahrirlash</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === test.id}
                        onClick={() => void removeItem(() => deleteAdminTest(test.id), test.id, "Test o'chirilmadi.")}
                      >
                        <Trash2 className="h-4 w-4" />
                        O'chirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Kategoriyalar</CardTitle>
              <CardDescription>{resource.data.categories.length} ta savol kategoriyasi</CardDescription>
            </div>
            <Button onClick={() => openCategoryModal()}>
              <Plus className="h-4 w-4" />
              Yangi kategoriya
            </Button>
          </CardHeader>
          <CardContent>
            {resource.data.categories.length === 0 ? (
              <EmptyState title="Kategoriya yo'q" description="Question categories shu yerda boshqariladi." />
            ) : (
              <div className="space-y-3">
                {resource.data.categories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{category.description ?? "No description"}</p>
                      </div>
                      <Badge variant={category.is_active ? "success" : "outline"}>{category.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openCategoryModal(category)}>Tahrirlash</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === category.id}
                        onClick={() => void removeItem(() => deleteAdminQuestionCategory(category.id), category.id, "Kategoriya o'chirilmadi.")}
                      >
                        <Trash2 className="h-4 w-4" />
                        O'chirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Lessonlar</CardTitle>
              <CardDescription>{resource.data.lessons.length} ta lesson</CardDescription>
            </div>
            <Button onClick={() => openLessonModal()}>
              <Plus className="h-4 w-4" />
              Yangi lesson
            </Button>
          </CardHeader>
          <CardContent>
            {resource.data.lessons.length === 0 ? (
              <EmptyState title="Lesson yo'q" description="Media upload bilan lesson kontentini biriktirishingiz mumkin." />
            ) : (
              <div className="space-y-3">
                {resource.data.lessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{lesson.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lesson.content_type} • {lesson.topic ?? "No topic"}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{lesson.content_url}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={lesson.is_active ? "success" : "outline"}>{lesson.is_active ? "Active" : "Inactive"}</Badge>
                        {lesson.is_premium ? <Badge variant="warning">Premium</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openLessonModal(lesson)}>Tahrirlash</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === lesson.id}
                        onClick={() => void removeItem(() => deleteAdminLesson(lesson.id), lesson.id, "Lesson o'chirilmadi.")}
                      >
                        <Trash2 className="h-4 w-4" />
                        O'chirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Savollar</CardTitle>
              <CardDescription>{resource.data.questions.length} ta savol bankda</CardDescription>
            </div>
            <Button onClick={() => openQuestionModal()}>
              <Plus className="h-4 w-4" />
              Yangi savol
            </Button>
          </CardHeader>
          <CardContent>
            {resource.data.questions.length === 0 ? (
              <EmptyState title="Savollar yo'q" description="Savol va javob variantlarini shu sahifada boshqaring." />
            ) : (
              <div className="space-y-3">
                {resource.data.questions.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{question.text}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {question.topic ?? "No topic"} • {question.difficulty} • {question.answer_options.length} options
                        </p>
                      </div>
                      <Badge variant="outline">{question.difficulty_percent}%</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.answer_options.slice(0, 3).map((option) => (
                        <Badge key={option.id} variant={option.is_correct ? "success" : "outline"}>
                          {option.text}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openQuestionModal(question)}>Tahrirlash</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === question.id}
                        onClick={() => void removeItem(() => deleteAdminQuestion(question.id), question.id, "Savol o'chirilmadi.")}
                      >
                        <Trash2 className="h-4 w-4" />
                        O'chirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={testModalOpen} onClose={() => setTestModalOpen(false)} title={editingTest ? "Test tahrirlash" : "Yangi test"}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Title</span>
            <Input value={testDraft.title} onChange={(event) => setTestDraft((draft) => ({ ...draft, title: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={testDraft.description} onChange={(event) => setTestDraft((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Difficulty</span>
            <Select value={testDraft.difficulty} onChange={(event) => setTestDraft((draft) => ({ ...draft, difficulty: event.target.value }))}>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Duration</span>
            <Input value={testDraft.duration} onChange={(event) => setTestDraft((draft) => ({ ...draft, duration: event.target.value }))} />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={testDraft.is_active} onChange={(event) => setTestDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
            Active
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={testDraft.is_premium} onChange={(event) => setTestDraft((draft) => ({ ...draft, is_premium: event.target.checked }))} />
            Premium
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setTestModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "test"} onClick={() => void saveTest()}>
            <BookCopy className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title={editingCategory ? "Kategoriya tahrirlash" : "Yangi kategoriya"}>
        <div className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <Input value={categoryDraft.name} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, name: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={categoryDraft.description} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={categoryDraft.is_active} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "category"} onClick={() => void saveCategory()}>Saqlash</Button>
        </div>
      </Modal>

      <Modal open={lessonModalOpen} onClose={() => setLessonModalOpen(false)} title={editingLesson ? "Lesson tahrirlash" : "Yangi lesson"}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Title</span>
            <Input value={lessonDraft.title} onChange={(event) => setLessonDraft((draft) => ({ ...draft, title: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={lessonDraft.description} onChange={(event) => setLessonDraft((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Content type</span>
            <Select value={lessonDraft.content_type} onChange={(event) => setLessonDraft((draft) => ({ ...draft, content_type: event.target.value }))}>
              <option value="link">link</option>
              <option value="video">video</option>
              <option value="document">document</option>
              <option value="image">image</option>
              <option value="audio">audio</option>
              <option value="text">text</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Sort order</span>
            <Input value={lessonDraft.sort_order} onChange={(event) => setLessonDraft((draft) => ({ ...draft, sort_order: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Content URL</span>
            <Input value={lessonDraft.content_url} onChange={(event) => setLessonDraft((draft) => ({ ...draft, content_url: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Upload file</span>
            <Input type="file" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadLessonAsset(file);
              }
            }} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Thumbnail URL</span>
            <Input value={lessonDraft.thumbnail_url} onChange={(event) => setLessonDraft((draft) => ({ ...draft, thumbnail_url: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Topic</span>
            <Input value={lessonDraft.topic} onChange={(event) => setLessonDraft((draft) => ({ ...draft, topic: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Section</span>
            <Input value={lessonDraft.section} onChange={(event) => setLessonDraft((draft) => ({ ...draft, section: event.target.value }))} />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={lessonDraft.is_active} onChange={(event) => setLessonDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
            Active
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={lessonDraft.is_premium} onChange={(event) => setLessonDraft((draft) => ({ ...draft, is_premium: event.target.checked }))} />
            Premium
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setLessonModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "lesson" || busy === "lesson-upload"} onClick={() => void saveLesson()}>
            <Upload className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>

      <Modal open={questionModalOpen} onClose={() => setQuestionModalOpen(false)} title={editingQuestion ? "Savol tahrirlash" : "Yangi savol"} className="max-w-4xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Text</span>
            <Textarea value={questionDraft.text} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, text: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Media type</span>
            <Select value={questionDraft.media_type} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, media_type: event.target.value }))}>
              <option value="text">text</option>
              <option value="image">image</option>
              <option value="video">video</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Difficulty</span>
            <Select value={questionDraft.difficulty} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, difficulty: event.target.value }))}>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Topic</span>
            <Input value={questionDraft.topic} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, topic: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Difficulty percent</span>
            <Input value={questionDraft.difficulty_percent} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, difficulty_percent: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category label</span>
            <Input value={questionDraft.category} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, category: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Category id</span>
            <Select value={questionDraft.category_id} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, category_id: event.target.value }))}>
              <option value="">Tanlanmagan</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Image URL</span>
            <Input value={questionDraft.image_url} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, image_url: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Upload image</span>
            <Input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadQuestionAsset(file);
              }
            }} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Video URL</span>
            <Input value={questionDraft.video_url} onChange={(event) => setQuestionDraft((draft) => ({ ...draft, video_url: event.target.value }))} />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Javob variantlari</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setQuestionDraft((draft) => ({
                  ...draft,
                  answer_options: [...draft.answer_options, { text: "", is_correct: false }],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Variant
            </Button>
          </div>
          {questionDraft.answer_options.map((option, index) => (
            <div key={option.id ?? `option-${index}`} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Input
                value={option.text}
                onChange={(event) =>
                  setQuestionDraft((draft) => ({
                    ...draft,
                    answer_options: draft.answer_options.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, text: event.target.value } : item,
                    ),
                  }))
                }
                placeholder={`Variant ${index + 1}`}
              />
              <Button
                size="sm"
                variant={option.is_correct ? "default" : "outline"}
                onClick={() =>
                  setQuestionDraft((draft) => ({
                    ...draft,
                    answer_options: draft.answer_options.map((item, itemIndex) => ({
                      ...item,
                      is_correct: itemIndex === index,
                    })),
                  }))
                }
              >
                <FileImage className="h-4 w-4" />
                To'g'ri
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setQuestionDraft((draft) => ({
                    ...draft,
                    answer_options: draft.answer_options.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
                O'chirish
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setQuestionModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "question" || busy === "question-upload"} onClick={() => void saveQuestion()}>
            <FileText className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  );
}
