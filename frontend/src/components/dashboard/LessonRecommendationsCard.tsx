'use client';

import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import PremiumLock from '@/components/PremiumLock';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LessonRecommendation } from '@/types/analytics';

interface LessonRecommendationsCardProps {
    lessons: LessonRecommendation[];
    isPremium: boolean;
}

export function LessonRecommendationsCard({ lessons, isPremium }: LessonRecommendationsCardProps) {
    const content = (
        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/20">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Lesson Recommendations
                </CardTitle>
                <CardDescription>
                    Generated from your weakest categories and repeated mistakes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {lessons.length === 0 ? (
                    <div className="rounded-md border border-dashed border-emerald-200 p-4 text-sm text-slate-600">
                        Not enough data yet. Complete more tests to get targeted lessons.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {lessons.map((lesson) => (
                            <div
                                key={lesson.lesson_id}
                                className="rounded-lg border bg-white p-3 shadow-sm"
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{lesson.content_type}</Badge>
                                    {lesson.topic ? <Badge variant="secondary">{lesson.topic}</Badge> : null}
                                    {lesson.section ? <Badge variant="secondary">{lesson.section}</Badge> : null}
                                </div>
                                <p className="font-semibold text-slate-900">{lesson.title}</p>
                                <p className="mt-1 text-xs text-slate-500">{lesson.reason}</p>
                            </div>
                        ))}
                    </div>
                )}

                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white group">
                    <Link href="/lessons">
                        Open Lessons
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <PremiumLock
            isLocked={!isPremium}
            title="Unlock Diagnostic Lesson Recommendations"
            description="Premiumda zaif kategoriyalarga mos darslar avtomatik tavsiya qilinadi."
            ctaText="Upgrade to Premium"
            ctaHref="/upgrade"
        >
            {content}
        </PremiumLock>
    );
}
