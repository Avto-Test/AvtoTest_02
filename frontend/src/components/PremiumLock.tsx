"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumLockProps {
    isLocked: boolean;
    children: ReactNode;
    title?: string;
    description?: string;
    ctaText?: string;
    onCTA?: () => void;
    ctaHref?: string;
    dark?: boolean;
}

export default function PremiumLock({
    isLocked,
    children,
    title = "Unlock Detailed Analytics",
    description = "Get deep insights into your test performance and track your progress over time.",
    ctaText = "Upgrade to Premium",
    onCTA,
    ctaHref = "/pricing",
    dark = false,
}: PremiumLockProps) {
    if (!isLocked) {
        return <>{children}</>;
    }

    const handleCTA = () => {
        if (onCTA) {
            onCTA();
        }
    };

    return (
        <div className="relative group overflow-hidden rounded-2xl">
            {/* Blurred Content */}
            <div
                className="blur-md select-none pointer-events-none opacity-40 transition-all duration-500"
                aria-hidden="true"
            >
                {children}
            </div>

            {/* Overlay */}
            <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] animate-in fade-in duration-700 ${dark ? 'bg-black/60' : 'bg-white/30'}`}>
                <div className="mb-4 relative">
                    <div className="w-16 h-16 bg-[#F59E0B]/10 rounded-full flex items-center justify-center animate-bounce duration-[3000ms]">
                        <Lock className="w-7 h-7 text-[#F59E0B]" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                        <Crown className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B] animate-pulse" />
                    </div>
                </div>

                <h3 className={`text-xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                <p className={`text-sm mb-6 max-w-[280px] mx-auto leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {description}
                </p>

                {onCTA ? (
                    <Button
                        onClick={handleCTA}
                        className="bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl h-11 px-8 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        {ctaText}
                    </Button>
                ) : (
                    <Button
                        asChild
                        className="bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl h-11 px-8 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Link href={ctaHref}>{ctaText}</Link>
                    </Button>
                )}
            </div>

            {/* Glossy highlight effect on hover */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </div>
    );
}
