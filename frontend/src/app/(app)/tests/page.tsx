"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function TestsPage() {
    const [questionCount, setQuestionCount] = useState(20);
    const searchParams = useSearchParams();
    const pressureEnabled = searchParams.get("pressure") === "true";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">Smart Adaptive Tests</h1>
                <p className="text-muted-foreground">
                    Testlar savollar bazasidan avtomatik olinadi. Faqat savollar sonini tanlang.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
                <span className="text-sm font-medium text-muted-foreground mr-2">Question count:</span>
                {[20, 30, 40, 50].map((count) => (
                    <Button
                        key={count}
                        type="button"
                        variant={questionCount === count ? "default" : "outline"}
                        onClick={() => setQuestionCount(count)}
                    >
                        {count}
                    </Button>
                ))}
            </div>

            <Card className="border-border shadow-sm">
                <CardHeader>
                    <CardTitle>Adaptive Session</CardTitle>
                    <CardDescription>
                        Savollar kategoriyalar bo&apos;yicha teng taqsimlanadi va foydalanuvchi holatiga mos tanlanadi.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                        Tanlangan savollar soni: <strong>{questionCount}</strong>
                    </div>
                    <Button asChild>
                        <Link href={`/tests/adaptive?count=${questionCount}${pressureEnabled ? "&pressure=true" : ""}`}>
                            Start Smart Test
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
