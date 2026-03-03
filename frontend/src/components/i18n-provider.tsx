"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, Locale, translations } from "@/i18n/translations";

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "site_locale_v2";

function isLocale(value: string | null): value is Locale {
    return value === "uz-latn" || value === "uz-cyrl" || value === "ru" || value === "en";
}

function localeToHtmlLang(locale: Locale): string {
    if (locale === "uz-cyrl") return "uz-Cyrl";
    if (locale === "uz-latn") return "uz-Latn";
    return locale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window === "undefined") return DEFAULT_LOCALE;
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return isLocale(saved) ? saved : DEFAULT_LOCALE;
    });

    useEffect(() => {
        document.documentElement.lang = localeToHtmlLang(locale);
    }, [locale]);

    const setLocale = (nextLocale: Locale) => {
        setLocaleState(nextLocale);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, nextLocale);
        }
    };

    const value = useMemo<I18nContextValue>(() => {
        return {
            locale,
            setLocale,
            t: (key: string, fallback?: string) => {
                return translations[locale][key] ?? fallback ?? key;
            },
        };
    }, [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useI18n must be used inside I18nProvider");
    }
    return ctx;
}
