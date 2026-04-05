"use client";

import { apiRequest } from "@/api/client";

export type IntroVideoSetting = {
  intro_video_url?: string | null;
};

export function getIntroVideoSetting() {
  return apiRequest<IntroVideoSetting>("/settings/intro-video", { method: "GET" });
}
