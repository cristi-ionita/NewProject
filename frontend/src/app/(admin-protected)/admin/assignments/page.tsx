"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closeAssignment,
  createAssignment,
  deleteAssignment,
  listAssignments,
  type AssignmentItem,
} from "@/services/assignments.api";
import { listUsers, type UserItem } from "@/services/users.api";
import { listVehicles, type VehicleItem } from "@/services/vehicles.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CarFront,
  ChevronDown,
  ClipboardList,
  Plus,
  Settings2,
  UserRound,
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

  if (!detail) return "Failed to load data.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load data.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminAssignmentsPage() {
  const { locale, t } = useI18n();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [userId, setUserId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentItem | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [assignmentsRes, usersRes, vehiclesRes] = await Promise.all([
        listAssignments(),
        listUsers(true),
        listVehicles(),
      ]);

      setAssignments(assignmentsRes.assignments);
      setUsers(usersRes);
      setVehicles(vehiclesRes);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createAssignment({
        user_id: Number(userId),
        vehicle_id: Number(vehicleId),
      });

      setUserId("");
      setVehicleId("");
      setShowCreateForm(false);

      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(id: number) {
    try {
      setWorkingId(id);
      setError("");
      await closeAssignment(id);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setWorkingId(null);
    }
  }

  function openDeleteModal(assignment: AssignmentItem) {
    setAssignmentToDelete(assignment);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (workingId !== null) return;
    setDeleteModalOpen(false);
    setAssignmentToDelete(null);
  }

  async function handleDeleteConfirm() {
    if (!assignmentToDelete) return;

    try {
      setWorkingId(assignmentToDelete.id);
      setError("");
      await deleteAssignment(assignmentToDelete.id);
      await loadData();
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setWorkingId(null);
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
    if (status === "active") {
      return text({ ro: "Activ", en: "Active", de: "Aktiv" });
    }

    if (status === "closed") {
      return text({ ro: "Închis", en: "Closed", de: "Geschlossen" });
    }

    return status;
  }

  function getStatusClass(status: string) {
    if (status === "active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "active").length,
    [assignments]
  );

  const closedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "closed").length,
    [assignments]
  );

  const isDeletingCurrent =
    assignmentToDelete !== null && workingId === assignmentToDelete.id;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă assignmenturile...",
              en: "Loading assignments...",
              de: "Zuweisungen werden geladen...",
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
                    {t("nav", "assignments")}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Creează, închide sau șterge alocările dintre utilizatori și vehicule.",
                      en: "Create, close, or delete assignments between users and vehicles.",
                      de: "Erstelle, schließe oder lösche Zuweisungen zwischen Benutzern und Fahrzeugen.",
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
                  value={String(assignments.length)}
                />
                <HeroStatCard
                  icon={<UserRound className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Active",
                    en: "Active",
                    de: "Aktiv",
                  })}
                  value={String(activeAssignments)}
                />
                <HeroStatCard
                  icon={<CarFront className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Închise",
                    en: "Closed",
                    de: "Geschlossen",
                  })}
                  value={String(closedAssignments)}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Settings2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {text({
                      ro: "Gestionare",
                      en: "Management",
                      de: "Verwaltung",
                    })}
                  </p>
                  <h2 className="text-[17px] font-semibold text-slate-950">
                    {text({
                      ro: "Creează assignment",
                      en: "Create assignment",
                      de: "Zuweisung erstellen",
                    })}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {showCreateForm
                  ? text({ ro: "Închide", en: "Close", de: "Schließen" })
                  : text({
                      ro: "Creează",
                      en: "Create",
                      de: "Erstellen",
                    })}
              </button>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              {text({
                ro: "Alege un utilizator activ și un vehicul pentru a crea o nouă alocare.",
                en: "Select an active user and a vehicle to create a new assignment.",
                de: "Wähle einen aktiven Benutzer und ein Fahrzeug aus, um eine neue Zuweisung zu erstellen.",
              })}
            </p>
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
                  ro: "Assignmenturi totale",
                  en: "Total assignments",
                  de: "Zuweisungen gesamt",
                })}
                value={String(assignments.length)}
              />
              <QuickRow
                label={text({
                  ro: "Active",
                  en: "Active",
                  de: "Aktiv",
                })}
                value={String(activeAssignments)}
              />
              <QuickRow
                label={text({
                  ro: "Închise",
                  en: "Closed",
                  de: "Geschlossen",
                })}
                value={String(closedAssignments)}
              />
            </div>
          </div>
        </section>

        {showCreateForm ? (
          <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Plus className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Alocare nouă",
                    en: "New assignment",
                    de: "Neue Zuweisung",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Completează datele",
                    en: "Complete the details",
                    de: "Daten ausfüllen",
                  })}
                </h2>
              </div>
            </div>

            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
              <SelectField
                label={text({ ro: "Utilizator", en: "User", de: "Benutzer" })}
                value={userId}
                onChange={setUserId}
                placeholder={text({
                  ro: "Selectează utilizator",
                  en: "Select user",
                  de: "Benutzer auswählen",
                })}
                options={users.map((user) => ({
                  value: String(user.id),
                  label: `${user.full_name}${
                    user.shift_number
                      ? text({
                          ro: ` — tura ${user.shift_number}`,
                          en: ` — shift ${user.shift_number}`,
                          de: ` — Schicht ${user.shift_number}`,
                        })
                      : ""
                  }`,
                }))}
              />

              <SelectField
                label={text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
                value={vehicleId}
                onChange={setVehicleId}
                placeholder={text({
                  ro: "Selectează vehicul",
                  en: "Select vehicle",
                  de: "Fahrzeug auswählen",
                })}
                options={vehicles.map((vehicle) => ({
                  value: String(vehicle.id),
                  label: `${vehicle.license_plate} — ${vehicle.brand} ${vehicle.model}`,
                }))}
              />

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !userId || !vehicleId}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? t("common", "loading")
                    : text({
                        ro: "Creează assignment",
                        en: "Create assignment",
                        de: "Zuweisung erstellen",
                      })}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Listă assignmenturi",
                  en: "Assignment list",
                  de: "Zuweisungsliste",
                })}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
                {t("nav", "assignments")}
              </h2>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {assignments.length}{" "}
              {text({
                ro: "înregistrări",
                en: "records",
                de: "Einträge",
              })}
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="px-4 py-7">
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {text({
                    ro: "Nu există assignmenturi.",
                    en: "There are no assignments.",
                    de: "Es gibt keine Zuweisungen.",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Utilizator", en: "User", de: "Benutzer" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Vehicul", en: "Vehicle", de: "Fahrzeug" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Număr", en: "Plate", de: "Kennzeichen" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "status")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Start", en: "Started", de: "Beginn" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Final", en: "Ended", de: "Ende" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "actions")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignments.map((assignment, index) => {
                    const isWorking = workingId === assignment.id;

                    return (
                      <tr key={assignment.id} className="border-t border-slate-200">
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                              <span className="text-xs font-semibold">{index + 1}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-950">
                              {assignment.user_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {assignment.vehicle_brand} {assignment.vehicle_model}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {assignment.vehicle_license_plate}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                              getStatusClass(assignment.status)
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {getStatusLabel(assignment.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(assignment.started_at)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatDate(assignment.ended_at)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {assignment.status === "active" ? (
                              <button
                                type="button"
                                onClick={() => handleClose(assignment.id)}
                                disabled={isWorking}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {text({
                                  ro: "Închide",
                                  en: "Close",
                                  de: "Schließen",
                                })}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDeleteModal(assignment)}
                                disabled={isWorking}
                                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {text({
                                  ro: "Șterge",
                                  en: "Delete",
                                  de: "Löschen",
                                })}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title={text({
          ro: "Confirmare ștergere",
          en: "Delete confirmation",
          de: "Löschbestätigung",
        })}
        message={
          assignmentToDelete
            ? text({
                ro: `Sigur vrei să ștergi assignmentul pentru ${assignmentToDelete.user_name}?`,
                en: `Are you sure you want to delete the assignment for ${assignmentToDelete.user_name}?`,
                de: `Möchtest du die Zuweisung für ${assignmentToDelete.user_name} wirklich löschen?`,
              })
            : text({
                ro: "Sigur vrei să ștergi acest assignment?",
                en: "Are you sure you want to delete this assignment?",
                de: "Möchtest du diese Zuweisung wirklich löschen?",
              })
        }
        confirmText={text({
          ro: "Șterge",
          en: "Delete",
          de: "Löschen",
        })}
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={isDeletingCurrent}
        loadingText={text({
          ro: "Se șterge...",
          en: "Deleting...",
          de: "Wird gelöscht...",
        })}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
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

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}