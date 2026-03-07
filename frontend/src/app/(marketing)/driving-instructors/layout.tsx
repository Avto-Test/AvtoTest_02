import type { Metadata } from "next";

import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Haydovchilik instruktorlari katalogi",
  description:
    "AUTOTEST orqali tajribali haydovchilik instruktorlarini toping. Shahar, avtomat yoki mexanika, narx va reyting bo'yicha qidiring.",
  path: "/driving-instructors",
  keywords: [
    "haydovchilik instruktorlari",
    "driving instructor uzbekistan",
    "avto instruktor",
    "toshkent instruktor",
  ],
});

export default function DrivingInstructorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
