import type { MetadataRoute } from "next";

import type { DrivingInstructorCatalogResponse } from "@/schemas/drivingInstructor.schema";
import type { DrivingSchoolCatalogResponse } from "@/schemas/drivingSchool.schema";
import { absoluteUrl, fetchPublicSeoJson } from "@/lib/seo";

async function getDrivingSchoolUrls(): Promise<MetadataRoute.Sitemap> {
  const payload = await fetchPublicSeoJson<DrivingSchoolCatalogResponse>(
    "/api/driving-schools?limit=500&offset=0"
  );

  if (!payload?.items?.length) {
    return [];
  }

  return payload.items.map((school) => ({
    url: absoluteUrl(`/driving-schools/${school.slug}`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}

async function getDrivingInstructorUrls(): Promise<MetadataRoute.Sitemap> {
  const payload = await fetchPublicSeoJson<DrivingInstructorCatalogResponse>(
    "/api/driving-instructors?limit=500&offset=0"
  );

  if (!payload?.items?.length) {
    return [];
  }

  return payload.items.map((instructor) => ({
    url: absoluteUrl(`/driving-instructors/${instructor.slug}`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/pricing"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/practice-tests"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/driving-schools"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/driving-instructors"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/driving-schools/partner"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/driving-instructors/apply"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/privacy"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const [schoolUrls, instructorUrls] = await Promise.all([
    getDrivingSchoolUrls(),
    getDrivingInstructorUrls(),
  ]);

  return [...staticRoutes, ...schoolUrls, ...instructorUrls];
}
