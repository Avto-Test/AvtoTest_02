'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TopicRetention } from '@/types/analytics';
import PremiumLock from '@/components/PremiumLock';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/i18n-provider';

interface RetentionHeatmapProps {
    retention: TopicRetention[];
    isPremium: boolean;
}

export function RetentionHeatmap({ retention, isPremium }: RetentionHeatmapProps) {
    const { t } = useI18n();
    if (!retention || retention.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{t("premium.memory_retention", "Memory Retention")}</CardTitle>
                    <CardDescription>{t("premium.memory_desc", "Knowledge freshness over time.")}</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center px-6">
                    {t("premium.memory_empty", "Start practicing to see your memory retention heatmap and identify fading concepts.")}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-none shadow-xl bg-gradient-to-br from-[#0f2745] to-[#102f5a] text-white overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-white">
                            {t("premium.memory_heatmap", "Memory Retention Heatmap")}
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium">
                            {t("premium.ebbinghaus", "Ebbinghaus Forgetting Curve Tracking")}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white/5 text-slate-300 border-white/10">
                        {t("premium.live_analytics", "Live Analytics")}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <PremiumLock
                    isLocked={!isPremium}
                    title={t("premium.unlock_retention", "Unlock Retention Intelligence")}
                    description={t("premium.unlock_retention_desc", "Visualize how concepts fade from your memory over time and get AI revision alerts")}
                    dark
                >
                    <div className="space-y-6 pt-2">
                        {retention.map((item, index) => {
                            let status = t("premium.status_fresh", "Fresh");
                            let colorClass = 'bg-emerald-500';
                            let textClass = 'text-emerald-400';

                            if (item.retention < 0.6) {
                                status = t("premium.status_needs_revision", "Needs Revision");
                                colorClass = 'bg-red-500';
                                textClass = 'text-red-400';
                            } else if (item.retention < 0.85) {
                                status = t("premium.status_fading", "Fading");
                                colorClass = 'bg-amber-500';
                                textClass = 'text-amber-400';
                            }

                            return (
                                <div key={index} className="space-y-2 group">
                                    <div className="flex items-center justify-between transition-transform group-hover:translate-x-1 duration-200">
                                        <span className="text-sm font-semibold text-slate-200">
                                            {item.topic}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
                                            {status} ({(item.retention * 100).toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute left-0 top-0 h-full ${colorClass} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,0,0,0.5)]`}
                                            style={{ width: `${item.retention * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </PremiumLock>
            </CardContent>
        </Card>
    );
}
