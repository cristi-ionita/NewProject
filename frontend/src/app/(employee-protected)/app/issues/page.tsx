"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Settings2,
  Wrench,
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
import { createMyIssue, listMyIssues, type IssueItem } from "@/services/issues.api";

type SupportedLocale = "ro" | "en" | "de";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDate(value?: string | null, locale: SupportedLocale = "ro") {
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
  const normalized = normalize(status);

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
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [issues, setIssues] = useState<IssueItem[]>([]);
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
    return values[safeLocale];
  }

  function yesNo(value: boolean) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  function getStatusLabel(status: string) {
    const normalized = normalize(status);

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

  const resetForm = useCallback(() => {
    setNeedServiceInKm("");
    setNeedBrakes(false);
    setNeedTires(false);
    setNeedOil(false);
    setDashboardChecks("");
    setOtherProblems("");
  }, []);

  const loadData = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setIssues([]);
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      const issuesRes = await listMyIssues(session.unique_code);
      setIssues(issuesRes.issues);
    } catch (err: unknown) {
      setIssues([]);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca issue-urile.",
            en: "Could not load issues.",
            de: "Probleme konnten nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [safeLocale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateIssue(event: React.FormEvent<HTMLFormElement>) {
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

    const parsedServiceKm =
      needServiceInKm.trim() === "" ? undefined : Number(needServiceInKm);

    if (
      parsedServiceKm !== undefined &&
      (!Number.isFinite(parsedServiceKm) || parsedServiceKm < 0)
    ) {
      setError(
        text({
          ro: "Valoarea pentru service în km trebuie să fie un număr valid.",
          en: "Service in km must be a valid number.",
          de: "Service in km muss eine gültige Zahl sein.",
        })
      );
      return;
    }

    if (
      parsedServiceKm === undefined &&
      !needBrakes &&
      !needTires &&
      !needOil &&
      !dashboardChecks.trim() &&
      !otherProblems.trim()
    ) {
      setError(
        text({
          ro: "Completează cel puțin o problemă.",
          en: "Fill in at least one issue.",
          de: "Fülle mindestens ein Problem aus.",
        })
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createMyIssue(session.unique_code, {
        need_service_in_km: parsedServiceKm,
        need_brakes: needBrakes,
        need_tires: needTires,
        need_oil: needOil,
        dashboard_checks: dashboardChecks.trim() || undefined,
        other_problems: otherProblems.trim() || undefined,
      });

      resetForm();
      await loadData();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut crea issue-ul.",
            en: "Could not create issue.",
            de: "Problem konnte nicht erstellt werden.",
          })
        )
      );
    } finally {
      setSaving(false);
    }
  }

  const openIssuesCount = useMemo(
    () => issues.filter((issue) => normalize(issue.status) !== "resolved").length,
    [issues]
  );

  const resolvedIssuesCount = useMemo(
    () => issues.filter((issue) => normalize(issue.status) === "resolved").length,
    [issues]
  );

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !issues.length) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={<ClipboardList className="h-7 w-7" />}
        title={text({
          ro: "Problemele mele",
          en: "My Issues",
          de: "Meine Probleme",
        })}
        description={text({
          ro: "Raportează rapid problemele observate și urmărește statusul lor.",
          en: "Quickly report observed problems and track their status.",
          de: "Melde beobachtete Probleme schnell und verfolge ihren Status.",
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<ClipboardList className="h-4 w-4" />}
              label={text({
                ro: "Total",
                en: "Total",
                de: "Gesamt",
              })}
              value={issues.length}
            />
            <HeroStatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label={text({
                ro: "Deschise",
                en: "Open",
                de: "Offen",
              })}
              value={openIssuesCount}
            />
            <HeroStatCard
              icon={<Wrench className="h-4 w-4" />}
              label={text({
                ro: "Rezolvate",
                en: "Resolved",
                de: "Gelöst",
              })}
              value={resolvedIssuesCount}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title={text({
            ro: "Raportează o problemă",
            en: "Report an issue",
            de: "Problem melden",
          })}
          icon={<Settings2 className="h-5 w-5" />}
        >
          <form onSubmit={handleCreateIssue} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Service în km",
                  en: "Service in km",
                  de: "Service in km",
                })}
              </label>
              <input
                type="number"
                min="0"
                value={needServiceInKm}
                onChange={(event) => setNeedServiceInKm(event.target.value)}
                placeholder={text({
                  ro: "Ex: 1500",
                  en: "Ex: 1500",
                  de: "Z. B.: 1500",
                })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
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
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Verificări bord",
                  en: "Dashboard checks",
                  de: "Dashboard-Prüfungen",
                })}
              </label>
              <textarea
                value={dashboardChecks}
                onChange={(event) => setDashboardChecks(event.target.value)}
                placeholder={text({
                  ro: "Descrie avertizările sau verificările de pe bord",
                  en: "Describe dashboard warnings or checks",
                  de: "Beschreibe Warnungen oder Prüfungen am Armaturenbrett",
                })}
                className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {text({
                  ro: "Alte probleme",
                  en: "Other problems",
                  de: "Andere Probleme",
                })}
              </label>
              <textarea
                value={otherProblems}
                onChange={(event) => setOtherProblems(event.target.value)}
                placeholder={text({
                  ro: "Adaugă orice altă observație relevantă",
                  en: "Add any other relevant observation",
                  de: "Füge weitere relevante Beobachtungen hinzu",
                })}
                className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
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
        </SectionCard>

        <SectionCard
          title={text({
            ro: "Informații rapide",
            en: "Quick details",
            de: "Schnellinfos",
          })}
          icon={<ClipboardList className="h-5 w-5" />}
        >
          <div className="space-y-2.5">
            <QuickRow
              label={text({
                ro: "Probleme totale",
                en: "Total issues",
                de: "Probleme gesamt",
              })}
              value={String(issues.length)}
            />
            <QuickRow
              label={text({
                ro: "Probleme deschise",
                en: "Open issues",
                de: "Offene Probleme",
              })}
              value={String(openIssuesCount)}
            />
            <QuickRow
              label={text({
                ro: "Probleme rezolvate",
                en: "Resolved issues",
                de: "Gelöste Probleme",
              })}
              value={String(resolvedIssuesCount)}
            />
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title={text({
          ro: "Problemele mele raportate",
          en: "My reported issues",
          de: "Meine gemeldeten Probleme",
        })}
        icon={<CarFront className="h-5 w-5" />}
      >
        {issues.length === 0 ? (
          <EmptyState
            title={text({
              ro: "Nu există issue-uri raportate",
              en: "There are no reported issues",
              de: "Es gibt keine gemeldeten Probleme",
            })}
            description={text({
              ro: "Problemele raportate de tine vor apărea aici.",
              en: "The issues reported by you will appear here.",
              de: "Die von dir gemeldeten Probleme erscheinen hier.",
            })}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {issues.map((issue, index) => (
              <article
                key={issue.id}
                className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>

                    <span className="text-sm font-semibold text-slate-900">
                      {issue.vehicle_license_plate || "—"}
                      {issue.vehicle_brand || issue.vehicle_model
                        ? ` - ${issue.vehicle_brand || ""} ${issue.vehicle_model || ""}`.trim()
                        : ""}
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
                    value={issue.need_service_in_km != null ? String(issue.need_service_in_km) : "-"}
                  />
                  <InfoTile
                    label={text({
                      ro: "Creat",
                      en: "Created",
                      de: "Erstellt",
                    })}
                    value={formatDate(issue.created_at, safeLocale)}
                  />
                  <InfoTile
                    label={text({
                      ro: "Frâne",
                      en: "Brakes",
                      de: "Bremsen",
                    })}
                    value={yesNo(Boolean(issue.need_brakes))}
                  />
                  <InfoTile
                    label={text({
                      ro: "Anvelope",
                      en: "Tires",
                      de: "Reifen",
                    })}
                    value={yesNo(Boolean(issue.need_tires))}
                  />
                  <InfoTile
                    label={text({
                      ro: "Ulei",
                      en: "Oil",
                      de: "Öl",
                    })}
                    value={yesNo(Boolean(issue.need_oil))}
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
              </article>
            ))}
          </div>
        )}
      </SectionCard>
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
        onChange={(event) => onChange(event.target.checked)}
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
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}