"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ProgressProvider } from "@/components/providers/progress-provider";
import { AchievementUnlockStack } from "@/components/rewards/achievement-unlock-stack";
import { ShellUiProvider } from "@/components/shell-ui-context";
import { AppTopbar } from "@/components/app-topbar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  return (
    <div className="page-shell min-h-screen overflow-x-hidden">
      {!focusMode ? <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} /> : null}
      <div
        className={cn(
          "min-h-screen min-w-0",
          focusMode ? "assessment-focus" : "bg-[var(--content-bg)] lg:pl-64",
        )}
      >
        <ShellUiProvider value={{ setFocusMode }}>
          <ProgressProvider>
            {!focusMode ? <AppTopbar onMenuToggle={() => setMobileOpen((value) => !value)} /> : null}
            {!focusMode ? <AchievementUnlockStack /> : null}
            <main
              className={cn(
                "min-w-0",
                focusMode ? "px-0 py-0" : "px-4 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-8",
              )}
            >
              {children}
            </main>
          </ProgressProvider>
        </ShellUiProvider>
      </div>
    </div>
  );
}
