"use client";

import { BookCopy, FileImage, FileText, Plus, RefreshCcw, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  getAdminQuestions,
  updateAdminAnswerOption,
  updateAdminLesson,
  updateAdminQuestion,
  updateAdminQuestionCategory,
  updateAdminSimulationExamSettings,
  updateAdminTest,
  uploadAdminLessonFile,
  uploadAdminQuestionImage,
} from "@/api/admin";
import { AdminActionMenu, AdminSurface, AdminToolbar } from "@/features/admin/admin-ui";
import { toNullableString, toRequiredNumber } from "@/features/admin/utils";
import type {
  AdminLesson,
  AdminLessonPayload,
  AdminPaginatedQuestions,
  AdminQuestionCategory,
  AdminQuestionCategoryPayload,
  AdminQuestionListItem,
  AdminQuestionPayload,
  AdminSimulationExamSettings,
  AdminTestListItem,
  AdminTestPayload,
} from "@/types/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";

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

type SimulationExamSettingsDraft = {
  question_count: string;
  duration_minutes: string;
  mistake_limit: string;
  violation_limit: string;
  cooldown_days: string;
  fast_unlock_price: string;
  intro_video_url: string;
};

function normalizeAdminLabel(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

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

function makeSimulationExamSettingsDraft(settings?: AdminSimulationExamSettings): SimulationExamSettingsDraft {
  return {
    question_count: String(settings?.question_count ?? 40),
    duration_minutes: String(settings?.duration_minutes ?? 40),
    mistake_limit: String(settings?.mistake_limit ?? 3),
    violation_limit: String(settings?.violation_limit ?? 2),
    cooldown_days: String(settings?.cooldown_days ?? 14),
    fast_unlock_price: String(settings?.fast_unlock_price ?? 120),
    intro_video_url: settings?.intro_video_url ?? "",
  };
}

function matchesContentStateFilter(
  filter: string,
  item: {
    is_active?: boolean;
    is_premium?: boolean;
  },
) {
  if (filter === "all") {
    return true;
  }
  if (filter === "active") {
    return item.is_active === true;
  }
  if (filter === "inactive") {
    return item.is_active === false;
  }
  if (filter === "premium") {
    return item.is_premium === true;
  }
  return true;
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

const QUESTION_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const QUESTION_SEARCH_DEBOUNCE_MS = 400;

function buildBootstrapQuestionPage(
  items: AdminQuestionListItem[],
  total: number,
  limit: number,
): AdminPaginatedQuestions {
  return {
    items: items.slice(0, limit),
    total,
    offset: 0,
    limit,
    has_more: total > limit,
  };
}

function buildVisiblePageNumbers(page: number, totalPages: number) {
  return Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

function QuestionBankLoadingState() {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`question-skeleton-${index}`} className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
          <Skeleton className="h-5 w-4/5 bg-[var(--muted)]" />
          <Skeleton className="h-4 w-2/3 bg-[var(--muted)]" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-full bg-[var(--muted)]" />
            <Skeleton className="h-6 w-20 rounded-full bg-[var(--muted)]" />
            <Skeleton className="h-6 w-28 rounded-full bg-[var(--muted)]" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-24 rounded-xl bg-[var(--muted)]" />
            <Skeleton className="h-9 w-9 rounded-xl bg-[var(--muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionBankPagination({
  page,
  total,
  limit,
  hasMore,
  loading,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  total: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit || 1));
  const visiblePages = buildVisiblePageNumbers(page, totalPages);
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--border)]/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
        <p>
          {rangeStart}-{rangeEnd} / {total} ta savol
        </p>
        <p>Page {page} of {totalPages}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <span>Har sahifada</span>
          <Select
            value={String(limit)}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="min-w-24"
            disabled={loading}
          >
            {QUESTION_PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {visiblePages.map((value, index) => {
              const previous = visiblePages[index - 1];
              return (
                <div key={`page-group-${value}`} className="flex items-center gap-2">
                  {previous && value - previous > 1 ? (
                    <span className="px-1 text-sm text-[var(--muted-foreground)]">...</span>
                  ) : null}
                  <Button
                    size="sm"
                    variant={value === page ? "default" : "outline"}
                    disabled={loading}
                    onClick={() => onPageChange(value)}
                  >
                    {value}
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={!hasMore || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminContentPage() {
  const resource = useAsyncResource(getAdminContentData, [], true);
  const [tab, setTab] = useState("questions");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [questionPage, setQuestionPage] = useState(1);
  const [questionLimit, setQuestionLimit] = useState<number>(20);
  const [questionCategoryId, setQuestionCategoryId] = useState("all");
  const [debouncedQuestionQuery, setDebouncedQuestionQuery] = useState("");
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
  const [simulationExamSettingsDraft, setSimulationExamSettingsDraft] = useState<SimulationExamSettingsDraft>(
    makeSimulationExamSettingsDraft(),
  );
  const categoryOptions = useMemo(() => resource.data?.categories ?? [], [resource.data?.categories]);
  const effectiveQuestionCategoryId = questionCategoryId === "all" ? undefined : questionCategoryId;
  const questionOffset = (questionPage - 1) * questionLimit;
  const bootstrapQuestionPage = useMemo(
    () =>
      buildBootstrapQuestionPage(
        resource.data?.questions ?? [],
        resource.data?.questionTotal ?? 0,
        questionLimit,
      ),
    [questionLimit, resource.data?.questionTotal, resource.data?.questions],
  );
  const canUseBootstrapQuestionPage =
    tab === "questions" &&
    questionPage === 1 &&
    !effectiveQuestionCategoryId &&
    debouncedQuestionQuery.length === 0;
  const questionBankResource = useAsyncResource(
    () =>
      getAdminQuestions({
        offset: questionOffset,
        limit: questionLimit,
        search: debouncedQuestionQuery || undefined,
        categoryId: effectiveQuestionCategoryId,
      }),
    [questionOffset, questionLimit, effectiveQuestionCategoryId, debouncedQuestionQuery],
    tab === "questions" && !canUseBootstrapQuestionPage,
    {
      cacheKey: `admin-question-bank:${effectiveQuestionCategoryId ?? "all"}:${debouncedQuestionQuery || "all"}:${questionOffset}:${questionLimit}`,
      keepPreviousData: true,
    },
  );
  const questionPageData = canUseBootstrapQuestionPage ? bootstrapQuestionPage : questionBankResource.data;
  const questionItems = questionPageData?.items ?? [];
  const questionTotal = questionPageData?.total ?? resource.data?.questionTotal ?? 0;
  const questionHasMore = questionPageData?.has_more ?? false;
  const questionBankLoading = !questionPageData && questionBankResource.loading;
  const questionBankRefreshing =
    tab === "questions" &&
    (questionBankResource.loading || query.trim() !== debouncedQuestionQuery);
  const categoryCoverage = useMemo(() => {
    const coverage = new Map<string, { lessonCount: number; questionCount: number }>();
    const categoriesByName = new Map(
      categoryOptions.map((category) => [normalizeAdminLabel(category.name), category]),
    );

    for (const category of categoryOptions) {
      coverage.set(category.id, { lessonCount: 0, questionCount: 0 });
    }

    for (const lesson of resource.data?.lessons ?? []) {
      const matchedCategory = [lesson.topic, lesson.section]
        .map((value) => categoriesByName.get(normalizeAdminLabel(value)))
        .find(Boolean);
      if (!matchedCategory) {
        continue;
      }
      const next = coverage.get(matchedCategory.id);
      if (next) {
        next.lessonCount += 1;
      }
    }

    for (const question of resource.data?.questions ?? []) {
      const matchedCategory =
        (question.category_id ? categoryOptions.find((category) => category.id === question.category_id) : null) ??
        categoriesByName.get(normalizeAdminLabel(question.category));
      if (!matchedCategory) {
        continue;
      }
      const next = coverage.get(matchedCategory.id);
      if (next) {
        next.questionCount += 1;
      }
    }

    return coverage;
  }, [categoryOptions, resource.data?.lessons, resource.data?.questions]);
  const selectedLessonCategoryId = useMemo(() => {
    const matched = categoryOptions.find((category) =>
      [lessonDraft.topic, lessonDraft.section].some(
        (value) => normalizeAdminLabel(value) === normalizeAdminLabel(category.name),
      ),
    );
    return matched?.id ?? "";
  }, [categoryOptions, lessonDraft.section, lessonDraft.topic]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTests = useMemo(() => {
    return (resource.data?.tests ?? []).filter((test) => {
      const matchesQuery =
        !normalizedQuery ||
        test.title.toLowerCase().includes(normalizedQuery) ||
        (test.description ?? "").toLowerCase().includes(normalizedQuery) ||
        test.difficulty.toLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesContentStateFilter(statusFilter, test);
    });
  }, [normalizedQuery, resource.data?.tests, statusFilter]);
  const filteredCategories = useMemo(() => {
    return (resource.data?.categories ?? []).filter((category) => {
      const matchesQuery =
        !normalizedQuery ||
        category.name.toLowerCase().includes(normalizedQuery) ||
        (category.description ?? "").toLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesContentStateFilter(statusFilter, category);
    });
  }, [normalizedQuery, resource.data?.categories, statusFilter]);
  const filteredLessons = useMemo(() => {
    return (resource.data?.lessons ?? []).filter((lesson) => {
      const matchesQuery =
        !normalizedQuery ||
        lesson.title.toLowerCase().includes(normalizedQuery) ||
        (lesson.description ?? "").toLowerCase().includes(normalizedQuery) ||
        (lesson.topic ?? "").toLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesContentStateFilter(statusFilter, lesson);
    });
  }, [normalizedQuery, resource.data?.lessons, statusFilter]);

  useEffect(() => {
    if (resource.data?.simulationExamSettings) {
      setSimulationExamSettingsDraft(makeSimulationExamSettingsDraft(resource.data.simulationExamSettings));
    }
  }, [resource.data?.simulationExamSettings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuestionQuery(query.trim());
    }, QUESTION_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (questionCategoryId === "all") {
      return;
    }
    if (categoryOptions.some((category) => category.id === questionCategoryId)) {
      return;
    }
    setQuestionCategoryId("all");
    setQuestionPage(1);
  }, [categoryOptions, questionCategoryId]);

  useEffect(() => {
    if (tab !== "questions" || !questionPageData) {
      return;
    }

    const totalPages = Math.max(1, Math.ceil(questionPageData.total / questionLimit || 1));
    if (questionPage > totalPages) {
      setQuestionPage(totalPages);
    }
  }, [questionLimit, questionPage, questionPageData, tab]);

  const refresh = async () => {
    await resource.reload({ force: true });
    if (tab === "questions" && !canUseBootstrapQuestionPage) {
      const refreshed = await questionBankResource.reload({ force: true });
      if (refreshed && refreshed.items.length === 0 && refreshed.total > 0 && questionPage > 1) {
        setQuestionPage(Math.max(1, Math.ceil(refreshed.total / questionLimit)));
      }
    }
  };

  const saveSimulationExamSettings = async () => {
    setBusy("simulation-settings");
    setNotice(null);
    try {
      await updateAdminSimulationExamSettings({
        question_count: toRequiredNumber(simulationExamSettingsDraft.question_count, 40),
        duration_minutes: toRequiredNumber(simulationExamSettingsDraft.duration_minutes, 40),
        mistake_limit: toRequiredNumber(simulationExamSettingsDraft.mistake_limit, 3),
        violation_limit: toRequiredNumber(simulationExamSettingsDraft.violation_limit, 2),
        cooldown_days: toRequiredNumber(simulationExamSettingsDraft.cooldown_days, 14),
        fast_unlock_price: toRequiredNumber(simulationExamSettingsDraft.fast_unlock_price, 120),
        intro_video_url: toNullableString(simulationExamSettingsDraft.intro_video_url),
      });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Imtihon qoidalari saqlanmadi.");
    } finally {
      setBusy(null);
    }
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

  const uploadIntroVideoAsset = async (file: File) => {
    setBusy("intro-video-upload");
    setNotice(null);
    try {
      const uploaded = await uploadAdminLessonFile(file);
      if (uploaded.content_type && uploaded.content_type !== "video") {
        throw new Error("About uchun faqat video fayl yuklang.");
      }
      setSimulationExamSettingsDraft((draft) => ({ ...draft, intro_video_url: uploaded.url }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "About videosi yuklanmadi.");
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

  const applyLessonCategory = (categoryId: string) => {
    const matchedCategory = categoryOptions.find((category) => category.id === categoryId);
    if (!matchedCategory) {
      setLessonDraft((draft) => ({ ...draft, topic: "", section: "" }));
      return;
    }
    setLessonDraft((draft) => ({
      ...draft,
      topic: matchedCategory.name,
      section: matchedCategory.name,
    }));
  };

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

  const searchPlaceholder =
    tab === "questions"
      ? "Savol, topic yoki kategoriya bo'yicha qidiring"
      : tab === "categories"
        ? "Kategoriya nomi bo'yicha qidiring"
        : tab === "lessons"
          ? "Lesson yoki topic bo'yicha qidiring"
          : "Sozlama bo'yicha qidiring";
  const configuredQuestionCount = toRequiredNumber(simulationExamSettingsDraft.question_count, 40);
  const configuredDurationMinutes = toRequiredNumber(simulationExamSettingsDraft.duration_minutes, 40);
  const availableQuestionCount = resource.data.questionTotal;
  const hasQuestionBankGap = configuredQuestionCount > availableQuestionCount;
  const settingsBusy = busy === "simulation-settings" || busy === "intro-video-upload";

  const primaryAction =
    tab === "questions" ? (
      <Button onClick={() => openQuestionModal()}>
        <Plus className="h-4 w-4" />
        Yangi savol
      </Button>
    ) : tab === "categories" ? (
      <Button onClick={() => openCategoryModal()}>
        <Plus className="h-4 w-4" />
        Yangi kategoriya
      </Button>
    ) : tab === "lessons" ? (
      <Button onClick={() => openLessonModal()}>
        <Plus className="h-4 w-4" />
        Yangi lesson
      </Button>
    ) : (
      <Button disabled={settingsBusy} onClick={() => void saveSimulationExamSettings()}>
        Sozlamalarni saqlash
      </Button>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kontent banki"
        description="Adaptive amaliyot uchun savollar banki, kategoriyalar, lessonlar va imtihon sozlamalarini bitta oqimda boshqaring."
        action={primaryAction}
      />

      <AdminToolbar
        search={tab === "settings" ? null : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setQuestionPage(1);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        filters={tab === "questions" ? (
          <Select
            value={questionCategoryId}
            onChange={(event) => {
              setQuestionCategoryId(event.target.value);
              setQuestionPage(1);
            }}
            className="min-w-48"
          >
            <option value="all">Barcha kategoriyalar</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        ) : tab === "settings" ? null : (
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-40">
            <option value="all">Barcha status</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
            {tab === "lessons" ? <option value="premium">Premium</option> : null}
          </Select>
        )}
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCcw className="h-4 w-4" />
              Yangilash
            </Button>
          </>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="questions">Question Bank</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          {tab === "__legacy_tests__" ? (
            <AdminSurface
            title="Tests"
            description={`${filteredTests.length} ta test ko'rinmoqda. Formlar modalga ajratildi, list esa minimal kartalar ko'rinishida.`}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {filteredTests.length === 0 ? (
                <EmptyState title="Test topilmadi" description="Qidiruv va filtr bo'yicha mos test yo'q." />
              ) : (
                filteredTests.map((test) => (
                  <div key={test.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{test.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{test.description ?? "No description"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={test.is_active ? "success" : "muted"}>{test.is_active ? "Active" : "Inactive"}</Badge>
                        {test.is_premium ? <Badge variant="warning">Premium</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-[var(--muted-foreground)]">
                      {test.difficulty} • {test.duration ?? 0} daqiqa
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button size="sm" variant="outline" onClick={() => openTestModal(test)}>
                        Manage
                      </Button>
                      <AdminActionMenu
                        items={[
                          {
                            label: test.is_active ? "Deactivate" : "Activate",
                            disabled: busy === `test-status-${test.id}`,
                            onClick: () =>
                              void removeItem(
                                () => updateAdminTest(test.id, { is_active: !test.is_active }),
                                `test-status-${test.id}`,
                                "Test holati yangilanmadi.",
                              ),
                          },
                          {
                            label: test.is_premium ? "Premiumni olib tashlash" : "Premium qilish",
                            disabled: busy === `test-premium-${test.id}`,
                            onClick: () =>
                              void removeItem(
                                () => updateAdminTest(test.id, { is_premium: !test.is_premium }),
                                `test-premium-${test.id}`,
                                "Test premium holati yangilanmadi.",
                              ),
                          },
                          {
                            label: "Delete",
                            tone: "danger",
                            disabled: busy === test.id,
                            onClick: () => void removeItem(() => deleteAdminTest(test.id), test.id, "Test o'chirilmadi."),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            </AdminSurface>
          ) : null}

          <AdminSurface
            title="Question bank"
            description={`${questionTotal} ta savol bankda mavjud. Joriy sahifada ${questionItems.length} ta savol ko'rsatilmoqda.`}
            action={questionBankRefreshing ? <Badge variant="secondary">Yangilanmoqda...</Badge> : null}
          >
            {questionBankResource.error && questionItems.length > 0 ? (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                Savollar yangilanmadi. Avvalgi natijalar ko&apos;rsatilmoqda.
              </div>
            ) : null}

            {questionBankLoading ? (
              <QuestionBankLoadingState />
            ) : questionBankResource.error && questionItems.length === 0 ? (
              <div className="p-5">
                <ErrorState
                  title="Question Bank yuklanmadi"
                  description="Savollar ro'yxatini olib bo'lmadi."
                  error={questionBankResource.error}
                  onRetry={() => void questionBankResource.reload({ force: true })}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 px-5 pt-5 lg:grid-cols-2">
                  {questionItems.length === 0 ? (
                    <div className="lg:col-span-2">
                      <EmptyState
                        title={debouncedQuestionQuery ? "Natija topilmadi" : "Savollar topilmadi"}
                        description={
                          debouncedQuestionQuery
                            ? `"${debouncedQuestionQuery}" bo'yicha mos savol topilmadi.`
                            : effectiveQuestionCategoryId
                              ? "Tanlangan kategoriya bo'yicha hali savol yo'q."
                              : "Question Bank hozircha bo'sh."
                        }
                        actionLabel="Yangi savol"
                        onAction={() => openQuestionModal()}
                      />
                    </div>
              ) : (
                    questionItems.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{question.text}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {question.topic ?? "No topic"} • {question.difficulty} • {question.answer_options.length} options
                        </p>
                      </div>
                      <Badge variant="muted">{question.difficulty_percent}%</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.answer_options.slice(0, 3).map((option) => (
                        <Badge key={option.id} variant={option.is_correct ? "success" : "muted"}>
                          {option.text}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button size="sm" variant="outline" onClick={() => openQuestionModal(question)}>
                        Manage
                      </Button>
                      <AdminActionMenu
                        items={[
                          { label: "Edit", onClick: () => openQuestionModal(question) },
                          {
                            label: "Delete",
                            tone: "danger",
                            disabled: busy === question.id,
                            onClick: () => void removeItem(() => deleteAdminQuestion(question.id), question.id, "Savol o'chirilmadi."),
                          },
                        ]}
                      />
                    </div>
                  </div>
                    ))
                  )}
                </div>

                <QuestionBankPagination
                  page={questionPage}
                  total={questionTotal}
                  limit={questionLimit}
                  hasMore={questionHasMore}
                  loading={questionBankRefreshing}
                  onPageChange={setQuestionPage}
                  onLimitChange={(nextLimit) => {
                    setQuestionLimit(nextLimit);
                    setQuestionPage(1);
                  }}
                />
              </div>
            )}
          </AdminSurface>
        </TabsContent>

        <TabsContent value="categories">
          <AdminSurface
            title="Categories"
            description={`${filteredCategories.length} ta kategoriya ko'rinmoqda. Coverage badge'lari savol va lesson bog'lanishini ko'rsatadi.`}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {filteredCategories.length === 0 ? (
                <EmptyState title="Kategoriya topilmadi" description="Qidiruv va filtr bo'yicha mos kategoriya yo'q." />
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{category.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{category.description ?? "No description"}</p>
                      </div>
                      <Badge variant={category.is_active ? "success" : "muted"}>{category.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="muted">{categoryCoverage.get(category.id)?.questionCount ?? 0} savol</Badge>
                      <Badge variant="muted">{categoryCoverage.get(category.id)?.lessonCount ?? 0} lesson</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button size="sm" variant="outline" onClick={() => openCategoryModal(category)}>
                        Manage
                      </Button>
                      <AdminActionMenu
                        items={[
                          {
                            label: category.is_active ? "Deactivate" : "Activate",
                            disabled: busy === `category-status-${category.id}`,
                            onClick: () =>
                              void removeItem(
                                () => updateAdminQuestionCategory(category.id, { is_active: !category.is_active }),
                                `category-status-${category.id}`,
                                "Kategoriya holati yangilanmadi.",
                              ),
                          },
                          {
                            label: "Delete",
                            tone: "danger",
                            disabled: busy === category.id,
                            onClick: () =>
                              void removeItem(
                                () => deleteAdminQuestionCategory(category.id),
                                category.id,
                                "Kategoriya o'chirilmadi.",
                              ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminSurface>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-6">
          <AdminSurface
            title="Lessons"
            description={`${filteredLessons.length} ta lesson ko'rinmoqda. Qo'shimcha kontent URL va media upload modal ichida saqlanadi.`}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              {filteredLessons.length === 0 ? (
                <EmptyState title="Lesson topilmadi" description="Qidiruv va filtr bo'yicha mos lesson yo'q." />
              ) : (
                filteredLessons.map((lesson) => (
                  <div key={lesson.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {lesson.content_type} / {lesson.topic ?? "No topic"}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{lesson.content_url}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={lesson.is_active ? "success" : "muted"}>{lesson.is_active ? "Active" : "Inactive"}</Badge>
                        {lesson.is_premium ? <Badge variant="warning">Premium</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lesson.section ? <Badge variant="muted">{lesson.section}</Badge> : null}
                      {lesson.thumbnail_url ? <Badge variant="muted">Thumbnail</Badge> : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button size="sm" variant="outline" onClick={() => openLessonModal(lesson)}>
                        Manage
                      </Button>
                      <AdminActionMenu
                        items={[
                          {
                            label: lesson.is_active ? "Deactivate" : "Activate",
                            disabled: busy === `lesson-status-${lesson.id}`,
                            onClick: () =>
                              void removeItem(
                                () => updateAdminLesson(lesson.id, { is_active: !lesson.is_active }),
                                `lesson-status-${lesson.id}`,
                                "Lesson holati yangilanmadi.",
                              ),
                          },
                          {
                            label: lesson.is_premium ? "Premiumni olib tashlash" : "Premium qilish",
                            disabled: busy === `lesson-premium-${lesson.id}`,
                            onClick: () =>
                              void removeItem(
                                () => updateAdminLesson(lesson.id, { is_premium: !lesson.is_premium }),
                                `lesson-premium-${lesson.id}`,
                                "Lesson premium holati yangilanmadi.",
                              ),
                          },
                          {
                            label: "Delete",
                            tone: "danger",
                            disabled: busy === lesson.id,
                            onClick: () =>
                              void removeItem(() => deleteAdminLesson(lesson.id), lesson.id, "Lesson o'chirilmadi."),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminSurface>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <AdminSurface
            title="Simulation control center"
            description="Simulyatsiya ochilganda foydalanuvchiga beriladigan savollar soni, taymer va barcha limitlarni shu yerda boshqaring."
            action={
              <Button disabled={settingsBusy} onClick={() => void saveSimulationExamSettings()}>
                Sozlamalarni saqlash
              </Button>
            }
          >
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={hasQuestionBankGap ? "danger" : "success"}>
                  Bank: {availableQuestionCount} savol
                </Badge>
                <Badge variant="secondary">
                  Simulyatsiya: {configuredQuestionCount} savol / {configuredDurationMinutes} daqiqa
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Savollar soni</span>
                  <Input
                    type="number"
                    min={10}
                    max={120}
                    value={simulationExamSettingsDraft.question_count}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, question_count: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Taymer (daqiqa)</span>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={simulationExamSettingsDraft.duration_minutes}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, duration_minutes: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Mistake limit</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={simulationExamSettingsDraft.mistake_limit}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, mistake_limit: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Violation limit</span>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={simulationExamSettingsDraft.violation_limit}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, violation_limit: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Cooldown days</span>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={simulationExamSettingsDraft.cooldown_days}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, cooldown_days: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Fast unlock price</span>
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={simulationExamSettingsDraft.fast_unlock_price}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, fast_unlock_price: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {hasQuestionBankGap
                  ? `Ogohlantirish: bankda hozir ${availableQuestionCount} ta savol bor, lekin simulyatsiya ${configuredQuestionCount} ta savol so'ramoqda. Start paytida yetarli bank bo'lmasa session ochilmaydi.`
                  : "Bu konfiguratsiya barcha yangi simulation sessionlar uchun darhol ishlaydi. Foydalanuvchi boshlagan mavjud sessionlar eski taymer bilan davom etadi."}
              </div>
            </div>
          </AdminSurface>

          <AdminSurface
            title="Landing About video"
            description="Dastlabki sahifadagi `about` tugmasi shu video URL ni ochadi. Fayl yuklasangiz URL maydoni avtomatik to'ladi."
            action={
              <Button disabled={settingsBusy} onClick={() => void saveSimulationExamSettings()}>
                About videosini saqlash
              </Button>
            }
          >
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Video URL</span>
                  <Input
                    value={simulationExamSettingsDraft.intro_video_url}
                    onChange={(event) =>
                      setSimulationExamSettingsDraft((draft) => ({ ...draft, intro_video_url: event.target.value }))
                    }
                    placeholder="https://.../intro.mp4"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Video yuklash</span>
                  <Input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadIntroVideoAsset(file);
                      }
                    }}
                  />
                </label>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  `about` bosilganda landing modal aynan shu videoni yuklaydi. Fayl yuklangandan keyin `About videosini saqlash`
                  tugmasini bosing.
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,var(--background))] p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">Joriy preview</p>
                {simulationExamSettingsDraft.intro_video_url ? (
                  <video
                    controls
                    className="mt-3 aspect-video w-full rounded-[1rem] border border-[var(--border)] bg-black object-cover"
                    src={simulationExamSettingsDraft.intro_video_url}
                  >
                    Brauzer video previewni qo&apos;llab-quvvatlamaydi.
                  </video>
                ) : (
                  <div className="mt-3 flex aspect-video items-center justify-center rounded-[1rem] border border-dashed border-[var(--border)] bg-[var(--muted)]/35 px-4 text-center text-sm text-[var(--muted-foreground)]">
                    Hali about videosi biriktirilmagan.
                  </div>
                )}
              </div>
            </div>
          </AdminSurface>
        </TabsContent>
      </Tabs>
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
            <span className="text-sm font-medium">Category</span>
            <Select value={selectedLessonCategoryId} onChange={(event) => applyLessonCategory(event.target.value)}>
              <option value="">Custom</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
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
            <Select
              value={questionDraft.category_id}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                const matchedCategory = categoryOptions.find((category) => category.id === nextCategoryId);
                setQuestionDraft((draft) => ({
                  ...draft,
                  category_id: nextCategoryId,
                  category: matchedCategory?.name ?? draft.category,
                }));
              }}
            >
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
                To&apos;g&apos;ri
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
                O&apos;chirish
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

