import type { Metadata } from "next";

import { LandingPage } from "@/landing/landing-page";

export const metadata: Metadata = {
  title: "AUTOTEST | Aqlli haydovchilik tayyorgarligi",
  description:
    "AUTOTEST yordamida haydovchilik nazariyasi, AI tahlil, interaktiv demo va imtihon tayyorgarligini bitta professional platformada boshlang.",
};

export default function HomePage() {
  return <LandingPage />;
}
