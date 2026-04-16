"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVehicleLiveStatus,
  type VehicleLiveStatusItem,
} from "@/services/vehicles.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  CarFront,
  ClipboardList,
  RefreshCw,
  Settings2,
  UserRound,
  Wrench,
} from "lucide-react";

import InfoRow from "@/components/ui/info-row";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { detail?: unknown } };
  };
  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load live status.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item?.msg || "Error")
      .join(", ");
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) {
    return (detail as { msg?: string }).msg || "Error";
  }

  return "Failed to load live status.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function VehicleLiveStatusPage() {
  const { locale, t } = useI18n();

  const [vehicles, setVehicles] = useState<VehicleLiveStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getVehicleLiveStatus();
      setVehicles(data?.vehicles ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const occupiedCount = useMemo(
    () =>
      vehicles.filter((vehicle) => vehicle.availability === "occupied").length,
    [vehicles]
  );

  const freeCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.availability === "free").length,
    [vehicles]
  );

  const serviceCount = useMemo(
    () =>
      vehicles.filter((vehicle) => vehicle.vehicle_status === "in_service")
        .length,
    [vehicles]
  );

  function getVehicleStatusLabel(status: string) {
    if (status === "in_service") {
      return text({ ro: "În service", en: "In service", de: "Im Service" });
    }

    if (status === "inactive") {
      return text({ ro: "Inactiv", en: "Inactive", de: "Inaktiv" });
    }

    if (status === "sold") {
      return text({ ro: "Vândut", en: "Sold", de: "Verkauft" });
    }

    return text({ ro: "Activ", en: "Active", de: "Aktiv" });
  }

  function getVehicleStatusClass(status: string) {
    if (status === "in_service") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (status === "inactive") {
      return "border-slate-200 bg-slate-100 text-slate-700";
    }

    if (status === "sold") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  function getAvailabilityLabel(availability: string) {
    return availability === "occupied"
      ? text({ ro: "Ocupată", en: "Occupied", de: "Belegt" })
      : text({ ro: "Liberă", en: "Free", de: "Frei" });
  }

  function getAvailabilityClass(availability: string) {
    return availability === "occupied"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-white text-slate-700";
  }

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<CarFront className="h-7 w-7" />}
        title={text({
          ro: "Status live vehicule",
          en: "Vehicle live status",
          de: "Fahrzeug-Livestatus",
        })}
        description={text({
          ro: "Vezi instant disponibilitatea și alocările active din flotă.",
          en: "Instantly see fleet availability and active assignments.",
          de: "Sieh sofort Verfügbarkeit und aktive Zuweisungen der Flotte.",
        })}
        actions={
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing
              ? t("common", "loading")
              : text({
                  ro: "Actualizează",
                  en: "Refresh",
                  de: "Aktualisieren",
                })}
          </button>
        }
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label={text({
                ro: "Total vehicule",
                en: "Total vehicles",
                de: "Gesamtfahrzeuge",
              })}
              value={vehicles.length}
            />
            <HeroStatCard
              icon={<UserRound className="h-4 w-4" />}
              label={text({
                ro: "Ocupate",
                en: "Occupied",
                de: "Belegt",
              })}
              value={occupiedCount}
            />
            <HeroStatCard
              icon={<Wrench className="h-4 w-4" />}
              label={text({
                ro: "În service",
                en: "In service",
                de: "Im Service",
              })}
              value={`${serviceCount} / ${text({
                ro: "Libere",
                en: "Free",
                de: "Frei",
              })}: ${freeCount}`}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      {vehicles.length === 0 ? (
        <EmptyState
          title={text({
            ro: "Nu există vehicule.",
            en: "There are no vehicles.",
            de: "Es gibt keine Fahrzeuge.",
          })}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.vehicle_id}
              className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white to-slate-50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {vehicle.license_plate}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {vehicle.brand} {vehicle.model} • {vehicle.year}
                  </p>
                </div>

                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    getAvailabilityClass(vehicle.availability)
                  )}
                >
                  {getAvailabilityLabel(vehicle.availability)}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <InfoRow
                  icon={<Settings2 className="h-4 w-4 text-slate-400" />}
                  label={text({
                    ro: "Status",
                    en: "Status",
                    de: "Status",
                  })}
                  value={
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        getVehicleStatusClass(vehicle.vehicle_status)
                      )}
                    >
                      {getVehicleStatusLabel(vehicle.vehicle_status)}
                    </span>
                  }
                />

                <InfoRow
                  icon={<UserRound className="h-4 w-4 text-slate-400" />}
                  label={text({
                    ro: "Utilizator",
                    en: "User",
                    de: "Benutzer",
                  })}
                  value={vehicle.assigned_to_name || "—"}
                />

                <InfoRow
                  icon={<ClipboardList className="h-4 w-4 text-slate-400" />}
                  label={text({
                    ro: "Schimb",
                    en: "Shift",
                    de: "Schicht",
                  })}
                  value={vehicle.assigned_to_shift_number || "—"}
                />
              </div>

              {!vehicle.assigned_to_name ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {text({
                    ro: "Nicio alocare activă",
                    en: "No active assignment",
                    de: "Keine aktive Zuweisung",
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
