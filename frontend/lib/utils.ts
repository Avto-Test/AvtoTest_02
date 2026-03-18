import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Noma'lum";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Noma'lum";
  }

  return date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "Hozir";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `${diffMinutes} daqiqa oldin`;
  }
  if (diffHours < 24) {
    return `${diffHours} soat oldin`;
  }
  if (diffDays < 7) {
    return `${diffDays} kun oldin`;
  }

  return formatDate(value);
}

export function formatCurrency(value: number | null | undefined, currency = "UZS") {
  if (value == null || Number.isNaN(value)) {
    return "Noma'lum";
  }

  return new Intl.NumberFormat("uz-UZ", {
    maximumFractionDigits: 0,
    style: "currency",
    currency,
  }).format(value / 100);
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
