"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOccupiedVehicles,
  getUsersWithoutContract,
  getUsersWithoutDriverLicense,
  getUsersWithoutProfile,
  getVehiclesWithIssues,
} from "@/services/alerts.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  FileWarning,
  IdCard,
  UserRound,
} from "lucide-react";

type AlertUser = {
  user_id: number;
  full_name: string;
  unique_code?: string | null;
  shift_number?: string | null;
  is_active?: boolean;
};

type AlertVehicleIssue = {
  vehicle_id: number;
  license_plate: string;
  brand: string;
  model: string;
  open_issues_count: number;
  in_progress_issues_count?: number;
  latest_issue_created_at?: string | null;
};

type OccupiedVehicle = {
  assignment_id: number;
  vehicle_id: number;
  license_plate: string;
  brand: string;
  model: string;
  user_id: number;
  user_name: string;
  started_at?: string;
};

type AlertsPageData = {
  noProfile: { users: AlertUser[] };
  noContract: { users: AlertUser[] };
  noLicense: { users: AlertUser[] };
  vehiclesIssues: { vehicles: AlertVehicleIssue[] };
  occupied: { vehicles: OccupiedVehicle[] };
};

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load alerts.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load alerts.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminAlertsPage() {
  const { locale, t } = useI18n();

  const [data, setData] = useState<AlertsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [noProfile, noContract, noLicense, vehiclesIssues, occupied] =
          await Promise.all([
            getUsersWithoutProfile(),
            getUsersWithoutContract(),
            getUsersWithoutDriverLicense(),
            getVehiclesWithIssues(),
            getOccupiedVehicles(),
          ]);

        setData({
          noProfile,
          noContract,
          noLicense,
          vehiclesIssues,
          occupied,
        });
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const counts = useMemo(() => {
    return {
      noProfile: data?.noProfile.users.length ?? 0,
      noContract: data?.noContract.users.length ?? 0,
      noLicense: data?.noLicense.users.length ?? 0,
      vehiclesIssues: data?.vehiclesIssues.vehicles.length ?? 0,
      occupied: data?.occupied.vehicles.length ?? 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">{t("common", "loading")}</p>
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

  if (!data) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <p className="text-sm text-slate-500">
          {text({
            ro: "Nu există date disponibile.",
            en: "No data available.",
            de: "Keine Daten verfügbar.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2.5">
              <div>
                <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                  {t("nav", "alerts")}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Vezi rapid utilizatorii sau vehiculele care necesită atenție.",
                    en: "Quickly review users and vehicles that need attention.",
                    de: "Sieh schnell Benutzer und Fahrzeuge, die Aufmerksamkeit benötigen.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <HeroStatCard
                icon={<UserRound className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Fără profil",
                  en: "No profile",
                  de: "Ohne Profil",
                })}
                value={String(counts.noProfile)}
              />
              <HeroStatCard
                icon={<FileWarning className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Fără contract",
                  en: "No contract",
                  de: "Ohne Vertrag",
                })}
                value={String(counts.noContract)}
              />
              <HeroStatCard
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Vehicule cu probleme",
                  en: "Vehicles with issues",
                  de: "Fahrzeuge mit Problemen",
                })}
                value={String(counts.vehiclesIssues)}
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
                  ro: "Alerte active",
                  en: "Active alerts",
                  de: "Aktive Warnungen",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Categorii rapide",
                  en: "Quick categories",
                  de: "Schnellkategorien",
                })}
              </h2>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatusOverviewCard
              title={text({
                ro: "Fără profil",
                en: "No profile",
                de: "Ohne Profil",
              })}
              value={counts.noProfile}
              badgeClass="border-slate-200 bg-slate-50 text-slate-700"
            />
            <StatusOverviewCard
              title={text({
                ro: "Fără contract",
                en: "No contract",
                de: "Ohne Vertrag",
              })}
              value={counts.noContract}
              badgeClass="border-rose-200 bg-rose-50 text-rose-700"
            />
            <StatusOverviewCard
              title={text({
                ro: "Fără permis",
                en: "No license",
                de: "Ohne Führerschein",
              })}
              value={counts.noLicense}
              badgeClass="border-amber-200 bg-amber-50 text-amber-700"
            />
            <StatusOverviewCard
              title={text({
                ro: "Vehicule cu probleme",
                en: "Vehicle issues",
                de: "Fahrzeugprobleme",
              })}
              value={counts.vehiclesIssues}
              badgeClass="border-blue-200 bg-blue-50 text-blue-700"
            />
            <StatusOverviewCard
              title={text({
                ro: "Vehicule ocupate",
                en: "Occupied vehicles",
                de: "Belegte Fahrzeuge",
              })}
              value={counts.occupied}
              badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
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
            <QuickRow
              label={text({
                ro: "Utilizatori fără profil",
                en: "Users without profile",
                de: "Benutzer ohne Profil",
              })}
              value={String(counts.noProfile)}
            />
            <QuickRow
              label={text({
                ro: "Utilizatori fără permis",
                en: "Users without license",
                de: "Benutzer ohne Führerschein",
              })}
              value={String(counts.noLicense)}
            />
            <QuickRow
              label={text({
                ro: "Vehicule ocupate",
                en: "Occupied vehicles",
                de: "Belegte Fahrzeuge",
              })}
              value={String(counts.occupied)}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AlertListCard
          title={text({
            ro: "Utilizatori fără profil",
            en: "Users without profile",
            de: "Benutzer ohne Profil",
          })}
          description={text({
            ro: "Conturi active care nu au profil completat.",
            en: "Active accounts without a completed profile.",
            de: "Aktive Konten ohne ausgefülltes Profil.",
          })}
          count={data.noProfile.users.length}
        >
          {data.noProfile.users.length ? (
            <div className="space-y-3">
              {data.noProfile.users.map((user) => (
                <UserAlertRow
                  key={user.user_id}
                  name={user.full_name}
                  subtext={`${user.unique_code || "—"}${
                    user.shift_number
                      ? ` • ${text({
                          ro: `Tura ${user.shift_number}`,
                          en: `Shift ${user.shift_number}`,
                          de: `Schicht ${user.shift_number}`,
                        })}`
                      : ""
                  }`}
                />
              ))}
            </div>
          ) : (
            <EmptyText
              text={text({
                ro: "Nu există utilizatori fără profil.",
                en: "There are no users without profile.",
                de: "Es gibt keine Benutzer ohne Profil.",
              })}
            />
          )}
        </AlertListCard>

        <AlertListCard
          title={text({
            ro: "Utilizatori fără contract",
            en: "Users without contract",
            de: "Benutzer ohne Vertrag",
          })}
          description={text({
            ro: "Conturi care au nevoie de documente contractuale.",
            en: "Accounts that still need contract documents.",
            de: "Konten, die noch Vertragsdokumente benötigen.",
          })}
          count={data.noContract.users.length}
        >
          {data.noContract.users.length ? (
            <div className="space-y-3">
              {data.noContract.users.map((user) => (
                <UserAlertRow
                  key={user.user_id}
                  name={user.full_name}
                  subtext={user.unique_code || "—"}
                />
              ))}
            </div>
          ) : (
            <EmptyText
              text={text({
                ro: "Nu există utilizatori fără contract.",
                en: "There are no users without contract.",
                de: "Es gibt keine Benutzer ohne Vertrag.",
              })}
            />
          )}
        </AlertListCard>

        <AlertListCard
          title={text({
            ro: "Utilizatori fără permis",
            en: "Users without driver license",
            de: "Benutzer ohne Führerschein",
          })}
          description={text({
            ro: "Utilizatori care nu au documentul de permis încărcat.",
            en: "Users who do not have a driver license document uploaded.",
            de: "Benutzer, die noch keinen Führerschein hochgeladen haben.",
          })}
          count={data.noLicense.users.length}
        >
          {data.noLicense.users.length ? (
            <div className="space-y-3">
              {data.noLicense.users.map((user) => (
                <UserAlertRow
                  key={user.user_id}
                  name={user.full_name}
                  subtext={user.unique_code || "—"}
                />
              ))}
            </div>
          ) : (
            <EmptyText
              text={text({
                ro: "Nu există utilizatori fără permis.",
                en: "There are no users without driver license.",
                de: "Es gibt keine Benutzer ohne Führerschein.",
              })}
            />
          )}
        </AlertListCard>

        <AlertListCard
          title={text({
            ro: "Vehicule cu probleme",
            en: "Vehicles with issues",
            de: "Fahrzeuge mit Problemen",
          })}
          description={text({
            ro: "Vehicule cu probleme deschise sau în lucru.",
            en: "Vehicles with open or in-progress issues.",
            de: "Fahrzeuge mit offenen oder laufenden Problemen.",
          })}
          count={data.vehiclesIssues.vehicles.length}
        >
          {data.vehiclesIssues.vehicles.length ? (
            <div className="space-y-3">
              {data.vehiclesIssues.vehicles.map((vehicle) => (
                <VehicleIssueRow
                  key={vehicle.vehicle_id}
                  title={`${vehicle.license_plate} • ${vehicle.brand} ${vehicle.model}`}
                  subtitle={`${text({
                    ro: `Deschise: ${vehicle.open_issues_count}`,
                    en: `Open: ${vehicle.open_issues_count}`,
                    de: `Offen: ${vehicle.open_issues_count}`,
                  })} • ${text({
                    ro: `În lucru: ${vehicle.in_progress_issues_count ?? 0}`,
                    en: `In progress: ${vehicle.in_progress_issues_count ?? 0}`,
                    de: `In Bearbeitung: ${vehicle.in_progress_issues_count ?? 0}`,
                  })}`}
                />
              ))}
            </div>
          ) : (
            <EmptyText
              text={text({
                ro: "Nu există vehicule cu probleme.",
                en: "There are no vehicles with issues.",
                de: "Es gibt keine Fahrzeuge mit Problemen.",
              })}
            />
          )}
        </AlertListCard>
      </div>

      <AlertListCard
        title={text({
          ro: "Vehicule ocupate",
          en: "Occupied vehicles",
          de: "Belegte Fahrzeuge",
        })}
        description={text({
          ro: "Vehicule aflate în uz și utilizatorii care le folosesc.",
          en: "Vehicles currently in use and the assigned users.",
          de: "Fahrzeuge, die aktuell genutzt werden, und die zugewiesenen Benutzer.",
        })}
        count={data.occupied.vehicles.length}
      >
        {data.occupied.vehicles.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.occupied.vehicles.map((vehicle) => (
              <div
                key={vehicle.assignment_id}
                className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="font-semibold text-slate-900">{vehicle.license_plate}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {vehicle.brand} {vehicle.model}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {text({
                    ro: "Alocat către",
                    en: "Assigned to",
                    de: "Zugewiesen an",
                  })}{" "}
                  <span className="font-medium text-slate-700">{vehicle.user_name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyText
            text={text({
              ro: "Nu există vehicule ocupate.",
              en: "There are no occupied vehicles.",
              de: "Es gibt keine belegten Fahrzeuge.",
            })}
          />
        )}
      </AlertListCard>
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

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function StatusOverviewCard({
  title,
  value,
  badgeClass,
}: {
  title: string;
  value: number;
  badgeClass: string;
}) {
  return (
    <div className={cn("rounded-[18px] border p-4", badgeClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AlertListCard({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {count}
        </span>
      </div>

      {children}
    </section>
  );
}

function UserAlertRow({
  name,
  subtext,
}: {
  name: string;
  subtext: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="font-medium text-slate-900">{name}</div>
      <div className="mt-1 text-xs text-slate-500">{subtext}</div>
    </div>
  );
}

function VehicleIssueRow({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}