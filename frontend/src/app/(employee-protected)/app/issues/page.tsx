"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import { getActiveSession } from "@/services/auth.api";
import { createMyIssue, listMyIssues, IssueItem } from "@/services/issues.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Settings2,
  Wrench,
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

function sectionLabelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function textareaClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function buttonPrimaryClass() {
  return "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
}

function formatDate(value?: string | null, locale: "ro" | "en" | "de" = "ro") {
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

function getStatusBadgeClass(status?: string | null) {
  const normalized = status?.toLowerCase?.() || "";

  if (normalized === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "in_progress" || normalized === "scheduled") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "open") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function EmployeeIssuesPage() {
  const session = getUserSession();
  const { locale } = useI18n();

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [needServiceInKm, setNeedServiceInKm] = useState("");
  const [needBrakes, setNeedBrakes] = useState(false);
  const [needTires, setNeedTires] = useState(false);
  const [needOil, setNeedOil] = useState(false);
  const [dashboardChecks, setDashboardChecks] = useState("");
  const [otherProblems, setOtherProblems] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function yesNo(value: boolean) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  function getStatusLabel(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === "resolved") {
      return text({ ro: "Rezolvat", en: "Resolved", de: "Gelöst" });
    }

    if (normalized === "in_progress") {
      return text({ ro: "În lucru", en: "In progress", de: "In Bearbeitung" });
    }

    if (normalized === "scheduled") {
      return text({ ro: "Programat", en: "Scheduled", de: "Geplant" });
    }

    return text({ ro: "Deschis", en: "Open", de: "Offen" });
  }

  async function loadData() {
    try {
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

      const [issuesRes, activeRes] = await Promise.all([
        listMyIssues(session.unique_code),
        getActiveSession(session.unique_code),
      ]);

      setIssues(issuesRes.issues);
      setHasActiveSession(!!activeRes.has_active_session);
      setAssignmentId(activeRes.assignment_id ?? null);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca issue-urile",
            en: "Could not load issues",
            de: "Probleme konnten nicht geladen werden",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.unique_code, locale]);

  async function handleCreateIssue(e: React.FormEvent) {
    e.preventDefault();

    if (!session?.unique_code || !assignmentId) {
      setError(
        text({
          ro: "Ai nevoie de sesiune activă pentru a raporta o problemă.",
          en: "You need an active session to report an issue.",
          de: "Du brauchst eine aktive Sitzung, um ein Problem zu melden.",
        })
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createMyIssue({
        user_code: session.unique_code,
        assignment_id: assignmentId,
        need_service_in_km: needServiceInKm ? Number(needServiceInKm) : undefined,
        need_brakes: needBrakes,
        need_tires: needTires,
        need_oil: needOil,
        dashboard_checks: dashboardChecks || undefined,
        other_problems: otherProblems || undefined,
      });

      setNeedServiceInKm("");
      setNeedBrakes(false);
      setNeedTires(false);
      setNeedOil(false);
      setDashboardChecks("");
      setOtherProblems("");

      await loadData();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut crea issue-ul",
            en: "Could not create issue",
            de: "Problem konnte nicht erstellt werden",
          })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const openIssuesCount = useMemo(
    () => issues.filter((issue) => issue.status !== "resolved").length,
    [issues]
  );

  const resolvedIssuesCount = useMemo(
    () => issues.filter((issue) => issue.status === "resolved").length,
    [issues]
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
                    ro: "Problemele mele",
                    en: "My Issues",
                    de: "Meine Probleme",
                  })}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Raportează rapid problemele observate și urmărește statusul lor.",
                    en: "Quickly report observed problems and track their status.",
                    de: "Melde beobachtete Probleme schnell und verfolge ihren Status.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <HeroStatCard
                icon={<ClipboardList className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Total",
                  en: "Total",
                  de: "Gesamt",
                })}
                value={String(issues.length)}
              />
              <HeroStatCard
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Deschise",
                  en: "Open",
                  de: "Offen",
                })}
                value={String(openIssuesCount)}
              />
              <HeroStatCard
                icon={<Wrench className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Rezolvate",
                  en: "Resolved",
                  de: "Gelöst",
                })}
                value={String(resolvedIssuesCount)}
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

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Settings2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Raportare",
                  en: "Reporting",
                  de: "Meldung",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Raportează o problemă",
                  en: "Report an issue",
                  de: "Problem melden",
                })}
              </h2>
            </div>
          </div>

          {!hasActiveSession ? (
            <div className={tileClass()}>
              <p className="text-sm text-slate-500">
                {text({
                  ro: "Nu ai sesiune activă. Nu poți raporta probleme fără o sesiune activă.",
                  en: "You do not have an active session. You cannot report issues without one.",
                  de: "Du hast keine aktive Sitzung. Ohne aktive Sitzung kannst du keine Probleme melden.",
                })}
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className={sectionLabelClass()}>
                  {text({
                    ro: "Service în km",
                    en: "Service in km",
                    de: "Service in km",
                  })}
                </label>
                <input
                  type="number"
                  placeholder={text({
                    ro: "Ex: 1500",
                    en: "Ex: 1500",
                    de: "Z. B.: 1500",
                  })}
                  value={needServiceInKm}
                  onChange={(e) => setNeedServiceInKm(e.target.value)}
                  className={cn("mt-2", inputClass())}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <CheckboxCard
                  checked={needBrakes}
                  onChange={setNeedBrakes}
                  label={text({
                    ro: "Necesită frâne",
                    en: "Need brakes",
                    de: "Bremsen nötig",
                  })}
                />
                <CheckboxCard
                  checked={needTires}
                  onChange={setNeedTires}
                  label={text({
                    ro: "Necesită anvelope",
                    en: "Need tires",
                    de: "Reifen nötig",
                  })}
                />
                <CheckboxCard
                  checked={needOil}
                  onChange={setNeedOil}
                  label={text({
                    ro: "Necesită ulei",
                    en: "Need oil",
                    de: "Öl nötig",
                  })}
                />
              </div>

              <div>
                <label className={sectionLabelClass()}>
                  {text({
                    ro: "Verificări bord",
                    en: "Dashboard checks",
                    de: "Dashboard-Prüfungen",
                  })}
                </label>
                <textarea
                  placeholder={text({
                    ro: "Descrie avertizările sau verificările de pe bord",
                    en: "Describe dashboard warnings or checks",
                    de: "Beschreibe Warnungen oder Prüfungen am Armaturenbrett",
                  })}
                  value={dashboardChecks}
                  onChange={(e) => setDashboardChecks(e.target.value)}
                  className={cn("mt-2 min-h-[110px]", textareaClass())}
                />
              </div>

              <div>
                <label className={sectionLabelClass()}>
                  {text({
                    ro: "Alte probleme",
                    en: "Other problems",
                    de: "Andere Probleme",
                  })}
                </label>
                <textarea
                  placeholder={text({
                    ro: "Adaugă orice altă observație relevantă",
                    en: "Add any other relevant observation",
                    de: "Füge weitere relevante Beobachtungen hinzu",
                  })}
                  value={otherProblems}
                  onChange={(e) => setOtherProblems(e.target.value)}
                  className={cn("mt-2 min-h-[120px]", textareaClass())}
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className={buttonPrimaryClass()}>
                  {saving
                    ? text({
                        ro: "Se salvează...",
                        en: "Saving...",
                        de: "Wird gespeichert...",
                      })
                    : text({
                        ro: "Raportează problema",
                        en: "Report issue",
                        de: "Problem melden",
                      })}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
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
                ro: "Sesiune activă",
                en: "Active session",
                de: "Aktive Sitzung",
              })}
              value={
                hasActiveSession
                  ? text({ ro: "Da", en: "Yes", de: "Ja" })
                  : text({ ro: "Nu", en: "No", de: "Nein" })
              }
            />
            <QuickRow
              label={text({
                ro: "Assignment ID",
                en: "Assignment ID",
                de: "Zuweisungs-ID",
              })}
              value={assignmentId ? String(assignmentId) : "—"}
            />
            <QuickRow
              label={text({
                ro: "Probleme deschise",
                en: "Open issues",
                de: "Offene Probleme",
              })}
              value={String(openIssuesCount)}
            />
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <CarFront className="h-4.5 w-4.5" />
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
                ro: "Problemele mele raportate",
                en: "My reported issues",
                de: "Meine gemeldeten Probleme",
              })}
            </h2>
          </div>
        </div>

        {issues.length === 0 ? (
          <div className={tileClass()}>
            <p className="text-sm text-slate-500">
              {text({
                ro: "Nu există issue-uri raportate.",
                en: "There are no reported issues.",
                de: "Es gibt keine gemeldeten Probleme.",
              })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {issues.map((issue, index) => (
              <div
                key={issue.id}
                className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {issue.vehicle_license_plate} - {issue.vehicle_brand} {issue.vehicle_model}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      getStatusBadgeClass(issue.status)
                    )}
                  >
                    {getStatusLabel(issue.status)}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoTile
                    label={text({
                      ro: "Service în km",
                      en: "Service in km",
                      de: "Service in km",
                    })}
                    value={String(issue.need_service_in_km ?? "-")}
                  />
                  <InfoTile
                    label={text({
                      ro: "Creat",
                      en: "Created",
                      de: "Erstellt",
                    })}
                    value={formatDate(issue.created_at, locale)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Frâne",
                      en: "Brakes",
                      de: "Bremsen",
                    })}
                    value={yesNo(issue.need_brakes)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Anvelope",
                      en: "Tires",
                      de: "Reifen",
                    })}
                    value={yesNo(issue.need_tires)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Ulei",
                      en: "Oil",
                      de: "Öl",
                    })}
                    value={yesNo(issue.need_oil)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Bord",
                      en: "Dashboard",
                      de: "Dashboard",
                    })}
                    value={issue.dashboard_checks || "-"}
                  />
                  <div className="md:col-span-2">
                    <InfoTile
                      label={text({
                        ro: "Alte probleme",
                        en: "Other problems",
                        de: "Andere Probleme",
                      })}
                      value={issue.other_problems || "-"}
                    />
                  </div>
                </div>
              </div>
            ))}
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
    <label className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span className="text-sm font-medium text-slate-900">{label}</span>
    </label>
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

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={tileClass()}>
      <p className={sectionLabelClass()}>{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}