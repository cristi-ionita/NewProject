"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequestItem,
  type LeaveStatus,
} from "@/services/leave.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  UserRound,
  XCircle,
} from "lucide-react";
import { isApiClientError } from "@/lib/axios";

import InfoRow from "@/components/ui/info-row";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

type ReviewStatus = Exclude<LeaveStatus, "pending">;

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
  const [requestToReview, setRequestToReview] =
    useState<LeaveRequestItem | null>(null);
  const [nextReviewStatus, setNextReviewStatus] =
    useState<ReviewStatus | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function handleError(err: unknown) {
    if (isApiClientError(err)) {
      setError(err.message);
      return;
    }

    setError(
      text({
        ro: "A apărut o eroare neașteptată.",
        en: "Unexpected error.",
        de: "Unerwarteter Fehler.",
      })
    );
  }

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const data = await getAllLeaveRequests();
      setRequests(data.requests);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function openReviewModal(item: LeaveRequestItem, status: ReviewStatus) {
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

      await reviewLeaveRequest(requestToReview.id, {
        status: nextReviewStatus,
      });

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestToReview.id
            ? { ...item, status: nextReviewStatus }
            : item
        )
      );

      setReviewModalOpen(false);
      setRequestToReview(null);
      setNextReviewStatus(null);
    } catch (err) {
      handleError(err);
    } finally {
      setSavingId(null);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(
      locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
      {
        dateStyle: "medium",
      }
    ).format(date);
  }

  function statusBadgeClass(status: LeaveStatus) {
    if (status === "approved") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "rejected") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  function getStatusLabel(status: LeaveStatus) {
    if (status === "approved") {
      return text({ ro: "Aprobat", en: "Approved", de: "Genehmigt" });
    }

    if (status === "rejected") {
      return text({ ro: "Respins", en: "Rejected", de: "Abgelehnt" });
    }

    return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
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

  const confirmMessage =
    requestToReview && nextReviewStatus
      ? text({
          ro: `Sigur vrei să marchezi cererea lui ${
            requestToReview.user_name
          } ca "${getStatusLabel(nextReviewStatus)}"?`,
          en: `Are you sure you want to mark ${
            requestToReview.user_name
          }'s request as "${getStatusLabel(nextReviewStatus)}"?`,
          de: `Möchtest du den Antrag von ${
            requestToReview.user_name
          } wirklich als "${getStatusLabel(nextReviewStatus)}" markieren?`,
        })
      : "";

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<CalendarDays className="h-7 w-7" />}
          title={t("nav", "leave")}
          description={text({
            ro: "Revizuiește și aprobă rapid cererile de concediu.",
            en: "Quickly review and approve leave requests.",
            de: "Überprüfe und genehmige Urlaubsanträge schnell.",
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

        <SectionCard
          title={text({
            ro: "Cereri concediu",
            en: "Leave requests",
            de: "Urlaubsanträge",
          })}
        >
          {requests.length ? (
            <div className="space-y-3">
              {requests.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {item.user_name}
                        </p>

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            statusBadgeClass(item.status)
                          )}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoRow
                          icon={<UserRound className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "Cod",
                            en: "Code",
                            de: "Code",
                          })}
                          value={item.user_code || "—"}
                        />

                        <InfoRow
                          icon={
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                          }
                          label={text({
                            ro: "Start",
                            en: "Start",
                            de: "Start",
                          })}
                          value={formatDate(item.start_date)}
                        />

                        <InfoRow
                          icon={
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                          }
                          label={text({
                            ro: "Sfârșit",
                            en: "End",
                            de: "Ende",
                          })}
                          value={formatDate(item.end_date)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openReviewModal(item, "approved")}
                            disabled={savingId === item.id}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {text({
                              ro: "Respinge",
                              en: "Reject",
                              de: "Ablehnen",
                            })}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există cereri de concediu.",
                en: "No leave requests found.",
                de: "Keine Urlaubsanträge gefunden.",
              })}
            />
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={reviewModalOpen}
        title={text({
          ro: "Confirmare acțiune",
          en: "Confirm action",
          de: "Aktion bestätigen",
        })}
        message={confirmMessage}
        confirmText={text({
          ro: "Confirmă",
          en: "Confirm",
          de: "Bestätigen",
        })}
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={savingId !== null}
        onConfirm={handleConfirmReview}
        onCancel={closeReviewModal}
      />
    </>
  );
}