"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  clearMechanicSession,
  getMechanicSession,
  type MechanicSession,
} from "@/lib/auth";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import { ClipboardList, MapPin, Settings2, Wrench } from "lucide-react";

type IssueItem = {
  id: number;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  assignment_id: number | null;
  reported_by_user_id: number;
  reported_by_name: string;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  status: string;
  assigned_mechanic_id: number | null;
  scheduled_for: string | null;
  scheduled_location: string | null;
  created_at: string;
  updated_at: string;
};

type IssuesResponse = {
  issues: IssueItem[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Could not load issues.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Could not load issues.";
}

function normalizeDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function MechanicDashboardPage() {
  const router = useRouter();
  const { locale, t } = useI18n();

  const [session, setSession] = useState<MechanicSession | null>(null);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [issueToConfirm, setIssueToConfirm] = useState<number | null>(null);

  const [editState, setEditState] = useState<
    Record<
      number,
      {
        status: string;
        scheduled_for: string;
        scheduled_location: string;
      }
    >
  >({});

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(
      locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(date);
  }

  function yesNo(value: boolean) {
    return value
      ? text({ ro: "Da", en: "Yes", de: "Ja" })
      : text({ ro: "Nu", en: "No", de: "Nein" });
  }

  function statusBadgeClass(status: string) {
    const normalized = status.toLowerCase();

    if (normalized === "resolved") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (normalized === "in_progress") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (normalized === "scheduled") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
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

  useEffect(() => {
    const parsed = getMechanicSession();

    if (!parsed || parsed.role !== "mechanic" || !parsed.unique_code) {
      clearMechanicSession();
      router.replace("/login");
      return;
    }

    setSession(parsed);
  }, [router]);

  async function loadIssues(userCode: string) {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get<IssuesResponse>("/vehicle-issues/mechanic", {
        headers: {
          "X-User-Code": userCode,
        },
      });

      setIssues(data.issues);

      const nextState: Record<
        number,
        {
          status: string;
          scheduled_for: string;
          scheduled_location: string;
        }
      > = {};

      for (const issue of data.issues) {
        nextState[issue.id] = {
          status: issue.status,
          scheduled_for: normalizeDateTimeLocal(issue.scheduled_for),
          scheduled_location: issue.scheduled_location || "",
        };
      }

      setEditState(nextState);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.unique_code) {
      loadIssues(session.unique_code);
    }
  }, [session]);

  const openIssues = useMemo(
    () => issues.filter((issue) => issue.status !== "resolved"),
    [issues]
  );

  const resolvedIssues = useMemo(
    () => issues.filter((issue) => issue.status === "resolved"),
    [issues]
  );

  const scheduledIssues = useMemo(
    () => issues.filter((issue) => issue.status === "scheduled").length,
    [issues]
  );

  async function handleSave(issueId: number) {
    if (!session?.unique_code) return;

    const values = editState[issueId];
    if (!values) return;

    try {
      setSavingId(issueId);
      setError("");

      await api.patch(
        `/vehicle-issues/${issueId}/mechanic`,
        {
          status: values.status,
          scheduled_for: values.scheduled_for
            ? new Date(values.scheduled_for).toISOString()
            : null,
          scheduled_location: values.scheduled_location.trim() || null,
        },
        {
          headers: {
            "X-User-Code": session.unique_code,
          },
        }
      );

      await loadIssues(session.unique_code);
      setConfirmOpen(false);
      setIssueToConfirm(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handleConfirmSave() {
    if (issueToConfirm === null) return;
    await handleSave(issueToConfirm);
  }

  function handleCloseConfirm() {
    if (savingId !== null) return;
    setConfirmOpen(false);
    setIssueToConfirm(null);
  }

  if (!session) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se verifică sesiunea...",
              en: "Checking session...",
              de: "Sitzung wird überprüft...",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 text-slate-900">
        <section className="flex flex-col gap-2">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">
            {text({
              ro: "Dashboard",
              en: "Dashboard",
              de: "Dashboard",
            })}
          </h1>

          <p className="text-sm text-slate-500">
            {text({
              ro: `Bine ai venit, ${session.full_name}. Gestionează problemele raportate.`,
              en: `Welcome, ${session.full_name}. Manage reported issues.`,
              de: `Willkommen, ${session.full_name}. Verwalte Probleme.`,
            })}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={text({ ro: "Total", en: "Total", de: "Gesamt" })}
            value={String(issues.length)}
          />
          <StatCard
            label={text({ ro: "Deschise", en: "Open", de: "Offen" })}
            value={String(openIssues.length)}
          />
          <StatCard
            label={text({ ro: "Programate", en: "Scheduled", de: "Geplant" })}
            value={String(scheduledIssues)}
          />
          <StatCard
            label={text({ ro: "Rezolvate", en: "Resolved", de: "Gelöst" })}
            value={String(resolvedIssues.length)}
          />
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
                    ro: "Sesiune mecanic",
                    en: "Mechanic session",
                    de: "Mechaniker-Sitzung",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {session.full_name}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <QuickRow
                label={text({
                  ro: "Cod utilizator",
                  en: "User code",
                  de: "Benutzercode",
                })}
                value={session.unique_code}
              />
              <QuickRow
                label={text({
                  ro: "Rol",
                  en: "Role",
                  de: "Rolle",
                })}
                value={session.role}
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
                  ro: "Probleme active",
                  en: "Active issues",
                  de: "Aktive Probleme",
                })}
                value={String(openIssues.length)}
              />
              <QuickRow
                label={text({
                  ro: "Rezolvate",
                  en: "Resolved",
                  de: "Gelöst",
                })}
                value={String(resolvedIssues.length)}
              />
              <QuickRow
                label={text({
                  ro: "Programări",
                  en: "Scheduled",
                  de: "Geplant",
                })}
                value={String(scheduledIssues)}
              />
            </div>
          </div>
        </section>

        {issues.length === 0 ? (
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <p className="text-sm text-slate-500">
              {text({
                ro: "Nu există issue-uri.",
                en: "No issues found.",
                de: "Keine Probleme gefunden.",
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue, index) => {
              const values = editState[issue.id] || {
                status: issue.status,
                scheduled_for: "",
                scheduled_location: "",
              };

              return (
                <section
                  key={issue.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                          <span className="text-xs font-semibold">{index + 1}</span>
                        </div>

                        <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
                          {issue.vehicle_license_plate} · {issue.vehicle_brand} {issue.vehicle_model}
                        </h2>

                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                            statusBadgeClass(issue.status)
                          )}
                        >
                          {getStatusLabel(issue.status)}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <InfoBox
                          label={text({
                            ro: "Raportat de",
                            en: "Reported by",
                            de: "Gemeldet von",
                          })}
                          value={issue.reported_by_name}
                        />
                        <InfoBox
                          label={text({
                            ro: "Creat la",
                            en: "Created at",
                            de: "Erstellt am",
                          })}
                          value={formatDate(issue.created_at)}
                        />
                        <InfoBox
                          label={text({
                            ro: "Programat pentru",
                            en: "Scheduled for",
                            de: "Geplant für",
                          })}
                          value={formatDate(issue.scheduled_for)}
                        />
                        <InfoBox
                          label={text({
                            ro: "Locație",
                            en: "Location",
                            de: "Ort",
                          })}
                          value={issue.scheduled_location || "—"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <InfoCard
                      icon={<Wrench className="h-4 w-4" />}
                      label={text({
                        ro: "Service în km",
                        en: "Service in km",
                        de: "Service in km",
                      })}
                      value={issue.need_service_in_km ?? "—"}
                    />

                    <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                          {text({
                            ro: "Verificări",
                            en: "Checks",
                            de: "Prüfungen",
                          })}
                        </p>
                      </div>

                      <div className="mt-2.5 space-y-1 text-sm text-slate-900">
                        <p>
                          {text({ ro: "Frâne", en: "Brakes", de: "Bremsen" })}: {yesNo(issue.need_brakes)}
                        </p>
                        <p>
                          {text({ ro: "Anvelope", en: "Tires", de: "Reifen" })}: {yesNo(issue.need_tires)}
                        </p>
                        <p>
                          {text({ ro: "Ulei", en: "Oil", de: "Öl" })}: {yesNo(issue.need_oil)}
                        </p>
                      </div>
                    </div>

                    <InfoCard
                      icon={<ClipboardList className="h-4 w-4" />}
                      label={text({
                        ro: "Verificări bord",
                        en: "Dashboard checks",
                        de: "Dashboard-Prüfungen",
                      })}
                      value={issue.dashboard_checks || "—"}
                    />

                    <div className="md:col-span-2 xl:col-span-3">
                      <InfoCard
                        icon={<ClipboardList className="h-4 w-4" />}
                        label={text({
                          ro: "Alte probleme",
                          en: "Other problems",
                          de: "Andere Probleme",
                        })}
                        value={issue.other_problems || "—"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                    <div className="mb-4">
                      <h3 className="text-[16px] font-semibold text-slate-900">
                        {text({
                          ro: "Acțiune mecanic",
                          en: "Mechanic action",
                          de: "Mechaniker-Aktion",
                        })}
                      </h3>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <SelectField
                        label={t("common", "status")}
                        value={values.status}
                        onChange={(value) =>
                          setEditState((prev) => ({
                            ...prev,
                            [issue.id]: {
                              ...prev[issue.id],
                              status: value,
                            },
                          }))
                        }
                        options={[
                          {
                            value: "open",
                            label: text({ ro: "Deschis", en: "Open", de: "Offen" }),
                          },
                          {
                            value: "scheduled",
                            label: text({ ro: "Programat", en: "Scheduled", de: "Geplant" }),
                          },
                          {
                            value: "in_progress",
                            label: text({
                              ro: "În lucru",
                              en: "In progress",
                              de: "In Bearbeitung",
                            }),
                          },
                          {
                            value: "resolved",
                            label: text({ ro: "Rezolvat", en: "Resolved", de: "Gelöst" }),
                          },
                        ]}
                      />

                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {text({
                            ro: "Dată și oră",
                            en: "Date & time",
                            de: "Datum & Uhrzeit",
                          })}
                        </label>
                        <input
                          type="datetime-local"
                          value={values.scheduled_for}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [issue.id]: {
                                ...prev[issue.id],
                                scheduled_for: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {text({
                            ro: "Locație",
                            en: "Location",
                            de: "Ort",
                          })}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={values.scheduled_location}
                            onChange={(e) =>
                              setEditState((prev) => ({
                                ...prev,
                                [issue.id]: {
                                  ...prev[issue.id],
                                  scheduled_location: e.target.value,
                                },
                              }))
                            }
                            placeholder={text({
                              ro: "Service / garaj",
                              en: "Garage / service location",
                              de: "Werkstatt / Service-Ort",
                            })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                          />
                          <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIssueToConfirm(issue.id);
                          setConfirmOpen(true);
                        }}
                        disabled={savingId === issue.id}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === issue.id
                          ? text({
                              ro: "Se salvează...",
                              en: "Saving...",
                              de: "Wird gespeichert...",
                            })
                          : text({
                              ro: "Salvează actualizarea",
                              en: "Save update",
                              de: "Aktualisierung speichern",
                            })}
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={text({
          ro: "Confirmare actualizare",
          en: "Confirm update",
          de: "Aktualisierung bestätigen",
        })}
        message={text({
          ro: "Sigur vrei să salvezi modificările pentru acest issue?",
          en: "Are you sure you want to save changes for this issue?",
          de: "Möchtest du die Änderungen für dieses Problem wirklich speichern?",
        })}
        confirmText={text({
          ro: "Salvează",
          en: "Save",
          de: "Speichern",
        })}
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={issueToConfirm !== null && savingId === issueToConfirm}
        onConfirm={handleConfirmSave}
        onCancel={handleCloseConfirm}
      />
    </>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
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

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          {icon}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      </div>

      <p className="mt-2.5 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}