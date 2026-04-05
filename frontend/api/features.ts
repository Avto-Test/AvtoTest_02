import { apiRequest } from "@/api/client";
import type { PlatformFeature, UpdatePlatformFeaturePayload } from "@/types/feature";

const FEATURES_CACHE_TTL_MS = 15_000;

let featuresCache: { data: PlatformFeature[]; expiresAt: number } | null = null;
let featuresInflight: Promise<PlatformFeature[]> | null = null;

export function invalidatePlatformFeaturesCache() {
  featuresCache = null;
}

export async function getPlatformFeatures(options: { force?: boolean } = {}) {
  const force = options.force ?? false;
  const now = Date.now();

  if (!force && featuresCache && now < featuresCache.expiresAt) {
    return featuresCache.data;
  }

  if (!force && featuresInflight) {
    return featuresInflight;
  }

  const request = apiRequest<PlatformFeature[]>("/features", { method: "GET" }).then((data) => {
    featuresCache = {
      data,
      expiresAt: Date.now() + FEATURES_CACHE_TTL_MS,
    };
    return data;
  });

  featuresInflight = request;

  try {
    return await request;
  } finally {
    featuresInflight = null;
  }
}

export async function updatePlatformFeature(featureId: string, payload: UpdatePlatformFeaturePayload) {
  const feature = await apiRequest<PlatformFeature>(`/features/${featureId}`, {
    method: "PATCH",
    body: payload,
  });

  invalidatePlatformFeaturesCache();
  return feature;
}
