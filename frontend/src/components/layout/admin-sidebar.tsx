"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  TriangleAlert,
  Users,
} from "lucide-react";

import { locales, type Locale } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  pathname: string;
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

export default function AdminSidebar({
  pathname,
  open,
  onClose,
  onLogout,
}: Props) {
  const { locale, setLocale, t } = useI18n();

  const navigation: NavigationItem[] = [
    {
      href: "/admin/dashboard",
      label: t("nav", "dashboard"),
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/admin/users",
      label: t("nav", "users"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: "/admin/vehicles",
      label: t("nav", "vehicles"),
      icon: <CarFront className="h-4 w-4" />,
    },
    {
      href: "/admin/issues",
      label: t("nav", "issues"),
      icon: <TriangleAlert className="h-4 w-4" />,
    },
    {
      href: "/admin/assignments",
      label: t("nav", "assignments"),
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      href: "/admin/alerts",
      label: t("nav", "alerts"),
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      href: "/admin/leave",
      label: t("nav", "leave"),
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ];

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[3px] md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[288px] transform border-r border-white/10",
          "bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)] text-white",
          "shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition duration-300",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin sidebar"
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-4">
            <div
              className="flex gap-2 rounded-[18px] border border-white/10 bg-white/10 p-1.5 backdrop-blur-md"
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
                      "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-0",
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

          <nav className="flex flex-1 flex-col gap-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-[20px] border px-3 py-3 text-sm font-medium transition-all duration-300 ease-out",
                    isActive
                      ? "border-white/10 bg-white text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.08)]"
                      : "border-transparent bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[14px] transition-all duration-300",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "bg-black/30 text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                    )}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={cn(
                      "tracking-tight",
                      isActive ? "text-slate-950" : "text-inherit"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/10 px-3 py-3 text-sm font-semibold text-slate-200 shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/14 hover:text-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-black text-white">
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