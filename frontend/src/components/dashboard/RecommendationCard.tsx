'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight, Lock } from 'lucide-react';
import { TopicRecommendation } from '@/types/analytics';
import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';

interface RecommendationCardProps {
    recommendation: TopicRecommendation | null;
    isPremium: boolean;
    onUpgrade: () => void;
}

export function RecommendationCard({ recommendation, isPremium, onUpgrade }: RecommendationCardProps) {
    const { t } = useI18n();
    if (!isPremium) {
        return (
            <Card className="relative overflow-hidden border-amber-200/60 bg-amber-50/30 dark:border-amber-700/40 dark:bg-amber-900/20">
                <div className="absolute inset-0 bg-white/60 dark:bg-background/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="p-3 bg-amber-100 rounded-full">
                        <Lock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-foreground">{t("premium.unlock_reco", "Unlock Smart Recommendations")}</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                            {t("premium.unlock_reco_desc", "Get AI-driven advice on which topics to focus on next.")}
                        </p>
                    </div>
                    <Button size="sm" onClick={onUpgrade} className="bg-amber-600 hover:bg-amber-700 text-white">
                        {t("premium.upgrade_unlock", "Upgrade to Unlock")}
                    </Button>
                </div>

                {/* Blurry background content */}
                <CardHeader className="opacity-20 pointer-events-none">
                    <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" /> Focus Recommendation
                    </CardTitle>
                </CardHeader>
                <CardContent className="opacity-20 pointer-events-none space-y-4">
                    <div className="space-y-1">
                        <div className="text-2xl font-bold">Traffic Signs</div>
                        <div className="text-sm text-red-500 font-medium">Low Accuracy (45%)</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!recommendation) {
        return (
            <Card className="bg-slate-50 border-slate-200 border-dashed dark:bg-card/70 dark:border-border">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <div className="p-2 bg-slate-100 dark:bg-muted rounded-full">
                        <Target className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{t("premium.no_reco", "No recommendations yet.")}</p>
                    <p className="text-xs text-muted-foreground">{t("premium.no_reco_desc", "Complete more tests to generate insights.")}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20 dark:border-l-blue-400">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Target className="w-5 h-5 text-blue-600" />
                    {t("premium.focus_reco", "Focus Recommendation")}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                    {t("premium.based_performance", "Based on your recent performance.")}
                    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                        {t("premium.adaptive_mode", "Adaptive Mode")}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="text-lg font-bold text-foreground">
                        {recommendation.topic}
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                        <span className="text-muted-foreground">{t("premium.current_accuracy", "Current Accuracy:")}</span>
                        <span className="font-bold text-red-500">{recommendation.accuracy}%</span>
                    </div>
                </div>

                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white group">
                    <Link href="/tests?mode=adaptive">
                        {t("premium.start_adaptive", "Start Adaptive Practice")}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
