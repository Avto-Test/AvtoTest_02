'use client';

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsOverview, TopicAccuracy } from '@/types/analytics';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Award, Target, AlertTriangle } from 'lucide-react';

interface ProgressAnalyticsProps {
    overview: AnalyticsOverview;
    topics: TopicAccuracy[];
}

export function ProgressAnalytics({ overview, topics }: ProgressAnalyticsProps) {
    // Format data for Recharts
    const chartData = (overview.last_5_scores ?? []).map((score, index) => ({
        name: `A${index + 1}`,
        score: score,
    }));

    const weakestTopic = topics.length > 0
        ? [...topics].sort((a, b) => a.accuracy - b.accuracy)[0]
        : null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600">Pass Rate</p>
                                <p className="text-2xl font-bold text-emerald-900">{overview.pass_rate ?? 0}%</p>
                            </div>
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Best Score</p>
                                <p className="text-2xl font-bold text-blue-900">{overview.best_score}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Award className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 border-amber-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600">Average</p>
                                <p className="text-2xl font-bold text-amber-900">{overview.average_score}</p>
                            </div>
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Target className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50/50 border-slate-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">Attempts</p>
                                <p className="text-2xl font-bold text-slate-900">{overview.total_attempts}</p>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Brain className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                <Card className="md:col-span-4 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            Performance Trend
                            <Badge variant="secondary" className="font-normal">Last 5 Sessions</Badge>
                        </CardTitle>
                        <CardDescription>Visualizing your improvement over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[240px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00B37E" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#00B37E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                    />
                                    <YAxis
                                        domain={[0, 20]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#00B37E"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Topic Breakdown</CardTitle>
                        <CardDescription>Accuracy per category.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {topics.length > 0 ? (
                            <div className="space-y-4">
                                {topics.map((item) => (
                                    <div key={item.topic} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-slate-700">{item.topic}</span>
                                            <span className="text-slate-500">{item.accuracy}%</span>
                                        </div>
                                        <Progress
                                            value={item.accuracy}
                                            className="h-2"
                                        // Custom color logic could be added here if shadcn progress supported it easily
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-500">
                                No topic data available yet.
                            </div>
                        )}

                        {weakestTopic && weakestTopic.accuracy < 70 && (
                            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold text-red-900">Focus Recommendation</p>
                                    <p className="text-red-700">
                                        You are struggling with <span className="font-bold">{weakestTopic.topic}</span>. We recommend reviewing this topic specifically.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
