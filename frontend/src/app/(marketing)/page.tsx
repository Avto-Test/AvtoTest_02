import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
    LandingCtaFooter,
    LandingDifferentiation,
    LandingFeatures,
    LandingHero,
    LandingHowItWorks,
    LandingProductPreview,
    LandingPricing,
    LandingSocialProof,
} from "@/components/marketing/landing";

export const metadata: Metadata = {
    title: "AUTOTEST | Imtihon uchun AI-intellekt platformasi",
    description:
        "Haydovchilik imtihoniga tayyorgarlikni aniq signal, barqarorlik kuzatuvi va aqlli tavsiyalar bilan boshqaring.",
};

export default async function HomePage() {
    const cookieStore = await cookies();
    const isAuthenticated = Boolean(cookieStore.get("access_token")?.value);

    return (
        <div>
            <LandingHero isAuthenticated={isAuthenticated} />
            <LandingSocialProof />
            <LandingDifferentiation />
            <LandingFeatures />
            <LandingProductPreview />
            <LandingHowItWorks />
            <LandingPricing isAuthenticated={isAuthenticated} />
            <LandingCtaFooter isAuthenticated={isAuthenticated} />
        </div>
    );
}
