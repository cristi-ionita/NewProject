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
import { isApiClientError } from "@/lib/axios";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CarFront,
  ClipboardList,
  Plus,
  Settings2,
  UserRound,
} from "lucide-react";

import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

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
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<AssignmentItem | null>(null);

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
    } catch (err: unknown) {
      setError(
        isApiClientError(err)
          ? err.message
          : text({
              ro: "Nu s-au putut încărca datele.",
              en: "Failed to load data.",
              de: "Daten konnten nicht geladen werden.",
            })
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || !vehicleId) {
      setError(
        text({
          ro: "Selectează utilizatorul și vehiculul.",
          en: "Select user and vehicle.",
          de: "Benutzer und Fahrzeug auswählen.",
        })
      );
      return;
    }

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
    } catch (err: unknown) {
      setError(
        isApiClientError(err)
          ? err.message
          : text({
              ro: "Nu s-a putut crea alocarea.",
              en: "Failed to create assignment.",
              de: "Zuweisung konnte nicht erstellt werden.",
            })
      );
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
    } catch (err: unknown) {
      setError(
        isApiClientError(err)
          ? err.message
          : text({
              ro: "Nu s-a putut închide alocarea.",
              en: "Failed to close assignment.",
              de: "Zuweisung konnte nicht geschlossen werden.",
            })
      );
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
    } catch (err: unknown) {
      setError(
        isApiClientError(err)
          ? err.message
          : text({
              ro: "Nu s-a putut șterge alocarea.",
              en: "Failed to delete assignment.",
              de: "Zuweisung konnte nicht gelöscht werden.",
            })
      );
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
    return status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-100 text-slate-700";
  }

  const activeAssignments = useMemo(
    () =>
      assignments.filter((assignment) => assignment.status === "active").length,
    [assignments]
  );

  const closedAssignments = useMemo(
    () =>
      assignments.filter((assignment) => assignment.status === "closed").length,
    [assignments]
  );

  const isDeletingCurrent =
    assignmentToDelete !== null && workingId === assignmentToDelete.id;

  const deleteMessage = assignmentToDelete
    ? text({
        ro: `Sigur vrei să ștergi alocarea pentru ${
          assignmentToDelete.user_name || `#${assignmentToDelete.user_id}`
        }?`,
        en: `Are you sure you want to delete the assignment for ${
          assignmentToDelete.user_name || `#${assignmentToDelete.user_id}`
        }?`,
        de: `Möchtest du die Zuweisung für ${
          assignmentToDelete.user_name || `#${assignmentToDelete.user_id}`
        } wirklich löschen?`,
      })
    : "";

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<ClipboardList className="h-7 w-7" />}
          title={t("nav", "assignments")}
          description={text({
            ro: "Gestionează rapid alocările dintre utilizatori și vehicule.",
            en: "Quickly manage user and vehicle assignments.",
            de: "Verwalte schnell Zuweisungen zwischen Benutzern und Fahrzeugen.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <HeroStatCard
                icon={<ClipboardList className="h-4 w-4" />}
                label={text({
                  ro: "Total alocări",
                  en: "Total assignments",
                  de: "Gesamtzuweisungen",
                })}
                value={assignments.length}
              />
              <HeroStatCard
                icon={<Settings2 className="h-4 w-4" />}
                label={text({
                  ro: "Active",
                  en: "Active",
                  de: "Aktiv",
                })}
                value={activeAssignments}
              />
              <HeroStatCard
                icon={<CarFront className="h-4 w-4" />}
                label={text({
                  ro: "Închise",
                  en: "Closed",
                  de: "Geschlossen",
                })}
                value={closedAssignments}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title={text({
              ro: "Creare alocare",
              en: "Create assignment",
              de: "Zuweisung erstellen",
            })}
            actions={
              <button
                type="button"
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {showCreateForm
                  ? text({ ro: "Ascunde", en: "Hide", de: "Ausblenden" })
                  : text({ ro: "Nouă", en: "New", de: "Neu" })}
              </button>
            }
          >
            {showCreateForm ? (
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {text({
                      ro: "Utilizator",
                      en: "User",
                      de: "Benutzer",
                    })}
                  </label>
                  <select
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      {text({
                        ro: "Selectează utilizatorul",
                        en: "Select user",
                        de: "Benutzer auswählen",
                      })}
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {text({
                      ro: "Vehicul",
                      en: "Vehicle",
                      de: "Fahrzeug",
                    })}
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      {text({
                        ro: "Selectează vehiculul",
                        en: "Select vehicle",
                        de: "Fahrzeug auswählen",
                      })}
                    </option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "..."
                    : text({
                        ro: "Creează alocarea",
                        en: "Create assignment",
                        de: "Zuweisung erstellen",
                      })}
                </button>
              </form>
            ) : (
              <EmptyState
                title={text({
                  ro: "Deschide formularul pentru a crea o alocare nouă.",
                  en: "Open the form to create a new assignment.",
                  de: "Öffne das Formular, um eine neue Zuweisung zu erstellen.",
                })}
              />
            )}
          </SectionCard>

          <SectionCard
            title={text({
              ro: "Lista alocări",
              en: "Assignments list",
              de: "Zuweisungsliste",
            })}
          >
            {assignments.length ? (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-[22px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {assignment.user_name || `#${assignment.user_id}`}
                          </p>

                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium",
                              getStatusClass(assignment.status)
                            )}
                          >
                            {getStatusLabel(assignment.status)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                          <p className="flex items-center gap-2">
                            <CarFront className="h-4 w-4 text-slate-400" />
                            <span>
                              {assignment.vehicle_license_plate ||
                                `#${assignment.vehicle_id}`}
                            </span>
                          </p>

                          <p className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-400" />
                            <span>
                              {text({
                                ro: "Început",
                                en: "Started",
                                de: "Gestartet",
                              })}
                              : {formatDate(assignment.started_at)}
                            </span>
                          </p>

                          {assignment.ended_at ? (
                            <p className="flex items-center gap-2">
                              <Settings2 className="h-4 w-4 text-slate-400" />
                              <span>
                                {text({
                                  ro: "Închis",
                                  en: "Closed",
                                  de: "Geschlossen",
                                })}
                                : {formatDate(assignment.ended_at)}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {assignment.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => handleClose(assignment.id)}
                            disabled={workingId === assignment.id}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {workingId === assignment.id
                              ? "..."
                              : text({
                                  ro: "Închide",
                                  en: "Close",
                                  de: "Schließen",
                                })}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openDeleteModal(assignment)}
                          disabled={workingId === assignment.id}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {text({
                            ro: "Șterge",
                            en: "Delete",
                            de: "Löschen",
                          })}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există alocări.",
                  en: "No assignments found.",
                  de: "Keine Zuweisungen gefunden.",
                })}
              />
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title={text({
          ro: "Ștergere alocare",
          en: "Delete assignment",
          de: "Zuweisung löschen",
        })}
        message={deleteMessage}
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
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        loading={Boolean(isDeletingCurrent)}
      />
    </>
  );
}