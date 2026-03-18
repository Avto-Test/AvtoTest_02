"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return (
      <div className="theme-switch theme-switch-loading" aria-hidden="true">
        <span className="theme-switch-slider" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("theme-switch", isDark && "theme-switch-checked")}
      aria-label={isDark ? "Light mode ga o'tish" : "Dark mode ga o'tish"}
      aria-checked={isDark}
      role="switch"
      type="button"
    >
      <span className="theme-switch-slider" aria-hidden="true" />
    </button>
  );
}
