import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
    LandingAudience,
    LandingCtaFooter,
    LandingDifferentiation,
    LandingFaq,
    LandingFeatures,
    LandingHero,
    LandingHowItWorks,
    LandingProductPreview,
    LandingPricing,
    LandingSocialProof,
} from "@/components/marketing/landing";
import { absoluteUrl, buildSeoMetadata, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
    title: "AUTOTEST | Haydovchilik imtihoni uchun online test platformasi",
    description:
        "Haydovchilik imtihoniga tayyorgarlikni AUTOTEST bilan boshlang: online testlar, AI asosidagi tahlil, premium reja va avtomaktablar katalogi.",
    path: "/",
    keywords: [
        "haydovchilik imtihoni testlari",
        "online avto test",
        "yo'l qoidalari test",
        "premium test analytics",
        "uzbekistan driving test",
    ],
});

export default async function HomePage() {
    const cookieStore = await cookies();
    const isAuthenticated = Boolean(cookieStore.get("access_token")?.value);
    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AUTOTEST",
        url: getSiteUrl(),
        inLanguage: "uz",
        potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/driving-schools")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };
    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "AUTOTEST",
        url: getSiteUrl(),
        logo: absoluteUrl("/favicon.ico"),
        sameAs: [getSiteUrl()],
    };

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <LandingHero isAuthenticated={isAuthenticated} />
            <LandingSocialProof />
            <LandingDifferentiation />
            <LandingFeatures />
            <LandingProductPreview />
            <LandingAudience />
            <LandingHowItWorks />
            <LandingPricing isAuthenticated={isAuthenticated} />
            <LandingFaq />
            <LandingCtaFooter isAuthenticated={isAuthenticated} />
        </div>
    );
}
