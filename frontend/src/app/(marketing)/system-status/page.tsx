import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "System Status | AUTOTEST",
    description: "Current AUTOTEST platform status.",
};

const checks = [
    { name: "Core API", status: "Operational" },
    { name: "Auth Service", status: "Operational" },
    { name: "Analytics Pipeline", status: "Operational" },
    { name: "Dashboard UI", status: "Operational" },
];

export default function SystemStatusPage() {
    return (
        <section className="py-16 sm:py-20">
            <div className="container-app max-w-3xl space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight">System Status</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Current platform health for core AUTOTEST services.
                </p>

                <div className="space-y-3">
                    {checks.map((check) => (
                        <div key={check.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                            <span className="text-sm text-foreground">{check.name}</span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-success">
                                <span className="size-1.5 rounded-full bg-success" />
                                {check.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
