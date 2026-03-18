import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy | AUTOTEST",
    description: "Privacy commitment and data handling principles for AUTOTEST.",
};

export default function PrivacyPage() {
    return (
        <section className="py-16 sm:py-20">
            <div className="container-app max-w-3xl space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    AUTOTEST processes account, assessment, and performance data to deliver exam intelligence,
                    adaptive practice, and platform analytics. We do not sell personal data.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Access is restricted to authenticated users and authorized administrators. If you need account
                    data export or deletion support, contact us at support@autotest.ai.
                </p>
            </div>
        </section>
    );
}
