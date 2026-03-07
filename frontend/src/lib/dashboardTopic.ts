export function normalizeTopicKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['`"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function topicsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) {
    return false;
  }

  return normalizeTopicKey(a) === normalizeTopicKey(b);
}

export function truncateTopicLabel(label: string, maxLength: number): string {
  return label.length <= maxLength ? label : `${label.slice(0, maxLength)}...`;
}
