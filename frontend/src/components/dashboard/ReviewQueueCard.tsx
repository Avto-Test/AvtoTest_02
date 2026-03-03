'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BrainCircuit, ArrowRight, AlertCircle } from 'lucide-react';
import PremiumLock from '@/components/PremiumLock';
import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';

interface ReviewQueueCardProps {
    totalDue: number;
    isPremium: boolean;
}

export function ReviewQueueCard({ totalDue, isPremium }: ReviewQueueCardProps) {
    const { t } = useI18n();
    const isCritical = totalDue > 5;

    return (
        <Card className="h-full border-none shadow-xl bg-gradient-to-br from-amber-600 to-orange-700 text-white overflow-hidden relative group">
            {/* Background Decorative Element */}
            <div className="absolute -right-8 -bottom-8 opacity-10 transition-transform group-hover:scale-110 duration-500">
                <BrainCircuit size={160} />
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            {t("premium.review_queue_title", "Daily Review Queue")}
                        </CardTitle>
                        <CardDescription className="text-amber-100 font-medium">
                            {t("premium.spaced_rep", "Spaced Repetition (SM-2)")}
                        </CardDescription>
                    </div>
                    {isCritical && (
                        <Badge variant="destructive" className="bg-red-500 text-white border-none animate-pulse">
                            {t("premium.overdue_high", "Overdue High")}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="relative z-10">
                <PremiumLock
                    isLocked={!isPremium}
                    title={t("premium.unlock_memory", "Unlock Memory Scheduling")}
                    description={t("premium.unlock_memory_desc", "Our SM-2 brain engine predicts exactly when you are about to forget a topic")}
                    dark
                >
                    <div className="flex flex-col h-full justify-between gap-4 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                                <Calendar className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white">
                                    {totalDue}
                                </div>
                                <div className="text-sm font-bold text-amber-100 uppercase tracking-widest">
                                    {t("premium.topics_due", "Topics Due Today")}
                                </div>
                            </div>
                        </div>

                        {totalDue > 0 ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <p className="text-xs font-medium text-amber-50">
                                        {t("premium.queue_topics", "Topics in queue")}: {isCritical ? t("premium.queue_focus", "Focus on high-priority review.") : t("premium.queue_stable", "Stable progress detected.")}
                                    </p>
                                </div>
                                <Button
                                    className="w-full bg-white text-orange-700 hover:bg-amber-50 font-bold rounded-xl h-11 shadow-lg group/btn"
                                    asChild
                                >
                                    <Link href="/tests?mode=adaptive">
                                        {t("premium.start_review", "Start Review Session")}
                                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-emerald-300" />
                                <span className="text-xs font-bold text-emerald-100">
                                    {t("premium.queue_empty", "Queue empty. You are on track!")}
                                </span>
                            </div>
                        )}
                    </div>
                </PremiumLock>
            </CardContent>
        </Card>
    );
}
