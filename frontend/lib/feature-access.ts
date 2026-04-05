"use client";

import type { PlatformFeature } from "@/types/feature";
import type { User } from "@/types/user";

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeRolloutPercentage(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.trunc(value), 100));
}

function resolveRolloutBucket(user: User | null | undefined, feature: PlatformFeature | null | undefined) {
  if (!user || !feature) {
    return null;
  }

  const rolloutPercentage = normalizeRolloutPercentage(feature.rollout_percentage);
  if (rolloutPercentage <= 0) {
    return null;
  }

  const seed = `${feature.experiment_group ?? feature.key}:${user.id}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash % 100;
}

export function hasActivePremiumSubscription(user: User | null | undefined, now = new Date()) {
  if (!user) {
    return false;
  }

  if (user.is_admin) {
    return true;
  }

  if (!user.is_premium) {
    return false;
  }

  const expiresAt = toDate(user.subscription_expires_at);
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() > now.getTime();
}

export function isFeatureTemporarilyOpen(feature: PlatformFeature | null | undefined, now = new Date()) {
  const enabledUntil = toDate(feature?.enabled_for_all_until);
  if (!enabledUntil) {
    return false;
  }

  return now.getTime() < enabledUntil.getTime();
}

export function hasFeatureAccess(
  user: User | null | undefined,
  feature: PlatformFeature | null | undefined,
  now = new Date(),
) {
  if (!feature) {
    return false;
  }

  if (typeof feature.has_access === "boolean") {
    return feature.has_access;
  }

  if (!feature.is_premium) {
    return true;
  }

  if (isFeatureTemporarilyOpen(feature, now)) {
    return true;
  }

  const rolloutBucket = resolveRolloutBucket(user, feature);
  if (rolloutBucket !== null && rolloutBucket < normalizeRolloutPercentage(feature.rollout_percentage)) {
    return true;
  }

  if ((feature.remaining_trial_uses ?? 0) > 0) {
    return true;
  }

  return hasActivePremiumSubscription(user, now);
}
