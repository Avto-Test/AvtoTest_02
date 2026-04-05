"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bot, Check, Clock, Sparkles, Target, X, Zap } from "lucide-react";

import { LinkButton } from "@/landing/link-button";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

const demoQuestion = {
  question: "Yomg'irli trassada tezlikni tanlashda asosiy mezon nima?",
  image: "/assets/landing/rainy-driving.jpg",
  options: [
    { id: "A", text: "Faqat avtomobil quvvatiga suyanish", correct: false },
    {
      id: "B",
      text: "Belgilangan limit va real ko'rinish sharoitiga mos xavfsiz tezlik hamda masofani tanlash",
      correct: true,
    },
    { id: "C", text: "Oldingi mashina tezligini ko'r-ko'rona takrorlash", correct: false },
    { id: "D", text: "Yo'l bo'sh bo'lsa limitni ikki marta oshirish", correct: false },
  ],
  explanation:
    "Xavfsiz tezlik tanlovi doimo ko'rinish sharoitlariga bog'liq. Yomg'irda to'xtash masofasi uzunroq bo'ladi, shuning uchun oldingi mashina bilan masofa oshirilishi kerak.",
};

type DemoState = "question" | "answered" | "explained";

export function DemoSection() {
  const [state, setState] = useState<DemoState>("question");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const explanationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (explanationTimerRef.current !== null) {
        window.clearTimeout(explanationTimerRef.current);
      }
    };
  }, []);

  const handleSelectAnswer = (id: string) => {
    if (state !== "question") {
      return;
    }

    setSelectedAnswer(id);
    setState("answered");

    explanationTimerRef.current = window.setTimeout(() => {
      setState("explained");
    }, 1500);
  };

  const handleReset = () => {
    if (explanationTimerRef.current !== null) {
      window.clearTimeout(explanationTimerRef.current);
    }
    setState("question");
    setSelectedAnswer(null);
  };

  const selectedOption = demoQuestion.options.find((option) => option.id === selectedAnswer);
  const isCorrect = selectedOption?.correct;

  return (
    <section id="demo" className="landing-section landing-section-muted landing-glow-blue scroll-mt-24 overflow-hidden">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Interaktiv demo</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Test ishlashni hoziroq sinab ko&apos;ring</h2>
            <p className="mb-6 text-lg text-muted-foreground">
              Haqiqiy savolni yeching va AI murabbiy qanday ishlashini ko&apos;ring. Platformani ro&apos;yxatdan o&apos;tmasdan ham
              his qilishingiz mumkin.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground">1000+ savollar</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <span className="text-muted-foreground">Real imtihon formati</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground">AI tushuntirishlar</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-transparent blur-2xl opacity-60" />
            <div className="landing-panel relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/50">
              <Image src="/assets/landing/practice-test.jpg" alt="AUTOTEST demo amaliyoti" fill className="object-cover brightness-[0.72]" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/90 px-4 py-3 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">AI Coach yordami</div>
                    <div className="text-xs text-muted-foreground">Har bir javobga tushuntirish</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="landing-panel overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-video lg:min-h-[400px] lg:aspect-auto">
                <Image src={demoQuestion.image} alt="Yomg'irli yo'l vaziyati" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent lg:bg-gradient-to-r" />
                <div className="absolute left-4 top-4">
                  <div className="rounded-full border border-border/50 bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm">
                    Demo savol
                  </div>
                </div>
              </div>

              <div className="p-6 lg:p-8">
                <h3 className="mb-6 text-lg font-semibold text-foreground">{demoQuestion.question}</h3>

                <div className="space-y-3">
                  {demoQuestion.options.map((option) => {
                    const isSelected = selectedAnswer === option.id;
                    const showResult = state !== "question";

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectAnswer(option.id)}
                        disabled={state !== "question"}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300",
                          state === "question" && "cursor-pointer border-border/50 bg-secondary/30 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5",
                          showResult && isSelected && option.correct && "border-primary bg-primary/10",
                          showResult && isSelected && !option.correct && "border-destructive bg-destructive/10",
                          showResult && !isSelected && option.correct && "border-primary/30 bg-primary/5",
                          showResult && !isSelected && !option.correct && "opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            state === "question" && "bg-secondary text-foreground",
                            showResult && option.correct && "bg-primary text-primary-foreground",
                            showResult && !option.correct && isSelected && "bg-destructive text-destructive-foreground",
                            showResult && !option.correct && !isSelected && "bg-secondary text-muted-foreground",
                          )}
                        >
                          {showResult && option.correct ? (
                            <Check className="h-4 w-4" />
                          ) : showResult && !option.correct && isSelected ? (
                            <X className="h-4 w-4" />
                          ) : (
                            option.id
                          )}
                        </span>
                        <span
                          className={cn(
                            "pt-0.5 text-sm",
                            showResult && option.correct && "font-medium text-foreground",
                            showResult && !option.correct && "text-muted-foreground",
                          )}
                        >
                          {option.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {state === "explained" ? (
              <div className="border-t border-border bg-gradient-to-r from-primary/5 to-transparent p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-semibold text-foreground">AI Coach</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          isCorrect ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive",
                        )}
                      >
                        {isCorrect ? "To'g'ri javob!" : "Xato javob"}
                      </span>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{demoQuestion.explanation}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border/50 pt-6">
                  <Button variant="outline" onClick={handleReset} className="rounded-full text-sm">
                    Qayta sinash
                  </Button>
                  <LinkButton href="/register" className="landing-button-primary rounded-full">
                    To&apos;liq platformani ochish
                  </LinkButton>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">Barcha 1000+ savollar va AI tahlil uchun hisob oching</p>
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton
                href="/register"
                variant="outline"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
              >
                Bepul boshlash
              </LinkButton>
              <LinkButton href="/login" className="landing-button-success rounded-full">
                Kirish
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
