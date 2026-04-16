"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Send,
  XCircle,
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
import {
  createLeaveRequest,
  getMyLeaveRequests,
  type LeaveRequestItem,
} from "@/services/leave.api";

type SupportedLocale = "ro" | "en" | "de";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value: string, locale: SupportedLocale = "ro") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { dateStyle: "medium" }
  ).format(date);
}

function statusBadgeClass(status: string) {
  const normalized = normalize(status);

  if (normalized === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function EmployeeLeavePage() {
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[safeLocale];
  }

  function getStatusLabel(status: string) {
    const normalized = normalize(status);

    if (normalized === "approved") {
      return text({ ro: "Aprobat", en: "Approved", de: "Genehmigt" });
    }

    if (normalized === "rejected") {
      return text({ ro: "Respins", en: "Rejected", de: "Abgelehnt" });
    }

    return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
  }

  const resetForm = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setReason("");
  }, []);

  const loadLeaves = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setRequests([]);
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      const data = await getMyLeaveRequests(session.unique_code);
      setRequests(data.requests);
    } catch (err: unknown) {
      setRequests([]);
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
  }, [safeLocale]);

  useEffect(() => {
    void loadLeaves();
  }, [loadLeaves]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    if (!startDate || !endDate) {
      setError(
        text({
          ro: "Completează perioada concediului.",
          en: "Please fill in the leave period.",
          de: "Bitte fülle den Urlaubszeitraum aus.",
        })
      );
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError(
        text({
          ro: "Data de început nu poate fi după data de sfârșit.",
          en: "Start date cannot be after end date.",
          de: "Das Startdatum kann nicht nach dem Enddatum liegen.",
        })
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await createLeaveRequest(session.unique_code, {
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
      });

      resetForm();
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
    () => requests.filter((item) => normalize(item.status) === "pending").length,
    [requests]
  );

  const approvedCount = useMemo(
    () => requests.filter((item) => normalize(item.status) === "approved").length,
    [requests]
  );

  const rejectedCount = useMemo(
    () => requests.filter((item) => normalize(item.status) === "rejected").length,
    [requests]
  );

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !requests.length) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<CalendarDays className="h-7 w-7" />}
        title={text({
          ro: "Concediul meu",
          en: "My Leave",
          de: "Mein Urlaub",
        })}
        description={text({
          ro: "Trimite o cerere de concediu și vezi istoricul solicitărilor tale.",
          en: "Send a leave request and view your request history.",
          de: "Sende einen Urlaubsantrag und sieh deinen Antragsverlauf.",
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label={text({
                ro: "În așteptare",
                en: "Pending",
                de: "Ausstehend",
              })}
              value={pendingCount}
            />
            <HeroStatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={text({
                ro: "Aprobate",
                en: "Approved",
                de: "Genehmigt",
              })}
              value={approvedCount}
            />
            <HeroStatCard
              icon={<XCircle className="h-4 w-4" />}
              label={text({
                ro: "Respinse",
                en: "Rejected",
                de: "Abgelehnt",
              })}
              value={rejectedCount}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      {success ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title={text({
            ro: "Cerere nouă",
            en: "New request",
            de: "Neuer Antrag",
          })}
          icon={<Send className="h-5 w-5" />}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Data de început",
                  en: "Start date",
                  de: "Startdatum",
                })}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Data de sfârșit",
                  en: "End date",
                  de: "Enddatum",
                })}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Motiv",
                  en: "Reason",
                  de: "Grund",
                })}
              </label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder={text({
                  ro: "Motivul concediului",
                  en: "Reason for leave",
                  de: "Grund für den Urlaub",
                })}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || !startDate || !endDate}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        </SectionCard>

        <SectionCard
          title={text({
            ro: "Informații rapide",
            en: "Quick details",
            de: "Schnellinfos",
          })}
          icon={<CalendarDays className="h-5 w-5" />}
        >
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
        </SectionCard>
      </section>

      <SectionCard
        title={text({
          ro: "Cererile mele",
          en: "My Requests",
          de: "Meine Anträge",
        })}
        icon={<ClipboardList className="h-5 w-5" />}
      >
        {requests.length === 0 ? (
          <EmptyState
            title={text({
              ro: "Nu există cereri de concediu",
              en: "There are no leave requests",
              de: "Es gibt keine Urlaubsanträge",
            })}
            description={text({
              ro: "Cererile tale de concediu vor apărea aici.",
              en: "Your leave requests will appear here.",
              de: "Deine Urlaubsanträge erscheinen hier.",
            })}
          />
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
                    <td className="px-3 py-4">{formatDate(item.start_date, safeLocale)}</td>
                    <td className="px-3 py-4">{formatDate(item.end_date, safeLocale)}</td>
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
                    <td className="px-3 py-4">{formatDate(item.created_at, safeLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
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