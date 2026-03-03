import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms | AUTOTEST",
    description: "Terms of use for AUTOTEST.",
};

export default function TermsPage() {
    return (
        <section className="py-16 sm:py-20">
            <div className="container-app max-w-3xl space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    AUTOTEST provides exam preparation and analytics tools for educational purposes. Users are responsible
                    for maintaining account security and for all actions under their account.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Subscription plans and product capabilities may evolve. Continued use after updates indicates acceptance
                    of revised terms.
                </p>
            </div>
        </section>
    );
}
