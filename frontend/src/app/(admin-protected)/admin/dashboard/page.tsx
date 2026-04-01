"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  CalendarDays,
  CarFront,
  ClipboardList,
  TriangleAlert,
  Users,
} from "lucide-react";

import { getAllLeaveRequests } from "@/services/leave.api";
import { listIssues } from "@/services/issues.api";
import { listVehicles } from "@/services/vehicles.api";
import { getAdminDashboardSummary } from "@/services/dashboard.api";

type Section = "leave" | "issues" | "vehicles" | null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminDashboardPage() {
  const { locale } = useI18n();

  const [section, setSection] = useState<Section>(null);

  const [todayLeaves, setTodayLeaves] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [summary, leaveRes, issuesRes, vehiclesRes] = await Promise.all([
          getAdminDashboardSummary(),
          getAllLeaveRequests(),
          listIssues(),
          listVehicles(),
        ]);

        setActiveUsers(summary.users.active);

        const today = new Date().toISOString().slice(0, 10);

        const todayOnly = leaveRes.requests.filter((l) =>
          l.start_date.startsWith(today)
        );

        setTodayLeaves(todayOnly);

        setIssues(
          issuesRes.issues.filter(
            (i) => i.status === "open" || i.status === "in_progress"
          )
        );

        setVehicles(vehiclesRes.filter((v) => v.status === "active"));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const sectionTitle = useMemo(() => {
    if (section === "leave") {
      return text({
        ro: "Concedii de azi",
        en: "Today's leave",
        de: "Heutige Urlaube",
      });
    }

    if (section === "issues") {
      return text({
        ro: "Probleme active",
        en: "Active issues",
        de: "Aktive Probleme",
      });
    }

    if (section === "vehicles") {
      return text({
        ro: "Mașini active",
        en: "Active vehicles",
        de: "Aktive Fahrzeuge",
      });
    }

    return text({
      ro: "Rezumat general",
      en: "General overview",
      de: "Allgemeine Übersicht",
    });
  }, [section, locale]);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă dashboard-ul...",
              en: "Loading dashboard...",
              de: "Dashboard wird geladen...",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                  {text({
                    ro: "Panou",
                    en: "Dashboard",
                    de: "Übersicht",
                  })}
                </h1>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Vezi rapid indicatorii principali și intră în secțiunile care necesită atenție.",
                    en: "Quickly review the main indicators and open the sections that need attention.",
                    de: "Prüfe schnell die wichtigsten Kennzahlen und öffne die Bereiche, die Aufmerksamkeit benötigen.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <HeroStatCard
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Concedii azi",
                  en: "Leave today",
                  de: "Urlaub heute",
                })}
                value={String(todayLeaves.length)}
              />

              <HeroStatCard
                icon={<TriangleAlert className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Probleme",
                  en: "Issues",
                  de: "Probleme",
                })}
                value={String(issues.length)}
              />

              <HeroStatCard
                icon={<Users className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Angajați activi",
                  en: "Active users",
                  de: "Aktive Mitarbeiter",
                })}
                value={String(activeUsers)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Indicatori",
                  en: "Indicators",
                  de: "Kennzahlen",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Secțiuni rapide",
                  en: "Quick sections",
                  de: "Schnellbereiche",
                })}
              </h2>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              title={text({
                ro: "Concedii azi",
                en: "Leave today",
                de: "Urlaub heute",
              })}
              value={todayLeaves.length}
              icon={<CalendarDays className="h-4 w-4" />}
              isActive={section === "leave"}
              onClick={() => setSection("leave")}
            />

            <DashboardCard
              title={text({
                ro: "Probleme",
                en: "Issues",
                de: "Probleme",
              })}
              value={issues.length}
              icon={<TriangleAlert className="h-4 w-4" />}
              isActive={section === "issues"}
              onClick={() => setSection("issues")}
            />

            <DashboardCard
              title={text({
                ro: "Angajați activi",
                en: "Active users",
                de: "Aktive Mitarbeiter",
              })}
              value={activeUsers}
              icon={<Users className="h-4 w-4" />}
              isActive={section === null}
              onClick={() => setSection(null)}
            />

            <DashboardCard
              title={text({
                ro: "Mașini active",
                en: "Active vehicles",
                de: "Aktive Fahrzeuge",
              })}
              value={vehicles.length}
              icon={<CarFront className="h-4 w-4" />}
              isActive={section === "vehicles"}
              onClick={() => setSection("vehicles")}
            />
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <CarFront className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Focus",
                  en: "Focus",
                  de: "Fokus",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {sectionTitle}
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            <QuickRow
              label={text({
                ro: "Concedii astăzi",
                en: "Leave today",
                de: "Urlaub heute",
              })}
              value={String(todayLeaves.length)}
            />
            <QuickRow
              label={text({
                ro: "Probleme deschise",
                en: "Open issues",
                de: "Offene Probleme",
              })}
              value={String(issues.length)}
            />
            <QuickRow
              label={text({
                ro: "Vehicule active",
                en: "Active vehicles",
                de: "Aktive Fahrzeuge",
              })}
              value={String(vehicles.length)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {text({
                ro: "Detalii",
                en: "Details",
                de: "Details",
              })}
            </p>
            <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
              {sectionTitle}
            </h2>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {section === "leave"
              ? todayLeaves.length
              : section === "issues"
              ? issues.length
              : section === "vehicles"
              ? vehicles.length
              : activeUsers}{" "}
            {text({
              ro: "elemente",
              en: "items",
              de: "Elemente",
            })}
          </div>
        </div>

        {section === null ? (
          <div className="px-4 py-7">
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                {text({
                  ro: "Selectează o secțiune din cardurile de mai sus pentru a vedea detalii.",
                  en: "Select a section from the cards above to view details.",
                  de: "Wähle oben einen Bereich aus, um Details anzuzeigen.",
                })}
              </p>
            </div>
          </div>
        ) : section === "leave" ? (
          todayLeaves.length === 0 ? (
            <EmptyState
              text={text({
                ro: "Nu există concedii pentru ziua de azi.",
                en: "There are no leave requests for today.",
                de: "Es gibt heute keine Urlaubsanträge.",
              })}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Nume", en: "Name", de: "Name" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Cod", en: "Code", de: "Code" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Start", en: "Start", de: "Start" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "End", en: "End", de: "Ende" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Status", en: "Status", de: "Status" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {todayLeaves.map((l, index) => (
                    <tr key={l.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <span className="text-xs font-semibold">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-950">
                            {l.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{l.user_code}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{l.start_date}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{l.end_date}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : section === "issues" ? (
          issues.length === 0 ? (
            <EmptyState
              text={text({
                ro: "Nu există probleme active.",
                en: "There are no active issues.",
                de: "Es gibt keine aktiven Probleme.",
              })}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Status", en: "Status", de: "Status" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Raportat de", en: "Reported by", de: "Gemeldet von" })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i, index) => (
                    <tr key={i.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <span className="text-xs font-semibold">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-950">
                            {i.vehicle_license_plate}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {i.reported_by_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : vehicles.length === 0 ? (
          <EmptyState
            text={text({
              ro: "Nu există mașini active.",
              en: "There are no active vehicles.",
              de: "Es gibt keine aktiven Fahrzeuge.",
            })}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Număr", en: "Plate", de: "Kennzeichen" })}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Status", en: "Status", de: "Status" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, index) => (
                  <tr key={v.id} className="border-t border-slate-200">
                    <td className="px-4 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <span className="text-xs font-semibold">{index + 1}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-950">
                          {v.brand} {v.model}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{v.license_plate}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2.5 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  isActive,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-[18px] border p-4 text-left transition-all duration-200",
        isActive
          ? "border-slate-900 bg-slate-950 text-white shadow-md"
          : "border-slate-200 bg-white text-slate-950 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            isActive ? "bg-white text-slate-950" : "bg-slate-100 text-slate-900"
          )}
        >
          {icon}
        </div>

        <p
          className={cn(
            "text-[28px] font-semibold tracking-tight",
            isActive ? "text-white" : "text-slate-950"
          )}
        >
          {value}
        </p>
      </div>

      <p
        className={cn(
          "mt-3 text-sm font-medium",
          isActive ? "text-slate-200" : "text-slate-500"
        )}
      >
        {title}
      </p>
    </button>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-7">
      <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase?.() || "";

  const isOpen = normalized === "open";
  const isInProgress = normalized === "in_progress";
  const isApproved = normalized === "approved";
  const isRejected = normalized === "rejected";
  const isActive = normalized === "active";

  const className = isOpen
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : isInProgress
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : isApproved || isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isRejected
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
        className
      )}
    >
      {status}
    </span>
  );
}