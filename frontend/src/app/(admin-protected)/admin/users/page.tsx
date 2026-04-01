"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  activateUser,
  createUser,
  deactivateUser,
  listUsers,
  resetUserPin,
  type UserItem,
} from "@/services/users.api";
import { getAllLeaveRequests } from "@/services/leave.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CalendarDays,
  ClipboardList,
  KeyRound,
  Plus,
  Settings2,
  Users,
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

  if (!detail) return "An error occurred.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "An error occurred.";
}

type FilterType = "all" | "active" | "leave";
type UserRole = "employee" | "mechanic";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminUsersPage() {
  const { locale, t } = useI18n();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resettingPin, setResettingPin] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState<UserItem | null>(null);
  const [nextUserActive, setNextUserActive] = useState<boolean | null>(null);

  const [statusFilter, setStatusFilter] = useState<FilterType>("all");
  const [onLeaveUserIds, setOnLeaveUserIds] = useState<number[]>([]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [shiftNumber, setShiftNumber] = useState("");
  const [pin, setPin] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const [usersData, leaveData] = await Promise.all([listUsers(), getAllLeaveRequests()]);

      setUsers(usersData);

      const today = new Date().toISOString().slice(0, 10);

      const leaveIds = Array.from(
        new Set(
          leaveData.requests
            .filter((request) => {
              const startsTodayOrBefore = request.start_date <= today;
              const endsTodayOrAfter = request.end_date >= today;
              const isApproved = request.status === "approved";
              return isApproved && startsTodayOrBefore && endsTodayOrAfter;
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);

        if (!resettingPin) {
          closeResetPinModal();
        }

        if (updatingId === null) {
          closeStatusModal();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [resettingPin, updatingId]);

  function openResetPinModal(user: UserItem) {
    setSelectedUser(user);
    setNewPin("");
    setShowResetPinModal(true);
    setOpenMenuId(null);
    setError("");
  }

  function closeResetPinModal() {
    setShowResetPinModal(false);
    setSelectedUser(null);
    setNewPin("");
  }

  function openStatusModal(user: UserItem, nextActive: boolean) {
    if (user.is_active === nextActive) {
      setOpenMenuId(null);
      return;
    }

    setUserToUpdate(user);
    setNextUserActive(nextActive);
    setStatusModalOpen(true);
    setOpenMenuId(null);
    setError("");
  }

  function closeStatusModal() {
    if (updatingId !== null) return;
    setStatusModalOpen(false);
    setUserToUpdate(null);
    setNextUserActive(null);
  }

  async function handleCreateUser(event: React.FormEvent) {
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
      setRole("employee");
      setShiftNumber("");
      setPin("");
      setShowCreateForm(false);

      await loadUsers();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmStatusChange() {
    if (!userToUpdate || nextUserActive === null) return;

    try {
      setError("");
      setUpdatingId(userToUpdate.id);

      if (nextUserActive) {
        await activateUser(userToUpdate.id);
      } else {
        await deactivateUser(userToUpdate.id);
      }

      setUsers((prev) =>
        prev.map((item) =>
          item.id === userToUpdate.id ? { ...item, is_active: nextUserActive } : item
        )
      );

      setStatusModalOpen(false);
      setUserToUpdate(null);
      setNextUserActive(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleResetPin(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedUser) return;

    try {
      setResettingPin(true);
      setError("");

      await resetUserPin(selectedUser.id, {
        new_pin: newPin,
      });

      closeResetPinModal();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResettingPin(false);
    }
  }

  function isUserOnLeave(userId: number) {
    return onLeaveUserIds.includes(userId);
  }

  function getStatusLabel(user: UserItem) {
    if (isUserOnLeave(user.id)) {
      return text({ ro: "În concediu", en: "On leave", de: "Im Urlaub" });
    }

    return user.is_active
      ? text({ ro: "Activ", en: "Active", de: "Aktiv" })
      : text({ ro: "Inactiv", en: "Inactive", de: "Inaktiv" });
  }

  function getStatusStyles(user: UserItem) {
    if (isUserOnLeave(user.id)) {
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    return user.is_active
      ? {
          badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
          dot: "bg-emerald-500",
        }
      : {
          badge: "border-slate-200 bg-slate-50 text-slate-700",
          dot: "bg-slate-500",
        };
  }

  function getMenuItemClass(isSelected: boolean) {
    return cn(
      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
      isSelected
        ? "bg-slate-100 font-medium text-slate-900"
        : "text-slate-700 hover:bg-slate-50"
    );
  }

  const activeCount = useMemo(
    () => users.filter((user) => user.is_active && !onLeaveUserIds.includes(user.id)).length,
    [users, onLeaveUserIds]
  );

  const leaveCount = useMemo(
    () => users.filter((user) => onLeaveUserIds.includes(user.id)).length,
    [users, onLeaveUserIds]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === "active") {
        return user.is_active && !onLeaveUserIds.includes(user.id);
      }

      if (statusFilter === "leave") {
        return onLeaveUserIds.includes(user.id);
      }

      return true;
    });
  }, [users, statusFilter, onLeaveUserIds]);

  function filterButtonClass(isActive: boolean, variant: "slate" | "emerald" | "amber") {
    const base =
      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200";

    if (!isActive) {
      return `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
    }

    if (variant === "emerald") {
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm`;
    }

    if (variant === "amber") {
      return `${base} border-amber-200 bg-amber-50 text-amber-700 shadow-sm`;
    }

    return `${base} border-slate-200 bg-slate-100 text-slate-900 shadow-sm`;
  }

  function filterDotClass(variant: "slate" | "emerald" | "amber") {
    if (variant === "emerald") return "bg-emerald-500";
    if (variant === "amber") return "bg-amber-500";
    return "bg-slate-500";
  }

  const isUpdatingCurrent = userToUpdate !== null && updatingId === userToUpdate.id;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă utilizatorii...",
              en: "Loading users...",
              de: "Benutzer werden geladen...",
            })}
          </p>
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
                    {t("nav", "users")}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Gestionează conturile angajaților, statusul și resetarea PIN-ului.",
                      en: "Manage employee accounts, statuses, and PIN resets.",
                      de: "Verwalte Mitarbeiterkonten, Status und PIN-Zurücksetzungen.",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
                <HeroStatCard
                  icon={<Users className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Total utilizatori",
                    en: "Total users",
                    de: "Benutzer gesamt",
                  })}
                  value={String(users.length)}
                />
                <HeroStatCard
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Activi",
                    en: "Active",
                    de: "Aktiv",
                  })}
                  value={String(activeCount)}
                />
                <HeroStatCard
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "În concediu",
                    en: "On leave",
                    de: "Im Urlaub",
                  })}
                  value={String(leaveCount)}
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
                      ro: "Filtrare utilizatori",
                      en: "User filters",
                      de: "Benutzerfilter",
                    })}
                  </p>
                  <h2 className="text-[17px] font-semibold text-slate-950">
                    {text({
                      ro: "Selectează categoria",
                      en: "Select category",
                      de: "Kategorie wählen",
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
                  : text({ ro: "Creează user", en: "Create user", de: "Benutzer erstellen" })}
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={filterButtonClass(statusFilter === "all", "slate")}
              >
                <span className={cn("h-2 w-2 rounded-full", filterDotClass("slate"))} />
                {text({ ro: "Toți", en: "All", de: "Alle" })}
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={filterButtonClass(statusFilter === "active", "emerald")}
              >
                <span className={cn("h-2 w-2 rounded-full", filterDotClass("emerald"))} />
                {text({ ro: "Activi", en: "Active", de: "Aktiv" })}
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("leave")}
                className={filterButtonClass(statusFilter === "leave", "amber")}
              >
                <span className={cn("h-2 w-2 rounded-full", filterDotClass("amber"))} />
                {text({ ro: "În concediu", en: "On leave", de: "Im Urlaub" })}
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Users className="h-4.5 w-4.5" />
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
                  ro: "Utilizatori afișați",
                  en: "Visible users",
                  de: "Sichtbare Benutzer",
                })}
                value={String(filteredUsers.length)}
              />
              <QuickRow
                label={text({
                  ro: "Activi",
                  en: "Active",
                  de: "Aktiv",
                })}
                value={String(activeCount)}
              />
              <QuickRow
                label={text({
                  ro: "În concediu",
                  en: "On leave",
                  de: "Im Urlaub",
                })}
                value={String(leaveCount)}
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
                    ro: "Utilizator nou",
                    en: "New user",
                    de: "Neuer Benutzer",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Adaugă un utilizator",
                    en: "Add a user",
                    de: "Benutzer hinzufügen",
                  })}
                </h2>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="grid gap-3 md:grid-cols-4">
              <FormField
                label={text({ ro: "Nume complet", en: "Full name", de: "Vollständiger Name" })}
                value={fullName}
                onChange={setFullName}
                placeholder={text({
                  ro: "Nume complet",
                  en: "Full name",
                  de: "Vollständiger Name",
                })}
                required
              />

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {text({ ro: "Rol", en: "Role", de: "Rolle" })}
                </label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="employee">
                    {text({ ro: "Angajat", en: "Employee", de: "Mitarbeiter" })}
                  </option>
                  <option value="mechanic">
                    {text({ ro: "Mecanic", en: "Mechanic", de: "Mechaniker" })}
                  </option>
                </select>
              </div>

              {role !== "mechanic" ? (
                <FormField
                  label={text({ ro: "Tură", en: "Shift", de: "Schicht" })}
                  value={shiftNumber}
                  onChange={setShiftNumber}
                  placeholder={text({
                    ro: "Tură",
                    en: "Shift",
                    de: "Schicht",
                  })}
                  required
                />
              ) : (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {text({ ro: "Tură", en: "Shift", de: "Schicht" })}
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                    {text({
                      ro: "Nu este necesară pentru mecanic",
                      en: "Not required for mechanic",
                      de: "Für Mechaniker nicht erforderlich",
                    })}
                  </div>
                </div>
              )}

              <FormField
                label="PIN"
                type="password"
                value={pin}
                onChange={setPin}
                placeholder="1234"
                required
              />

              <div className="flex justify-end gap-3 md:col-span-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {t("common", "cancel")}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t("common", "loading") : t("common", "save")}
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
                  ro: "Listă utilizatori",
                  en: "User list",
                  de: "Benutzerliste",
                })}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Utilizatori",
                  en: "Users",
                  de: "Benutzer",
                })}
              </h2>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {filteredUsers.length}{" "}
              {text({
                ro: "afișați",
                en: "shown",
                de: "angezeigt",
              })}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-4 py-7">
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {text({
                    ro: "Nu există rezultate.",
                    en: "No results found.",
                    de: "Keine Ergebnisse gefunden.",
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
                      {text({ ro: "Nume", en: "Name", de: "Name" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Tură", en: "Shift", de: "Schicht" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Cod user", en: "User code", de: "Benutzercode" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({ ro: "Rol", en: "Role", de: "Rolle" })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("common", "status")}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      PIN
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t("nav", "documents")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user, index) => {
                    const styles = getStatusStyles(user);
                    const isOpen = openMenuId === user.id;
                    const isUpdating = updatingId === user.id;

                    return (
                      <tr key={user.id} className="border-t border-slate-200">
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                              <span className="text-xs font-semibold">{index + 1}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-950">
                              {user.full_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {user.shift_number || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 font-mono text-xs font-medium text-slate-700">
                            {user.unique_code}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {user.role === "mechanic"
                            ? text({ ro: "Mecanic", en: "Mechanic", de: "Mechaniker" })
                            : text({ ro: "Angajat", en: "Employee", de: "Mitarbeiter" })}
                        </td>

                        <td className="px-4 py-4">
                          <div className="relative" ref={isOpen ? menuRef : null}>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === user.id ? null : user.id))
                              }
                              disabled={isUpdating || isUserOnLeave(user.id)}
                              className={cn(
                                "inline-flex h-10 w-[170px] items-center justify-between rounded-full border px-3.5 text-xs font-semibold shadow-sm transition",
                                "hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60",
                                styles.badge
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className={cn("h-2 w-2 flex-shrink-0 rounded-full", styles.dot)}
                                />
                                <span className="truncate">{getStatusLabel(user)}</span>
                              </span>

                              {!isUserOnLeave(user.id) ? (
                                <span className="ml-2 flex-shrink-0 text-[10px] opacity-60">
                                  ▾
                                </span>
                              ) : null}
                            </button>

                            {isOpen ? (
                              <div className="absolute left-0 top-full z-20 mt-2 w-[190px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(user, true)}
                                  className={getMenuItemClass(user.is_active)}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {text({ ro: "Activ", en: "Active", de: "Aktiv" })}
                                  </span>
                                  {user.is_active ? (
                                    <span className="text-xs text-slate-400">✓</span>
                                  ) : null}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openStatusModal(user, false)}
                                  className={getMenuItemClass(!user.is_active)}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-slate-500" />
                                    {text({ ro: "Inactiv", en: "Inactive", de: "Inaktiv" })}
                                  </span>
                                  {!user.is_active ? (
                                    <span className="text-xs text-slate-400">✓</span>
                                  ) : null}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openResetPinModal(user)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 whitespace-nowrap"
                          >
                            {text({ ro: "Reset PIN", en: "Reset PIN", de: "PIN zurücksetzen" })}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/documents/${user.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 whitespace-nowrap"
                          >
                            {text({
                              ro: "Documente",
                              en: "Documents",
                              de: "Dokumente",
                            })}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showResetPinModal && selectedUser ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-slate-900">
                    {text({ ro: "Reset PIN", en: "Reset PIN", de: "PIN zurücksetzen" })}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {text({
                      ro: "Setezi un PIN nou pentru",
                      en: "Set a new PIN for",
                      de: "Lege eine neue PIN fest für",
                    })}{" "}
                    <span className="font-medium text-slate-800">{selectedUser.full_name}</span>.
                  </p>
                </div>
              </div>

              <form onSubmit={handleResetPin} className="space-y-4">
                <FormField
                  label={text({ ro: "PIN nou", en: "New PIN", de: "Neue PIN" })}
                  type="password"
                  value={newPin}
                  onChange={setNewPin}
                  placeholder={text({
                    ro: "PIN nou (4 cifre)",
                    en: "New PIN (4 digits)",
                    de: "Neue PIN (4 Ziffern)",
                  })}
                  required
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeResetPinModal}
                    disabled={resettingPin}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("common", "cancel")}
                  </button>

                  <button
                    type="submit"
                    disabled={resettingPin}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resettingPin ? t("common", "loading") : t("common", "save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={statusModalOpen}
        title={text({
          ro: "Confirmare schimbare status",
          en: "Confirm status change",
          de: "Statusänderung bestätigen",
        })}
        message={
          userToUpdate && nextUserActive !== null
            ? nextUserActive
              ? text({
                  ro: `Sigur vrei să activezi utilizatorul ${userToUpdate.full_name}?`,
                  en: `Are you sure you want to activate ${userToUpdate.full_name}?`,
                  de: `Möchtest du ${userToUpdate.full_name} wirklich aktivieren?`,
                })
              : text({
                  ro: `Sigur vrei să dezactivezi utilizatorul ${userToUpdate.full_name}?`,
                  en: `Are you sure you want to deactivate ${userToUpdate.full_name}?`,
                  de: `Möchtest du ${userToUpdate.full_name} wirklich deaktivieren?`,
                })
            : text({
                ro: "Sigur vrei să continui această acțiune?",
                en: "Are you sure you want to continue this action?",
                de: "Möchtest du diese Aktion wirklich fortsetzen?",
              })
        }
        confirmText={
          nextUserActive
            ? text({
                ro: "Activează",
                en: "Activate",
                de: "Aktivieren",
              })
            : text({
                ro: "Dezactivează",
                en: "Deactivate",
                de: "Deaktivieren",
              })
        }
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

function FormField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
        required={required}
      />
    </div>
  );
}