import type { Metadata } from "next";

import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "AUTOTEST Premium tariflari va narxlari",
  description:
    "AUTOTEST bepul va premium tariflarini solishtiring. Premium reja orqali cheksiz testlar, analytics va kengaytirilgan tayyorgarlik imkoniyatlarini oling.",
  path: "/pricing",
  keywords: [
    "AUTOTEST premium",
    "test tariflari",
    "online test narxlari",
    "premium obuna",
  ],
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
