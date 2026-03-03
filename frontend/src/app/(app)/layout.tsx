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

    return (
        <GlobalAuthGate>
            <div className="min-h-screen bg-background">
                {!isExamMode && <AppNavbar />}
                <main className={!isExamMode ? "p-6" : ""}>
                    <div className={!isExamMode ? "container-app" : "h-full"}>
                        {children}
                    </div>
                </main>
            </div>
        </GlobalAuthGate>
    );
}
