"use client";

export default function FullScreenLoader() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#00B37E]/20 border-t-[#00B37E] rounded-full animate-spin" />
                <p className="animate-pulse text-sm font-medium text-muted-foreground">Initializing AUTOTEST...</p>
            </div>
        </div>
    );
}
