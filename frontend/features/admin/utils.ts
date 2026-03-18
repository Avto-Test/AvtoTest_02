export function sortByCreatedAt<T extends { created_at?: string | null }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function formatAdminStatus(value: string | null | undefined) {
  if (!value) {
    return "Noma'lum";
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function statusVariant(status: string | null | undefined): "outline" | "warning" | "success" {
  const normalized = (status ?? "").toLowerCase();
  if (["approved", "active", "verified", "completed", "resolved", "visible"].includes(normalized)) {
    return "success";
  }
  if (["pending", "new", "submitted", "review", "trialing"].includes(normalized)) {
    return "warning";
  }
  return "outline";
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
