
"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    Activity,
    Timer,
    TrendingUp,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamic import for Recharts components
const ChartContainer = dynamic(() => Promise.resolve(({ children }: { children: React.ReactNode }) => (
    <div className="h-[250px] w-full">{children}</div>
)), { ssr: false, loading: () => <Skeleton className="h-[250px] w-full rounded-xl" /> });

interface PerformanceDiagnosticsProps {
    topicBreakdown: Array<{ topic: string; accuracy: number; total: number }>;
    avgResponseTime: number; // in ms
    improvementDelta: number;
    difficultyAccuracy?: Record<string, number>;
    adaptiveStrength?: number;
}

export function PerformanceDiagnostics({
    topicBreakdown,
    avgResponseTime,
    improvementDelta,
    difficultyAccuracy,
    adaptiveStrength
}: PerformanceDiagnosticsProps) {

    const weakestTopic = useMemo(() => {
        if (!topicBreakdown?.length) return null;
        return [...topicBreakdown].sort((a, b) => a.accuracy - b.accuracy)[0];
    }, [topicBreakdown]);

    const chartData = useMemo(() => {
        return topicBreakdown?.map(t => ({
            name: t.topic.length > 15 ? t.topic.substring(0, 12) + "..." : t.topic,
            fullName: t.topic,
            accuracy: Math.round(t.accuracy)
        })) || [];
    }, [topicBreakdown]);

    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 px-2">
                <Activity className="w-6 h-6 text-emerald-500" />
                Performance Diagnostics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TOPIC BREAKDOWN CHART */}
                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                            Topic Proficiency
                            {weakestTopic && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 italic">
                                    Focus needed on {weakestTopic.topic}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F8FAFC' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} barSize={32}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.accuracy >= 75 ? '#10B981' : entry.accuracy >= 50 ? '#3B82F6' : '#EF4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* EFFICIENCY & ADAPTIVE METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="rounded-2xl border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Timer className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Efficiency</span>
                            </div>
                            <h4 className="text-2xl font-black text-slate-900">{(avgResponseTime / 1000).toFixed(2)}s<span className="text-xs font-medium text-slate-400 ml-1">avg</span></h4>
                        </div>
                        <div className="pt-2">
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-bold w-fit border border-emerald-100">
                                Optimal Pace
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-2xl border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-400">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Improvement</span>
                            </div>
                            <h4 className={cn(
                                "text-2xl font-black",
                                improvementDelta >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {improvementDelta > 0 ? `+${improvementDelta}` : improvementDelta}%
                            </h4>
                        </div>
                        <div className="pt-2">
                            <div className="text-[10px] font-bold text-slate-500">Vs previous session</div>
                        </div>
                    </Card>

                    <Card className="rounded-2xl border-slate-200 shadow-sm p-6 col-span-1 sm:col-span-2 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Zap className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Adaptive Intelligence</span>
                                <h4 className="text-xl font-black text-slate-900 leading-none mt-1">
                                    {adaptiveStrength ? (adaptiveStrength * 100).toFixed(0) : "0"}% Strength
                                </h4>
                            </div>
                        </div>
                        <div className="hidden sm:block text-right">
                            <div className="text-[10px] font-bold text-indigo-500 uppercase">Engine Health</div>
                            <div className="flex gap-1 mt-1 justify-end">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={cn(
                                        "w-2 h-2 rounded-full",
                                        i <= (adaptiveStrength || 0) * 5 ? "bg-indigo-500" : "bg-slate-200"
                                    )} />
                                ))}
                            </div>
                        </div>
                    </Card>

                    {difficultyAccuracy && Object.keys(difficultyAccuracy).length > 0 && (
                        <Card className="rounded-2xl border-slate-200 shadow-sm p-6 col-span-1 sm:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none block mb-4">Accuracy by Difficulty</span>
                            <div className="flex items-center gap-6">
                                {Object.entries(difficultyAccuracy).map(([difficulty, accuracy]) => (
                                    <div key={difficulty} className="flex-1 space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span className="uppercase text-slate-500">{difficulty}</span>
                                            <span className="text-slate-900">{Math.round(accuracy)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    difficulty === 'hard' ? 'bg-red-500' : difficulty === 'medium' ? 'bg-blue-500' : 'bg-emerald-500'
                                                )}
                                                style={{ width: `${accuracy}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </section>
    );
}
