'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AnomalyAlert, type FunnelAnomalySignal } from '@/components/admin/AnomalyAlert';
import {
    FunnelRecommendationCard,
    type FunnelRecommendationInsight,
} from '@/components/admin/FunnelRecommendationCard';
import { LeakInsightCard, type FunnelLeakInsight } from '@/components/admin/LeakInsightCard';
import { SummaryCard } from '@/components/admin/SummaryCard';
import { TrendIndicator, type FunnelTrendSignal } from '@/components/admin/TrendIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts';

type Period = 'today' | 'yesterday' | '7d' | '30d';

interface FunnelResponse {
    premium_block_view: number;
    upgrade_click: number;
    upgrade_page_view: number;
    upgrade_success: number;
    ctr: number;
    conversion_rate: number;
}

interface FunnelDeltaValue {
    absolute: number;
    relative: number;
}

interface FunnelComparisonDelta {
    premium_block_view: FunnelDeltaValue;
    upgrade_click: FunnelDeltaValue;
    upgrade_success: FunnelDeltaValue;
    ctr: FunnelDeltaValue;
    conversion_rate: FunnelDeltaValue;
}

interface FunnelComparison {
    previous: FunnelResponse;
    delta: FunnelComparisonDelta;
}

type FunnelApiResponse = FunnelResponse & {
    comparison?: FunnelComparison;
    leak?: FunnelLeakInsight;
    recommendation?: FunnelRecommendationInsight;
    trend?: FunnelTrendSignal;
    anomaly?: FunnelAnomalySignal;
};

type DeltaTone = 'positive' | 'negative' | 'neutral';

interface DeltaDisplay {
    text: string;
    tone: DeltaTone;
}

const PERIOD_OPTIONS: Array<{ label: string; value: Period }> = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
];

const EMPTY_FUNNEL: FunnelResponse = {
    premium_block_view: 0,
    upgrade_click: 0,
    upgrade_page_view: 0,
    upgrade_success: 0,
    ctr: 0,
    conversion_rate: 0,
};

function normalizePeriod(rawPeriod: string | null): Period {
    if (rawPeriod === 'today' || rawPeriod === 'yesterday' || rawPeriod === '7d' || rawPeriod === '30d') {
        return rawPeriod;
    }

    return '7d';
}

