"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  HeartPulse,
  ShieldAlert,
  TriangleAlert,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  getVehicleHistory,
  getVehicleLiveStatus,
  type VehicleHistoryItem,
  type VehicleLiveStatusItem,
} from "@/services/vehicles.api";
import { useI18n } from "@/lib/i18n/use-i18n";

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load vehicle details.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load vehicle details.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function VehicleDetailsPage() {
  const { locale } = useI18n();
  const params = useParams();

  const vehicleId = Number(params.id);

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
        label: text({
          ro: "Necunoscut",
          en: "Unknown",
          de: "Unbekannt",
        }),
        className: "border-white/15 bg-white/10 text-white",
      };
    }

    if (vehicle.vehicle_status === "in_service") {
      return {
        label: text({
          ro: "În service",
          en: "In service",
          de: "Im Service",
        }),
        className: "border-amber-300/25 bg-amber-400/10 text-amber-100",
      };
    }

    if (vehicle.availability === "occupied") {
      return {
        label: text({
          ro: "Ocupată",
          en: "Occupied",
          de: "Belegt",
        }),
        className: "border-rose-300/25 bg-rose-400/10 text-rose-100",
      };
    }

    return {
      label: text({
        ro: "Disponibilă",
        en: "Available",
        de: "Verfügbar",
      }),
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

        setHistory(historyData.history);

        const currentVehicle =
          liveData.vehicles.find((item) => item.vehicle_id === vehicleId) || null;

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

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă datele vehiculului...",
              en: "Loading vehicle data...",
              de: "Fahrzeugdaten werden geladen...",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  const totalAssignments = history.length;
  const currentDriver = vehicle?.assigned_to_name || "—";
  const latestHistory = history[0];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link
                href="/admin/vehicles"
                className="group inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lg active:translate-y-0"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                {text({ ro: "Înapoi", en: "Back", de: "Zurück" })}
              </Link>

              <div className="space-y-2.5">
                <div
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    statusConfig.className
                  )}
                >
                  {statusConfig.label}
                </div>

                <div>
                  <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                    {vehicle?.license_plate ||
                      text({
                        ro: "Detalii mașină",
                        en: "Vehicle details",
                        de: "Fahrzeugdetails",
                      })}
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Sesiunea curentă și istoricul complet al alocărilor.",
                      en: "Current session and complete assignment history.",
                      de: "Aktuelle Sitzung und vollständiger Zuweisungsverlauf.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {text({
                      ro: "Alocări",
                      en: "Assignments",
                      de: "Zuweisungen",
                    })}
                  </span>
                </div>
                <p className="mt-2.5 text-lg font-semibold text-white">{totalAssignments}</p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <UserRound className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {text({
                      ro: "Șofer curent",
                      en: "Current driver",
                      de: "Aktueller Fahrer",
                    })}
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-2 text-xs font-semibold text-white">
                  {currentDriver}
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {text({
                      ro: "Ultima sesiune",
                      en: "Latest session",
                      de: "Letzte Sitzung",
                    })}
                  </span>
                </div>
                <p className="mt-2.5 text-xs font-semibold text-white">
                  {latestHistory ? formatDate(latestHistory.started_at) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <CarFront className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Sesiunea actuală",
                  en: "Current session",
                  de: "Aktuelle Sitzung",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Status operațional",
                  en: "Operational status",
                  de: "Betriebsstatus",
                })}
              </h2>
            </div>
          </div>

          {!vehicle ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">
                {text({
                  ro: "Mașina nu a fost găsită.",
                  en: "Vehicle not found.",
                  de: "Fahrzeug nicht gefunden.",
                })}
              </p>
            </div>
          ) : vehicle.vehicle_status === "in_service" ? (
            <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {text({
                      ro: "Mașina este în service.",
                      en: "Vehicle is in service.",
                      de: "Fahrzeug ist im Service.",
                    })}
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    {text({
                      ro: "Vehiculul nu este disponibil pentru alocare momentan.",
                      en: "The vehicle is currently unavailable for assignment.",
                      de: "Das Fahrzeug ist derzeit nicht für Zuweisungen verfügbar.",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : vehicle.availability === "occupied" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {text({
                      ro: "Alocată către",
                      en: "Assigned to",
                      de: "Zugewiesen an",
                    })}
                  </p>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {vehicle.assigned_to_name || "—"}
                </p>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {text({
                      ro: "Tură",
                      en: "Shift",
                      de: "Schicht",
                    })}
                  </p>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {vehicle.assigned_to_shift_number || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {text({
                      ro: "Mașina este liberă în acest moment.",
                      en: "Vehicle is currently free.",
                      de: "Fahrzeug ist momentan frei.",
                    })}
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {text({
                      ro: "Vehiculul poate fi alocat imediat.",
                      en: "The vehicle can be assigned immediately.",
                      de: "Das Fahrzeug kann sofort zugewiesen werden.",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <Gauge className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Rezumat",
                  en: "Overview",
                  de: "Übersicht",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Informații rapide",
                  en: "Quick details",
                  de: "Schnellinfos",
                })}
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                {text({ ro: "Număr auto", en: "License plate", de: "Kennzeichen" })}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {vehicle?.license_plate || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                {text({ ro: "Status", en: "Status", de: "Status" })}
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                {text({
                  ro: "Istoric total",
                  en: "Total history",
                  de: "Gesamtverlauf",
                })}
              </span>
              <span className="text-sm font-semibold text-slate-900">{history.length}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {text({
                ro: "Istoric",
                en: "History",
                de: "Verlauf",
              })}
            </p>
            <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
              {text({
                ro: "Istoric alocări",
                en: "Assignment history",
                de: "Zuweisungsverlauf",
              })}
            </h2>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {history.length}{" "}
            {text({
              ro: "înregistrări",
              en: "records",
              de: "Einträge",
            })}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-7">
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                {text({
                  ro: "Nu există istoric pentru acest vehicul.",
                  en: "There is no history for this vehicle.",
                  de: "Für dieses Fahrzeug gibt es keinen Verlauf.",
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3 sm:p-4">
            {history.map((item, index) => {
              const isOpen = openAssignmentId === item.assignment_id;

              return (
                <div
                  key={item.assignment_id}
                  className="overflow-hidden rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]"
                >
                  <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <span className="text-xs font-semibold">{index + 1}</span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <p className="text-[15px] font-semibold text-slate-950">
                            {item.driver_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {text({
                              ro: "Detalii sesiune și verificări de predare/preluare.",
                              en: "Session details and handover checks.",
                              de: "Sitzungsdetails und Übergabeprüfungen.",
                            })}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                            {text({ ro: "Start", en: "Start", de: "Start" })}:{" "}
                            {formatDate(item.started_at)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                            {text({ ro: "Final", en: "End", de: "Ende" })}:{" "}
                            {formatDate(item.ended_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenAssignmentId((prev) =>
                          prev === item.assignment_id ? null : item.assignment_id
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                    >
                      {isOpen
                        ? text({
                            ro: "Ascunde detalii",
                            en: "Hide details",
                            de: "Details ausblenden",
                          })
                        : text({
                            ro: "Vezi detalii",
                            en: "View details",
                            de: "Details ansehen",
                          })}
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <InfoCard
                          icon={<Gauge className="h-4 w-4" />}
                          label={text({ ro: "KM start", en: "KM start", de: "KM Start" })}
                          value={item.mileage_start ?? "—"}
                        />
                        <InfoCard
                          icon={<Gauge className="h-4 w-4" />}
                          label={text({ ro: "KM final", en: "KM end", de: "KM Ende" })}
                          value={item.mileage_end ?? "—"}
                        />
                        <InfoCard
                          icon={<AlertTriangle className="h-4 w-4" />}
                          label={text({
                            ro: "Avertizări start",
                            en: "Warnings start",
                            de: "Warnungen Start",
                          })}
                          value={item.dashboard_warnings_start || "—"}
                        />
                        <InfoCard
                          icon={<AlertTriangle className="h-4 w-4" />}
                          label={text({
                            ro: "Avertizări final",
                            en: "Warnings end",
                            de: "Warnungen Ende",
                          })}
                          value={item.dashboard_warnings_end || "—"}
                        />
                        <InfoCard
                          icon={<ShieldAlert className="h-4 w-4" />}
                          label={text({
                            ro: "Daune start",
                            en: "Damage start",
                            de: "Schäden Start",
                          })}
                          value={item.damage_notes_start || "—"}
                        />
                        <InfoCard
                          icon={<ShieldAlert className="h-4 w-4" />}
                          label={text({
                            ro: "Daune final",
                            en: "Damage end",
                            de: "Schäden Ende",
                          })}
                          value={item.damage_notes_end || "—"}
                        />
                        <InfoCard
                          icon={<FileText className="h-4 w-4" />}
                          label={text({
                            ro: "Note start",
                            en: "Notes start",
                            de: "Notizen Start",
                          })}
                          value={item.notes_start || "—"}
                        />
                        <div className="md:col-span-2 xl:col-span-2">
                          <InfoCard
                            icon={<FileText className="h-4 w-4" />}
                            label={text({
                              ro: "Note final",
                              en: "Notes end",
                              de: "Notizen Ende",
                            })}
                            value={item.notes_end || "—"}
                          />
                        </div>

                        <div className="md:col-span-2 xl:col-span-3 rounded-[18px] border border-slate-200 bg-white p-4">
                          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {text({
                              ro: "Checklist vehicul",
                              en: "Vehicle checklist",
                              de: "Fahrzeug-Checkliste",
                            })}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <ChecklistBadge
                              icon={<FileText className="h-3.5 w-3.5" />}
                              label={text({
                                ro: "Documente",
                                en: "Documents",
                                de: "Dokumente",
                              })}
                              value={yesNo(item.has_documents)}
                              ok={item.has_documents}
                            />
                            <ChecklistBadge
                              icon={<HeartPulse className="h-3.5 w-3.5" />}
                              label={text({
                                ro: "Trusă medicală",
                                en: "Medkit",
                                de: "Erste-Hilfe-Set",
                              })}
                              value={yesNo(item.has_medkit)}
                              ok={item.has_medkit}
                            />
                            <ChecklistBadge
                              icon={<Wrench className="h-3.5 w-3.5" />}
                              label={text({
                                ro: "Extinctor",
                                en: "Extinguisher",
                                de: "Feuerlöscher",
                              })}
                              value={yesNo(item.has_extinguisher)}
                              ok={item.has_extinguisher}
                            />
                            <ChecklistBadge
                              icon={<TriangleAlert className="h-3.5 w-3.5" />}
                              label={text({
                                ro: "Triunghi",
                                en: "Warning triangle",
                                de: "Warndreieck",
                              })}
                              value={yesNo(item.has_warning_triangle)}
                              ok={item.has_warning_triangle}
                            />
                            <ChecklistBadge
                              icon={<CarFront className="h-3.5 w-3.5" />}
                              label={text({
                                ro: "Roată de rezervă",
                                en: "Spare wheel",
                                de: "Ersatzrad",
                              })}
                              value={yesNo(item.has_spare_wheel)}
                              ok={item.has_spare_wheel}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>

      <p className="mt-2.5 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function ChecklistBadge({
  icon,
  label,
  value,
  ok,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-700"
      )}
    >
      {icon}
      {label}: {value}
    </span>
  );
}