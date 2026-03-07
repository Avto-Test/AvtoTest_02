import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://auto-drive.online";
const DEFAULT_SITE_NAME = "AUTOTEST";
const DEFAULT_DESCRIPTION =
  "AUTOTEST yordamida haydovchilik imtihoniga tayyorlaning: online testlar, premium tahlil, avtomaktablar va instruktorlar katalogi.";

const DEFAULT_KEYWORDS = [
  "AUTOTEST",
  "haydovchilik imtihoni",
  "yo'l harakati qoidalari",
  "online test",
  "avto test",
  "davlat imtihoni",
  "avtomaktab",
  "haydovchilik kurslari",
  "driving school uzbekistan",
  "driving instructor uzbekistan",
];

function normalizeUrl(value: string | undefined | null, fallback: string): string {
  if (!value || !value.trim()) {
    return fallback;
  }

  try {
    return new URL(value).toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

export function getSiteUrl(): string {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_SITE_URL);
}

export function getBackendSeoApiUrl(): string {
  return normalizeUrl(
    process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
    "http://127.0.0.1:8000"
  );
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function buildSeoMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  keywords = [],
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(path);
  const mergedKeywords = Array.from(new Set([...DEFAULT_KEYWORDS, ...keywords]));

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: DEFAULT_SITE_NAME,
      locale: "uz_UZ",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export async function fetchPublicSeoJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getBackendSeoApiUrl()}${path}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

