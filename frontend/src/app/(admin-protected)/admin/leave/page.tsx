"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequestItem,
} from "@/services/leave.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load leave requests.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load leave requests.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminLeavePage() {
  const { locale, t } = useI18n();

  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [requestToReview, setRequestToReview] = useState<LeaveRequestItem | null>(null);
  const [nextReviewStatus, setNextReviewStatus] = useState<"approved" | "rejected" | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
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

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(
      locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
      {
        dateStyle: "medium",
      }
    ).format(date);
  }

  async function loadRequests() {
    try {
      setError("");
      setLoading(true);
      const data = await getAllLeaveRequests();
      setRequests(data.requests);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function openReviewModal(
    item: LeaveRequestItem,
    status: "approved" | "rejected"
  ) {
    setRequestToReview(item);
    setNextReviewStatus(status);
    setReviewModalOpen(true);
  }

  function closeReviewModal() {
    if (savingId !== null) return;
    setReviewModalOpen(false);
    setRequestToReview(null);
    setNextReviewStatus(null);
  }

  async function handleConfirmReview() {
    if (!requestToReview || !nextReviewStatus) return;

    try {
      setSavingId(requestToReview.id);
      setError("");

      await reviewLeaveRequest(requestToReview.id, { status: nextReviewStatus });
      await loadRequests();

      setReviewModalOpen(false);
      setRequestToReview(null);
      setNextReviewStatus(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingId(null);
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

  const isReviewingCurrent =
    requestToReview !== null && savingId === requestToReview.id;

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

  return (
    <>
      <div className="space-y-5 text-slate-900">
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2.5">
                <div>
                  <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                    {t("nav", "leave")}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Aprobă sau respinge cererile de concediu ale angajaților.",
                      en: "Approve or reject employee leave requests.",
                      de: "Genehmige oder lehne Urlaubsanfragen der Mitarbeiter ab.",
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

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <CalendarDays className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Cereri concediu",
                    en: "Leave requests",
                    de: "Urlaubsanträge",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Distribuție rapidă",
                    en: "Quick distribution",
                    de: "Schnellübersicht",
                  })}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StatusOverviewCard
                title={text({
                  ro: "În așteptare",
                  en: "Pending",
                  de: "Ausstehend",
                })}
                value={pendingCount}
                badgeClass="border-amber-200 bg-amber-50 text-amber-700"
              />
              <StatusOverviewCard
                title={text({
                  ro: "Aprobate",
                  en: "Approved",
                  de: "Genehmigt",
                })}
                value={approvedCount}
                badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              />
              <StatusOverviewCard
                title={text({
                  ro: "Respinse",
                  en: "Rejected",
                  de: "Abgelehnt",
                })}
                value={rejectedCount}
                badgeClass="border-red-200 bg-red-50 text-red-700"
              />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <ClipboardList className="h-4.5 w-4.5" />
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
                  ro: "Necesită revizuire",
                  en: "Need review",
                  de: "Benötigen Prüfung",
                })}
                value={String(pendingCount)}
              />
              <QuickRow
                label={text({
                  ro: "Aprobate deja",
                  en: "Already approved",
                  de: "Bereits genehmigt",
                })}
                value={String(approvedCount)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Listă cereri",
                  en: "Request list",
                  de: "Anfrageliste",
                })}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
                {t("nav", "leave")}
              </h2>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {requests.length}{" "}
              {text({
                ro: "înregistrări",
                en: "records",
                de: "Einträge",
              })}
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="px-4 py-7">
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {text({
                    ro: "Nu există cereri.",
                    en: "There are no requests.",
                    de: "Es gibt keine Anfragen.",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Angajat", en: "Employee", de: "Mitarbeiter" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Cod", en: "Code", de: "Code" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Start", en: "Start", de: "Beginn" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Final", en: "End", de: "Ende" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Motiv", en: "Reason", de: "Grund" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "status")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "actions")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <span className="text-xs font-semibold">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-950">
                            {item.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">{item.user_code}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(item.start_date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(item.end_date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {item.reason || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                            statusBadgeClass(item.status)
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {item.status === "pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openReviewModal(item, "approved")}
                              disabled={savingId === item.id}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {text({
                                ro: "Aprobă",
                                en: "Approve",
                                de: "Genehmigen",
                              })}
                            </button>
                            <button
                              type="button"
                              onClick={() => openReviewModal(item, "rejected")}
                              disabled={savingId === item.id}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {text({
                                ro: "Respinge",
                                en: "Reject",
                                de: "Ablehnen",
                              })}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            {text({
                              ro: "Revizuită",
                              en: "Reviewed",
                              de: "Überprüft",
                            })}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={reviewModalOpen}
        title={text({
          ro: "Confirmare acțiune",
          en: "Confirm action",
          de: "Aktion bestätigen",
        })}
        message={
          requestToReview && nextReviewStatus
            ? nextReviewStatus === "approved"
              ? text({
                  ro: `Sigur vrei să aprobi cererea de concediu pentru ${requestToReview.user_name}?`,
                  en: `Are you sure you want to approve the leave request for ${requestToReview.user_name}?`,
                  de: `Möchtest du den Urlaubsantrag für ${requestToReview.user_name} wirklich genehmigen?`,
                })
              : text({
                  ro: `Sigur vrei să respingi cererea de concediu pentru ${requestToReview.user_name}?`,
                  en: `Are you sure you want to reject the leave request for ${requestToReview.user_name}?`,
                  de: `Möchtest du den Urlaubsantrag für ${requestToReview.user_name} wirklich ablehnen?`,
                })
            : text({
                ro: "Sigur vrei să continui această acțiune?",
                en: "Are you sure you want to continue this action?",
                de: "Möchtest du diese Aktion wirklich fortsetzen?",
              })
        }
        confirmText={
          nextReviewStatus === "approved"
            ? text({
                ro: "Aprobă",
                en: "Approve",
                de: "Genehmigen",
              })
            : text({
                ro: "Respinge",
                en: "Reject",
                de: "Ablehnen",
              })
        }
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={isReviewingCurrent}
        loadingText={text({
          ro: "Se procesează...",
          en: "Processing...",
          de: "Wird verarbeitet...",
        })}
        onConfirm={handleConfirmReview}
        onCancel={closeReviewModal}
      />
    </>
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