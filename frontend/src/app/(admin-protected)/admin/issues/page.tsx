"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listIssues,
  updateIssueStatus,
  type IssueItem,
  type VehicleIssueStatus,
} from "@/services/issues.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import { isApiClientError } from "@/lib/axios";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Settings2,
  UserRound,
  Wrench,
} from "lucide-react";

import InfoRow from "@/components/ui/info-row";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminIssuesPage() {
  const { locale, t } = useI18n();

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [issueToUpdate, setIssueToUpdate] = useState<IssueItem | null>(null);
  const [nextStatus, setNextStatus] = useState<VehicleIssueStatus | null>(null);

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

  async function loadIssues() {
    try {
      setLoading(true);
      setError("");

      const data = await listIssues();
      setIssues(data.issues);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
  }, []);

  function openStatusModal(issue: IssueItem, status: VehicleIssueStatus) {
    if (issue.status === status) return;

    setIssueToUpdate(issue);
    setNextStatus(status);
    setStatusModalOpen(true);
  }

  function closeStatusModal() {
    if (updatingId !== null) return;

    setStatusModalOpen(false);
    setIssueToUpdate(null);
    setNextStatus(null);
  }

  async function handleConfirmStatusChange() {
    if (!issueToUpdate || !nextStatus) return;

    try {
      setUpdatingId(issueToUpdate.id);
      setError("");

      await updateIssueStatus(issueToUpdate.id, { status: nextStatus });

      setIssues((prev) =>
        prev.map((item) =>
          item.id === issueToUpdate.id ? { ...item, status: nextStatus } : item
        )
      );

      setStatusModalOpen(false);
      setIssueToUpdate(null);
      setNextStatus(null);
    } catch (err) {
      handleError(err);
    } finally {
      setUpdatingId(null);
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
        timeStyle: "short",
      }
    ).format(date);
  }

  function getStatusLabel(status: VehicleIssueStatus) {
    switch (status) {
      case "open":
        return text({ ro: "Deschis", en: "Open", de: "Offen" });
      case "in_progress":
        return text({
          ro: "În lucru",
          en: "In progress",
          de: "In Bearbeitung",
        });
      case "resolved":
        return text({
          ro: "Rezolvat",
          en: "Resolved",
          de: "Gelöst",
        });
      default:
        return status;
    }
  }

  function getStatusClass(status: VehicleIssueStatus) {
    switch (status) {
      case "open":
        return "border-rose-200 bg-rose-50 text-rose-700";
      case "in_progress":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "resolved":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      default:
        return "border-slate-200 bg-slate-100 text-slate-700";
    }
  }

  const openCount = useMemo(
    () => issues.filter((item) => item.status === "open").length,
    [issues]
  );

  const inProgressCount = useMemo(
    () => issues.filter((item) => item.status === "in_progress").length,
    [issues]
  );

  const resolvedCount = useMemo(
    () => issues.filter((item) => item.status === "resolved").length,
    [issues]
  );

  const isUpdatingCurrent =
    issueToUpdate !== null && updatingId === issueToUpdate.id;

  const confirmMessage =
    issueToUpdate && nextStatus
      ? text({
          ro: `Sigur vrei să schimbi statusul pentru ${issueToUpdate.vehicle_license_plate} în "${getStatusLabel(
            nextStatus
          )}"?`,
          en: `Are you sure you want to change the status for ${issueToUpdate.vehicle_license_plate} to "${getStatusLabel(
            nextStatus
          )}"?`,
          de: `Möchtest du den Status für ${issueToUpdate.vehicle_license_plate} wirklich auf "${getStatusLabel(
            nextStatus
          )}" ändern?`,
        })
      : "";

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<AlertTriangle className="h-7 w-7" />}
          title={t("nav", "issues")}
          description={text({
            ro: "Monitorizează și actualizează rapid problemele raportate pentru vehicule.",
            en: "Quickly monitor and update reported vehicle issues.",
            de: "Überwache und aktualisiere schnell gemeldete Fahrzeugprobleme.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <HeroStatCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label={text({ ro: "Deschise", en: "Open", de: "Offen" })}
                value={openCount}
              />
              <HeroStatCard
                icon={<Wrench className="h-4 w-4" />}
                label={text({
                  ro: "În lucru",
                  en: "In progress",
                  de: "In Bearbeitung",
                })}
                value={inProgressCount}
              />
              <HeroStatCard
                icon={<ClipboardList className="h-4 w-4" />}
                label={text({
                  ro: "Rezolvate",
                  en: "Resolved",
                  de: "Gelöst",
                })}
                value={resolvedCount}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <SectionCard
          title={text({
            ro: "Lista probleme",
            en: "Issues list",
            de: "Problemliste",
          })}
        >
          {issues.length ? (
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <div
                  key={issue.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          #{index + 1}
                        </p>

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            getStatusClass(issue.status)
                          )}
                        >
                          {getStatusLabel(issue.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <InfoRow
                          icon={<CarFront className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "Vehicul",
                            en: "Vehicle",
                            de: "Fahrzeug",
                          })}
                          value={issue.vehicle_license_plate || "—"}
                        />

                        <InfoRow
                          icon={<UserRound className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "Raportat de",
                            en: "Reported by",
                            de: "Gemeldet von",
                          })}
                          value={issue.reported_by_name || "—"}
                        />

                        <InfoRow
                          icon={<Settings2 className="h-4 w-4 text-slate-400" />}
                          label={text({
                            ro: "Creat la",
                            en: "Created at",
                            de: "Erstellt am",
                          })}
                          value={formatDate(issue.created_at)}
                        />
                      </div>
                    </div>

                    <div className="xl:w-[240px]">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        {text({
                          ro: "Schimbă status",
                          en: "Change status",
                          de: "Status ändern",
                        })}
                      </label>

                      <div className="relative">
                        <select
                          value={issue.status}
                          onChange={(event) =>
                            openStatusModal(
                              issue,
                              event.target.value as VehicleIssueStatus
                            )
                          }
                          disabled={updatingId === issue.id}
                          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="open">
                            {text({
                              ro: "Deschis",
                              en: "Open",
                              de: "Offen",
                            })}
                          </option>
                          <option value="in_progress">
                            {text({
                              ro: "În lucru",
                              en: "In progress",
                              de: "In Bearbeitung",
                            })}
                          </option>
                          <option value="resolved">
                            {text({
                              ro: "Rezolvat",
                              en: "Resolved",
                              de: "Gelöst",
                            })}
                          </option>
                        </select>

                        <ChevronIndicator />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={text({
                ro: "Nu există probleme raportate.",
                en: "No issues found.",
                de: "Keine Probleme gefunden.",
              })}
            />
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={statusModalOpen}
        title={text({
          ro: "Confirmare schimbare status",
          en: "Confirm status change",
          de: "Statusänderung bestätigen",
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
        loading={Boolean(isUpdatingCurrent)}
        onConfirm={handleConfirmStatusChange}
        onCancel={closeStatusModal}
      />
    </>
  );
}

function ChevronIndicator() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}