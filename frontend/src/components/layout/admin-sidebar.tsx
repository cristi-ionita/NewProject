"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";
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

type Props = {
  pathname: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminSidebar({
  pathname,
  open,
  onClose,
  onLogout,
}: Props) {
  const { locale, setLocale } = useI18n() as {
    locale: "ro" | "en" | "de";
    setLocale?: (locale: "ro" | "en" | "de") => void;
  };

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  const navigation = [
    {
      href: "/admin/dashboard",
      label: text({
        ro: "Panou",
        en: "Dashboard",
        de: "Übersicht",
      }),
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/admin/users",
      label: text({
        ro: "Utilizatori",
        en: "Users",
        de: "Benutzer",
      }),
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: "/admin/vehicles",
      label: text({
        ro: "Mașini",
        en: "Vehicles",
        de: "Fahrzeuge",
      }),
      icon: <CarFront className="h-4 w-4" />,
    },
    {
      href: "/admin/issues",
      label: text({
        ro: "Probleme",
        en: "Issues",
        de: "Probleme",
      }),
      icon: <TriangleAlert className="h-4 w-4" />,
    },
    {
      href: "/admin/assignments",
      label: text({
        ro: "Asignări",
        en: "Assignments",
        de: "Zuweisungen",
      }),
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      href: "/admin/alerts",
      label: text({
        ro: "Alerte",
        en: "Alerts",
        de: "Warnungen",
      }),
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      href: "/admin/leave",
      label: text({
        ro: "Concedii",
        en: "Leave",
        de: "Urlaub",
      }),
      icon: <CalendarDays className="h-4 w-4" />,
    },
  ] as const;

  const languages: Array<{ value: "ro" | "en" | "de"; label: string }> = [
    { value: "ro", label: "RO" },
    { value: "en", label: "EN" },
    { value: "de", label: "DE" },
  ];

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[272px] transform border-r border-white/10 bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] transition duration-300",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col px-4 py-4">
          <div className="mb-4">
            <div className="flex gap-2 rounded-[18px] border border-white/10 bg-white/5 p-1.5">
              {languages.map((item) => {
                const isActive = locale === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLocale?.(item.value)}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5">
            {navigation.map((item) => {
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

                  <span
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-slate-950" : "text-inherit"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-[16px] border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 hover:bg-white/10 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                <LogOut className="h-4 w-4" />
              </span>
              {text({
                ro: "Ieșire",
                en: "Logout",
                de: "Abmelden",
              })}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}