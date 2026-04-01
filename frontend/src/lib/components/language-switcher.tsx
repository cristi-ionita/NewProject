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
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {locales.map((item) => {
        const isActive = item === locale;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-blue-600 text-white"
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