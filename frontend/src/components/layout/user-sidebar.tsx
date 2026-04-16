"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CarFront,
  FileText,
  LogOut,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { locales, type Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const languageLabels: Record<Locale, string> = {
  ro: "RO",
  en: "EN",
  de: "DE",
};

export default function UserSidebar({ open, onClose, onLogout }: Props) {
  const pathname = usePathname() || "";
  const { locale, setLocale, t } = useI18n();

  const links: NavigationItem[] = [
    {
      href: "/app/profile",
      label: t("nav", "profile"),
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      href: "/app/my-vehicle",
      label: t("nav", "myVehicle"),
      icon: <CarFront className="h-4 w-4" />,
    },
    {
      href: "/app/issues",
      label: t("nav", "issues"),
      icon: <TriangleAlert className="h-4 w-4" />,
    },
    {
      href: "/app/documents",
      label: t("nav", "documents"),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      href: "/app/leave",
      label: t("nav", "leave"),
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ];

  return (
    <>
      {open ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[288px] transform border-r border-white/10",
          "bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)] text-white",
          "shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition duration-300",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="User sidebar"
      >
        <div className="flex h-full flex-col px-4 py-4">
          <div className="mb-4 rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              Employee Panel
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
              Fleet Workspace
            </h2>

            <div
              className="mt-4 flex gap-2 rounded-[18px] border border-white/10 bg-white/5 p-1.5"
              role="group"
              aria-label="Select language"
            >
              {locales.map((item: Locale) => {
                const isActive = locale === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLocale(item)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-white/50",
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {languageLabels[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {links.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-[16px] px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-slate-100 text-slate-950"
                        : "bg-white/5 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                    )}
                  >
                    {item.icon}
                  </span>

                  <span className={cn(isActive ? "text-slate-950" : "text-inherit")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                <LogOut className="h-4 w-4" />
              </span>
              {t("common", "logout")}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}