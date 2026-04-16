"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getTranslation,
  locales,
  type Locale,
  type TranslationNamespace,
} from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (namespace: TranslationNamespace, key: string) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ro";
  }

  try {
    const stored = window.localStorage.getItem("lang")?.trim().toLowerCase();
    if (stored && isLocale(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }

  const browserLocale = window.navigator.language?.split("-")[0]?.toLowerCase();
  if (browserLocale && isLocale(browserLocale)) {
    return browserLocale;
  }

  return "ro";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;

    try {
      window.localStorage.setItem("lang", locale);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (!isLocale(nextLocale)) {
      return;
    }

    setLocaleState(nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (namespace, key) => getTranslation(locale, namespace, key as never),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18nContext must be used within I18nProvider");
  }

  return context;
}