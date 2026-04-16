"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

import DashboardCard from "@/components/admin/dashboard-card";
import DashboardInfoStat from "@/components/admin/dashboard-info-stat";
import DashboardListRow from "@/components/admin/dashboard-list-row";

import {
  clearMechanicSession,
  getMechanicSession,
  type MechanicSession,
} from "@/lib/auth";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  useMechanicIssues,
  type IssueItem,
} from "@/hooks/use-mechanic-issues";

type DashboardSection = null | "open" | "scheduled" | "resolved";
type SupportedLocale = "ro" | "en" | "de";

function formatDate(value: string | null, locale: SupportedLocale): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export default function MechanicDashboardPage() {
  const router = useRouter();
  const { locale } = useI18n();

  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [session, setSession] = useState<MechanicSession | null>(null);
  const [section, setSection] = useState<DashboardSection>(null);
  const [sessionChecking, setSessionChecking] = useState(true);

  function text(values: { ro: string; en: string; de: string }) {
    return values[safeLocale];
  }

  function getStatusLabel(status: string) {
    const normalized = status.trim().toLowerCase();

    if (normalized === "resolved") {
      return text({ ro: "Rezolvat", en: "Resolved", de: "Gelöst" });
    }

    if (normalized === "in_progress") {
      return text({ ro: "În lucru", en: "In progress", de: "In Bearbeitung" });
    }

    if (normalized === "scheduled") {
      return text({ ro: "Programat", en: "Scheduled", de: "Geplant" });
    }

    return text({ ro: "Deschis", en: "Open", de: "Offen" });
  }

  useEffect(() => {
    const parsed = getMechanicSession();

    if (!parsed || parsed.role !== "mechanic" || !parsed.unique_code) {
      clearMechanicSession();
      router.replace("/login");
      return;
    }

    setSession(parsed);
    setSessionChecking(false);
  }, [router]);

  const {
    loading,
    error,
    openIssues,
    scheduledIssues,
    resolvedIssues,
    counts,
  } = useMechanicIssues(session?.unique_code);

  let sectionTitle = text({
    ro: "Rezumat general",
    en: "General overview",
    de: "Allgemeine Übersicht",
  });

  if (section === "open") {
    sectionTitle = text({
      ro: "Probleme active",
      en: "Active issues",
      de: "Aktive Probleme",
    });
  } else if (section === "scheduled") {
    sectionTitle = text({
      ro: "Probleme programate",
      en: "Scheduled issues",
      de: "Geplante Probleme",
    });
  } else if (section === "resolved") {
    sectionTitle = text({
      ro: "Probleme rezolvate",
      en: "Resolved issues",
      de: "Gelöste Probleme",
    });
  }

  if (sessionChecking || loading) {
    return <LoadingCard />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<ClipboardList className="h-7 w-7" />}
        title={text({
          ro: "Mechanic Dashboard",
          en: "Mechanic Dashboard",
          de: "Mechaniker Dashboard",
        })}
        description={text({
          ro: `Panou principal pentru gestionarea problemelor atribuite. Bine ai venit, ${session.full_name}.`,
          en: `Main panel for managing assigned issues. Welcome, ${session.full_name}.`,
          de: `Hauptbereich zur Verwaltung zugewiesener Probleme. Willkommen, ${session.full_name}.`,
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<TriangleAlert className="h-4 w-4" />}
              label={text({
                ro: "Probleme active",
                en: "Active issues",
                de: "Aktive Probleme",
              })}
              value={counts.open}
            />
            <HeroStatCard
              icon={<CalendarDays className="h-4 w-4" />}
              label={text({
                ro: "Programate",
                en: "Scheduled",
                de: "Geplant",
              })}
              value={counts.scheduled}
            />
            <HeroStatCard
              icon={<Wrench className="h-4 w-4" />}
              label={text({
                ro: "Rezolvate",
                en: "Resolved",
                de: "Gelöst",
              })}
              value={counts.resolved}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title={text({ ro: "Active", en: "Active", de: "Aktiv" })}
          value={counts.open}
          icon={<TriangleAlert className="h-6 w-6" />}
          isActive={section === "open"}
          onClick={() => setSection("open")}
        />
        <DashboardCard
          title={text({ ro: "Programate", en: "Scheduled", de: "Geplant" })}
          value={counts.scheduled}
          icon={<CalendarDays className="h-6 w-6" />}
          isActive={section === "scheduled"}
          onClick={() => setSection("scheduled")}
        />
        <DashboardCard
          title={text({ ro: "Rezumat", en: "Overview", de: "Übersicht" })}
          value={counts.total}
          icon={<ClipboardList className="h-6 w-6" />}
          isActive={section === null}
          onClick={() => setSection(null)}
        />
        <DashboardCard
          title={text({ ro: "Rezolvate", en: "Resolved", de: "Gelöst" })}
          value={counts.resolved}
          icon={<Wrench className="h-6 w-6" />}
          isActive={section === "resolved"}
          onClick={() => setSection("resolved")}
        />
      </section>

      <SectionCard title={sectionTitle}>
        {section === null ? (
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardInfoStat
              label={text({
                ro: "Probleme active",
                en: "Active issues",
                de: "Aktive Probleme",
              })}
              value={counts.open}
            />
            <DashboardInfoStat
              label={text({
                ro: "Programate",
                en: "Scheduled",
                de: "Geplant",
              })}
              value={counts.scheduled}
            />
            <DashboardInfoStat
              label={text({
                ro: "Rezolvate",
                en: "Resolved",
                de: "Gelöst",
              })}
              value={counts.resolved}
            />
          </div>
        ) : null}

        {section === "open" ? (
          openIssues.length ? (
            <div className="space-y-3">
              {openIssues.map((item: IssueItem) => (
                <DashboardListRow
                  key={item.id}
                  title={`${item.vehicle_license_plate || "—"} · ${item.vehicle_brand} ${item.vehicle_model}`}
                  subtitle={`${item.reported_by_name || "—"} • ${getStatusLabel(item.status)}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există probleme active",
                en: "No active issues",
                de: "Keine aktiven Probleme",
              })}
            />
          )
        ) : null}

        {section === "scheduled" ? (
          scheduledIssues.length ? (
            <div className="space-y-3">
              {scheduledIssues.map((item: IssueItem) => (
                <DashboardListRow
                  key={item.id}
                  title={`${item.vehicle_license_plate || "—"} · ${item.scheduled_location || "—"}`}
                  subtitle={formatDate(item.scheduled_for, safeLocale)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există probleme programate",
                en: "No scheduled issues",
                de: "Keine geplanten Probleme",
              })}
            />
          )
        ) : null}

        {section === "resolved" ? (
          resolvedIssues.length ? (
            <div className="space-y-3">
              {resolvedIssues.map((item: IssueItem) => (
                <DashboardListRow
                  key={item.id}
                  title={`${item.vehicle_license_plate || "—"} · ${item.vehicle_brand} ${item.vehicle_model}`}
                  subtitle={formatDate(item.updated_at, safeLocale)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există probleme rezolvate",
                en: "No resolved issues",
                de: "Keine gelösten Probleme",
              })}
            />
          )
        ) : null}
      </SectionCard>
    </div>
  );
}