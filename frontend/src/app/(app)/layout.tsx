"use client";

import { usePathname } from "next/navigation";
import AppNavbar from "@/components/AppNavbar";
import GlobalAuthGate from "@/components/GlobalAuthGate";

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

    return (
        <GlobalAuthGate>
            <div className="min-h-screen bg-background">
                {!isExamMode && !isStandaloneAuthPage && <AppNavbar />}
                <main className={!isExamMode && !isStandaloneAuthPage ? "py-4 sm:py-5 md:py-6" : ""}>
                    <div
                        className={
                            isExamMode
                                ? "h-full"
                                : isStandaloneAuthPage
                                    ? "mx-auto w-full max-w-md px-4 py-10"
                                    : "container-app"
                        }
                    >
                        {children}
                    </div>
                </main>
            </div>
        </GlobalAuthGate>
    );
}
