import { CheckCircle2 } from "lucide-react";

import { LinkButton } from "@/landing/link-button";

const benefits = ["Bepul boshlash", "Karta talab qilinmaydi", "Darhol foydalanish"];

export function CTASection() {
  return (
    <section className="landing-section landing-section-surface landing-glow-blue relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-background to-background" />
      <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-20 left-1/3 h-[200px] w-[400px] rounded-full bg-accent/10 blur-3xl" />

      <div className="landing-container relative z-10 px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium text-primary">Hoziroq boshlang</span>
        </div>

        <h2 className="mb-6 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          Haydovchilik testlariga tayyorlanishni boshlang
        </h2>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          10,000+ haydovchilar qatoriga qo&apos;shiling va birinchi urinishda testdan o&apos;tishga yaqinlashing.
        </p>

        <div className="mb-10 flex flex-wrap justify-center gap-6">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {benefit}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <LinkButton
            href="/register"
            size="lg"
            className="landing-button-primary h-14 rounded-full px-10 text-lg font-medium"
          >
            Bepul boshlash
          </LinkButton>
          <LinkButton
            href="/login"
            variant="outline"
            size="lg"
            className="landing-button-secondary h-14 rounded-full px-10 text-lg font-medium"
          >
            Kirish
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
