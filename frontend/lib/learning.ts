import type { DashboardAnalytics } from "@/types/analytics";
import type { AttemptResult, PublicQuestion } from "@/types/test";

export type TopicMasteryState = "weak" | "improving" | "stable" | "mastered";

export type LearningPathTopicDefinition = {
  topic: string;
  description: string;
  aliases: string[];
};

export type LearningPathTopicProgress = LearningPathTopicDefinition & {
  accuracy: number;
  mastery: number;
  retention: number;
  score: number;
  state: TopicMasteryState;
};

export const LEARNING_PATH_TOPICS: LearningPathTopicDefinition[] = [
  {
    topic: "Yo'l belgilari",
    description: "Belgilarni tez tanish va yo'lda to'g'ri qaror qabul qilish.",
    aliases: ["yo'l belgilari", "yol belgilari", "belgilar"],
  },
  {
    topic: "Yo'l chiziqlari",
    description: "Chiziqlar va qatordagi tartibni aniq tushunish.",
    aliases: ["yo'l chiziqlari", "yol chiziqlari", "chiziqlar"],
  },
  {
    topic: "Chorrahalar",
    description: "Chorrahalarda ustuvorlik va xavfsiz qaror qabul qilish.",
    aliases: ["chorrahalar", "chorraha", "ustuvorlik", "yo'l ustuvorligi", "yol ustuvorligi"],
  },
  {
    topic: "Yo'l harakati qoidalari",
    description: "Asosiy qoidalar, ustuvorlik va xavfsiz harakat tamoyillari.",
    aliases: ["yo'l harakati qoidalari", "yol harakati qoidalari", "yo'l qoidalari", "qoidalar", "qoida"],
  },
  {
    topic: "Haydovchi madaniyati",
    description: "Mas'uliyatli, sokin va hurmatli haydovchilik odatlari.",
    aliases: ["haydovchi madaniyati", "madaniyat"],
  },
  {
    topic: "Transport boshqaruvi",
    description: "Avtomobilni boshqarish, manevr va holatni nazorat qilish.",
    aliases: ["transport boshqaruvi", "boshqaruv", "manevr", "transport", "parkovka", "burilish qoidalari", "burilish"],
  },
  {
    topic: "Yo'l xavfsizligi",
    description: "Xatarni oldindan ko'rish va xavfsiz yechim topish.",
    aliases: ["yo'l xavfsizligi", "yol xavfsizligi", "xavfsizlik", "xavfsiz haydash", "masofa saqlash", "tezlik rejimi", "qorong'ida haydash", "favqulodda vaziyat"],
  },
];

export const PRIMARY_TOPIC_VISUALIZATION_TOPICS = [
  "Yo'l belgilari",
  "Chorrahalar",
  "Yo'l chiziqlari",
  "Haydovchi madaniyati",
  "Transport boshqaruvi",
  "Yo'l harakati qoidalari",
  "Yo'l xavfsizligi",
] as const;

