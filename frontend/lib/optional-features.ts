function isEnabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export const demoFixturesEnabled = isEnabled(process.env.NEXT_PUBLIC_ENABLE_DEMO_FIXTURES);

export const backendOptionalApiFeatures = {
  achievements: isEnabled(process.env.NEXT_PUBLIC_ENABLE_ACHIEVEMENTS),
  coins: isEnabled(process.env.NEXT_PUBLIC_ENABLE_COINS),
  leaderboard: isEnabled(process.env.NEXT_PUBLIC_ENABLE_LEADERBOARD),
  xp: isEnabled(process.env.NEXT_PUBLIC_ENABLE_XP),
} as const;

export const optionalApiFeatures = {
  achievements: backendOptionalApiFeatures.achievements || demoFixturesEnabled,
  coins: backendOptionalApiFeatures.coins || demoFixturesEnabled,
  leaderboard: backendOptionalApiFeatures.leaderboard || demoFixturesEnabled,
  xp: backendOptionalApiFeatures.xp || demoFixturesEnabled,
  demoFixtures: demoFixturesEnabled,
} as const;
