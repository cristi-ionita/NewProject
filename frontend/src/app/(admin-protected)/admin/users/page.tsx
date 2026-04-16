"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  activateUser,
  createUser,
  deactivateUser,
  listUsers,
  resetUserPin,
  type UserItem,
} from "@/services/users.api";
import {
  getAllLeaveRequests,
  type LeaveRequestItem,
} from "@/services/leave.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import { isApiClientError } from "@/lib/axios";
import {
  CalendarDays,
  FileText,
  KeyRound,
  Plus,
  Settings2,
  Users,
  UserRound,
  ClipboardList,
} from "lucide-react";

import InfoRow from "@/components/ui/info-row";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

type FilterType = "all" | "active" | "leave";
type UserRole = "employee" | "mechanic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function extractErrorMessage(error: unknown): string {
  if (isApiClientError(error)) {
    return error.message;
  }

  const err = error as { response?: { data?: { detail?: string } } };
  return err?.response?.data?.detail || "Error";
}

export default function AdminUsersPage() {
  const { locale, t } = useI18n();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [onLeaveUserIds, setOnLeaveUserIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<FilterType>("all");

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<UserItem | null>(null);
  const [nextUserActive, setNextUserActive] = useState<boolean | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resettingPin, setResettingPin] = useState(false);
  const [showResetPinModal, setShowResetPinModal] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [shiftNumber, setShiftNumber] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const [usersData, leaveData] = await Promise.all([
        listUsers(),
        getAllLeaveRequests(),
      ]);

      setUsers(usersData);

      const today = new Date();

      const leaveIds = Array.from(
        new Set(
          leaveData.requests
            .filter((request: LeaveRequestItem) => {
              if (request.status !== "approved") return false;

              const start = new Date(request.start_date);
              const end = new Date(request.end_date);

              return start <= today && end >= today;
            })
            .map((request) => request.user_id)
        )
      );

      setOnLeaveUserIds(leaveIds);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const leaveSet = useMemo(() => new Set(onLeaveUserIds), [onLeaveUserIds]);

  function isUserOnLeave(id: number) {
    return leaveSet.has(id);
  }

  function getStatusLabel(user: UserItem) {
    if (isUserOnLeave(user.id)) {
      return text({
        ro: "În concediu",
        en: "On leave",
        de: "Im Urlaub",
      });
    }

    return user.is_active
      ? text({ ro: "Activ", en: "Active", de: "Aktiv" })
      : text({ ro: "Inactiv", en: "Inactive", de: "Inaktiv" });
  }

  function getStatusClass(user: UserItem) {
    if (isUserOnLeave(user.id)) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return user.is_active
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-100 text-slate-700";
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === "active") {
        return user.is_active && !isUserOnLeave(user.id);
      }

      if (statusFilter === "leave") {
        return isUserOnLeave(user.id);
      }

      return true;
    });
  }, [users, statusFilter, onLeaveUserIds]);

  const activeCount = useMemo(
    () =>
      users.filter((user) => user.is_active && !isUserOnLeave(user.id)).length,
    [users, onLeaveUserIds]
  );

  const leaveCount = useMemo(
    () => users.filter((user) => isUserOnLeave(user.id)).length,
    [users, onLeaveUserIds]
  );

  const totalCount = users.length;

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createUser({
        full_name: fullName,
        role,
        shift_number: role === "mechanic" ? null : shiftNumber,
        pin,
      });

      setFullName("");
      setPin("");
      setShiftNumber("");
      setRole("employee");
      setShowCreateForm(false);

      await loadUsers();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openStatusModal(user: UserItem, active: boolean) {
    setUserToUpdate(user);
    setNextUserActive(active);
    setStatusModalOpen(true);
  }

  function closeStatusModal() {
    if (updatingId !== null) return;
    setStatusModalOpen(false);
    setUserToUpdate(null);
    setNextUserActive(null);
  }

  async function handleConfirmStatusChange() {
    if (!userToUpdate || nextUserActive === null) return;

    try {
      setUpdatingId(userToUpdate.id);
      setError("");

      if (nextUserActive) {
        await activateUser(userToUpdate.id);
      } else {
        await deactivateUser(userToUpdate.id);
      }

      await loadUsers();

      setStatusModalOpen(false);
      setUserToUpdate(null);
      setNextUserActive(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  function openResetPinModal(user: UserItem) {
    setSelectedUser(user);
    setNewPin("");
    setShowResetPinModal(true);
  }

  function closeResetPinModal() {
    if (resettingPin) return;
    setShowResetPinModal(false);
    setSelectedUser(null);
    setNewPin("");
  }

  async function handleResetPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) return;

    try {
      setResettingPin(true);
      setError("");

      await resetUserPin(selectedUser.id, {
        new_pin: newPin,
      });

      setShowResetPinModal(false);
      setSelectedUser(null);
      setNewPin("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResettingPin(false);
    }
  }

  const statusConfirmMessage =
    userToUpdate && nextUserActive !== null
      ? text({
          ro: `Sigur vrei să ${
            nextUserActive ? "activezi" : "dezactivezi"
          } utilizatorul ${userToUpdate.full_name}?`,
          en: `Are you sure you want to ${
            nextUserActive ? "activate" : "deactivate"
          } ${userToUpdate.full_name}?`,
          de: `Möchtest du ${userToUpdate.full_name} wirklich ${
            nextUserActive ? "aktivieren" : "deaktivieren"
          }?`,
        })
      : "";

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<Users className="h-7 w-7" />}
          title={t("nav", "users")}
          description={text({
            ro: "Administrează utilizatorii, statusurile și accesul lor în sistem.",
            en: "Manage users, statuses, and their system access.",
            de: "Verwalte Benutzer, Status und deren Systemzugriff.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <HeroStatCard
                icon={<Users className="h-4 w-4" />}
                label={text({
                  ro: "Total",
                  en: "Total",
                  de: "Gesamt",
                })}
                value={totalCount}
              />
              <HeroStatCard
                icon={<Settings2 className="h-4 w-4" />}
                label={text({
                  ro: "Active",
                  en: "Active",
                  de: "Aktiv",
                })}
                value={activeCount}
              />
              <HeroStatCard
                icon={<CalendarDays className="h-4 w-4" />}
                label={text({
                  ro: "În concediu",
                  en: "On leave",
                  de: "Im Urlaub",
                })}
                value={leaveCount}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title={text({
              ro: "Creare utilizator",
              en: "Create user",
              de: "Benutzer erstellen",
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
                  : text({ ro: "Nou", en: "New", de: "Neu" })}
              </button>
            }
          >
            {showCreateForm ? (
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {text({
                      ro: "Nume complet",
                      en: "Full name",
                      de: "Vollständiger Name",
                    })}
                  </label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder={text({
                      ro: "Nume complet",
                      en: "Full name",
                      de: "Vollständiger Name",
                    })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {text({
                      ro: "Rol",
                      en: "Role",
                      de: "Rolle",
                    })}
                  </label>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="employee">
                      {text({
                        ro: "Angajat",
                        en: "Employee",
                        de: "Mitarbeiter",
                      })}
                    </option>
                    <option value="mechanic">
                      {text({
                        ro: "Mecanic",
                        en: "Mechanic",
                        de: "Mechaniker",
                      })}
                    </option>
                  </select>
                </div>

                {role !== "mechanic" ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {text({
                        ro: "Număr schimb",
                        en: "Shift number",
                        de: "Schichtnummer",
                      })}
                    </label>
                    <input
                      value={shiftNumber}
                      onChange={(event) => setShiftNumber(event.target.value)}
                      placeholder={text({
                        ro: "Număr schimb",
                        en: "Shift number",
                        de: "Schichtnummer",
                      })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    PIN
                  </label>
                  <input
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="PIN"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "..."
                    : text({
                        ro: "Creează utilizator",
                        en: "Create user",
                        de: "Benutzer erstellen",
                      })}
                </button>
              </form>
            ) : (
              <EmptyState
                title={text({
                  ro: "Deschide formularul pentru a crea un utilizator nou.",
                  en: "Open the form to create a new user.",
                  de: "Öffne das Formular, um einen neuen Benutzer zu erstellen.",
                })}
              />
            )}
          </SectionCard>

          <SectionCard
            title={text({
              ro: "Lista utilizatori",
              en: "Users list",
              de: "Benutzerliste",
            })}
            actions={
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                  label={text({
                    ro: "Toți",
                    en: "All",
                    de: "Alle",
                  })}
                />
                <FilterButton
                  active={statusFilter === "active"}
                  onClick={() => setStatusFilter("active")}
                  label={text({
                    ro: "Activi",
                    en: "Active",
                    de: "Aktiv",
                  })}
                />
                <FilterButton
                  active={statusFilter === "leave"}
                  onClick={() => setStatusFilter("leave")}
                  label={text({
                    ro: "În concediu",
                    en: "On leave",
                    de: "Im Urlaub",
                  })}
                />
              </div>
            }
          >
            {filteredUsers.length ? (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-[22px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {user.full_name}
                          </p>

                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium",
                              getStatusClass(user)
                            )}
                          >
                            {getStatusLabel(user)}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <InfoRow
                            icon={
                              <ClipboardList className="h-4 w-4 text-slate-400" />
                            }
                            label={text({
                              ro: "Cod",
                              en: "Code",
                              de: "Code",
                            })}
                            value={user.unique_code || "—"}
                          />

                          <InfoRow
                            icon={
                              <UserRound className="h-4 w-4 text-slate-400" />
                            }
                            label={text({
                              ro: "Rol",
                              en: "Role",
                              de: "Rolle",
                            })}
                            value={user.role || "—"}
                          />

                          <InfoRow
                            icon={
                              <Settings2 className="h-4 w-4 text-slate-400" />
                            }
                            label={text({
                              ro: "Schimb",
                              en: "Shift",
                              de: "Schicht",
                            })}
                            value={user.shift_number || "—"}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openResetPinModal(user)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          <KeyRound className="h-4 w-4" />
                          {text({
                            ro: "Reset PIN",
                            en: "Reset PIN",
                            de: "PIN zurücksetzen",
                          })}
                        </button>

                        <Link
                          href={`/admin/documents/${user.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          <FileText className="h-4 w-4" />
                          {text({
                            ro: "Documente",
                            en: "Documents",
                            de: "Dokumente",
                          })}
                        </Link>

                        {user.is_active ? (
                          <button
                            type="button"
                            onClick={() => openStatusModal(user, false)}
                            disabled={updatingId === user.id}
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {text({
                              ro: "Dezactivează",
                              en: "Deactivate",
                              de: "Deaktivieren",
                            })}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openStatusModal(user, true)}
                            disabled={updatingId === user.id}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {text({
                              ro: "Activează",
                              en: "Activate",
                              de: "Aktivieren",
                            })}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={text({
                  ro: "Nu există utilizatori pentru filtrul selectat.",
                  en: "No users found for the selected filter.",
                  de: "Keine Benutzer für den ausgewählten Filter gefunden.",
                })}
              />
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={statusModalOpen}
        title={text({
          ro: "Confirmare schimbare status",
          en: "Confirm status change",
          de: "Statusänderung bestätigen",
        })}
        message={statusConfirmMessage}
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
        loading={updatingId !== null}
        onConfirm={handleConfirmStatusChange}
        onCancel={closeStatusModal}
      />

      {showResetPinModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-gradient-to-b from-white to-slate-50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-950">
                {text({
                  ro: "Resetare PIN",
                  en: "Reset PIN",
                  de: "PIN zurücksetzen",
                })}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedUser?.full_name || ""}
              </p>
            </div>

            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {text({
                    ro: "PIN nou",
                    en: "New PIN",
                    de: "Neue PIN",
                  })}
                </label>
                <input
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value)}
                  placeholder="PIN"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeResetPinModal}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                >
                  {text({
                    ro: "Anulează",
                    en: "Cancel",
                    de: "Abbrechen",
                  })}
                </button>

                <button
                  type="submit"
                  disabled={resettingPin}
                  className="flex-1 rounded-2xl bg-black py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resettingPin
                    ? "..."
                    : text({
                        ro: "Salvează",
                        en: "Save",
                        de: "Speichern",
                      })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}