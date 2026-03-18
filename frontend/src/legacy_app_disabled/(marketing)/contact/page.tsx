import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Contact | AUTOTEST",
    description: "Contact AUTOTEST support and sales teams.",
};

export default function ContactPage() {
    return (
        <section className="py-16 sm:py-20">
            <div className="container-app max-w-3xl space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Need help with onboarding, billing, or product operations? Reach our team directly.
                </p>
                <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                        Support:{" "}
                        <Link href="mailto:support@autotest.ai" className="text-primary hover:underline">
                            support@autotest.ai
                        </Link>
                    </p>
                    <p className="text-muted-foreground">
                        Sales:{" "}
                        <Link href="mailto:sales@autotest.ai" className="text-primary hover:underline">
                            sales@autotest.ai
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}
