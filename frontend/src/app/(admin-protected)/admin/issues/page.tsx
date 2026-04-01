"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listIssues,
  updateIssueStatus,
  type IssueItem,
} from "@/services/issues.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  AlertTriangle,
  CarFront,
  ChevronDown,
  ClipboardList,
  Settings2,
  Wrench,
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

  if (!detail) return "Failed to load issues.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load issues.";
}

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
  const [nextStatus, setNextStatus] = useState<string | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadIssues() {
    try {
      setLoading(true);
      setError("");

      const data = await listIssues();
      setIssues(data.issues);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIssues();
  }, []);

  function openStatusModal(issue: IssueItem, status: string) {
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
      await loadIssues();

      setStatusModalOpen(false);
      setIssueToUpdate(null);
      setNextStatus(null);
    } catch (err) {
      setError(extractErrorMessage(err));
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

  function getStatusLabel(status: string) {
    if (status === "open") {
      return text({ ro: "Deschis", en: "Open", de: "Offen" });
    }

    if (status === "in_progress") {
      return text({
        ro: "În lucru",
        en: "In progress",
        de: "In Bearbeitung",
      });
    }

    if (status === "resolved") {
      return text({
        ro: "Rezolvat",
        en: "Resolved",
        de: "Gelöst",
      });
    }

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "open") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (status === "in_progress") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (status === "resolved") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  function yesNo(value: boolean) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  const openCount = useMemo(
    () => issues.filter((issue) => issue.status === "open").length,
    [issues]
  );

  const inProgressCount = useMemo(
    () => issues.filter((issue) => issue.status === "in_progress").length,
    [issues]
  );

  const resolvedCount = useMemo(
    () => issues.filter((issue) => issue.status === "resolved").length,
    [issues]
  );

  const isUpdatingCurrent =
    issueToUpdate !== null && updatingId === issueToUpdate.id;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă problemele...",
              en: "Loading issues...",
              de: "Probleme werden geladen...",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2.5">
                <div>
                  <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                    {t("nav", "issues")}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Monitorizează problemele raportate pentru vehicule și actualizează statusul acestora.",
                      en: "Monitor reported vehicle issues and update their status.",
                      de: "Überwache gemeldete Fahrzeugprobleme und aktualisiere deren Status.",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
                <HeroStatCard
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Deschise",
                    en: "Open",
                    de: "Offen",
                  })}
                  value={String(openCount)}
                />
                <HeroStatCard
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "În lucru",
                    en: "In progress",
                    de: "In Bearbeitung",
                  })}
                  value={String(inProgressCount)}
                />
                <HeroStatCard
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Rezolvate",
                    en: "Resolved",
                    de: "Gelöst",
                  })}
                  value={String(resolvedCount)}
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
                <Settings2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Status probleme",
                    en: "Issue status",
                    de: "Problemstatus",
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
                title={text({ ro: "Deschise", en: "Open", de: "Offen" })}
                value={openCount}
                badgeClass="border-rose-200 bg-rose-50 text-rose-700"
              />
              <StatusOverviewCard
                title={text({
                  ro: "În lucru",
                  en: "In progress",
                  de: "In Bearbeitung",
                })}
                value={inProgressCount}
                badgeClass="border-amber-200 bg-amber-50 text-amber-700"
              />
              <StatusOverviewCard
                title={text({
                  ro: "Rezolvate",
                  en: "Resolved",
                  de: "Gelöst",
                })}
                value={resolvedCount}
                badgeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <CarFront className="h-4.5 w-4.5" />
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
                  ro: "Total probleme",
                  en: "Total issues",
                  de: "Probleme gesamt",
                })}
                value={String(issues.length)}
              />
              <QuickRow
                label={text({
                  ro: "Necesită atenție",
                  en: "Need attention",
                  de: "Benötigen Aufmerksamkeit",
                })}
                value={String(openCount + inProgressCount)}
              />
              <QuickRow
                label={text({
                  ro: "Rezolvate",
                  en: "Resolved",
                  de: "Gelöst",
                })}
                value={String(resolvedCount)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Listă probleme",
                  en: "Issue list",
                  de: "Problemliste",
                })}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
                {t("nav", "issues")}
              </h2>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {issues.length}{" "}
              {text({
                ro: "înregistrări",
                en: "records",
                de: "Einträge",
              })}
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="px-4 py-7">
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {text({
                    ro: "Nu există issue-uri.",
                    en: "There are no issues.",
                    de: "Es gibt keine Probleme.",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Număr", en: "Plate", de: "Kennzeichen" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Raportat de", en: "Reported by", de: "Gemeldet von" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "status")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Service KM", en: "Service KM", de: "Service KM" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Frâne", en: "Brakes", de: "Bremsen" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Anvelope", en: "Tires", de: "Reifen" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Ulei", en: "Oil", de: "Öl" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Bord", en: "Dashboard", de: "Armaturenbrett" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Alte probleme", en: "Other problems", de: "Andere Probleme" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Creat", en: "Created", de: "Erstellt" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "actions")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {issues.map((issue, index) => (
                    <tr key={issue.id} className="border-t border-slate-200">
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <span className="text-xs font-semibold">{index + 1}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-950">
                            {issue.vehicle_license_plate}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {issue.vehicle_brand} {issue.vehicle_model}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {issue.reported_by_name}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                            getStatusClass(issue.status)
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {getStatusLabel(issue.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700">
                        {issue.need_service_in_km ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {yesNo(issue.need_brakes)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {yesNo(issue.need_tires)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {yesNo(issue.need_oil)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {issue.dashboard_checks || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {issue.other_problems || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(issue.created_at)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="relative min-w-[170px]">
                          <select
                            value={issue.status}
                            onChange={(event) =>
                              openStatusModal(issue, event.target.value)
                            }
                            disabled={updatingId === issue.id}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                          >
                            <option value="open">
                              {text({ ro: "Deschis", en: "Open", de: "Offen" })}
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

                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
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
        open={statusModalOpen}
        title={text({
          ro: "Confirmare schimbare status",
          en: "Confirm status change",
          de: "Statusänderung bestätigen",
        })}
        message={
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
            : text({
                ro: "Sigur vrei să schimbi statusul acestei probleme?",
                en: "Are you sure you want to change this issue status?",
                de: "Möchtest du den Status dieses Problems wirklich ändern?",
              })
        }
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
        loading={isUpdatingCurrent}
        loadingText={text({
          ro: "Se actualizează...",
          en: "Updating...",
          de: "Wird aktualisiert...",
        })}
        onConfirm={handleConfirmStatusChange}
        onCancel={closeStatusModal}
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