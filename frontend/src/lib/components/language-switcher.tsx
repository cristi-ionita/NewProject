"use client";

import { locales, type Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/use-i18n";

const labels: Record<Locale, string> = {
  ro: "RO",
  en: "EN",
  de: "DE",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label="Select language"
    >
      {locales.map((item: Locale) => {
        const isActive = item === locale;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            aria-pressed={isActive}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
          >
            {labels[item]}
          </button>
        );
      })}
    </div>
  );
}