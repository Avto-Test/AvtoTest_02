import type { SimulationStatus } from "@/types/analytics";

export function formatSimulationCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} kun ${hours} soat`;
  }
  if (hours > 0) {
    return `${hours} soat ${minutes} daqiqa`;
  }
  if (minutes > 0) {
    return `${minutes} daqiqa`;
  }
  return "Hozir ochiq";
}

export function resolveSimulationTone(status: SimulationStatus | null | undefined) {
  if (status?.launch_ready) {
    return {
      ring: "from-emerald-400 via-lime-300 to-cyan-300",
      accent: "text-emerald-300",
      surface:
        "border-[color-mix(in_oklab,#34d399_28%,var(--border))] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,#34d399_18%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--sidebar)_96%,transparent))]",
    };
  }

  if (status && !status.cooldown_ready) {
    return {
      ring: "from-amber-300 via-orange-300 to-yellow-200",
      accent: "text-amber-300",
      surface:
        "border-[color-mix(in_oklab,#f59e0b_24%,var(--border))] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,#f59e0b_14%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--sidebar)_96%,transparent))]",
    };
  }

  return {
    ring: "from-sky-400 via-indigo-400 to-fuchsia-400",
    accent: "text-sky-300",
    surface:
      "border-[color-mix(in_oklab,var(--primary)_24%,var(--border))] bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--sidebar)_96%,transparent))]",
  };
}
