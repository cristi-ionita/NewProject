"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVehicleLiveStatus,
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

  if (!detail) return "Failed to load live status.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load live status.";
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
      setVehicles(data.vehicles);
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
    () => vehicles.filter((vehicle) => vehicle.availability === "occupied").length,
    [vehicles]
  );

  const freeCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.availability === "free").length,
    [vehicles]
  );

  const serviceCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.vehicle_status === "in_service").length,
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
    return (
      <div className="section-card">
        <p className="text-sm text-slate-500">{t("common", "loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">
              {text({
                ro: "Status live vehicule",
                en: "Vehicle live status",
                de: "Fahrzeug-Livestatus",
              })}
            </h1>
            <p className="page-description">
              {text({
                ro: "Vezi instant disponibilitatea și alocările active din flotă.",
                en: "Instantly see fleet availability and active assignments.",
                de: "Sieh sofort Verfügbarkeit und aktive Zuweisungen der Flotte.",
              })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing
              ? t("common", "loading")
              : text({
                  ro: "Actualizează",
                  en: "Refresh",
                  de: "Aktualisieren",
                })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card">
          <p className="card-title">
            {text({ ro: "Total vehicule", en: "Total vehicles", de: "Gesamtfahrzeuge" })}
          </p>
          <p className="card-value">{vehicles.length}</p>
        </div>

        <div className="stat-card">
          <p className="card-title">
            {text({ ro: "Ocupate", en: "Occupied", de: "Belegt" })}
          </p>
          <p className="card-value">{occupiedCount}</p>
        </div>

        <div className="stat-card">
          <p className="card-title">
            {text({ ro: "În service", en: "In service", de: "Im Service" })}
          </p>
          <p className="card-value">{serviceCount}</p>
          <p className="mt-2 text-sm text-slate-500">
            {text({ ro: "Libere", en: "Free", de: "Frei" })}: {freeCount}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <div className="section-card">
          <p className="text-sm text-slate-500">
            {text({
              ro: "Nu există vehicule.",
              en: "There are no vehicles.",
              de: "Es gibt keine Fahrzeuge.",
            })}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <section key={vehicle.vehicle_id} className="section-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {vehicle.license_plate}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {vehicle.brand} {vehicle.model} • {vehicle.year}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getAvailabilityClass(
                    vehicle.availability
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {getAvailabilityLabel(vehicle.availability)}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">
                    {text({
                      ro: "Status vehicul",
                      en: "Vehicle status",
                      de: "Fahrzeugstatus",
                    })}
                  </span>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getVehicleStatusClass(
                      vehicle.vehicle_status
                    )}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {getVehicleStatusLabel(vehicle.vehicle_status)}
                  </span>
                </div>

                {vehicle.assigned_to_name ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text({
                        ro: "Alocare activă",
                        en: "Active assignment",
                        de: "Aktive Zuweisung",
                      })}
                    </p>

                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">
                          {text({
                            ro: "Utilizator",
                            en: "User",
                            de: "Benutzer",
                          })}
                          :
                        </span>{" "}
                        {vehicle.assigned_to_name}
                      </p>

                      <p className="text-sm text-slate-700">
                        <span className="font-medium">
                          {text({
                            ro: "Tură",
                            en: "Shift",
                            de: "Schicht",
                          })}
                          :
                        </span>{" "}
                        {vehicle.assigned_to_shift_number || "—"}
                      </p>

                      <p className="text-sm text-slate-700">
                        <span className="font-medium">
                          {text({
                            ro: "Assignment ID",
                            en: "Assignment ID",
                            de: "Zuweisungs-ID",
                          })}
                          :
                        </span>{" "}
                        {vehicle.active_assignment_id || "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    {text({
                      ro: "Nicio alocare activă.",
                      en: "No active assignment.",
                      de: "Keine aktive Zuweisung.",
                    })}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}