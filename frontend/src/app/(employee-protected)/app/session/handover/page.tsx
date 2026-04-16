"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CarFront,
  ClipboardList,
  Gauge,
  ShieldCheck,
  UserRound,
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
import { getActiveSession } from "@/services/auth.api";
import {
  getSessionPage,
  saveHandoverEnd,
  saveHandoverStart,
  type SessionPageResponse,
} from "@/services/sessions.api";

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

  if (normalized === "active" || normalized === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "pending" ||
    normalized === "in_progress" ||
    normalized === "scheduled"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "closed") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function EmployeeHandoverPage() {
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [data, setData] = useState<SessionPageResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingStart, setSavingStart] = useState(false);
  const [savingEnd, setSavingEnd] = useState(false);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const [mileageStart, setMileageStart] = useState("");
  const [dashboardWarningsStart, setDashboardWarningsStart] = useState("");
  const [damageNotesStart, setDamageNotesStart] = useState("");
  const [notesStart, setNotesStart] = useState("");
  const [hasDocuments, setHasDocuments] = useState(false);
  const [hasMedkit, setHasMedkit] = useState(false);
  const [hasExtinguisher, setHasExtinguisher] = useState(false);
  const [hasWarningTriangle, setHasWarningTriangle] = useState(false);
  const [hasSpareWheel, setHasSpareWheel] = useState(false);

  const [mileageEnd, setMileageEnd] = useState("");
  const [dashboardWarningsEnd, setDashboardWarningsEnd] = useState("");
  const [damageNotesEnd, setDamageNotesEnd] = useState("");
  const [notesEnd, setNotesEnd] = useState("");

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

    if (normalized === "closed") {
      return text({ ro: "Închis", en: "Closed", de: "Geschlossen" });
    }

    if (normalized === "completed") {
      return text({ ro: "Completat", en: "Completed", de: "Abgeschlossen" });
    }

    if (normalized === "pending") {
      return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
    }

    return status || "—";
  }

  const resetStartForm = useCallback(() => {
    setMileageStart("");
    setDashboardWarningsStart("");
    setDamageNotesStart("");
    setNotesStart("");
    setHasDocuments(false);
    setHasMedkit(false);
    setHasExtinguisher(false);
    setHasWarningTriangle(false);
    setHasSpareWheel(false);
  }, []);

  const resetEndForm = useCallback(() => {
    setMileageEnd("");
    setDashboardWarningsEnd("");
    setDamageNotesEnd("");
    setNotesEnd("");
  }, []);

  const hydrateFormsFromPage = useCallback((page: SessionPageResponse) => {
    if (page.handover_start && !page.handover_start.is_completed) {
      setMileageStart(
        page.handover_start.mileage_start != null
          ? String(page.handover_start.mileage_start)
          : ""
      );
      setDashboardWarningsStart(
        page.handover_start.dashboard_warnings_start || ""
      );
      setDamageNotesStart(page.handover_start.damage_notes_start || "");
      setNotesStart(page.handover_start.notes_start || "");
      setHasDocuments(Boolean(page.handover_start.has_documents));
      setHasMedkit(Boolean(page.handover_start.has_medkit));
      setHasExtinguisher(Boolean(page.handover_start.has_extinguisher));
      setHasWarningTriangle(Boolean(page.handover_start.has_warning_triangle));
      setHasSpareWheel(Boolean(page.handover_start.has_spare_wheel));
    }

    if (page.handover_end && !page.handover_end.is_completed) {
      setMileageEnd(
        page.handover_end.mileage_end != null
          ? String(page.handover_end.mileage_end)
          : ""
      );
      setDashboardWarningsEnd(page.handover_end.dashboard_warnings_end || "");
      setDamageNotesEnd(page.handover_end.damage_notes_end || "");
      setNotesEnd(page.handover_end.notes_end || "");
    }
  }, []);

  const loadData = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setAssignmentId(null);
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

      const active = await getActiveSession(session.unique_code);

      if (!active.has_active_session || !active.assignment_id) {
        setAssignmentId(null);
        setData(null);
        return;
      }

      setAssignmentId(active.assignment_id);

      const page = await getSessionPage(active.assignment_id, session.unique_code);
      setData(page);
      hydrateFormsFromPage(page);
    } catch (err: unknown) {
      setAssignmentId(null);
      setData(null);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca handover-ul.",
            en: "Could not load handover.",
            de: "Übergabe konnte nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [hydrateFormsFromPage, safeLocale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openConfirm(action: PendingAction) {
    setPendingAction(action);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (savingStart || savingEnd) return;
    setConfirmOpen(false);
    setPendingAction(null);
  }

  async function performSaveStart() {
    const session = getUserSession();

    if (!assignmentId || !session?.unique_code) return;

    const parsedMileage = Number(mileageStart);

    if (!Number.isFinite(parsedMileage) || parsedMileage <= 0) {
      setError(
        text({
          ro: "Kilometrajul de start trebuie să fie valid.",
          en: "Start mileage must be valid.",
          de: "Der Startkilometerstand muss gültig sein.",
        })
      );
      return;
    }

    try {
      setSavingStart(true);
      setError("");

      await saveHandoverStart(assignmentId, session.unique_code, {
        mileage_start: parsedMileage,
        dashboard_warnings_start: dashboardWarningsStart.trim() || undefined,
        damage_notes_start: damageNotesStart.trim() || undefined,
        notes_start: notesStart.trim() || undefined,
        has_documents: hasDocuments,
        has_medkit: hasMedkit,
        has_extinguisher: hasExtinguisher,
        has_warning_triangle: hasWarningTriangle,
        has_spare_wheel: hasSpareWheel,
      });

      resetStartForm();
      await loadData();
      setConfirmOpen(false);
      setPendingAction(null);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva preluarea.",
            en: "Could not save handover start.",
            de: "Die Übernahme konnte nicht gespeichert werden.",
          })
        )
      );
    } finally {
      setSavingStart(false);
    }
  }

  async function performSaveEnd() {
    const session = getUserSession();

    if (!assignmentId || !session?.unique_code) return;

    const parsedMileage = Number(mileageEnd);

    if (!Number.isFinite(parsedMileage) || parsedMileage <= 0) {
      setError(
        text({
          ro: "Kilometrajul final trebuie să fie valid.",
          en: "End mileage must be valid.",
          de: "Der Endkilometerstand muss gültig sein.",
        })
      );
      return;
    }

    try {
      setSavingEnd(true);
      setError("");

      await saveHandoverEnd(assignmentId, session.unique_code, {
        mileage_end: parsedMileage,
        dashboard_warnings_end: dashboardWarningsEnd.trim() || undefined,
        damage_notes_end: damageNotesEnd.trim() || undefined,
        notes_end: notesEnd.trim() || undefined,
      });

      resetEndForm();
      await loadData();
      setConfirmOpen(false);
      setPendingAction(null);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva predarea.",
            en: "Could not save handover end.",
            de: "Die Rückgabe konnte nicht gespeichert werden.",
          })
        )
      );
    } finally {
      setSavingEnd(false);
    }
  }

  async function handleConfirm() {
    if (pendingAction === "start") {
      await performSaveStart();
      return;
    }

    if (pendingAction === "end") {
      await performSaveEnd();
    }
  }

  function handleSaveStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openConfirm("start");
  }

  function handleSaveEnd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openConfirm("end");
  }

  const confirmLoading =
    pendingAction === "start"
      ? savingStart
      : pendingAction === "end"
        ? savingEnd
        : false;

  const confirmTitle =
    pendingAction === "start"
      ? text({
          ro: "Confirmare preluare",
          en: "Confirm start handover",
          de: "Übernahme bestätigen",
        })
      : text({
          ro: "Confirmare predare",
          en: "Confirm end handover",
          de: "Rückgabe bestätigen",
        });

  const confirmMessage =
    pendingAction === "start"
      ? text({
          ro: "Sigur vrei să salvezi handover-ul de start? Verifică kilometrajul și checklist-ul înainte de confirmare.",
          en: "Are you sure you want to save the start handover? Check the mileage and checklist before confirming.",
          de: "Möchtest du die Start-Übergabe wirklich speichern? Prüfe Kilometerstand und Checkliste vor dem Bestätigen.",
        })
      : text({
          ro: "Sigur vrei să salvezi handover-ul de final? Verifică kilometrajul final și observațiile înainte de confirmare.",
          en: "Are you sure you want to save the end handover? Check the final mileage and notes before confirming.",
          de: "Möchtest du die End-Übergabe wirklich speichern? Prüfe den Endkilometerstand und die Hinweise vor dem Bestätigen.",
        });

  const confirmText =
    pendingAction === "start"
      ? text({
          ro: "Confirmă preluarea",
          en: "Confirm handover start",
          de: "Übernahme bestätigen",
        })
      : text({
          ro: "Confirmă predarea",
          en: "Confirm handover end",
          de: "Rückgabe bestätigen",
        });

  const loadingText =
    pendingAction === "start"
      ? text({
          ro: "Se salvează preluarea...",
          en: "Saving handover start...",
          de: "Übernahme wird gespeichert...",
        })
      : text({
          ro: "Se salvează predarea...",
          en: "Saving handover end...",
          de: "Rückgabe wird gespeichert...",
        });

  const startCompleted = Boolean(data?.handover_start?.is_completed);
  const endCompleted = Boolean(data?.handover_end?.is_completed);

  const sessionStatus = useMemo(() => {
    if (!data?.session?.status) return "—";
    return getStatusLabel(data.session.status);
  }, [data]);

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
          ro: "Nu există sesiune activă",
          en: "There is no active session",
          de: "Es gibt keine aktive Sitzung",
        })}
        description={text({
          ro: "Handover-ul devine disponibil doar când ai o sesiune activă pe vehicul.",
          en: "Handover becomes available only when you have an active vehicle session.",
          de: "Die Übergabe ist nur verfügbar, wenn du eine aktive Fahrzeugsitzung hast.",
        })}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<ClipboardList className="h-7 w-7" />}
          title={text({
            ro: "Vehicle Handover",
            en: "Vehicle Handover",
            de: "Fahrzeugübergabe",
          })}
          description={text({
            ro: "Completează preluarea și predarea vehiculului pentru sesiunea activă.",
            en: "Complete the vehicle handover start and end for the active session.",
            de: "Vervollständige die Übernahme und Rückgabe des Fahrzeugs für die aktive Sitzung.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-4">
              <HeroStatCard
                icon={<CarFront className="h-4 w-4" />}
                label={text({
                  ro: "Vehicul",
                  en: "Vehicle",
                  de: "Fahrzeug",
                })}
                value={`${data.vehicle.brand} ${data.vehicle.model}`}
              />
              <HeroStatCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label={text({
                  ro: "Număr",
                  en: "Plate",
                  de: "Kennzeichen",
                })}
                value={data.vehicle.license_plate}
              />
              <HeroStatCard
                icon={<Gauge className="h-4 w-4" />}
                label={text({
                  ro: "Kilometraj",
                  en: "Mileage",
                  de: "Kilometerstand",
                })}
                value={data.vehicle.current_mileage}
              />
              <HeroStatCard
                icon={<UserRound className="h-4 w-4" />}
                label={text({
                  ro: "Status sesiune",
                  en: "Session status",
                  de: "Sitzungsstatus",
                })}
                value={sessionStatus}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <SectionCard
          title={text({
            ro: "Current Session",
            en: "Current Session",
            de: "Aktuelle Sitzung",
          })}
          icon={<CarFront className="h-5 w-5" />}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile
              label={text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
              value={`${data.vehicle.brand} ${data.vehicle.model}`}
            />
            <InfoTile
              label={text({ ro: "Număr", en: "Plate", de: "Kennzeichen" })}
              value={data.vehicle.license_plate}
            />
            <InfoTile
              label={text({
                ro: "Kilometraj curent",
                en: "Current mileage",
                de: "Aktueller Kilometerstand",
              })}
              value={String(data.vehicle.current_mileage)}
            />
          </div>
        </SectionCard>

        <section className="grid gap-4 xl:grid-cols-2">
          <SectionCard
            title={text({
              ro: "Handover Start",
              en: "Handover Start",
              de: "Übernahme Start",
            })}
            icon={<ClipboardList className="h-5 w-5" />}
          >
            {startCompleted ? (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusTile
                  label={text({
                    ro: "Status",
                    en: "Status",
                    de: "Status",
                  })}
                  value="completed"
                  displayValue={text({
                    ro: "Completat",
                    en: "Completed",
                    de: "Abgeschlossen",
                  })}
                />
                <InfoTile
                  label={text({
                    ro: "Mileage start",
                    en: "Mileage start",
                    de: "Kilometer Start",
                  })}
                  value={String(data.handover_start?.mileage_start ?? "-")}
                />
                <InfoTile
                  label={text({
                    ro: "Warnings",
                    en: "Warnings",
                    de: "Warnungen",
                  })}
                  value={data.handover_start?.dashboard_warnings_start || "-"}
                />
                <InfoTile
                  label={text({
                    ro: "Damage",
                    en: "Damage",
                    de: "Schäden",
                  })}
                  value={data.handover_start?.damage_notes_start || "-"}
                />
                <div className="md:col-span-2">
                  <InfoTile
                    label={text({
                      ro: "Notes",
                      en: "Notes",
                      de: "Notizen",
                    })}
                    value={data.handover_start?.notes_start || "-"}
                  />
                </div>
                <InfoTile
                  label={text({
                    ro: "Documents",
                    en: "Documents",
                    de: "Dokumente",
                  })}
                  value={yesNo(data.handover_start?.has_documents)}
                />
                <InfoTile
                  label={text({
                    ro: "Medkit",
                    en: "Medkit",
                    de: "Verbandskasten",
                  })}
                  value={yesNo(data.handover_start?.has_medkit)}
                />
                <InfoTile
                  label={text({
                    ro: "Extinguisher",
                    en: "Extinguisher",
                    de: "Feuerlöscher",
                  })}
                  value={yesNo(data.handover_start?.has_extinguisher)}
                />
                <InfoTile
                  label={text({
                    ro: "Warning triangle",
                    en: "Warning triangle",
                    de: "Warndreieck",
                  })}
                  value={yesNo(data.handover_start?.has_warning_triangle)}
                />
                <InfoTile
                  label={text({
                    ro: "Spare wheel",
                    en: "Spare wheel",
                    de: "Ersatzrad",
                  })}
                  value={yesNo(data.handover_start?.has_spare_wheel)}
                />
              </div>
            ) : (
              <form onSubmit={handleSaveStart} className="space-y-4">
                <FormField
                  label={text({
                    ro: "Mileage start",
                    en: "Mileage start",
                    de: "Kilometer Start",
                  })}
                  required
                >
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mileageStart}
                    onChange={(event) => setMileageStart(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Dashboard warnings",
                    en: "Dashboard warnings",
                    de: "Dashboard-Warnungen",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Observații bord",
                      en: "Dashboard observations",
                      de: "Dashboard-Beobachtungen",
                    })}
                    value={dashboardWarningsStart}
                    onChange={(event) => setDashboardWarningsStart(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Damage notes",
                    en: "Damage notes",
                    de: "Schadensnotizen",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Observații daune",
                      en: "Damage notes",
                      de: "Hinweise zu Schäden",
                    })}
                    value={damageNotesStart}
                    onChange={(event) => setDamageNotesStart(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Notes",
                    en: "Notes",
                    de: "Notizen",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Note suplimentare",
                      en: "Additional notes",
                      de: "Zusätzliche Hinweise",
                    })}
                    value={notesStart}
                    onChange={(event) => setNotesStart(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxCard
                    checked={hasDocuments}
                    onChange={setHasDocuments}
                    label={text({
                      ro: "Documents",
                      en: "Documents",
                      de: "Dokumente",
                    })}
                  />
                  <CheckboxCard
                    checked={hasMedkit}
                    onChange={setHasMedkit}
                    label={text({
                      ro: "Medkit",
                      en: "Medkit",
                      de: "Verbandskasten",
                    })}
                  />
                  <CheckboxCard
                    checked={hasExtinguisher}
                    onChange={setHasExtinguisher}
                    label={text({
                      ro: "Extinguisher",
                      en: "Extinguisher",
                      de: "Feuerlöscher",
                    })}
                  />
                  <CheckboxCard
                    checked={hasWarningTriangle}
                    onChange={setHasWarningTriangle}
                    label={text({
                      ro: "Warning triangle",
                      en: "Warning triangle",
                      de: "Warndreieck",
                    })}
                  />
                  <CheckboxCard
                    checked={hasSpareWheel}
                    onChange={setHasSpareWheel}
                    label={text({
                      ro: "Spare wheel",
                      en: "Spare wheel",
                      de: "Ersatzrad",
                    })}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingStart}
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStart
                      ? text({
                          ro: "Se salvează...",
                          en: "Saving...",
                          de: "Wird gespeichert...",
                        })
                      : text({
                          ro: "Save Handover Start",
                          en: "Save Handover Start",
                          de: "Übernahme speichern",
                        })}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          <SectionCard
            title={text({
              ro: "Handover End",
              en: "Handover End",
              de: "Übergabe Ende",
            })}
            icon={<ClipboardList className="h-5 w-5" />}
          >
            {endCompleted ? (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusTile
                  label={text({
                    ro: "Status",
                    en: "Status",
                    de: "Status",
                  })}
                  value="completed"
                  displayValue={text({
                    ro: "Completat",
                    en: "Completed",
                    de: "Abgeschlossen",
                  })}
                />
                <InfoTile
                  label={text({
                    ro: "Mileage end",
                    en: "Mileage end",
                    de: "Kilometer Ende",
                  })}
                  value={String(data.handover_end?.mileage_end ?? "-")}
                />
                <InfoTile
                  label={text({
                    ro: "Warnings",
                    en: "Warnings",
                    de: "Warnungen",
                  })}
                  value={data.handover_end?.dashboard_warnings_end || "-"}
                />
                <InfoTile
                  label={text({
                    ro: "Damage",
                    en: "Damage",
                    de: "Schäden",
                  })}
                  value={data.handover_end?.damage_notes_end || "-"}
                />
                <div className="md:col-span-2">
                  <InfoTile
                    label={text({
                      ro: "Notes",
                      en: "Notes",
                      de: "Notizen",
                    })}
                    value={data.handover_end?.notes_end || "-"}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveEnd} className="space-y-4">
                <FormField
                  label={text({
                    ro: "Mileage end",
                    en: "Mileage end",
                    de: "Kilometer Ende",
                  })}
                  required
                >
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={mileageEnd}
                    onChange={(event) => setMileageEnd(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Dashboard warnings end",
                    en: "Dashboard warnings end",
                    de: "Dashboard-Warnungen Ende",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Observații finale bord",
                      en: "Final dashboard observations",
                      de: "Abschließende Dashboard-Beobachtungen",
                    })}
                    value={dashboardWarningsEnd}
                    onChange={(event) => setDashboardWarningsEnd(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Damage notes end",
                    en: "Damage notes end",
                    de: "Schadensnotizen Ende",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Observații finale daune",
                      en: "Final damage notes",
                      de: "Abschließende Schadensnotizen",
                    })}
                    value={damageNotesEnd}
                    onChange={(event) => setDamageNotesEnd(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <FormField
                  label={text({
                    ro: "Notes end",
                    en: "Notes end",
                    de: "Notizen Ende",
                  })}
                >
                  <textarea
                    placeholder={text({
                      ro: "Note finale",
                      en: "Final notes",
                      de: "Abschließende Hinweise",
                    })}
                    value={notesEnd}
                    onChange={(event) => setNotesEnd(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </FormField>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingEnd}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingEnd
                      ? text({
                          ro: "Se salvează...",
                          en: "Saving...",
                          de: "Wird gespeichert...",
                        })
                      : text({
                          ro: "Save Handover End",
                          en: "Save Handover End",
                          de: "Rückgabe speichern",
                        })}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>
        </section>
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
        loading={confirmLoading}
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

function CheckboxCard({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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