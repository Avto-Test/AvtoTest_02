import type { Metadata } from "next";

import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "O'zbekistondagi avtomaktablar katalogi",
  description:
    "Shahar, viloyat, narx va reyting bo'yicha avtomaktablarni toping. AUTOTEST katalogida haydovchilik kurslari va hamkor avtomaktablar jamlangan.",
  path: "/driving-schools",
  keywords: [
    "avtomaktablar",
    "haydovchilik kurslari",
    "driving school uzbekistan",
    "toshkent avtomaktab",
  ],
});

export default function DrivingSchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
