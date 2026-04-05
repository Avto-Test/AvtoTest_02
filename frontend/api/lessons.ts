import type { LessonsFeedResponse } from "@/types/lesson";

import { apiRequest } from "@/api/client";

export function getLessonsFeed() {
  return apiRequest<LessonsFeedResponse>("/lessons", { method: "GET" });
}
