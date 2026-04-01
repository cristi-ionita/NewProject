"use client";

import { useEffect, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import {
  endSession,
  getActiveSession,
  startSession,
  ActiveSessionResponse,
} from "@/services/auth.api";
import ConfirmDialog from "@/components/confirm-dialog";

type PendingAction = "start" | "end" | null;

function cardClass() {
  return "rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function primaryButtonClass() {
  return "rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed";
}

function secondaryButtonClass() {
  return "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed";
}

export default function EmployeeSessionPage() {
  const session = getUserSession();

  const [data, setData] = useState<ActiveSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [licensePlate, setLicensePlate] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function loadSession() {
    try {
      if (!session?.unique_code) {
        setError("Sesiune user invalidă.");
        setLoading(false);
        return;
      }

      setError("");
      const result = await getActiveSession(session.unique_code);
      setData(result);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut încărca sesiunea"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.unique_code]);

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
    if (!session?.unique_code) return;

    try {
      setSaving(true);
      setError("");

      await startSession({
        code: session.unique_code,
        license_plate: licensePlate,
      });

      setLicensePlate("");
      await loadSession();
      closeConfirm();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut porni sesiunea"));
    } finally {
      setSaving(false);
    }
  }

  async function performEnd() {
    if (!session?.unique_code) return;

    try {
      setSaving(true);
      setError("");

      await endSession({
        code: session.unique_code,
      });

      await loadSession();
      closeConfirm();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Nu am putut închide sesiunea"));
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

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!licensePlate.trim()) return;
    openConfirm("start");
  }

  function handleEnd() {
    openConfirm("end");
  }

  const confirmTitle =
    pendingAction === "start" ? "Confirm Start Session" : "Confirm End Session";

  const confirmMessage =
    pendingAction === "start"
      ? "Sigur vrei să începi sesiunea cu acest vehicul? Verifică numărul de înmatriculare."
      : "Sigur vrei să închizi sesiunea? Această acțiune finalizează lucrul pe vehicul.";

  const confirmText =
    pendingAction === "start" ? "Start Session" : "End Session";

  const loadingText =
    pendingAction === "start"
      ? "Se pornește sesiunea..."
      : "Se închide sesiunea...";

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow">
        Se încarcă...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-slate-900">
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow">
          <h1 className="text-[30px] font-semibold text-white">My Session</h1>
          <p className="text-sm text-slate-300">
            Pornește sau finalizează sesiunea de lucru pe vehicul.
          </p>
        </section>

        {error && (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!data?.has_active_session ? (
          <section className={cardClass()}>
            <h2 className="mb-4 text-[17px] font-semibold text-slate-950">
              Start Session
            </h2>

            <form onSubmit={handleStart} className="space-y-4">
              <input
                type="text"
                placeholder="License plate"
                value={licensePlate}
                onChange={(e) =>
                  setLicensePlate(e.target.value.toUpperCase())
                }
                className={inputClass()}
                required
              />

              <button
                type="submit"
                disabled={saving}
                className={primaryButtonClass()}
              >
                {saving ? "Se procesează..." : "Start Session"}
              </button>
            </form>
          </section>
        ) : (
          <section className={cardClass()}>
            <h2 className="mb-4 text-[17px] font-semibold text-slate-950">
              Active Session
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Assignment ID" value={data.assignment_id} />
              <Info label="Vehicle" value={`${data.brand} ${data.model}`} />
              <Info label="Plate" value={data.license_plate} />
              <Info label="Started" value={data.started_at} />
              <Info label="Status" value={data.status} />
            </div>

            <button
              onClick={handleEnd}
              disabled={saving}
              className={`mt-4 ${secondaryButtonClass()}`}
            >
              {saving ? "Se procesează..." : "End Session"}
            </button>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmText}
        cancelText="Cancel"
        loading={saving}
        loadingText={loadingText}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value ?? "-"}
      </p>
    </div>
  );
}