"use client";

import { usePathname } from "next/navigation";
import GlobalAuthGate from "@/components/GlobalAuthGate";
import ProductShell from "@/components/shell/ProductShell";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isExamMode = pathname.includes("/tests/") && !pathname.includes("/result");
    const isStandaloneAuthPage =
        pathname.startsWith("/verify")
        || pathname.startsWith("/forgot-password")
        || pathname.startsWith("/reset-password");
    const isAdminRoute = pathname.startsWith("/admin");

    return (
        <GlobalAuthGate>
            {isAdminRoute ? (
                <div className="min-h-screen bg-background">{children}</div>
            ) : isExamMode ? (
                <div className="min-h-screen bg-background">{children}</div>
            ) : isStandaloneAuthPage ? (
                <div className="min-h-screen bg-background">
                    <main className="mx-auto w-full max-w-md px-4 py-10">{children}</main>
                </div>
            ) : (
                <ProductShell>{children}</ProductShell>
            )}
        </GlobalAuthGate>
    );
}
