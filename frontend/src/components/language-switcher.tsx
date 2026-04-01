"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";

const languages = [
  { code: "ro", label: "Română", short: "RO" },
  { code: "en", label: "English", short: "EN" },
  { code: "de", label: "Deutsch", short: "DE" },
] as const;

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const activeLanguage =
    languages.find((language) => language.code === locale) ?? languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSelectLanguage(code: "ro" | "en" | "de") {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm">
          🌐
        </span>

        <span className="hidden sm:block">{activeLanguage.label}</span>
        <span className="sm:hidden">{activeLanguage.short}</span>

        <svg
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.75rem)] z-50 w-56 origin-top-right rounded-[24px] border border-slate-200 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
        role="menu"
      >
        {languages.map((language) => {
          const isActive = language.code === locale;

          return (
            <button
              key={language.code}
              type="button"
              onClick={() => handleSelectLanguage(language.code)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
              role="menuitem"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {language.short}
                </span>

                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{language.label}</span>
                  <span
                    className={`text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {language.code.toUpperCase()}
                  </span>
                </div>
              </div>

              {isActive ? (
                <span className="text-xs font-semibold text-slate-200">
                  Active
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}