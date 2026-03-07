import type { Metadata } from "next";

import type { DrivingSchoolDetail } from "@/schemas/drivingSchool.schema";
import { buildSeoMetadata, fetchPublicSeoJson } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: LayoutProps
): Promise<Metadata> {
  const { slug } = await params;
  const school = await fetchPublicSeoJson<DrivingSchoolDetail>(
    `/api/driving-schools/${encodeURIComponent(slug)}`
  );

  if (!school) {
    return buildSeoMetadata({
      title: "Avtomaktab profili",
      description:
        "AUTOTEST katalogidagi avtomaktab profili va kurs ma'lumotlari.",
      path: `/driving-schools/${slug}`,
    });
  }

  const location = [school.city, school.region].filter(Boolean).join(", ");
  const summary =
    school.short_description ||
    school.full_description ||
    `${school.name} avtomaktabi haqida ma'lumot, narxlar va kurs tafsilotlari.`;
  const categories = school.courses
    .map((course) => course.category_code)
    .filter(Boolean);

  return buildSeoMetadata({
    title: `${school.name} avtomaktabi${location ? ` - ${location}` : ""}`,
    description: summary.slice(0, 160),
    path: `/driving-schools/${school.slug}`,
    keywords: [
      school.name,
      school.city,
      ...(school.region ? [school.region] : []),
      ...categories,
      "avtomaktab",
    ],
  });
}

export default function DrivingSchoolDetailLayout({
  children,
}: LayoutProps) {
  return children;
}
