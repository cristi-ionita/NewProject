"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  type LeaveRequestItem,
} from "@/services/leave.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Send,
  XCircle,
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

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function labelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
}

function buttonPrimaryClass() {
  return "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatDate(value: string, locale: "ro" | "en" | "de" = "ro") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { dateStyle: "medium" }
  ).format(date);
}

export default function EmployeeLeavePage() {
  const { locale } = useI18n();

  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function getStatusLabel(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === "approved") {
      return text({ ro: "Aprobat", en: "Approved", de: "Genehmigt" });
    }

    if (normalized === "rejected") {
      return text({ ro: "Respins", en: "Rejected", de: "Abgelehnt" });
    }

    return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
  }

  async function loadLeaves() {
    try {
      const session = getUserSession();

      if (!session?.unique_code) {
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        setLoading(false);
        return;
      }

      setError("");
      const data = await getMyLeaveRequests(session.unique_code);
      setRequests(data.requests);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca cererile.",
            en: "Could not load requests.",
            de: "Anfragen konnten nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
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

      setSaving(true);
      setError("");
      setSuccess("");

      await createLeaveRequest({
        user_code: session.unique_code,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      });

      setStartDate("");
      setEndDate("");
      setReason("");
      setSuccess(
        text({
          ro: "Cererea de concediu a fost trimisă.",
          en: "Leave request was sent.",
          de: "Urlaubsantrag wurde gesendet.",
        })
      );
      await loadLeaves();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut trimite cererea.",
            en: "Could not send request.",
            de: "Antrag konnte nicht gesendet werden.",
          })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests]
  );

  const approvedCount = useMemo(
    () => requests.filter((item) => item.status === "approved").length,
    [requests]
  );

  const rejectedCount = useMemo(
    () => requests.filter((item) => item.status === "rejected").length,
    [requests]
  );

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
                    ro: "Concediul meu",
                    en: "My Leave",
                    de: "Mein Urlaub",
                  })}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Trimite o cerere de concediu și vezi istoricul solicitărilor tale.",
                    en: "Send a leave request and view your request history.",
                    de: "Sende einen Urlaubsantrag und sieh deinen Antragsverlauf.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <HeroStatCard
                icon={<ClipboardList className="h-3.5 w-3.5" />}
                label={text({
                  ro: "În așteptare",
                  en: "Pending",
                  de: "Ausstehend",
                })}
                value={String(pendingCount)}
              />
              <HeroStatCard
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Aprobate",
                  en: "Approved",
                  de: "Genehmigt",
                })}
                value={String(approvedCount)}
              />
              <HeroStatCard
                icon={<XCircle className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Respinse",
                  en: "Rejected",
                  de: "Abgelehnt",
                })}
                value={String(rejectedCount)}
              />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Send className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Cerere nouă",
                  en: "New request",
                  de: "Neuer Antrag",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Request Leave",
                  en: "Request Leave",
                  de: "Urlaub beantragen",
                })}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass()}>
                {text({
                  ro: "Data de început",
                  en: "Start date",
                  de: "Startdatum",
                })}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn("mt-2", inputClass())}
                required
              />
            </div>

            <div>
              <label className={labelClass()}>
                {text({
                  ro: "Data de sfârșit",
                  en: "End date",
                  de: "Enddatum",
                })}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn("mt-2", inputClass())}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass()}>
                {text({
                  ro: "Motiv",
                  en: "Reason",
                  de: "Grund",
                })}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder={text({
                  ro: "Motivul concediului",
                  en: "Reason for leave",
                  de: "Grund für den Urlaub",
                })}
                className={cn("mt-2 resize-none", textareaClass())}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || !startDate || !endDate}
                className={buttonPrimaryClass()}
              >
                {saving
                  ? text({
                      ro: "Se trimite...",
                      en: "Sending...",
                      de: "Wird gesendet...",
                    })
                  : text({
                      ro: "Trimite cererea",
                      en: "Send Request",
                      de: "Antrag senden",
                    })}
              </button>
            </div>
          </form>
        </div>

        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <CalendarDays className="h-4.5 w-4.5" />
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
                ro: "Cereri totale",
                en: "Total requests",
                de: "Anfragen gesamt",
              })}
              value={String(requests.length)}
            />
            <QuickRow
              label={text({
                ro: "În așteptare",
                en: "Pending",
                de: "Ausstehend",
              })}
              value={String(pendingCount)}
            />
            <QuickRow
              label={text({
                ro: "Aprobate",
                en: "Approved",
                de: "Genehmigt",
              })}
              value={String(approvedCount)}
            />
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {text({
                ro: "Istoric",
                en: "History",
                de: "Verlauf",
              })}
            </p>
            <h2 className="text-[17px] font-semibold text-slate-950">
              {text({
                ro: "Cererile mele",
                en: "My Requests",
                de: "Meine Anträge",
              })}
            </h2>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className={tileClass()}>
            <p className="text-sm text-slate-500">
              {text({
                ro: "Nu există cereri de concediu.",
                en: "There are no leave requests.",
                de: "Es gibt keine Urlaubsanträge.",
              })}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Start", en: "Start", de: "Start" })}
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Final", en: "End", de: "Ende" })}
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Motiv", en: "Reason", de: "Grund" })}
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Status", en: "Status", de: "Status" })}
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {text({ ro: "Creat", en: "Created", de: "Erstellt" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-4">{formatDate(item.start_date, locale)}</td>
                    <td className="px-3 py-4">{formatDate(item.end_date, locale)}</td>
                    <td className="px-3 py-4">{item.reason || "-"}</td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                          statusBadgeClass(item.status)
                        )}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4">{formatDate(item.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

function QuickRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}