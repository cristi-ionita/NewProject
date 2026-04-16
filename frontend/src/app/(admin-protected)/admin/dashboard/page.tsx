"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  CalendarDays,
  CarFront,
  ClipboardList,
  TriangleAlert,
  Users,
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

import { useAdminDashboard, type DashboardSection } from "@/hooks/use-admin-dashboard";

export default function AdminDashboardPage() {
  const { locale } = useI18n();
  const [section, setSection] = useState<DashboardSection>(null);

  const { loading, error, counts, todayLeaves, issues, vehicles } =
    useAdminDashboard();

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

let sectionTitle = text({
  ro: "Rezumat general",
  en: "General overview",
  de: "Allgemeine Übersicht",
});

if (section === "leave") {
  sectionTitle = text({
    ro: "Concedii de azi",
    en: "Today's leave",
    de: "Heutige Urlaube",
  });
} else if (section === "issues") {
  sectionTitle = text({
    ro: "Probleme active",
    en: "Active issues",
    de: "Aktive Probleme",
  });
} else if (section === "vehicles") {
  sectionTitle = text({
    ro: "Mașini active",
    en: "Active vehicles",
    de: "Aktive Fahrzeuge",
  });
}

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<ClipboardList className="h-7 w-7" />}
        title={text({
          ro: "Admin Dashboard",
          en: "Admin Dashboard",
          de: "Admin Dashboard",
        })}
        description={text({
          ro: "Panou principal pentru administrare rapidă și monitorizare operațională.",
          en: "Main panel for quick administration and operational monitoring.",
          de: "Hauptbereich für schnelle Verwaltung und operative Überwachung.",
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<CalendarDays className="h-4 w-4" />}
              label={text({
                ro: "Concedii azi",
                en: "Leave today",
                de: "Urlaub heute",
              })}
              value={counts.todayLeaves}
            />
            <HeroStatCard
              icon={<TriangleAlert className="h-4 w-4" />}
              label={text({
                ro: "Probleme active",
                en: "Active issues",
                de: "Aktive Probleme",
              })}
              value={counts.issues}
            />
            <HeroStatCard
              icon={<Users className="h-4 w-4" />}
              label={text({
                ro: "Utilizatori activi",
                en: "Active users",
                de: "Aktive Benutzer",
              })}
              value={counts.activeUsers}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title={text({ ro: "Concedii", en: "Leave", de: "Urlaub" })}
          value={counts.todayLeaves}
          icon={<CalendarDays className="h-6 w-6" />}
          isActive={section === "leave"}
          onClick={() => setSection("leave")}
        />
        <DashboardCard
          title="Issues"
          value={counts.issues}
          icon={<TriangleAlert className="h-6 w-6" />}
          isActive={section === "issues"}
          onClick={() => setSection("issues")}
        />
        <DashboardCard
          title="Users"
          value={counts.activeUsers}
          icon={<Users className="h-6 w-6" />}
          isActive={section === null}
          onClick={() => setSection(null)}
        />
        <DashboardCard
          title={text({ ro: "Vehicule", en: "Vehicles", de: "Fahrzeuge" })}
          value={counts.vehicles}
          icon={<CarFront className="h-6 w-6" />}
          isActive={section === "vehicles"}
          onClick={() => setSection("vehicles")}
        />
      </section>

      <SectionCard title={sectionTitle}>
        {section === null ? (
          <div className="grid gap-4 md:grid-cols-3">
            <DashboardInfoStat
              label={text({
                ro: "Concedii azi",
                en: "Leave today",
                de: "Urlaub heute",
              })}
              value={counts.todayLeaves}
            />
            <DashboardInfoStat
              label={text({
                ro: "Probleme active",
                en: "Active issues",
                de: "Aktive Probleme",
              })}
              value={counts.issues}
            />
            <DashboardInfoStat
              label={text({
                ro: "Vehicule active",
                en: "Active vehicles",
                de: "Aktive Fahrzeuge",
              })}
              value={counts.vehicles}
            />
          </div>
        ) : null}

        {section === "leave" ? (
          todayLeaves.length ? (
            <div className="space-y-3">
              {todayLeaves.map((item) => (
                <DashboardListRow
                  key={item.id}
                  title={item.user_name}
                  subtitle={`${item.start_date} → ${item.end_date}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există concedii astăzi",
                en: "No leave today",
                de: "Heute kein Urlaub",
              })}
            />
          )
        ) : null}

        {section === "issues" ? (
          issues.length ? (
            <div className="space-y-3">
              {issues.map((item) => (
                <DashboardListRow
                  key={item.id}
                  title={item.vehicle_license_plate || "—"}
                  subtitle={item.status}
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

        {section === "vehicles" ? (
          vehicles.length ? (
            <div className="space-y-3">
              {vehicles.map((item) => (
                <DashboardListRow
                  key={item.id}
                  title={item.license_plate}
                  subtitle={item.status}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există vehicule active",
                en: "No active vehicles",
                de: "Keine aktiven Fahrzeuge",
              })}
            />
          )
        ) : null}
      </SectionCard>
    </div>
  );
}