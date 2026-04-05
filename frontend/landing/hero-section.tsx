import Image from "next/image";
import { BarChart3, Brain, CheckCircle2, Play, Sparkles, Target } from "lucide-react";

import { LinkButton } from "@/landing/link-button";

const benefits = [
  { icon: Brain, text: "Adaptiv AI o'qitish tizimi" },
  { icon: BarChart3, text: "Shaxsiy analitika va progress" },
  { icon: Target, text: "Imtihon muvaffaqiyati bashorati" },
];

export function HeroSection() {
  return (
    <section className="landing-section relative flex min-h-screen items-center overflow-hidden pt-18 sm:pt-20">
      <div className="absolute inset-0">
        <Image
          src="/assets/landing/hero-driver.jpg"
          alt="AUTOTEST bilan mashq qilayotgan haydovchi"
          fill
          priority
          className="landing-hero-image object-cover"
        />
        <div className="landing-hero-overlay absolute inset-0" />
        <div className="landing-hero-vignette absolute inset-0" />
      </div>

      <div className="landing-container relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[42rem]">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--marketing-text)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--marketing-bg)_45%,transparent)] px-4 py-2 backdrop-blur-xl">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-powered learning platform</span>
          </div>

          <h1 className="landing-hero-title mb-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
            <span className="mb-3 block text-2xl font-semibold text-foreground/78 sm:text-3xl">Haydovchilik testlariga</span>
            Aqlli tayyorgarlik
          </h1>

          <p className="landing-hero-lead mb-8 max-w-[38rem] text-lg leading-relaxed md:text-xl">
            AUTOTEST oddiy test bazasi emas. Bu sizning <span className="font-medium text-foreground">bilimlaringizni tahlil qiladigan</span>,
            zaif tomonlaringizni topadigan va <span className="font-medium text-foreground">imtihondan o&apos;tish ehtimolini bashorat qiladigan</span>{" "}
            sun&apos;iy intellekt platformasi.
          </p>

          <ul className="mb-10 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit.text} className="flex items-center gap-3 text-foreground/88">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--marketing-text)_10%,transparent)] bg-[color:color-mix(in_srgb,var(--marketing-bg)_28%,transparent)] backdrop-blur-sm">
                  <benefit.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-4">
            <LinkButton
              href="/register"
              size="lg"
              className="landing-button-primary h-12 rounded-full px-8 text-base font-medium"
            >
              Bepul boshlash
            </LinkButton>
            <LinkButton
              href="#demo"
              variant="outline"
              size="lg"
              className="landing-button-secondary h-12 rounded-full px-6 text-base font-medium"
            >
              <Play className="h-4 w-4" />
              Demo ko&apos;rish
            </LinkButton>
          </div>

          <div className="mt-12 flex items-center gap-4 text-sm text-[var(--marketing-text-secondary)]">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-medium text-[var(--accent-brand-contrast)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--marketing-text)_6%,transparent)]"
                >
                  {String.fromCharCode(64 + item)}
                </div>
              ))}
            </div>
            <div>
              <span className="font-medium text-foreground">10,000+</span> haydovchilar muvaffaqiyatli tayyorlandi
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-6 text-xs text-[color:color-mix(in_srgb,var(--marketing-text-secondary)_92%,transparent)]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>95% o&apos;tish ko&apos;rsatkichi</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Darhol demo sinovi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
