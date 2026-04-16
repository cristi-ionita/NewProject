"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Gauge,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import HeroStatCard from "@/components/ui/hero-stat-card";
import LoadingCard from "@/components/ui/loading-card";
import PageHero from "@/components/ui/page-hero";
import SectionCard from "@/components/ui/section-card";

import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import { useI18n } from "@/lib/i18n/use-i18n";
import { getMyVehicle, type MyVehicleResponse } from "@/services/my-vehicle.api";

type SupportedLocale = "ro" | "en" | "de";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null, locale: SupportedLocale = "ro") {
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

function getStatusBadgeClass(status?: string | null) {
  const normalized = normalize(status);

  if (normalized === "active" || normalized === "completed" || normalized === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "in_progress" || normalized === "scheduled" || normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "open") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function MyVehiclePage() {
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [data, setData] = useState<MyVehicleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[safeLocale];
  }

  function yesNo(value?: boolean | null) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  function getStatusLabel(status?: string | null) {
    const normalized = normalize(status);

    if (normalized === "active") {
      return text({ ro: "Activ", en: "Active", de: "Aktiv" });
    }

    if (normalized === "completed") {
      return text({ ro: "Complet", en: "Completed", de: "Abgeschlossen" });
    }

    if (normalized === "resolved") {
      return text({ ro: "Rezolvat", en: "Resolved", de: "Gelöst" });
    }

    if (normalized === "in_progress") {
      return text({ ro: "În lucru", en: "In progress", de: "In Bearbeitung" });
    }

    if (normalized === "scheduled") {
      return text({ ro: "Programat", en: "Scheduled", de: "Geplant" });
    }

    if (normalized === "open") {
      return text({ ro: "Deschis", en: "Open", de: "Offen" });
    }

    if (normalized === "pending") {
      return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
    }

    return status || "—";
  }

  const loadVehicle = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setData(null);
        setError(
          text({
            ro: "Sesiune invalidă.",
            en: "Invalid session.",
            de: "Ungültige Sitzung.",
          })
        );
        return;
      }

      const result = await getMyVehicle(session.unique_code);
      setData(result);
    } catch (err: unknown) {
      setData(null);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca datele vehiculului.",
            en: "Could not load vehicle data.",
            de: "Fahrzeugdaten konnten nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [safeLocale]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const openIssuesCount = useMemo(() => data?.open_issues.length ?? 0, [data]);
  const hasVehicle = Boolean(data?.vehicle);

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !data) {
    return <ErrorAlert message={error} />;
  }

  if (!data) {
    return (
      <EmptyState
        title={text({
          ro: "Nu există date",
          en: "There is no data",
          de: "Es sind keine Daten vorhanden",
        })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<CarFront className="h-7 w-7" />}
        title={text({
          ro: "Mașina mea",
          en: "My Vehicle",
          de: "Mein Fahrzeug",
        })}
        description={text({
          ro: "Vezi informațiile despre mașina ta, alocare, handover și problemele deschise.",
          en: "View your vehicle information, assignment, handover and open issues.",
          de: "Sieh Informationen zu deinem Fahrzeug, der Zuweisung, Übergabe und offenen Problemen.",
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-4">
            <HeroStatCard
              icon={<UserRound className="h-4 w-4" />}
              label={text({
                ro: "Utilizator",
                en: "User",
                de: "Benutzer",
              })}
              value={data.user.full_name}
            />
            <HeroStatCard
              icon={<CarFront className="h-4 w-4" />}
              label={text({
                ro: "Vehicul",
                en: "Vehicle",
                de: "Fahrzeug",
              })}
              value={hasVehicle ? data.vehicle?.license_plate || "—" : "—"}
            />
            <HeroStatCard
              icon={<Gauge className="h-4 w-4" />}
              label={text({
                ro: "Kilometraj",
                en: "Mileage",
                de: "Kilometerstand",
              })}
              value={hasVehicle ? String(data.vehicle?.current_mileage ?? "—") : "—"}
            />
            <HeroStatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label={text({
                ro: "Probleme deschise",
                en: "Open issues",
                de: "Offene Probleme",
              })}
              value={openIssuesCount}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title={text({
            ro: "Prezentare generală",
            en: "Overview",
            de: "Übersicht",
          })}
          icon={<UserRound className="h-5 w-5" />}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile
              label={text({ ro: "Nume", en: "Name", de: "Name" })}
              value={data.user.full_name}
            />
            <InfoTile
              label={text({ ro: "Cod", en: "Code", de: "Code" })}
              value={data.user.unique_code}
            />
            <InfoTile
              label={text({ ro: "Tură", en: "Shift", de: "Schicht" })}
              value={data.user.shift_number || "-"}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={text({
            ro: "Starea curentă",
            en: "Current state",
            de: "Aktueller Status",
          })}
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          {!data.assignment ? (
            <EmptyState
              title={text({
                ro: "Nu există assignment activ",
                en: "There is no active assignment",
                de: "Es gibt keine aktive Zuweisung",
              })}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <InfoTile
                label={text({
                  ro: "ID asignare",
                  en: "Assignment ID",
                  de: "Zuweisungs-ID",
                })}
                value={String(data.assignment.id)}
              />
              <StatusTile
                label={text({ ro: "Status", en: "Status", de: "Status" })}
                value={data.assignment.status}
                displayValue={getStatusLabel(data.assignment.status)}
              />
              <InfoTile
                label={text({ ro: "Pornit", en: "Started", de: "Gestartet" })}
                value={formatDate(data.assignment.started_at, safeLocale)}
              />
            </div>
          )}
        </SectionCard>
      </section>

      {!data.vehicle ? (
        <EmptyState
          title={text({
            ro: "Nu ai o mașină atribuită",
            en: "You do not have an assigned vehicle",
            de: "Du hast kein zugewiesenes Fahrzeug",
          })}
          description={text({
            ro: "În acest moment nu există un vehicul asociat contului tău.",
            en: "At the moment there is no vehicle assigned to your account.",
            de: "Im Moment ist deinem Konto kein Fahrzeug zugewiesen.",
          })}
        />
      ) : (
        <>
          <SectionCard
            title={`${data.vehicle.license_plate} · ${data.vehicle.brand} ${data.vehicle.model}`}
            icon={<CarFront className="h-5 w-5" />}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile
                label={text({ ro: "Marcă", en: "Brand", de: "Marke" })}
                value={data.vehicle.brand}
              />
              <InfoTile
                label={text({ ro: "Model", en: "Model", de: "Modell" })}
                value={data.vehicle.model}
              />
              <InfoTile
                label={text({ ro: "Număr", en: "Plate", de: "Kennzeichen" })}
                value={data.vehicle.license_plate}
              />
              <InfoTile
                label={text({ ro: "An", en: "Year", de: "Jahr" })}
                value={String(data.vehicle.year)}
              />
              <InfoTile label="VIN" value={data.vehicle.vin || "-"} />
              <StatusTile
                label={text({ ro: "Status", en: "Status", de: "Status" })}
                value={data.vehicle.status}
                displayValue={getStatusLabel(data.vehicle.status)}
              />
              <InfoTile
                label={text({
                  ro: "Kilometraj curent",
                  en: "Current mileage",
                  de: "Aktueller Kilometerstand",
                })}
                value={String(data.vehicle.current_mileage ?? "-")}
              />
            </div>
          </SectionCard>

          <section className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title={text({
                ro: "Preluare",
                en: "Handover start",
                de: "Übergabestart",
              })}
              icon={<ClipboardList className="h-5 w-5" />}
            >
              {data.handover_start ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <StatusTile
                    label={text({
                      ro: "Completat",
                      en: "Completed",
                      de: "Abgeschlossen",
                    })}
                    value={data.handover_start.is_completed ? "completed" : "pending"}
                    displayValue={yesNo(data.handover_start.is_completed)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Kilometri start",
                      en: "Mileage start",
                      de: "Kilometer Start",
                    })}
                    value={String(data.handover_start.mileage_start ?? "-")}
                  />
                  <InfoTile
                    label={text({
                      ro: "Avertizări",
                      en: "Warnings",
                      de: "Warnungen",
                    })}
                    value={data.handover_start.dashboard_warnings_start || "-"}
                  />
                  <InfoTile
                    label={text({
                      ro: "Daune",
                      en: "Damage notes",
                      de: "Schadensnotizen",
                    })}
                    value={data.handover_start.damage_notes_start || "-"}
                  />
                  <div className="md:col-span-2">
                    <InfoTile
                      label={text({
                        ro: "Note",
                        en: "Notes",
                        de: "Notizen",
                      })}
                      value={data.handover_start.notes_start || "-"}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={text({
                    ro: "Nu există date de preluare",
                    en: "There is no handover start data",
                    de: "Es gibt keine Start-Übergabedaten",
                  })}
                />
              )}
            </SectionCard>

            <SectionCard
              title={text({
                ro: "Predare",
                en: "Handover end",
                de: "Übergabeende",
              })}
              icon={<ClipboardList className="h-5 w-5" />}
            >
              {data.handover_end ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <StatusTile
                    label={text({
                      ro: "Completat",
                      en: "Completed",
                      de: "Abgeschlossen",
                    })}
                    value={data.handover_end.is_completed ? "completed" : "pending"}
                    displayValue={yesNo(data.handover_end.is_completed)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Kilometri final",
                      en: "Mileage end",
                      de: "Kilometer Ende",
                    })}
                    value={String(data.handover_end.mileage_end ?? "-")}
                  />
                  <InfoTile
                    label={text({
                      ro: "Avertizări",
                      en: "Warnings",
                      de: "Warnungen",
                    })}
                    value={data.handover_end.dashboard_warnings_end || "-"}
                  />
                  <InfoTile
                    label={text({
                      ro: "Daune",
                      en: "Damage notes",
                      de: "Schadensnotizen",
                    })}
                    value={data.handover_end.damage_notes_end || "-"}
                  />
                  <div className="md:col-span-2">
                    <InfoTile
                      label={text({
                        ro: "Note",
                        en: "Notes",
                        de: "Notizen",
                      })}
                      value={data.handover_end.notes_end || "-"}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={text({
                    ro: "Nu există date de predare",
                    en: "There is no handover end data",
                    de: "Es gibt keine End-Übergabedaten",
                  })}
                />
              )}
            </SectionCard>
          </section>

          <SectionCard
            title={text({
              ro: "Probleme deschise",
              en: "Open issues",
              de: "Offene Probleme",
            })}
            icon={<Wrench className="h-5 w-5" />}
          >
            {data.open_issues.length === 0 ? (
              <EmptyState
                title={text({
                  ro: "Nu există issue-uri deschise",
                  en: "There are no open issues",
                  de: "Es gibt keine offenen Probleme",
                })}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.open_issues.map((issue, index) => (
                  <article
                    key={issue.id}
                    className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <span className="text-xs font-semibold">{index + 1}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {text({
                            ro: "Problema",
                            en: "Issue",
                            de: "Problem",
                          })}{" "}
                          #{issue.id}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                          getStatusBadgeClass(issue.status)
                        )}
                      >
                        {getStatusLabel(issue.status)}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <InfoTile
                        label={text({
                          ro: "Service în km",
                          en: "Service in km",
                          de: "Service in km",
                        })}
                        value={String(issue.need_service_in_km ?? "-")}
                      />
                      <InfoTile
                        label={text({
                          ro: "Creat",
                          en: "Created",
                          de: "Erstellt",
                        })}
                        value={formatDate(issue.created_at, safeLocale)}
                      />
                      <InfoTile
                        label={text({
                          ro: "Frâne",
                          en: "Brakes",
                          de: "Bremsen",
                        })}
                        value={yesNo(issue.need_brakes)}
                      />
                      <InfoTile
                        label={text({
                          ro: "Anvelope",
                          en: "Tires",
                          de: "Reifen",
                        })}
                        value={yesNo(issue.need_tires)}
                      />
                      <InfoTile
                        label={text({
                          ro: "Ulei",
                          en: "Oil",
                          de: "Öl",
                        })}
                        value={yesNo(issue.need_oil)}
                      />
                      <InfoTile
                        label={text({
                          ro: "Verificări bord",
                          en: "Dashboard checks",
                          de: "Dashboard-Prüfungen",
                        })}
                        value={issue.dashboard_checks || "-"}
                      />
                      <div className="md:col-span-2">
                        <InfoTile
                          label={text({
                            ro: "Alte probleme",
                            en: "Other problems",
                            de: "Andere Probleme",
                          })}
                          value={issue.other_problems || "-"}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatusTile({
  label,
  value,
  displayValue,
}: {
  label: string;
  value: string;
  displayValue?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <div className="mt-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
            getStatusBadgeClass(value)
          )}
        >
          {displayValue || value}
        </span>
      </div>
    </div>
  );
}