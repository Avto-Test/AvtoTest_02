import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const year = new Date().getFullYear();

    return (
        <div className="marketing-shell min-h-screen">
            <Navbar />
            <main className="relative">
                <div className="marketing-grid pointer-events-none absolute inset-0 opacity-20" />
                <div className="relative">{children}</div>
            </main>
            <footer className="border-t border-border/70 bg-background/70 backdrop-blur">
                <div className="container-app flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>&copy; {year} AUTOTEST. Zamonaviy nomzodlar uchun AI asosidagi imtihon intellekti.</p>
                    <div className="flex items-center gap-5">
                        <Link href="/privacy" className="transition-colors hover:text-foreground">
                            Maxfiylik
                        </Link>
                        <Link href="/terms" className="transition-colors hover:text-foreground">
                            Shartlar
                        </Link>
                        <Link href="/contact" className="transition-colors hover:text-foreground">
                            Aloqa
                        </Link>
                        <Link href="/driving-schools" className="transition-colors hover:text-foreground">
                            Avtomaktablar
                        </Link>
                        <Link href="/driving-instructors" className="transition-colors hover:text-foreground">
                            Instruktorlar
                        </Link>
                        <Link href="/driving-schools/partner" className="transition-colors hover:text-foreground">
                            Hamkor bo&apos;lish
                        </Link>
                        <Link href="/driving-instructors/apply" className="transition-colors hover:text-foreground">
                            Instruktor bo&apos;lish
                        </Link>
                        <Link href="/system-status" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                            <span className="size-1.5 rounded-full bg-success" />
                            Tizim holati
                        </Link>
                        <Link href="/tests?mode=adaptive" className="transition-colors hover:text-foreground">
                            Testlar
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
