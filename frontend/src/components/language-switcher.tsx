"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_OPTIONS, Locale } from "@/i18n/translations";

type LanguageSwitcherProps = {
    compact?: boolean;
};

type LocaleMeta = {
    code: string;
    hint: string;
};

const LOCALE_META: Record<Locale, LocaleMeta> = {
    "uz-latn": { code: "UZ", hint: "LATN" },
    "uz-cyrl": { code: "ЎЗ", hint: "CYR" },
    ru: { code: "RU", hint: "RU" },
    en: { code: "ENG", hint: "EN" },
};

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
    const { locale, setLocale, t } = useI18n();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    const currentMeta = useMemo(() => LOCALE_META[locale], [locale]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function selectLocale(nextLocale: Locale) {
        setLocale(nextLocale);
        setOpen(false);
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-label={t("lang.label", "Language")}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                className={`inline-flex items-center justify-between gap-2 rounded-xl border border-input bg-background/90 text-foreground shadow-sm transition hover:bg-muted ${
                    compact ? "h-9 min-w-[84px] px-3" : "h-10 min-w-[96px] px-3"
                }`}
            >
                <span className="text-sm font-semibold tracking-wide">{currentMeta.code}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {open ? (
                <div
                    role="listbox"
                    className="absolute right-0 z-50 mt-2 rounded-xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur"
                >
                    <div className="flex items-center gap-2">
                        {LOCALE_OPTIONS.map((item) => {
                            const meta = LOCALE_META[item.value];
                            const active = item.value === locale;
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => selectLocale(item.value)}
                                    className={`relative inline-flex h-10 min-w-[58px] flex-col items-center justify-center rounded-lg border px-2 transition ${
                                        active
                                            ? "border-primary bg-primary/15 text-primary shadow-sm"
                                            : "border-border text-foreground hover:bg-muted"
                                    }`}
                                    title={item.label}
                                >
                                    <p className="text-center text-sm font-semibold tracking-wide">{meta.code}</p>
                                    <p className="text-[10px] leading-none text-muted-foreground">{meta.hint}</p>
                                    {active ? <Check className="absolute right-1 top-1 h-3.5 w-3.5" /> : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
