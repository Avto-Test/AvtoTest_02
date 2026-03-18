"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, BarChart3, Bot, Car, Check, Gamepad2 } from "lucide-react";

import { LinkButton } from "@/landing/link-button";
import { cn } from "@/lib/utils";

const features = [
  {
    id: "scenes",
    icon: Car,
    label: "Real vaziyatlar",
    title: "Haqiqiy yo'l vaziyatlari",
    description:
      "Turli ob-havo sharoitlari, kundalik vaziyatlar va murakkab holatlarda mashq qiling. Har bir savol real hayotdan olingan.",
    benefits: ["Yomg'ir, qor, tuman sharoitlari", "Shahar va trassada haydash", "Favqulodda vaziyatlar"],
    image: "/assets/landing/rainy-driving.jpg",
  },
  {
    id: "ai",
    icon: Bot,
    label: "AI Coach",
    title: "Sun'iy intellekt murabbiy",
    description:
      "Har bir xato javobda AI murabbiy nima uchun bu javob noto'g'ri ekanini va to'g'ri qoidani batafsil tushuntiradi.",
    benefits: ["Har bir javob uchun tushuntirish", "Qoidalarni amalda qo'llash", "Shaxsiy tavsiyalar"],
    image: "/assets/landing/ai-coach-preview.jpg",
  },
  {
    id: "gamification",
    icon: Gamepad2,
    label: "Gamifikatsiya",
    title: "O'yin elementlari",
    description:
      "XP to'plang, darajangizni oshiring va tangalar yutib oling. O'rganishni qiziqarli va motivatsion qiling.",
    benefits: ["XP va daraja tizimi", "Kundalik mukofotlar", "Yutuqlar va badgelar"],
    image: "/assets/landing/gamification-preview.jpg",
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Tahlil",
    title: "Progress analytics",
    description:
      "O'sishingizni real vaqtda kuzating. Kuchli va zaif tomonlaringizni aniqlang va samarali tayyorlaning.",
    benefits: ["Batafsil statistika", "Mavzular bo'yicha tahlil", "O'sish grafiklari"],
    image: "/assets/landing/analytics-preview.jpg",
  },
];

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState("scenes");
  const currentFeature = features.find((feature) => feature.id === activeFeature) ?? features[0];

  return (
    <section id="features" className="landing-section landing-section-surface landing-glow-blue scroll-mt-24">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">AUTOTEST nimalardan iborat?</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">Zamonaviy o&apos;quv platformasining asosiy imkoniyatlari</p>
        </div>

        <div className="mb-12 flex flex-wrap justify-center gap-2">
          {features.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveFeature(feature.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300",
                activeFeature === feature.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              <feature.icon className="h-4 w-4" />
              {feature.label}
            </button>
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <currentFeature.icon className="h-7 w-7 text-primary" />
            </div>

            <h3 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">{currentFeature.title}</h3>
            <p className="mb-6 text-lg leading-relaxed text-muted-foreground">{currentFeature.description}</p>

            <ul className="mb-8 space-y-3">
              {currentFeature.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <LinkButton href="#demo" className="landing-button-primary group rounded-full">
              Sinab ko&apos;rish
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LinkButton>
          </div>

          <div className="order-1 lg:order-2">
            <div className="landing-panel group relative aspect-video overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
              <Image src={currentFeature.image} alt={currentFeature.label} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 rounded-lg border border-border/50 bg-background/80 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-sm font-medium text-foreground">{currentFeature.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
