'use client';

import { useEffect, useMemo, useState } from 'react';
import PremiumLock from '@/components/PremiumLock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLessonsFeed, LessonItem, LessonSection } from '@/lib/lessons';
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
                    <p className="text-muted-foreground">Text content is available for this lesson.</p>
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
                Your browser does not support video playback.
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
                Open Lesson Material
            </a>
        </Button>
    );
}

export default function LessonsPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lessons, setLessons] = useState<LessonItem[]>([]);
    const [sections, setSections] = useState<LessonSection[]>([]);
    const [isPremiumFromApi, setIsPremiumFromApi] = useState(false);
    const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

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
                setError(err instanceof Error ? err.message : 'Failed to load lessons');
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
            const key = lesson.section || lesson.topic || 'General';
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

    useEffect(() => {
        if (selectedCategoryKey && !categorySections.some((section) => section.key === selectedCategoryKey)) {
            setSelectedCategoryKey(null);
        }
    }, [categorySections, selectedCategoryKey]);

    if (isLoading) {
        return <div className="py-12 text-center text-muted-foreground">Loading lessons...</div>;
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
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedCategoryKey(null)}
                        >
                            {'<-'} Kategoriyalarga qaytish
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            {selectedCategory.lessons.length} ta dars
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {selectedCategory.lessons.map((lesson) => (
                            <article key={lesson.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{lesson.content_type}</Badge>
                                    {lesson.topic ? <Badge variant="secondary">{lesson.topic}</Badge> : null}
                                    {lesson.is_premium ? <Badge>Premium</Badge> : <Badge variant="secondary">All</Badge>}
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
