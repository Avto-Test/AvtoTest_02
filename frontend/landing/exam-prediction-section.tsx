"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, Gauge, Shield, TrendingUp } from "lucide-react";

import { LinkButton } from "@/landing/link-button";

export function ExamPredictionSection() {
  const [animatedScore, setAnimatedScore] = useState(0);
  const targetScore = 82;

  useEffect(() => {
    let intervalId: number | null = null;

    const startTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setAnimatedScore((previousScore) => {
          if (previousScore >= targetScore) {
            if (intervalId !== null) {
              window.clearInterval(intervalId);
            }
            return targetScore;
          }
          return previousScore + 1;
        });
      }, 20);
    }, 500);

    return () => {
      window.clearTimeout(startTimer);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <section className="landing-section landing-section-surface landing-glow-green overflow-hidden">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2">
              <Gauge className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Imtihon bashorati</span>
            </div>

            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Imtihondan o&apos;tish ehtimolini bilib oling</h2>

            <p className="mb-8 text-lg text-muted-foreground">
              AUTOTEST barcha natijalaringizni tahlil qilib, haqiqiy imtihondan o&apos;tish ehtimolini bashorat qiladi.
              <span className="font-medium text-foreground"> Bu xususiyat faqat AUTOTEST ichida mavjud.</span>
            </p>

            <div className="mb-8 space-y-4">
              {[
                {
                  icon: Brain,
                  title: "Bilim darajasi tahlili",
                  description: "Barcha mavzular bo'yicha to'plangan ma'lumotlar.",
                },
                {
                  icon: TrendingUp,
                  title: "Progress tezligi",
                  description: "Qanchalik tez va barqaror o'rganayotganingiz.",
                },
                {
                  icon: Shield,
                  title: "Barqarorlik ko'rsatkichi",
                  description: "Natijalaringizning izchilligi va xatolar qaytalanishi.",
                },
              ].map((factor) => (
                <div key={factor.title} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <factor.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{factor.title}</h4>
                    <p className="text-sm text-muted-foreground">{factor.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <LinkButton
              href="/register"
              size="lg"
              className="landing-button-success rounded-full px-6"
            >
              Hisob ochib ko&apos;rish
            </LinkButton>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-green)_14%,transparent),color-mix(in_srgb,var(--accent-blue)_10%,transparent),transparent_72%)] blur-3xl opacity-70" />

            <div className="landing-panel relative rounded-2xl border border-border bg-card p-8">
              <div className="relative mx-auto mb-6 h-64 w-64">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#landingGaugeGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${animatedScore * 2.83} 283`}
                    className="transition-all duration-100"
                  />
                  <defs>
                    <linearGradient id="landingGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" style={{ stopColor: "var(--accent-green)" }} />
                      <stop offset="100%" style={{ stopColor: "var(--accent-blue)" }} />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-foreground">{animatedScore}%</span>
                  <span className="text-sm text-muted-foreground">O&apos;tish ehtimoli</span>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Imtihonga tayyor</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Qolgan zaif tomonlar
                </h4>
                <div className="space-y-2">
                  {[
                    { topic: "Texnik qoidalar", progress: 58 },
                    { topic: "Jarimalar", progress: 65 },
                  ].map((item) => (
                    <div key={item.topic} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.topic}</span>
                          <span className="text-destructive">{item.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-destructive" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Bu mavzular yaxshilansa, ehtimol 95%+ ga yetadi.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
