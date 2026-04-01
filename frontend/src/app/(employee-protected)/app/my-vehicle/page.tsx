"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import { getMyVehicle, MyVehicleResponse } from "@/services/my-vehicle.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Gauge,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cardClass() {
  return "rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
}

function tileClass() {
  return "rounded-[18px] border border-slate-200 bg-slate-50/80 p-4";
}

function sectionLabelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
}

function displayValueClass() {
  return "mt-2 text-sm font-medium text-slate-900";
}

function formatDate(value?: string | null, locale: "ro" | "en" | "de" = "ro") {
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
  const normalized = status?.toLowerCase?.() || "";

  if (normalized === "active" || normalized === "completed" || normalized === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "in_progress" || normalized === "scheduled") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "open") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function MyVehiclePage() {
  const session = getUserSession();
  const { locale } = useI18n();

  const [data, setData] = useState<MyVehicleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function yesNo(value?: boolean | null) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  function getStatusLabel(status?: string | null) {
    const normalized = status?.toLowerCase?.() || "";

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

  useEffect(() => {
    async function load() {
      try {
        if (!session?.unique_code) {
          setError(
            text({
              ro: "Sesiune invalidă.",
              en: "Invalid session.",
              de: "Ungültige Sitzung.",
            })
          );
          setLoading(false);
          return;
        }

        const result = await getMyVehicle(session.unique_code);
        setData(result);
      } catch (err: unknown) {
        setError(
          extractErrorMessage(
            err,
            text({
              ro: "Nu am putut încărca datele vehiculului",
              en: "Could not load vehicle data",
              de: "Fahrzeugdaten konnten nicht geladen werden",
            })
          )
        );
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.unique_code, locale]);

  const openIssuesCount = useMemo(() => data?.open_issues.length ?? 0, [data]);
  const hasVehicle = !!data?.vehicle;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă...",
              en: "Loading...",
              de: "Wird geladen...",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cardClass()}>
        <div className="text-sm text-slate-500">
          {text({
            ro: "Nu există date.",
            en: "There is no data.",
            de: "Es sind keine Daten vorhanden.",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-900">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2.5">
              <div>
                <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                  {text({
                    ro: "Mașina mea",
                    en: "My Vehicle",
                    de: "Mein Fahrzeug",
                  })}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Vezi informațiile despre mașina ta, alocare, handover și problemele deschise.",
                    en: "View your vehicle information, assignment, handover, and open issues.",
                    de: "Sieh Informationen zu deinem Fahrzeug, der Zuweisung, Übergabe und offenen Problemen.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-4">
              <HeroStatCard
                icon={<UserRound className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Utilizator",
                  en: "User",
                  de: "Benutzer",
                })}
                value={data.user.full_name}
              />
              <HeroStatCard
                icon={<CarFront className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Vehicul",
                  en: "Vehicle",
                  de: "Fahrzeug",
                })}
                value={hasVehicle ? data.vehicle!.license_plate : "—"}
              />
              <HeroStatCard
                icon={<Gauge className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Kilometraj",
                  en: "Mileage",
                  de: "Kilometerstand",
                })}
                value={hasVehicle ? String(data.vehicle!.current_mileage ?? "—") : "—"}
              />
              <HeroStatCard
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Probleme deschise",
                  en: "Open issues",
                  de: "Offene Probleme",
                })}
                value={String(openIssuesCount)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <UserRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Utilizator",
                  en: "User",
                  de: "Benutzer",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Prezentare generală",
                  en: "Overview",
                  de: "Übersicht",
                })}
              </h2>
            </div>
          </div>

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
        </div>

        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Alocare",
                  en: "Assignment",
                  de: "Zuweisung",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Starea curentă",
                  en: "Current state",
                  de: "Aktueller Status",
                })}
              </h2>
            </div>
          </div>

          {!data.assignment ? (
            <div className={tileClass()}>
              <p className="text-sm text-slate-500">
                {text({
                  ro: "Nu există assignment activ.",
                  en: "There is no active assignment.",
                  de: "Es gibt keine aktive Zuweisung.",
                })}
              </p>
            </div>
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
                value={formatDate(data.assignment.started_at, locale)}
              />
            </div>
          )}
        </div>
      </section>

      {!data.vehicle ? (
        <section className={cardClass()}>
          <div className={tileClass()}>
            <p className="text-sm text-slate-500">
              {text({
                ro: "Nu ai o mașină atribuită în acest moment.",
                en: "You do not have an assigned vehicle at the moment.",
                de: "Du hast momentan kein zugewiesenes Fahrzeug.",
              })}
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className={cardClass()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <CarFront className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Vehicul",
                    en: "Vehicle",
                    de: "Fahrzeug",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {data.vehicle.license_plate} · {data.vehicle.brand} {data.vehicle.model}
                </h2>
              </div>
            </div>

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
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className={cardClass()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {text({
                      ro: "Preluare",
                      en: "Handover",
                      de: "Übergabe",
                    })}
                  </p>
                  <h2 className="text-[17px] font-semibold text-slate-950">
                    {text({
                      ro: "Start",
                      en: "Start",
                      de: "Start",
                    })}
                  </h2>
                </div>
              </div>

              {data.handover_start ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <StatusTile
                    label={text({
                      ro: "Completat",
                      en: "Completed",
                      de: "Abgeschlossen",
                    })}
                    value={data.handover_start.is_completed ? "completed" : "pending"}
                    displayValue={data.handover_start.is_completed ? yesNo(true) : yesNo(false)}
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
                <div className={tileClass()}>
                  <p className="text-sm text-slate-500">
                    {text({
                      ro: "Nu există date de preluare.",
                      en: "There is no handover start data.",
                      de: "Es gibt keine Start-Übergabedaten.",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className={cardClass()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {text({
                      ro: "Predare",
                      en: "Handover",
                      de: "Übergabe",
                    })}
                  </p>
                  <h2 className="text-[17px] font-semibold text-slate-950">
                    {text({
                      ro: "Final",
                      en: "End",
                      de: "Ende",
                    })}
                  </h2>
                </div>
              </div>

              {data.handover_end ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <StatusTile
                    label={text({
                      ro: "Completat",
                      en: "Completed",
                      de: "Abgeschlossen",
                    })}
                    value={data.handover_end.is_completed ? "completed" : "pending"}
                    displayValue={data.handover_end.is_completed ? yesNo(true) : yesNo(false)}
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
                <div className={tileClass()}>
                  <p className="text-sm text-slate-500">
                    {text({
                      ro: "Nu există date de predare.",
                      en: "There is no handover end data.",
                      de: "Es gibt keine End-Übergabedaten.",
                    })}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className={cardClass()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Wrench className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Probleme",
                    en: "Issues",
                    de: "Probleme",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Probleme deschise",
                    en: "Open issues",
                    de: "Offene Probleme",
                  })}
                </h2>
              </div>
            </div>

            {data.open_issues.length === 0 ? (
              <div className={tileClass()}>
                <p className="text-sm text-slate-500">
                  {text({
                    ro: "Nu există issue-uri deschise.",
                    en: "There are no open issues.",
                    de: "Es gibt keine offenen Probleme.",
                  })}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.open_issues.map((issue, index) => (
                  <div
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
                        value={formatDate(issue.created_at, locale)}
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
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
      <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-white">{value}</p>
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
    <div className={tileClass()}>
      <p className={sectionLabelClass()}>{label}</p>
      <p className={displayValueClass()}>{value}</p>
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
    <div className={tileClass()}>
      <p className={sectionLabelClass()}>{label}</p>
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