function normalizeTopic(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function resolveTopicAliases(topic: string) {
  const normalizedTopic = normalizeTopic(topic);
  const definition = LEARNING_PATH_TOPICS.find((item) => normalizeTopic(item.topic) === normalizedTopic);
  const aliases = [normalizedTopic, ...(definition?.aliases ?? []).map((item) => normalizeTopic(item))];
  return [...new Set(aliases.filter(Boolean))];
}

function topicMatches(candidate: string, aliases: string[]) {
  const normalizedCandidate = normalizeTopic(candidate);
  if (!normalizedCandidate) {
    return false;
  }
  return aliases.some(
    (alias) =>
      Boolean(alias) &&
      (
        normalizedCandidate === alias ||
        normalizedCandidate.includes(alias) ||
        alias.includes(normalizedCandidate)
      ),
  );
}

function findTopicMetric<T extends { topic: string }>(items: T[], topic: string) {
  const aliases = resolveTopicAliases(topic);
  return items.find((item) => topicMatches(item.topic, aliases)) ?? null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getLearningPathTopicDescription(topic: string) {
  return (
    LEARNING_PATH_TOPICS.find((item) => topicMatches(item.topic, resolveTopicAliases(topic)))?.description ??
    "Bu mavzu bo'yicha bilimni mustahkamlash uchun dars va mashqlar tavsiya etiladi."
  );
}

export function buildLearningPathTopicProgress(
  dashboard: DashboardAnalytics,
): LearningPathTopicProgress[] {
  return LEARNING_PATH_TOPICS.map((definition) => {
    const accuracyMetric = findTopicMetric(dashboard.topic_breakdown, definition.topic);
    const masteryMetric = findTopicMetric(dashboard.knowledge_mastery, definition.topic);
    const retentionMetric = findTopicMetric(dashboard.retention_vector, definition.topic);

    const accuracy = clampPercent(accuracyMetric?.accuracy ?? 0);
    const mastery = clampPercent(masteryMetric?.probability ?? accuracy);
    const retentionBase =
      retentionMetric?.retention ??
      (masteryMetric?.probability != null
        ? Math.max(0, Math.min(1, masteryMetric.probability / 100))
        : Math.max(0, Math.min(1, accuracy / 100)));
    const retention = clampPercent(retentionBase * 100);
    const score = clampPercent((accuracy * 0.4) + (mastery * 0.4) + (retention * 0.2));

    return {
      ...definition,
      accuracy,
      mastery,
      retention,
      score,
      state: resolveTopicMasteryState(definition.topic, dashboard),
    };
  });
}

export function resolveTopicMasteryState(topic: string, dashboard: DashboardAnalytics): TopicMasteryState {
  const accuracy = findTopicMetric(dashboard.topic_breakdown, topic)?.accuracy ?? null;
  const mastery = findTopicMetric(dashboard.knowledge_mastery, topic)?.probability ?? null;
  const retention = findTopicMetric(dashboard.retention_vector, topic)?.retention ?? null;

  if (accuracy === null && mastery === null && retention === null) {
    return "weak";
  }

  if (
    (accuracy !== null && accuracy < 70) ||
    (mastery !== null && mastery < 70) ||
    (retention !== null && retention < 0.7)
  ) {
    return "weak";
  }

  if (
    (accuracy !== null && accuracy >= 95) &&
    (mastery === null || mastery >= 95) &&
    (retention === null || retention >= 0.95)
  ) {
    return "mastered";
  }

  if (
    (accuracy !== null && accuracy >= 85) &&
    (mastery === null || mastery >= 85) &&
    (retention === null || retention >= 0.85)
  ) {
    return "stable";
  }

  return "improving";
}

export function resolveAttemptTopicState(topic: string, result: AttemptResult): TopicMasteryState {
  const normalizedTopic = normalizeTopic(topic);
  const stabilityEntry = Object.entries(result.topic_stability ?? {}).find(
    ([key]) => normalizeTopic(key) === normalizedTopic,
  );
  const stabilityValue = stabilityEntry?.[1]?.toLowerCase() ?? "";

  if (stabilityValue.includes("stable")) {
    return "stable";
  }
  if (stabilityValue.includes("improv") || stabilityValue.includes("recover")) {
    return "improving";
  }
  if (stabilityValue) {
    return "weak";
  }

  if ((result.fading_topics ?? []).some((item) => normalizeTopic(item) === normalizedTopic)) {
    return "weak";
  }

  return result.passed ? "stable" : "improving";
}

export function masteryStateMeta(state: TopicMasteryState) {
  if (state === "mastered") {
    return {
      label: "PERFECT",
      badgeVariant: "success" as const,
      description: "95%+ daraja. Bonus reward ochiladi va mavzu mukammal holatda.",
    };
  }

  if (state === "stable") {
    return {
      label: "GOOD",
      badgeVariant: "success" as const,
      description: "85%+ daraja. Bu tavsiya etilgan mustahkam holat.",
    };
  }

  if (state === "improving") {
    return {
      label: "PASS",
      badgeVariant: "outline" as const,
      description: "70%+ daraja. Keyingi bosqich ochiladi, lekin reward uchun yana oshirish foydali.",
    };
  }

  return {
    label: "Zaif",
    badgeVariant: "warning" as const,
    description: "70% gacha yetkazish kerak. Hozir eng ko'p e'tibor talab qilayotgan mavzu.",
  };
}

export function deriveWeakestTopicFromResult(result: AttemptResult, questions: PublicQuestion[]) {
  if (result.fading_topics?.length) {
    return result.fading_topics[0] ?? null;
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const wrongTopicCounts = new Map<string, number>();

  for (const answer of result.answers) {
    if (answer.is_correct) {
      continue;
    }

    const question = questionMap.get(answer.question_id);
    const topic = question?.topic ?? question?.category ?? null;
    if (!topic) {
      continue;
    }

    wrongTopicCounts.set(topic, (wrongTopicCounts.get(topic) ?? 0) + 1);
  }

  const rankedTopics = [...wrongTopicCounts.entries()].sort((left, right) => right[1] - left[1]);
  return rankedTopics[0]?.[0] ?? null;
}
