"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CarFront,
  ClipboardList,
  Play,
  ShieldCheck,
  Square,
} from "lucide-react";

import ConfirmDialog from "@/components/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import HeroStatCard from "@/components/ui/hero-stat-card";
import LoadingCard from "@/components/ui/loading-card";
import PageHero from "@/components/ui/page-hero";
import SectionCard from "@/components/ui/section-card";

import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  endSession,
  getActiveSession,
  startSession,
  type ActiveSessionResponse,
} from "@/services/auth.api";

type SupportedLocale = "ro" | "en" | "de";
type PendingAction = "start" | "end" | null;

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = normalize(status);

  if (normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "closed") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function EmployeeSessionPage() {
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [data, setData] = useState<ActiveSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[safeLocale];
  }

  function getStatusLabel(status?: string | null) {
    const normalized = normalize(status);

    if (normalized === "active") {
      return text({ ro: "Activă", en: "Active", de: "Aktiv" });
    }

    if (normalized === "closed") {
      return text({ ro: "Închisă", en: "Closed", de: "Geschlossen" });
    }

    return status || "—";
  }

  const loadSession = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setData(null);
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      const result = await getActiveSession(session.unique_code);
      setData(result);
    } catch (err: unknown) {
      setData(null);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca sesiunea.",
            en: "Could not load session.",
            de: "Sitzung konnte nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [safeLocale]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  function openConfirm(action: PendingAction) {
    setPendingAction(action);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (saving) return;
    setConfirmOpen(false);
    setPendingAction(null);
  }

  async function performStart() {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(
        text({
          ro: "Sesiune user invalidă.",
          en: "Invalid user session.",
          de: "Ungültige Benutzersitzung.",
        })
      );
      return;
    }

    if (!licensePlate.trim()) {
      setError(
        text({
          ro: "Numărul de înmatriculare este obligatoriu.",
          en: "License plate is required.",
          de: "Das Kennzeichen ist erforderlich.",
        })
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await startSession(session.unique_code, {
        license_plate: licensePlate.trim().toUpperCase(),
      });

      setLicensePlate("");
      await loadSession();
      closeConfirm();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut porni sesiunea.",
            en: "Could not start session.",
            de: "Sitzung konnte nicht gestartet werden.",
          })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function performEnd() {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(
        text({
          ro: "Sesiune user invalidă.",
          en: "Invalid user session.",
          de: "Ungültige Benutzersitzung.",
        })
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await endSession(session.unique_code);

      await loadSession();
      closeConfirm();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut închide sesiunea.",
            en: "Could not end session.",
            de: "Sitzung konnte nicht beendet werden.",
          })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (pendingAction === "start") {
      await performStart();
      return;
    }

    if (pendingAction === "end") {
      await performEnd();
    }
  }

  function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!licensePlate.trim()) return;
    openConfirm("start");
  }

  function handleEnd() {
    openConfirm("end");
  }

  const confirmTitle =
    pendingAction === "start"
      ? text({
          ro: "Confirmare pornire sesiune",
          en: "Confirm Start Session",
          de: "Sitzungsstart bestätigen",
        })
      : text({
          ro: "Confirmare închidere sesiune",
          en: "Confirm End Session",
          de: "Sitzungsende bestätigen",
        });

  const confirmMessage =
    pendingAction === "start"
      ? text({
          ro: "Sigur vrei să începi sesiunea cu acest vehicul? Verifică numărul de înmatriculare.",
          en: "Are you sure you want to start the session with this vehicle? Check the license plate.",
          de: "Möchtest du die Sitzung mit diesem Fahrzeug wirklich starten? Prüfe das Kennzeichen.",
        })
      : text({
          ro: "Sigur vrei să închizi sesiunea? Această acțiune finalizează lucrul pe vehicul.",
          en: "Are you sure you want to end the session? This action finishes your work on the vehicle.",
          de: "Möchtest du die Sitzung wirklich beenden? Diese Aktion beendet deine Arbeit am Fahrzeug.",
        });

  const confirmText =
    pendingAction === "start"
      ? text({
          ro: "Pornește sesiunea",
          en: "Start Session",
          de: "Sitzung starten",
        })
      : text({
          ro: "Închide sesiunea",
          en: "End Session",
          de: "Sitzung beenden",
        });

  const loadingText =
    pendingAction === "start"
      ? text({
          ro: "Se pornește sesiunea...",
          en: "Starting session...",
          de: "Sitzung wird gestartet...",
        })
      : text({
          ro: "Se închide sesiunea...",
          en: "Ending session...",
          de: "Sitzung wird beendet...",
        });

  const hasActiveSession = Boolean(data?.has_active_session);

  const sessionStatus = useMemo(() => {
    if (!data?.status) {
      return text({
        ro: "Inactivă",
        en: "Inactive",
        de: "Inaktiv",
      });
    }

    return getStatusLabel(data.status);
  }, [data, safeLocale]);

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !data) {
    return <ErrorAlert message={error} />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<ClipboardList className="h-7 w-7" />}
          title={text({
            ro: "Sesiunea mea",
            en: "My Session",
            de: "Meine Sitzung",
          })}
          description={text({
            ro: "Pornește sau finalizează sesiunea de lucru pe vehicul.",
            en: "Start or end your working session on a vehicle.",
            de: "Starte oder beende deine Arbeitssitzung auf einem Fahrzeug.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-4">
              <HeroStatCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label={text({
                  ro: "Status",
                  en: "Status",
                  de: "Status",
                })}
                value={sessionStatus}
              />
              <HeroStatCard
                icon={<ClipboardList className="h-4 w-4" />}
                label={text({
                  ro: "Assignment ID",
                  en: "Assignment ID",
                  de: "Zuweisungs-ID",
                })}
                value={data?.assignment_id ?? "—"}
              />
              <HeroStatCard
                icon={<CarFront className="h-4 w-4" />}
                label={text({
                  ro: "Vehicul",
                  en: "Vehicle",
                  de: "Fahrzeug",
                })}
                value={
                  hasActiveSession
                    ? `${data?.brand || ""} ${data?.model || ""}`.trim() || "—"
                    : "—"
                }
              />
              <HeroStatCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label={text({
                  ro: "Număr",
                  en: "Plate",
                  de: "Kennzeichen",
                })}
                value={hasActiveSession ? data?.license_plate || "—" : "—"}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        {!hasActiveSession ? (
          <SectionCard
            title={text({
              ro: "Pornește sesiunea",
              en: "Start Session",
              de: "Sitzung starten",
            })}
            icon={<Play className="h-5 w-5" />}
          >
            <form onSubmit={handleStart} className="space-y-4">
              <FormField
                label={text({
                  ro: "Număr de înmatriculare",
                  en: "License plate",
                  de: "Kennzeichen",
                })}
                required
              >
                <input
                  type="text"
                  placeholder={text({
                    ro: "Ex: B123ABC",
                    en: "Ex: B123ABC",
                    de: "Z. B.: B123ABC",
                  })}
                  value={licensePlate}
                  onChange={(event) =>
                    setLicensePlate(event.target.value.toUpperCase())
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  required
                />
              </FormField>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !licensePlate.trim()}
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? text({
                        ro: "Se procesează...",
                        en: "Processing...",
                        de: "Wird verarbeitet...",
                      })
                    : text({
                        ro: "Pornește sesiunea",
                        en: "Start Session",
                        de: "Sitzung starten",
                      })}
                </button>
              </div>
            </form>
          </SectionCard>
        ) : (
          <>
            <SectionCard
              title={text({
                ro: "Sesiune activă",
                en: "Active Session",
                de: "Aktive Sitzung",
              })}
              icon={<ClipboardList className="h-5 w-5" />}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <InfoTile
                  label={text({
                    ro: "Assignment ID",
                    en: "Assignment ID",
                    de: "Zuweisungs-ID",
                  })}
                  value={String(data?.assignment_id ?? "-")}
                />
                <InfoTile
                  label={text({
                    ro: "Vehicul",
                    en: "Vehicle",
                    de: "Fahrzeug",
                  })}
                  value={`${data?.brand || ""} ${data?.model || ""}`.trim() || "-"}
                />
                <InfoTile
                  label={text({
                    ro: "Număr",
                    en: "Plate",
                    de: "Kennzeichen",
                  })}
                  value={data?.license_plate || "-"}
                />
                <InfoTile
                  label={text({
                    ro: "Pornită",
                    en: "Started",
                    de: "Gestartet",
                  })}
                  value={data?.started_at || "-"}
                />
                <StatusTile
                  label={text({
                    ro: "Status",
                    en: "Status",
                    de: "Status",
                  })}
                  value={data?.status || "closed"}
                  displayValue={sessionStatus}
                />
              </div>
            </SectionCard>

            <SectionCard
              title={text({
                ro: "Finalizează sesiunea",
                en: "End Session",
                de: "Sitzung beenden",
              })}
              icon={<Square className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  {text({
                    ro: "Închide sesiunea curentă după ce ai terminat lucrul pe vehicul.",
                    en: "End the current session after you finish working on the vehicle.",
                    de: "Beende die aktuelle Sitzung, nachdem du deine Arbeit am Fahrzeug abgeschlossen hast.",
                  })}
                </p>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? text({
                          ro: "Se procesează...",
                          en: "Processing...",
                          de: "Wird verarbeitet...",
                        })
                      : text({
                          ro: "Închide sesiunea",
                          en: "End Session",
                          de: "Sitzung beenden",
                        })}
                  </button>
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {!data ? (
          <EmptyState
            title={text({
              ro: "Nu există date de sesiune",
              en: "There is no session data",
              de: "Es gibt keine Sitzungsdaten",
            })}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmText}
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={saving}
        loadingText={loadingText}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}

function FormField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required ? " *" : ""}
      </p>
      <div className="mt-2">{children}</div>
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
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
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
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
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