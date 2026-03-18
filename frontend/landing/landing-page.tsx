import styles from "./landing-page.module.css";

import { AnalyticsSection } from "@/landing/analytics-section";
import { CTASection } from "@/landing/cta-section";
import { DemoSection } from "@/landing/demo-section";
import { ExamPredictionSection } from "@/landing/exam-prediction-section";
import { FeaturesSection } from "@/landing/features-section";
import { HeroSection } from "@/landing/hero-section";
import { HowItWorksSection } from "@/landing/how-it-works-section";
import { InstitutionsSection } from "@/landing/institutions-section";
import { LandingHeader } from "@/landing/landing-header";
import { ProblemSection } from "@/landing/problem-section";
import { SmartLearningSection } from "@/landing/smart-learning-section";
import { StatsSection } from "@/landing/stats-section";
import { TestimonialsSection } from "@/landing/testimonials-section";

export function LandingPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <LandingHeader />
        <main className="landing-main">
          <HeroSection />
          <ProblemSection />
          <HowItWorksSection />
          <SmartLearningSection />
          <AnalyticsSection />
          <ExamPredictionSection />
          <DemoSection />
          <FeaturesSection />
          <StatsSection />
          <InstitutionsSection />
          <TestimonialsSection />
          <CTASection />
        </main>
      </div>
    </div>
  );
}
