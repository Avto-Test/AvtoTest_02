import { formatStatusLabel, statusTone } from "@/types/statuses";

export function sortByCreatedAt<T extends { created_at?: string | null }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function formatAdminStatus(value: string | null | undefined) {
  return formatStatusLabel(value);
}

export function statusVariant(status: string | null | undefined): "muted" | "warning" | "success" | "danger" {
  return statusTone(status);
}

export function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toRequiredNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? new Date(trimmed).toISOString() : null;
}
