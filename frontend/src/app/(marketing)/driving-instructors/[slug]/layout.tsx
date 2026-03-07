import type { Metadata } from "next";

import type { DrivingInstructorDetail } from "@/schemas/drivingInstructor.schema";
import { buildSeoMetadata, fetchPublicSeoJson } from "@/lib/seo";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: LayoutProps
): Promise<Metadata> {
  const { slug } = await params;
  const instructor = await fetchPublicSeoJson<DrivingInstructorDetail>(
    `/api/driving-instructors/${encodeURIComponent(slug)}`
  );

  if (!instructor) {
    return buildSeoMetadata({
      title: "Haydovchilik instruktori profili",
      description:
        "AUTOTEST katalogidagi haydovchilik instruktori profili va dars ma'lumotlari.",
      path: `/driving-instructors/${slug}`,
    });
  }

  const location = [instructor.city, instructor.region].filter(Boolean).join(", ");
  const description = `${instructor.full_name} - ${instructor.years_experience} yillik tajribaga ega instruktori. ${instructor.short_bio}`.slice(
    0,
    160
  );

  return buildSeoMetadata({
    title: `${instructor.full_name} instruktori${location ? ` - ${location}` : ""}`,
    description,
    path: `/driving-instructors/${instructor.slug}`,
    keywords: [
      instructor.full_name,
      instructor.city,
      ...(instructor.region ? [instructor.region] : []),
      instructor.car_model,
      instructor.transmission,
      "haydovchilik instruktori",
    ],
  });
}

export default function DrivingInstructorDetailLayout({
  children,
}: LayoutProps) {
  return children;
}