function formatPercent(value: number): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${(safeValue * 100).toFixed(2)}%`;
}

function formatStagePercent(value: number, baseline: number): string {
    if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) {
        return '0.0%';
    }

    return `${((value / baseline) * 100).toFixed(1)}%`;
}

function toDeltaTone(value: number): DeltaTone {
    if (value > 0) {
        return 'positive';
    }

    if (value < 0) {
        return 'negative';
    }

    return 'neutral';
}

function formatCountDelta(value: number): DeltaDisplay {
    const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
    const normalized = Object.is(safeValue, -0) ? 0 : safeValue;

    if (normalized > 0) {
        return {
            text: `+${normalized}`,
            tone: 'positive',
        };
    }

    if (normalized < 0) {
        return {
            text: `${normalized}`,
            tone: 'negative',
        };
    }

    return {
        text: '0',
        tone: 'neutral',
    };
}

function formatRateDelta(value: number): DeltaDisplay {
    const safeValue = Number.isFinite(value) ? value : 0;
    const roundedPercent = Number((safeValue * 100).toFixed(2));
    const normalized = Object.is(roundedPercent, -0) ? 0 : roundedPercent;
    const tone = toDeltaTone(normalized);

    if (tone === 'positive') {
        return {
            text: `+${normalized.toFixed(2)}%`,
            tone,
        };
    }

    if (tone === 'negative') {
        return {
            text: `${normalized.toFixed(2)}%`,
            tone,
        };
    }

    return {
        text: '0.00%',
        tone: 'neutral',
    };
}

export default function AdminAnalyticsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const period = useMemo(() => normalizePeriod(searchParams.get('period')), [searchParams]);

    const [funnel, setFunnel] = useState<FunnelApiResponse>(EMPTY_FUNNEL);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isChartReady, setIsChartReady] = useState(false);
    const [isChartContainerReady, setIsChartContainerReady] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);

    const loadFunnel = useCallback(async (selectedPeriod: Period) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/analytics/funnel?period=${selectedPeriod}`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null) as { error?: string } | null;
                throw new Error(payload?.error || 'Failed to load analytics funnel data.');
            }

            const payload = await response.json() as FunnelApiResponse;
            setFunnel({
                ...EMPTY_FUNNEL,
                ...payload,
                comparison: payload.comparison,
                leak: payload.leak,
                recommendation: payload.recommendation,
                trend: payload.trend,
                anomaly: payload.anomaly,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load analytics funnel data.';
            setError(message);
            setFunnel(EMPTY_FUNNEL);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadFunnel(period);
    }, [period, loadFunnel]);

    useEffect(() => {
        setIsChartReady(true);
    }, []);

    useEffect(() => {
        if (!isChartReady || !chartContainerRef.current) {
            setIsChartContainerReady(false);
            return;
        }

        const element = chartContainerRef.current;
        const updateReadyState = () => {
            setIsChartContainerReady(element.clientWidth > 0 && element.clientHeight > 0);
        };

        updateReadyState();

        const observer = new ResizeObserver(updateReadyState);
        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [isChartReady]);

    const totalEvents =
        funnel.premium_block_view +
        funnel.upgrade_click +
        funnel.upgrade_page_view +
        funnel.upgrade_success;

    const isEmpty = !isLoading && !error && totalEvents === 0;
    const funnelData = useMemo(() => {
        const baseline = funnel.premium_block_view;
        const stages = [
            { name: 'Premium Views', value: funnel.premium_block_view },
            { name: 'Upgrade Clicks', value: funnel.upgrade_click },
            { name: 'Upgrade Page Views', value: funnel.upgrade_page_view },
            { name: 'Upgrade Success', value: funnel.upgrade_success },
        ];

        return stages.map((stage) => ({
            ...stage,
            label: `${stage.name} (${formatStagePercent(stage.value, baseline)})`,
        }));
    }, [funnel]);

    const funnelColors = ['#cbd5e1', '#94a3b8', '#64748b', '#334155'];
    const shouldShowChartSection = !isLoading && !error && !isEmpty && funnel.premium_block_view > 0;
    const canRenderChart = shouldShowChartSection && isChartReady && isChartContainerReady;
    const summaryDelta = useMemo(() => {
        if (period !== '7d' || !funnel.comparison) {
            return null;
        }

        return {
            premium_block_view: formatCountDelta(funnel.comparison.delta.premium_block_view.absolute),
            upgrade_click: formatCountDelta(funnel.comparison.delta.upgrade_click.absolute),
            upgrade_success: formatCountDelta(funnel.comparison.delta.upgrade_success.absolute),
            ctr: formatRateDelta(funnel.comparison.delta.ctr.absolute),
            conversion_rate: formatRateDelta(funnel.comparison.delta.conversion_rate.absolute),
        };
    }, [period, funnel.comparison]);

    const handlePeriodChange = (nextPeriod: Period) => {
        if (nextPeriod === period) {
            return;
        }

        router.replace(`/admin/analytics?period=${nextPeriod}`);
    };

    return (
        <AdminLayout
            title="Analytics"
            description="Premium conversion funnel metrics"
        >
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                        {PERIOD_OPTIONS.map((option) => (
                            <Button
                                key={option.value}
                                size="sm"
                                variant={period === option.value ? 'default' : 'outline'}
                                onClick={() => handlePeriodChange(option.value)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                    {funnel.trend ? <TrendIndicator trend={funnel.trend} /> : null}
                </div>

                {!isLoading && !error && funnel.anomaly?.detected ? (
                    <AnomalyAlert anomaly={funnel.anomaly} />
                ) : null}

                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Card key={index} className="animate-pulse">
                                <CardContent className="space-y-3 p-6">
                                    <div className="h-4 w-24 rounded bg-muted" />
                                    <div className="h-8 w-20 rounded bg-muted" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : null}

                {error ? (
                    <Card>
                        <CardContent className="flex flex-col items-start gap-3 p-6">
                            <p className="text-sm text-destructive">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => void loadFunnel(period)}>
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                ) : null}

                {isEmpty ? (
                    <Card>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">
                                No funnel data for the selected period.
                            </p>
                        </CardContent>
                    </Card>
                ) : null}

                {!isLoading && !error ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <SummaryCard
                                label="Premium Views"
                                value={funnel.premium_block_view}
                                deltaText={summaryDelta?.premium_block_view.text}
                                deltaTone={summaryDelta?.premium_block_view.tone}
                                hint="premium_block_view"
                            />
                            <SummaryCard
                                label="Upgrade Clicks"
                                value={funnel.upgrade_click}
                                deltaText={summaryDelta?.upgrade_click.text}
                                deltaTone={summaryDelta?.upgrade_click.tone}
                                hint="upgrade_click"
                            />
                            <SummaryCard
                                label="Upgrade Success"
                                value={funnel.upgrade_success}
                                deltaText={summaryDelta?.upgrade_success.text}
                                deltaTone={summaryDelta?.upgrade_success.tone}
                                hint="upgrade_success"
                            />
                            <SummaryCard
                                label="CTR"
                                value={formatPercent(funnel.ctr)}
                                deltaText={summaryDelta?.ctr.text}
                                deltaTone={summaryDelta?.ctr.tone}
                                hint="upgrade_click / premium_block_view"
                            />
                            <SummaryCard
                                label="Conversion"
                                value={formatPercent(funnel.conversion_rate)}
                                deltaText={summaryDelta?.conversion_rate.text}
                                deltaTone={summaryDelta?.conversion_rate.tone}
                                hint="upgrade_success / premium_block_view"
                            />
                        </div>

                        {funnel.leak ? (
                            <LeakInsightCard leak={funnel.leak} />
                        ) : null}

                        {funnel.leak && funnel.recommendation ? (
                            <FunnelRecommendationCard recommendation={funnel.recommendation} />
                        ) : null}

                        {shouldShowChartSection ? (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-4">
                                        <h2 className="text-sm font-medium">Funnel Visualization</h2>
                                        <p className="text-xs text-muted-foreground">
                                            Stage drop-off from premium exposure to successful upgrades.
                                        </p>
                                    </div>
                                    <div ref={chartContainerRef} className="h-[340px] w-full min-w-0">
                                        {canRenderChart ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <FunnelChart>
                                                    <Tooltip
                                                        formatter={(value: number | string | undefined) => [Number(value ?? 0), 'Count']}
                                                    />
                                                    <Funnel
                                                        data={funnelData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        isAnimationActive={false}
                                                    >
                                                        {funnelData.map((entry, index) => (
                                                            <Cell
                                                                key={`${entry.name}-${index}`}
                                                                fill={funnelColors[index % funnelColors.length]}
                                                            />
                                                        ))}
                                                        <LabelList
                                                            position="right"
                                                            fill="#64748b"
                                                            stroke="none"
                                                            dataKey="label"
                                                        />
                                                    </Funnel>
                                                </FunnelChart>
                                            </ResponsiveContainer>
                                        ) : null}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                    </>
                ) : null}
            </div>
        </AdminLayout>
    );
}
