"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Gauge,
  Settings2,
  UserRound,
} from "lucide-react";
import {
  getVehicleHistory,
  getVehicleLiveStatus,
  type VehicleHistoryItem,
  type VehicleLiveStatusItem,
} from "@/services/vehicles.api";
import { useI18n } from "@/lib/i18n/use-i18n";

import InfoRow from "@/components/ui/info-row";
import InfoCard from "@/components/ui/info-card";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { detail?: unknown } };
  };
  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load vehicle details.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item?.msg || "Error")
      .join(", ");
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) {
    return (detail as { msg?: string }).msg || "Error";
  }

  return "Failed to load vehicle details.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function VehicleDetailsPage() {
  const { locale } = useI18n();
  const params = useParams();

  const vehicleId = Number(
    typeof params.id === "string" ? params.id : params.id?.[0]
  );

  const [vehicle, setVehicle] = useState<VehicleLiveStatusItem | null>(null);
  const [history, setHistory] = useState<VehicleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAssignmentId, setOpenAssignmentId] = useState<number | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function formatDate(value?: string | null) {
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

  function yesNo(value: boolean) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  const statusConfig = useMemo(() => {
    if (!vehicle) {
      return {
        label: text({ ro: "Necunoscut", en: "Unknown", de: "Unbekannt" }),
        className: "border-white/15 bg-white/10 text-white",
      };
    }

    if (vehicle.vehicle_status === "in_service") {
      return {
        label: text({ ro: "În service", en: "In service", de: "Im Service" }),
        className: "border-amber-300/25 bg-amber-400/10 text-amber-100",
      };
    }

    if (vehicle.availability === "occupied") {
      return {
        label: text({ ro: "Ocupată", en: "Occupied", de: "Belegt" }),
        className: "border-rose-300/25 bg-rose-400/10 text-rose-100",
      };
    }

    return {
      label: text({ ro: "Disponibilă", en: "Available", de: "Verfügbar" }),
      className: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    };
  }, [vehicle, locale]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [historyData, liveData] = await Promise.all([
          getVehicleHistory(vehicleId),
          getVehicleLiveStatus(),
        ]);

        setHistory(historyData?.history ?? []);

        const vehicles = liveData?.vehicles ?? [];
        const currentVehicle =
          vehicles.find((item) => item.vehicle_id === vehicleId) || null;

        setVehicle(currentVehicle);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    if (!vehicleId || Number.isNaN(vehicleId)) return;
    load();
  }, [vehicleId]);

  const totalAssignments = history.length;
  const currentDriver = vehicle?.assigned_to_name || "—";
  const latestHistory = history[0] || null;

  if (loading) {
    return <LoadingCard />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<CarFront className="h-7 w-7" />}
        title={
          vehicle?.license_plate ||
          text({
            ro: "Vehicul",
            en: "Vehicle",
            de: "Fahrzeug",
          })
        }
        description={text({
          ro: "Vezi starea curentă și istoricul complet al alocărilor.",
          en: "View current status and the full assignment history.",
          de: "Sieh den aktuellen Status und die vollständige Zuweisungshistorie.",
        })}
        actions={
          <Link
            href="/admin/vehicles"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {text({
              ro: "Înapoi",
              en: "Back",
              de: "Zurück",
            })}
          </Link>
        }
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<UserRound className="h-4 w-4" />}
              label={text({
                ro: "Șofer curent",
                en: "Current driver",
                de: "Aktueller Fahrer",
              })}
              value={currentDriver}
            />
            <HeroStatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label={text({
                ro: "Total alocări",
                en: "Total assignments",
                de: "Gesamtzuweisungen",
              })}
              value={totalAssignments}
            />
            <HeroStatCard
              icon={<Settings2 className="h-4 w-4" />}
              label={text({
                ro: "Status",
                en: "Status",
                de: "Status",
              })}
              value={statusConfig.label}
            />
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard
          icon={<CarFront className="h-5 w-5" />}
          title={text({
            ro: "Status vehicul",
            en: "Vehicle status",
            de: "Fahrzeugstatus",
          })}
          value={statusConfig.label}
          badgeClass={statusConfig.className}
          dark
        />

        <InfoCard
          icon={<UserRound className="h-5 w-5" />}
          title={text({
            ro: "Șofer curent",
            en: "Current driver",
            de: "Aktueller Fahrer",
          })}
          value={currentDriver}
        />

        <InfoCard
          icon={<ClipboardList className="h-5 w-5" />}
          title={text({
            ro: "Ultima activitate",
            en: "Latest activity",
            de: "Letzte Aktivität",
          })}
          value={latestHistory ? formatDate(latestHistory.started_at) : "—"}
        />
      </section>

      <SectionCard
        title={text({
          ro: "Istoric alocări",
          en: "Assignment history",
          de: "Zuweisungshistorie",
        })}
      >
        {history.length ? (
          <div className="space-y-3">
            {history.map((item) => {
              const isOpen = openAssignmentId === item.assignment_id;

              return (
                <div
                  key={item.assignment_id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {item.driver_name || "—"}
                        </p>

                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          #{item.assignment_id}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <InfoRow
                          icon={
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                          }
                          label={text({
                            ro: "Start",
                            en: "Start",
                            de: "Start",
                          })}
                          value={formatDate(item.started_at)}
                        />

                        <InfoRow
                          icon={
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                          }
                          label={text({
                            ro: "Sfârșit",
                            en: "End",
                            de: "Ende",
                          })}
                          value={formatDate(item.ended_at)}
                        />

                        <InfoRow
                          icon={<Gauge className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "KM start",
                            en: "KM start",
                            de: "KM Start",
                          })}
                          value={
                            item.mileage_start !== null &&
                            item.mileage_start !== undefined
                              ? String(item.mileage_start)
                              : "—"
                          }
                        />

                        <InfoRow
                          icon={<Gauge className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "KM final",
                            en: "KM end",
                            de: "KM Ende",
                          })}
                          value={
                            item.mileage_end !== null &&
                            item.mileage_end !== undefined
                              ? String(item.mileage_end)
                              : "—"
                          }
                        />

                        <InfoRow
                          icon={<FileText className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "Documente",
                            en: "Documents",
                            de: "Dokumente",
                          })}
                          value={yesNo(item.has_documents)}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenAssignmentId((prev) =>
                          prev === item.assignment_id ? null : item.assignment_id
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          {text({
                            ro: "Ascunde",
                            en: "Hide",
                            de: "Ausblenden",
                          })}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          {text({
                            ro: "Detalii",
                            en: "Details",
                            de: "Details",
                          })}
                        </>
                      )}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-3">
                      <InfoRow
                        icon={
                          <ClipboardList className="h-4 w-4 text-slate-400" />
                        }
                        label={text({
                          ro: "ID alocare",
                          en: "Assignment ID",
                          de: "Zuweisungs-ID",
                        })}
                        value={String(item.assignment_id)}
                      />

                      <InfoRow
                        icon={<UserRound className="h-4 w-4 text-slate-400" />}
                        label={text({
                          ro: "Șofer",
                          en: "Driver",
                          de: "Fahrer",
                        })}
                        value={item.driver_name || "—"}
                      />

                      <InfoRow
                        icon={<CarFront className="h-4 w-4 text-slate-400" />}
                        label={text({
                          ro: "Vehicul",
                          en: "Vehicle",
                          de: "Fahrzeug",
                        })}
                        value={vehicle?.license_plate || "—"}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={text({
              ro: "Nu există istoric pentru acest vehicul.",
              en: "No history found for this vehicle.",
              de: "Keine Historie für dieses Fahrzeug gefunden.",
            })}
          />
        )}
      </SectionCard>
    </div>
  );
}
