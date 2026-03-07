'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PremiumLock from '@/components/PremiumLock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLessonsFeed, LessonItem, LessonSection } from '@/lib/lessons';
import { normalizeTopicKey } from '@/lib/dashboardTopic';
import { useAuth } from '@/store/useAuth';

function toYoutubeEmbed(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes('youtube.com')) {
            const videoId = parsed.searchParams.get('v');
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
        if (parsed.hostname.includes('youtu.be')) {
            const id = parsed.pathname.replace('/', '').trim();
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        return null;
    } catch {
        return null;
    }
}

function LessonPreview({ lesson }: { lesson: LessonItem }) {
    if (lesson.content_type === 'text') {
        return (
            <div className="rounded-md border bg-card p-3 text-sm text-foreground">
                {lesson.description ? (
                    <div className="space-y-2">
                        {lesson.description.split('\n').map((line, index) => (
                            <p key={`${lesson.id}-line-${index}`} className="leading-relaxed">
                                {line}
                            </p>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">Bu dars uchun matnli kontent mavjud.</p>
                )}
            </div>
        );
    }

    if (lesson.content_type === 'video') {
        const youtubeEmbed = toYoutubeEmbed(lesson.content_url);
        if (youtubeEmbed) {
            return (
                <div className="aspect-video w-full overflow-hidden rounded-md border">
                    <iframe
                        src={youtubeEmbed}
                        title={lesson.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        }

        return (
            <video controls className="max-h-60 w-full rounded-md border" src={lesson.content_url}>
                Brauzeringiz video ijrosini qo'llab-quvvatlamaydi.
            </video>
        );
    }

    if (lesson.content_type === 'audio') {
        return <audio controls className="w-full" src={lesson.content_url} />;
    }

    if (lesson.content_type === 'image') {
        return (
            <img
                src={lesson.content_url}
                alt={lesson.title}
                className="max-h-64 w-full rounded-md border object-cover"
            />
        );
    }

    return (
        <Button variant="outline" asChild>
            <a href={lesson.content_url} target="_blank" rel="noreferrer">
                Dars materialini ochish
            </a>
        </Button>
    );
}

export default function LessonsPage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lessons, setLessons] = useState<LessonItem[]>([]);
    const [sections, setSections] = useState<LessonSection[]>([]);
    const [isPremiumFromApi, setIsPremiumFromApi] = useState(false);
    const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
    const [querySelectionApplied, setQuerySelectionApplied] = useState(false);
    const [highlightedSectionKey, setHighlightedSectionKey] = useState<string | null>(null);
    const [autoFocusedSectionKey, setAutoFocusedSectionKey] = useState<string | null>(null);
    const selectedSectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            try {
                const feed = await getLessonsFeed();
                setLessons(feed.lessons);
                setSections(feed.sections);
                setIsPremiumFromApi(feed.is_premium_user);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Darslarni yuklab bo'lmadi");
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, []);

    const isPremiumUser = user?.plan === 'premium' || isPremiumFromApi;

    const categorySections = useMemo(() => {
        if (sections.length > 0) {
            return sections;
        }
        const grouped = new Map<string, LessonItem[]>();
        for (const lesson of lessons) {
            const key = lesson.section || lesson.topic || 'Umumiy';
            const existing = grouped.get(key) || [];
            existing.push(lesson);
            grouped.set(key, existing);
        }
        return Array.from(grouped.entries()).map(([key, value]) => ({
            key: key.toLowerCase().replace(/\s+/g, '-'),
            title: key,
            lessons: [...value].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        }));
    }, [sections, lessons]);

    const selectedCategory = useMemo(
        () => categorySections.find((section) => section.key === selectedCategoryKey) ?? null,
        [categorySections, selectedCategoryKey]
    );

    const focusedTopic = searchParams.get('topic')?.trim() ?? '';
    const isFocusedSelection = useMemo(() => {
        if (!focusedTopic || !selectedCategory) {
            return false;
        }

        const normalizedFocusedTopic = normalizeTopicKey(focusedTopic);
        return (
            normalizeTopicKey(selectedCategory.key) === normalizedFocusedTopic ||
            normalizeTopicKey(selectedCategory.title) === normalizedFocusedTopic ||
            selectedCategory.lessons.some(
                (lesson) =>
                    normalizeTopicKey(lesson.topic ?? '') === normalizedFocusedTopic ||
                    normalizeTopicKey(lesson.section ?? '') === normalizedFocusedTopic
            )
        );
    }, [focusedTopic, selectedCategory]);

    useEffect(() => {
        setQuerySelectionApplied(false);
    }, [focusedTopic]);

    useEffect(() => {
        if (selectedCategoryKey && !categorySections.some((section) => section.key === selectedCategoryKey)) {
            setSelectedCategoryKey(null);
        }
    }, [categorySections, selectedCategoryKey]);

    useEffect(() => {
        if (querySelectionApplied || !focusedTopic || categorySections.length === 0) {
            return;
        }

        const normalizedFocusedTopic = normalizeTopicKey(focusedTopic);
        const matchedSection =
            categorySections.find(
                (section) =>
                    normalizeTopicKey(section.key) === normalizedFocusedTopic ||
                    normalizeTopicKey(section.title) === normalizedFocusedTopic ||
                    section.lessons.some(
                        (lesson) =>
                            normalizeTopicKey(lesson.topic ?? '') === normalizedFocusedTopic ||
                            normalizeTopicKey(lesson.section ?? '') === normalizedFocusedTopic
                    )
            ) ?? null;

        if (matchedSection) {
            setSelectedCategoryKey(matchedSection.key);
            setAutoFocusedSectionKey(matchedSection.key);
        }

        setQuerySelectionApplied(true);
    }, [categorySections, focusedTopic, querySelectionApplied]);

    useEffect(() => {
        if (!selectedCategory || !autoFocusedSectionKey || selectedCategory.key !== autoFocusedSectionKey) {
            return;
        }

        const scrollTarget = selectedSectionRef.current;
        if (!scrollTarget) {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setHighlightedSectionKey(autoFocusedSectionKey);
        });

        const timeoutId = window.setTimeout(() => {
            setHighlightedSectionKey((current) => (current === autoFocusedSectionKey ? null : current));
        }, 1800);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
        };
    }, [autoFocusedSectionKey, selectedCategory]);

    if (isLoading) {
        return <div className="py-12 text-center text-muted-foreground">Darslar yuklanmoqda...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Darslar</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {selectedCategory
                        ? `"${selectedCategory.title}" kategoriyasidagi darslar.`
                        : "Avval kategoriya tanlang, keyin o'sha kategoriya bo'yicha darslarni ko'ring."}
                </p>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {categorySections.length === 0 ? (
                <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
                    {"Hozircha darslar qo'shilmagan."}
                </div>
            ) : selectedCategory ? (
                <div
                    ref={selectedSectionRef}
                    className={`rounded-2xl transition-all duration-500 ${
                        highlightedSectionKey === selectedCategory.key
                            ? 'bg-cyan-500/5 p-4 ring-1 ring-cyan-400/35 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_18px_30px_rgba(8,47,73,0.18)]'
                            : ''
                    }`}
                >
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button type="button" variant="outline" onClick={() => setSelectedCategoryKey(null)}>
                            {'<-'} Kategoriyalarga qaytish
                        </Button>
                        <div className="flex items-center gap-2">
                            {isFocusedSelection ? (
                                <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">Tavsiya</Badge>
                            ) : null}
                            <div className="text-sm text-muted-foreground">
                                {selectedCategory.lessons.length} ta dars
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-foreground">{selectedCategory.title}</h2>
                        {isFocusedSelection ? (
                            <Badge variant="secondary" className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">
                                Tavsiya
                            </Badge>
                        ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {selectedCategory.lessons.map((lesson) => (
                            <article key={lesson.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{lesson.content_type}</Badge>
                                    {lesson.topic ? <Badge variant="secondary">{lesson.topic}</Badge> : null}
                                    {lesson.is_premium ? <Badge>Premium</Badge> : <Badge variant="secondary">Ochiq</Badge>}
                                </div>
                                <h2 className="text-lg font-semibold text-foreground">{lesson.title}</h2>
                                {lesson.description ? (
                                    <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                                ) : null}
                                <div className="mt-4">
                                    <PremiumLock
                                        isLocked={lesson.is_premium && !isPremiumUser}
                                        title="Premium dars"
                                        description="Bu dars premium foydalanuvchilar uchun ochiq."
                                        ctaText="Premiumga o'tish"
                                        ctaHref="/upgrade"
                                        dark
                                    >
                                        <LessonPreview lesson={lesson} />
                                    </PremiumLock>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
                </div>
            ) : (
                <section className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {categorySections.map((section) => {
                            const premiumCount = section.lessons.filter((lesson) => lesson.is_premium).length;
                            return (
                                <button
                                    key={section.key}
                                    type="button"
                                    onClick={() => setSelectedCategoryKey(section.key)}
                                    className="rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                                        <Badge variant="secondary">{section.lessons.length} dars</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {premiumCount > 0
                                            ? `${premiumCount} ta premium, ${section.lessons.length - premiumCount} ta ochiq dars`
                                            : "Barcha darslar ochiq"}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
