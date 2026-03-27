"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Car, FileText } from "lucide-react";

import { getIntroVideoSetting } from "@/api/settings";
import { LinkButton } from "@/landing/link-button";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";

const navItems = [
  { href: "#demo", label: "Demo", icon: FileText },
  { href: "#features", label: "Xususiyatlar" },
  { href: "#how-it-works", label: "Qanday ishlaydi?" },
  { href: "#b2b", label: "Tashkilotlar uchun", icon: Building2, iconClassName: "text-primary" },
  { href: "#testimonials", label: "Fikrlar" },
];

export function LandingHeader() {
  const [introVideoOpen, setIntroVideoOpen] = useState(false);
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [introVideoLoading, setIntroVideoLoading] = useState(false);

  const openIntroVideoModal = async () => {
    setIntroVideoOpen(true);
    setIntroVideoLoading(true);
    try {
      const response = await getIntroVideoSetting();
      setIntroVideoUrl(response.intro_video_url ?? null);
    } catch {
      setIntroVideoUrl(null);
    } finally {
      setIntroVideoLoading(false);
    }
  };

  return (
    <>
      <header className="landing-navbar-glass fixed inset-x-0 top-0 z-50 border-b">
        <div className="landing-container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block text-lg font-bold tracking-tight text-foreground">AUTOTEST</span>
              <span className="hidden text-[11px] uppercase tracking-[0.24em] text-muted-foreground sm:block">
                AI Driving Prep
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {Icon ? (
                    <Icon
                      className={`h-4 w-4 transition-transform group-hover:scale-110 ${item.iconClassName ?? "text-primary"}`}
                    />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="group relative h-8 overflow-hidden rounded-full border border-[rgba(89,216,196,0.42)] bg-[rgba(10,12,14,0.92)] px-0 text-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.84)] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-[550ms] [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)] hover:border-[rgba(168,255,240,0.5)] before:absolute before:inset-y-0 before:right-0 before:w-full before:rounded-full before:bg-[conic-gradient(from_180deg_at_74%_50%,transparent_0_240deg,rgba(236,255,251,0.24)_240deg_302deg,transparent_302deg_360deg),linear-gradient(114deg,rgba(70,214,186,0.98)_0%,rgba(18,125,132,0.95)_100%)] before:bg-[length:64%_100%,100%_100%] before:bg-[position:100%_0,0_0] before:bg-no-repeat before:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] before:transition-[width,border-radius,background-position,filter] before:duration-[550ms] before:[transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)] before:content-[''] hover:before:w-[28%] hover:before:brightness-110"
              onClick={() => void openIntroVideoModal()}
            >
              <span className="relative z-10 inline-flex min-w-[6.85rem] items-center justify-center px-3.5">
                <span
                  className="text-[0.84rem] font-medium lowercase tracking-[0.01em] text-white mix-blend-screen transition-transform duration-[550ms] [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)] group-hover:-translate-x-[0.45rem]"
                >
                  about
                </span>
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-[0.95rem] top-1/2 z-20 h-3 w-3 -translate-y-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(228,255,247,0.26))] opacity-82 shadow-[0_0_14px_rgba(255,255,255,0.12)] transition-all duration-[550ms] [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)] [clip-path:polygon(16%_10%,90%_50%,16%_90%)] group-hover:right-[0.76rem] group-hover:opacity-96"
              />
            </Button>
            <LinkButton
              href="/login"
              size="sm"
              className="landing-button-success hidden h-8 rounded-full px-3.5 sm:inline-flex"
            >
              Kirish
            </LinkButton>
            <Link
              href="/register"
              className="hidden text-sm font-medium text-foreground/88 transition-colors hover:text-foreground lg:inline-flex"
            >
              Ro&apos;yxatdan o&apos;tish
            </Link>
          </div>
        </div>
      </header>

      <Modal open={introVideoOpen} onClose={() => setIntroVideoOpen(false)} title="About">
        {introVideoLoading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-[var(--muted-foreground)]">
            Yuklanmoqda...
          </div>
        ) : introVideoUrl ? (
          <video controls className="w-full" src={introVideoUrl}>
            Brauzer video playerni qo&apos;llab-quvvatlamaydi.
          </video>
        ) : (
          <div className="flex min-h-48 items-center justify-center text-sm text-[var(--muted-foreground)]">
            Video mavjud emas
          </div>
        )}
      </Modal>
    </>
  );
}
