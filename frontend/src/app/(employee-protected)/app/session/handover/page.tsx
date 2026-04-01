"use client";

import { useEffect, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import {
  getActiveSession,
} from "@/services/auth.api";
import {
  getSessionPage,
  saveHandoverEnd,
  saveHandoverStart,
  SessionPageResponse,
} from "@/services/sessions.api";
import ConfirmDialog from "@/components/confirm-dialog";

type PendingAction = "start" | "end" | null;

function cardClass() {
  return "rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function checkboxLabelClass() {
  return "flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900";
}

function primaryButtonClass() {
  return "rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed";
}

function secondaryButtonClass() {
  return "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed";
}

export default function EmployeeHandoverPage() {
  const session = getUserSession();

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

  async function loadData() {
    try {
      if (!session?.unique_code) {
        setError("Sesiune user invalidă.");
        setLoading(false);
        return;
      }

      setError("");

      const active = await getActiveSession(session.unique_code);

      if (!active.has_active_session || !active.assignment_id) {
        setError("Nu există sesiune activă.");
        setLoading(false);
        return;
      }

      setAssignmentId(active.assignment_id);

      const page = await getSessionPage(active.assignment_id, session.unique_code);
      setData(page);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut încărca handover-ul"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.unique_code]);

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
    if (!assignmentId || !session?.unique_code) return;

    try {
      setSavingStart(true);
      setError("");

      await saveHandoverStart(assignmentId, {
        user_code: session.unique_code,
        mileage_start: Number(mileageStart),
        dashboard_warnings_start: dashboardWarningsStart || undefined,
        damage_notes_start: damageNotesStart || undefined,
        notes_start: notesStart || undefined,
        has_documents: hasDocuments,
        has_medkit: hasMedkit,
        has_extinguisher: hasExtinguisher,
        has_warning_triangle: hasWarningTriangle,
        has_spare_wheel: hasSpareWheel,
      });

      await loadData();
      setConfirmOpen(false);
      setPendingAction(null);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut salva preluarea"));
    } finally {
      setSavingStart(false);
    }
  }

  async function performSaveEnd() {
    if (!assignmentId || !session?.unique_code) return;

    try {
      setSavingEnd(true);
      setError("");

      await saveHandoverEnd(assignmentId, {
        user_code: session.unique_code,
        mileage_end: Number(mileageEnd),
        dashboard_warnings_end: dashboardWarningsEnd || undefined,
        damage_notes_end: damageNotesEnd || undefined,
        notes_end: notesEnd || undefined,
      });

      await loadData();
      setConfirmOpen(false);
      setPendingAction(null);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut salva predarea"));
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

  function handleSaveStart(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId || !session?.unique_code) return;
    openConfirm("start");
  }

  function handleSaveEnd(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId || !session?.unique_code) return;
    openConfirm("end");
  }

  const confirmLoading =
    pendingAction === "start" ? savingStart : pendingAction === "end" ? savingEnd : false;

  const confirmTitle =
    pendingAction === "start" ? "Confirmare preluare" : "Confirmare predare";

  const confirmMessage =
    pendingAction === "start"
      ? "Sigur vrei să salvezi handover-ul de start? Verifică kilometrajul și checklist-ul înainte de confirmare."
      : "Sigur vrei să salvezi handover-ul de final? Verifică kilometrajul final și observațiile înainte de confirmare.";

  const confirmText =
    pendingAction === "start" ? "Confirmă preluarea" : "Confirmă predarea";

  const loadingText =
    pendingAction === "start" ? "Se salvează preluarea..." : "Se salvează predarea...";

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-slate-900">
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

          <div className="relative">
            <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
              Vehicle Handover
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
              Completează preluarea și predarea vehiculului pentru sesiunea activă.
            </p>
          </div>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {!data ? (
          <div className={cardClass()}>Nu există date.</div>
        ) : (
          <>
            <section className={cardClass()}>
              <h2 className="mb-4 text-[17px] font-semibold text-slate-950">Current Session</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Vehicle
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data.vehicle.brand} {data.vehicle.model}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Plate
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data.vehicle.license_plate}
                  </p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Current mileage
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {data.vehicle.current_mileage}
                  </p>
                </div>
              </div>
            </section>

            <section className={cardClass()}>
              <h2 className="mb-4 text-[17px] font-semibold text-slate-950">Handover Start</h2>

              {data.handover_start?.is_completed ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Mileage start
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_start.mileage_start}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Warnings
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_start.dashboard_warnings_start || "-"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Damage
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_start.damage_notes_start || "-"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_start.notes_start || "-"}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveStart} className="space-y-4">
                  <input
                    type="number"
                    placeholder="Mileage start"
                    value={mileageStart}
                    onChange={(e) => setMileageStart(e.target.value)}
                    className={inputClass()}
                    required
                  />

                  <textarea
                    placeholder="Dashboard warnings"
                    value={dashboardWarningsStart}
                    onChange={(e) => setDashboardWarningsStart(e.target.value)}
                    className={textareaClass()}
                  />

                  <textarea
                    placeholder="Damage notes"
                    value={damageNotesStart}
                    onChange={(e) => setDamageNotesStart(e.target.value)}
                    className={textareaClass()}
                  />

                  <textarea
                    placeholder="Notes"
                    value={notesStart}
                    onChange={(e) => setNotesStart(e.target.value)}
                    className={textareaClass()}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className={checkboxLabelClass()}>
                      <input
                        type="checkbox"
                        checked={hasDocuments}
                        onChange={(e) => setHasDocuments(e.target.checked)}
                      />
                      Documents
                    </label>

                    <label className={checkboxLabelClass()}>
                      <input
                        type="checkbox"
                        checked={hasMedkit}
                        onChange={(e) => setHasMedkit(e.target.checked)}
                      />
                      Medkit
                    </label>

                    <label className={checkboxLabelClass()}>
                      <input
                        type="checkbox"
                        checked={hasExtinguisher}
                        onChange={(e) => setHasExtinguisher(e.target.checked)}
                      />
                      Extinguisher
                    </label>

                    <label className={checkboxLabelClass()}>
                      <input
                        type="checkbox"
                        checked={hasWarningTriangle}
                        onChange={(e) => setHasWarningTriangle(e.target.checked)}
                      />
                      Warning triangle
                    </label>

                    <label className={checkboxLabelClass()}>
                      <input
                        type="checkbox"
                        checked={hasSpareWheel}
                        onChange={(e) => setHasSpareWheel(e.target.checked)}
                      />
                      Spare wheel
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingStart}
                    className={primaryButtonClass()}
                  >
                    {savingStart ? "Se salvează..." : "Save Handover Start"}
                  </button>
                </form>
              )}
            </section>

            <section className={cardClass()}>
              <h2 className="mb-4 text-[17px] font-semibold text-slate-950">Handover End</h2>

              {data.handover_end?.is_completed ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Mileage end
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_end.mileage_end}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Warnings
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_end.dashboard_warnings_end || "-"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Damage
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_end.damage_notes_end || "-"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {data.handover_end.notes_end || "-"}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveEnd} className="space-y-4">
                  <input
                    type="number"
                    placeholder="Mileage end"
                    value={mileageEnd}
                    onChange={(e) => setMileageEnd(e.target.value)}
                    className={inputClass()}
                    required
                  />

                  <textarea
                    placeholder="Dashboard warnings end"
                    value={dashboardWarningsEnd}
                    onChange={(e) => setDashboardWarningsEnd(e.target.value)}
                    className={textareaClass()}
                  />

                  <textarea
                    placeholder="Damage notes end"
                    value={damageNotesEnd}
                    onChange={(e) => setDamageNotesEnd(e.target.value)}
                    className={textareaClass()}
                  />

                  <textarea
                    placeholder="Notes end"
                    value={notesEnd}
                    onChange={(e) => setNotesEnd(e.target.value)}
                    className={textareaClass()}
                  />

                  <button
                    type="submit"
                    disabled={savingEnd}
                    className={secondaryButtonClass()}
                  >
                    {savingEnd ? "Se salvează..." : "Save Handover End"}
                  </button>
                </form>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmText}
        cancelText="Anulează"
        loading={confirmLoading}
        loadingText={loadingText}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}