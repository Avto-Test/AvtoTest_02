const ABSOLUTE_HTTP_URL_REGEX = /^https?:\/\//i;

function getPublicOrigin(): string | null {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof appUrl !== "string" || appUrl.trim().length === 0) {
    return null;
  }

  try {
    return new URL(appUrl).origin;
  } catch {
    return null;
  }
}

export function resolvePublicMediaUrl(
  value: string | null | undefined
): string | null {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) {
    return null;
  }

  if (!ABSOLUTE_HTTP_URL_REGEX.test(rawValue)) {
    return rawValue;
  }

  try {
    const parsedUrl = new URL(rawValue);
    if (parsedUrl.protocol !== "http:" || !parsedUrl.pathname.startsWith("/uploads/")) {
      return parsedUrl.toString();
    }

    const publicOrigin = getPublicOrigin();
    if (!publicOrigin) {
      return parsedUrl.toString();
    }

    return `${publicOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return rawValue;
  }
}
