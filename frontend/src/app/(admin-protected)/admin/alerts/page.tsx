"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getOccupiedVehicles,
  getUsersWithoutContract,
  getUsersWithoutDriverLicense,
  getUsersWithoutProfile,
  getVehiclesWithIssues,
  type OccupiedVehicle,
  type UserAlert,
  type VehicleIssueAlert,
} from "@/services/alerts.api";
import { isApiClientError } from "@/lib/axios";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  FileWarning,
  UserRound,
} from "lucide-react";

import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

type AlertsPageData = {
  noProfile: UserAlert[];
  noContract: UserAlert[];
  noLicense: UserAlert[];
  vehiclesIssues: VehicleIssueAlert[];
  occupied: OccupiedVehicle[];
};

type AlertSection =
  | "noProfile"
  | "noContract"
  | "noLicense"
  | "vehiclesIssues"
  | "occupied";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminAlertsPage() {
  const { locale } = useI18n();

  const [data, setData] = useState<AlertsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<AlertSection>("noProfile");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  useEffect(() => {
    const load = async () => {
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
      } catch (err: unknown) {
        setError(
          isApiClientError(err)
            ? err.message
            : text({
                ro: "Nu s-au putut încărca alertele.",
                en: "Failed to load alerts.",
                de: "Warnungen konnten nicht geladen werden.",
              })
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const counts = useMemo(
    () => ({
      noProfile: data?.noProfile.length ?? 0,
      noContract: data?.noContract.length ?? 0,
      noLicense: data?.noLicense.length ?? 0,
      vehiclesIssues: data?.vehiclesIssues.length ?? 0,
      occupied: data?.occupied.length ?? 0,
    }),
    [data]
  );

  const sectionTitle = useMemo(() => {
    switch (activeSection) {
      case "noProfile":
        return text({
          ro: "Utilizatori fără profil",
          en: "Users without profile",
          de: "Benutzer ohne Profil",
        });
      case "noContract":
        return text({
          ro: "Utilizatori fără contract",
          en: "Users without contract",
          de: "Benutzer ohne Vertrag",
        });
      case "noLicense":
        return text({
          ro: "Utilizatori fără permis",
          en: "Users without license",
          de: "Benutzer ohne Führerschein",
        });
      case "vehiclesIssues":
        return text({
          ro: "Vehicule cu probleme",
          en: "Vehicles with issues",
          de: "Fahrzeuge mit Problemen",
        });
      case "occupied":
        return text({
          ro: "Vehicule ocupate",
          en: "Occupied vehicles",
          de: "Belegte Fahrzeuge",
        });
    }
  }, [activeSection, locale]);

  if (loading) {
    return <LoadingCard />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!data) {
    return (
      <EmptyState
        title={text({
          ro: "Nu există date disponibile.",
          en: "No data available.",
          de: "Keine Daten verfügbar.",
        })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-5">
        <StatusOverviewCard
          title={text({
            ro: "Fără profil",
            en: "No profile",
            de: "Ohne Profil",
          })}
          value={counts.noProfile}
          icon={<UserRound className="h-5 w-5" />}
          active={activeSection === "noProfile"}
          onClick={() => setActiveSection("noProfile")}
        />
        <StatusOverviewCard
          title={text({
            ro: "Fără contract",
            en: "No contract",
            de: "Ohne Vertrag",
          })}
          value={counts.noContract}
          icon={<FileWarning className="h-5 w-5" />}
          active={activeSection === "noContract"}
          onClick={() => setActiveSection("noContract")}
        />
        <StatusOverviewCard
          title={text({
            ro: "Fără permis",
            en: "No license",
            de: "Ohne Führerschein",
          })}
          value={counts.noLicense}
          icon={<ClipboardList className="h-5 w-5" />}
          active={activeSection === "noLicense"}
          onClick={() => setActiveSection("noLicense")}
        />
        <StatusOverviewCard
          title={text({
            ro: "Probleme vehicule",
            en: "Vehicle issues",
            de: "Fahrzeugprobleme",
          })}
          value={counts.vehiclesIssues}
          icon={<AlertTriangle className="h-5 w-5" />}
          active={activeSection === "vehiclesIssues"}
          onClick={() => setActiveSection("vehiclesIssues")}
        />
        <StatusOverviewCard
          title={text({
            ro: "Vehicule ocupate",
            en: "Occupied vehicles",
            de: "Belegte Fahrzeuge",
          })}
          value={counts.occupied}
          icon={<CarFront className="h-5 w-5" />}
          active={activeSection === "occupied"}
          onClick={() => setActiveSection("occupied")}
        />
      </div>

      <SectionCard title={sectionTitle}>
        <div className="space-y-3">
          {activeSection === "noProfile" &&
            (data.noProfile.length ? (
              data.noProfile.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.full_name}
                  subtitle={item.unique_code || "—"}
                />
              ))
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există utilizatori.",
                  en: "No users found.",
                  de: "Keine Benutzer gefunden.",
                })}
              />
            ))}

          {activeSection === "noContract" &&
            (data.noContract.length ? (
              data.noContract.map((item) => (
                <ListRow key={item.id} title={item.full_name} subtitle="—" />
              ))
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există utilizatori.",
                  en: "No users found.",
                  de: "Keine Benutzer gefunden.",
                })}
              />
            ))}

          {activeSection === "noLicense" &&
            (data.noLicense.length ? (
              data.noLicense.map((item) => (
                <ListRow key={item.id} title={item.full_name} subtitle="—" />
              ))
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există utilizatori.",
                  en: "No users found.",
                  de: "Keine Benutzer gefunden.",
                })}
              />
            ))}

          {activeSection === "vehiclesIssues" &&
            (data.vehiclesIssues.length ? (
              data.vehiclesIssues.map((item) => (
                <ListRow
                  key={item.id}
                  title={`${item.brand} ${item.model}`}
                  subtitle={`${item.license_plate} • ${item.issues_count} issue(s)`}
                />
              ))
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există vehicule cu probleme.",
                  en: "No vehicles with issues.",
                  de: "Keine Fahrzeuge mit Problemen.",
                })}
              />
            ))}

          {activeSection === "occupied" &&
            (data.occupied.length ? (
              data.occupied.map((item) => (
                <ListRow
                  key={item.assignment_id}
                  title={item.vehicle}
                  subtitle={item.user}
                />
              ))
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există vehicule ocupate.",
                  en: "No occupied vehicles.",
                  de: "Keine belegten Fahrzeuge.",
                })}
              />
            ))}
        </div>
      </SectionCard>
    </div>
  );
}

function StatusOverviewCard({
  title,
  value,
  icon,
  active,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[28px] border p-5 text-left text-white shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-200",
        active
          ? "border-white/20 bg-white/20 ring-2 ring-white/20"
          : "border-white/10 bg-white/10 hover:bg-white/14"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-black text-white">
          {icon}
        </div>
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
      </div>

      <p className="mt-4 text-sm font-semibold tracking-tight text-white">
        {title}
      </p>
    </button>
  );
}

function ListRow({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}