"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  getTranslation,
  locales,
  type Locale,
  type TranslationKey,
  type TranslationNamespace,
} from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <N extends TranslationNamespace>(
    namespace: N,
    key: TranslationKey<N>
  ) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "app-locale";

function isLocale(value: string | null): value is Locale {
  return !!value && locales.includes(value as Locale);
}

type Props = {
  children: ReactNode;
};

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const savedLocale = window.localStorage.getItem(STORAGE_KEY);

  if (isLocale(savedLocale)) {
    return savedLocale;
  }

  return defaultLocale;
}

export function I18nProvider({ children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const t = useCallback(
    <N extends TranslationNamespace>(namespace: N, key: TranslationKey<N>) => {
      return getTranslation(locale, String(namespace), String(key));
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}