import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">AUTOTEST</h1>
                    <p className="text-muted-foreground text-sm mt-2">Kirish yoki yangi akkount yarating</p>
                </div>
                {children}
            </div>
        </div>
    );
}
