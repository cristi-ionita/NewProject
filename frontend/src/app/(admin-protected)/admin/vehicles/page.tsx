"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  CarFront,
  ChevronDown,
  ClipboardList,
  Plus,
  Settings2,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  createVehicle,
  getVehicleLiveStatus,
  listVehicles,
  type CreateVehiclePayload,
  type VehicleItem,
  type VehicleLiveStatusItem,
} from "@/services/vehicles.api";
import {
  createAssignment,
  closeAssignment,
} from "@/services/assignments.api";
import { listUsers, type UserItem } from "@/services/users.api";

import FormField from "@/components/ui/form-field";
import FilterButton from "@/components/ui/filter-button";
import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

type FleetFilter = "allocated" | "free" | "service";

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load vehicles.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || "Error").join(", ");
  }
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load vehicles.";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminVehiclesPage() {
  const { locale } = useI18n();

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [liveStatus, setLiveStatus] = useState<VehicleLiveStatusItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingVehicleId, setChangingVehicleId] = useState<number | null>(
    null
  );
  const [selectedUserByVehicle, setSelectedUserByVehicle] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FleetFilter>("free");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [vehicleToChange, setVehicleToChange] =
    useState<VehicleLiveStatusItem | null>(null);
  const [nextAllocationValue, setNextAllocationValue] = useState<string | null>(
    null
  );

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadVehicles() {
    try {
      setLoading(true);
      setError("");

      const [vehiclesData, liveData, usersData] = await Promise.all([
        listVehicles(),
        getVehicleLiveStatus(),
        listUsers(),
      ]);

      setVehicles(vehiclesData);
      setLiveStatus(liveData.vehicles);
      setUsers(usersData.filter((user) => user.is_active));

      const initialSelections: Record<number, string> = {};
      liveData.vehicles.forEach((vehicle) => {
        if (
          vehicle.availability === "occupied" &&
          vehicle.assigned_to_user_id
        ) {
          initialSelections[vehicle.vehicle_id] = String(
            vehicle.assigned_to_user_id
          );
        } else {
          initialSelections[vehicle.vehicle_id] = "free";
        }
      });

      setSelectedUserByVehicle(initialSelections);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  async function handleCreateVehicle(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload: CreateVehiclePayload = {
        brand: brand.trim(),
        model: model.trim(),
        license_plate: licensePlate.trim(),
        year: Number(year),
        vin: vin.trim() || undefined,
      };

      await createVehicle(payload);

      setBrand("");
      setModel("");
      setLicensePlate("");
      setYear("");
      setVin("");
      setShowCreateForm(false);

      await loadVehicles();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openAllocationModal(
    vehicle: VehicleLiveStatusItem,
    nextValue: string
  ) {
    const currentAssignedUserId = vehicle.assigned_to_user_id
      ? String(vehicle.assigned_to_user_id)
      : "free";

    setSelectedUserByVehicle((prev) => ({
      ...prev,
      [vehicle.vehicle_id]: nextValue,
    }));

    if (nextValue === currentAssignedUserId) {
      return;
    }

    setVehicleToChange(vehicle);
    setNextAllocationValue(nextValue);
    setAllocationModalOpen(true);
    setError("");
  }

  function closeAllocationModal() {
    if (changingVehicleId !== null) return;

    if (vehicleToChange) {
      setSelectedUserByVehicle((prev) => ({
        ...prev,
        [vehicleToChange.vehicle_id]:
          vehicleToChange.availability === "occupied" &&
          vehicleToChange.assigned_to_user_id
            ? String(vehicleToChange.assigned_to_user_id)
            : "free",
      }));
    }

    setAllocationModalOpen(false);
    setVehicleToChange(null);
    setNextAllocationValue(null);
  }

  async function handleConfirmAllocationChange() {
    if (!vehicleToChange || !nextAllocationValue) return;

    try {
      setChangingVehicleId(vehicleToChange.vehicle_id);
      setError("");

      if (nextAllocationValue === "free") {
        if (vehicleToChange.active_assignment_id) {
          await closeAssignment(vehicleToChange.active_assignment_id);
        }
      } else {
        const nextUserId = Number(nextAllocationValue);
        if (!nextUserId) return;

        if (vehicleToChange.active_assignment_id) {
          await closeAssignment(vehicleToChange.active_assignment_id);
        }

        await createAssignment({
          user_id: nextUserId,
          vehicle_id: vehicleToChange.vehicle_id,
        });
      }

      await loadVehicles();

      setAllocationModalOpen(false);
      setVehicleToChange(null);
      setNextAllocationValue(null);
    } catch (err) {
      setError(extractErrorMessage(err));

      if (vehicleToChange) {
        setSelectedUserByVehicle((prev) => ({
          ...prev,
          [vehicleToChange.vehicle_id]:
            vehicleToChange.availability === "occupied" &&
            vehicleToChange.assigned_to_user_id
              ? String(vehicleToChange.assigned_to_user_id)
              : "free",
        }));
      }
    } finally {
      setChangingVehicleId(null);
    }
  }

  const totalVehicles = vehicles.length;

  const allocatedVehicles = useMemo(
    () => liveStatus.filter((vehicle) => vehicle.availability === "occupied"),
    [liveStatus]
  );

  const freeVehicles = useMemo(
    () =>
      liveStatus.filter(
        (vehicle) =>
          vehicle.vehicle_status === "active" && vehicle.availability === "free"
      ),
    [liveStatus]
  );

  const serviceVehicles = useMemo(
    () =>
      liveStatus.filter((vehicle) => vehicle.vehicle_status === "in_service"),
    [liveStatus]
  );

  const filteredVehicles = useMemo(() => {
    if (filter === "allocated") return allocatedVehicles;
    if (filter === "service") return serviceVehicles;
    return freeVehicles;
  }, [filter, allocatedVehicles, freeVehicles, serviceVehicles]);

  function getSectionTitle() {
    if (filter === "allocated") {
      return text({
        ro: "Mașini alocate",
        en: "Allocated vehicles",
        de: "Zugewiesene Fahrzeuge",
      });
    }

    if (filter === "service") {
      return text({
        ro: "Mașini în service",
        en: "Vehicles in service",
        de: "Fahrzeuge im Service",
      });
    }

    return text({
      ro: "Mașini libere",
      en: "Free vehicles",
      de: "Freie Fahrzeuge",
    });
  }

  function getUserNameById(userId: string | null) {
    if (!userId || userId === "free") {
      return text({
        ro: "Liberă",
        en: "Free",
        de: "Frei",
      });
    }

    const user = users.find((item) => String(item.id) === userId);
    return user?.full_name || userId;
  }

  function getAllocationMessage() {
    if (!vehicleToChange || !nextAllocationValue) {
      return text({
        ro: "Sigur vrei să continui această schimbare?",
        en: "Are you sure you want to continue this change?",
        de: "Möchtest du diese Änderung wirklich fortsetzen?",
      });
    }

    const currentUserName =
      vehicleToChange.assigned_to_name ||
      text({
        ro: "nimeni",
        en: "nobody",
        de: "niemand",
      });

    const nextUserName = getUserNameById(nextAllocationValue);

    if (nextAllocationValue === "free") {
      return text({
        ro: `Sigur vrei să eliberezi mașina ${vehicleToChange.license_plate} de la ${currentUserName}?`,
        en: `Are you sure you want to free vehicle ${vehicleToChange.license_plate} from ${currentUserName}?`,
        de: `Möchtest du das Fahrzeug ${vehicleToChange.license_plate} wirklich von ${currentUserName} freigeben?`,
      });
    }

    if (
      vehicleToChange.availability === "occupied" &&
      vehicleToChange.assigned_to_name
    ) {
      return text({
        ro: `Sigur vrei să muți mașina ${vehicleToChange.license_plate} de la ${currentUserName} la ${nextUserName}?`,
        en: `Are you sure you want to reassign vehicle ${vehicleToChange.license_plate} from ${currentUserName} to ${nextUserName}?`,
        de: `Möchtest du das Fahrzeug ${vehicleToChange.license_plate} wirklich von ${currentUserName} an ${nextUserName} umzuweisen?`,
      });
    }

    return text({
      ro: `Sigur vrei să aloci mașina ${vehicleToChange.license_plate} către ${nextUserName}?`,
      en: `Are you sure you want to assign vehicle ${vehicleToChange.license_plate} to ${nextUserName}?`,
      de: `Möchtest du das Fahrzeug ${vehicleToChange.license_plate} wirklich ${nextUserName} zuweisen?`,
    });
  }

  const isChangingCurrent =
    vehicleToChange !== null && changingVehicleId === vehicleToChange.vehicle_id;

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<CarFront className="h-7 w-7" />}
          title={text({
            ro: "Mașini",
            en: "Vehicles",
            de: "Fahrzeuge",
          })}
          description={text({
            ro: "Gestionează flota și vezi rapid statusul actual al mașinilor.",
            en: "Manage the fleet and quickly view the current vehicle status.",
            de: "Verwalte die Flotte und sieh den aktuellen Fahrzeugstatus auf einen Blick.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <HeroStatCard
                icon={<ClipboardList className="h-4 w-4" />}
                label={text({
                  ro: "Total mașini",
                  en: "Total vehicles",
                  de: "Fahrzeuge gesamt",
                })}
                value={totalVehicles}
              />
              <HeroStatCard
                icon={<UserRound className="h-4 w-4" />}
                label={text({
                  ro: "Alocate",
                  en: "Allocated",
                  de: "Zugewiesen",
                })}
                value={allocatedVehicles.length}
              />
              <HeroStatCard
                icon={<Wrench className="h-4 w-4" />}
                label={text({
                  ro: "În service",
                  en: "In service",
                  de: "Im Service",
                })}
                value={serviceVehicles.length}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title={text({
              ro: "Selectează categoria",
              en: "Select category",
              de: "Kategorie wählen",
            })}
            icon={<Settings2 className="h-4.5 w-4.5" />}
            actions={
              <button
                type="button"
                onClick={() => setShowCreateForm((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {showCreateForm
                  ? text({ ro: "Închide", en: "Close", de: "Schließen" })
                  : text({
                      ro: "Creează mașină",
                      en: "Create vehicle",
                      de: "Fahrzeug erstellen",
                    })}
              </button>
            }
          >
            <div className="flex flex-wrap gap-2.5">
              <FilterButton
                active={filter === "allocated"}
                onClick={() => setFilter("allocated")}
                label={text({
                  ro: `Alocate ${allocatedVehicles.length}`,
                  en: `Allocated ${allocatedVehicles.length}`,
                  de: `Zugewiesen ${allocatedVehicles.length}`,
                })}
                variant="blue"
              />
              <FilterButton
                active={filter === "free"}
                onClick={() => setFilter("free")}
                label={text({
                  ro: `Libere ${freeVehicles.length}`,
                  en: `Free ${freeVehicles.length}`,
                  de: `Frei ${freeVehicles.length}`,
                })}
                variant="slate"
              />
              <FilterButton
                active={filter === "service"}
                onClick={() => setFilter("service")}
                label={text({
                  ro: `În service ${serviceVehicles.length}`,
                  en: `In service ${serviceVehicles.length}`,
                  de: `Im Service ${serviceVehicles.length}`,
                })}
                variant="amber"
              />
            </div>
          </SectionCard>

          <SectionCard
            title={getSectionTitle()}
            icon={<CarFront className="h-4.5 w-4.5" />}
          >
            <div className="space-y-2.5">
              <QuickRow
                label={text({
                  ro: "Mașini afișate",
                  en: "Visible vehicles",
                  de: "Sichtbare Fahrzeuge",
                })}
                value={String(filteredVehicles.length)}
              />
              <QuickRow
                label={text({
                  ro: "Șoferi activi",
                  en: "Active drivers",
                  de: "Aktive Fahrer",
                })}
                value={String(users.length)}
              />
              <QuickRow
                label={text({
                  ro: "Flotă totală",
                  en: "Total fleet",
                  de: "Gesamtflotte",
                })}
                value={String(totalVehicles)}
              />
            </div>
          </SectionCard>
        </div>

        {showCreateForm ? (
          <SectionCard
            title={text({
              ro: "Adaugă o mașină nouă",
              en: "Add a new vehicle",
              de: "Neues Fahrzeug hinzufügen",
            })}
            icon={<Plus className="h-4.5 w-4.5" />}
          >
            <form
              onSubmit={handleCreateVehicle}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
            >
              <FormField
                label={text({ ro: "Marcă", en: "Brand", de: "Marke" })}
                value={brand}
                onChange={setBrand}
                required
              />
              <FormField
                label={text({ ro: "Model", en: "Model", de: "Modell" })}
                value={model}
                onChange={setModel}
                required
              />
              <FormField
                label={text({
                  ro: "Număr",
                  en: "Plate",
                  de: "Kennzeichen",
                })}
                value={licensePlate}
                onChange={setLicensePlate}
                required
              />
              <FormField
                label={text({ ro: "An", en: "Year", de: "Jahr" })}
                value={year}
                onChange={setYear}
                type="number"
                required
              />
              <FormField label="VIN" value={vin} onChange={setVin} />

              <div className="flex justify-end gap-3 md:col-span-2 xl:col-span-5">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? text({
                        ro: "Se salvează...",
                        en: "Saving...",
                        de: "Speichert...",
                      })
                    : text({
                        ro: "Salvează",
                        en: "Save",
                        de: "Speichern",
                      })}
                </button>
              </div>
            </form>
          </SectionCard>
        ) : null}

        <SectionCard
          title={getSectionTitle()}
          actions={
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {filteredVehicles.length}{" "}
              {text({
                ro: "afișate",
                en: "shown",
                de: "angezeigt",
              })}
            </div>
          }
        >
          {filteredVehicles.length === 0 ? (
            <EmptyState
              title={text({
                ro: "Nu există mașini în această categorie.",
                en: "There are no vehicles in this category.",
                de: "Es gibt keine Fahrzeuge in dieser Kategorie.",
              })}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({
                        ro: "Număr",
                        en: "Plate",
                        de: "Kennzeichen",
                      })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({
                        ro: "Model",
                        en: "Model",
                        de: "Modell",
                      })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({
                        ro: "Alocare",
                        en: "Allocation",
                        de: "Zuweisung",
                      })}
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {text({
                        ro: "Detalii",
                        en: "Details",
                        de: "Details",
                      })}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVehicles.map((vehicle, index) => {
                    const isChanging = changingVehicleId === vehicle.vehicle_id;
                    const selectedValue =
                      selectedUserByVehicle[vehicle.vehicle_id] ??
                      (vehicle.assigned_to_user_id
                        ? String(vehicle.assigned_to_user_id)
                        : "free");

                    return (
                      <tr
                        key={vehicle.vehicle_id}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                              <span className="text-xs font-semibold">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {vehicle.license_plate}
                              </p>
                              <p className="text-xs text-slate-500">
                                #{vehicle.vehicle_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <p className="text-sm font-semibold text-slate-950">
                            {vehicle.brand} {vehicle.model}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-middle">
                          {vehicle.vehicle_status === "in_service" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              {text({
                                ro: "În service",
                                en: "In service",
                                de: "Im Service",
                              })}
                            </span>
                          ) : (
                            <div className="relative min-w-[250px]">
                              <select
                                value={selectedValue}
                                onChange={(e) =>
                                  openAllocationModal(vehicle, e.target.value)
                                }
                                disabled={isChanging}
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                              >
                                <option value="free">
                                  {text({
                                    ro: "Liberă",
                                    en: "Free",
                                    de: "Frei",
                                  })}
                                </option>

                                {users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.full_name}
                                    {user.shift_number
                                      ? ` • ${text({
                                          ro: `Tura ${user.shift_number}`,
                                          en: `Shift ${user.shift_number}`,
                                          de: `Schicht ${user.shift_number}`,
                                        })}`
                                      : ""}
                                  </option>
                                ))}
                              </select>

                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 align-middle">
                          <Link
                            href={`/admin/vehicles/${vehicle.vehicle_id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 whitespace-nowrap"
                          >
                            {text({
                              ro: "Vezi detalii",
                              en: "View details",
                              de: "Details ansehen",
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
        </SectionCard>
      </div>

      <ConfirmDialog
        open={allocationModalOpen}
        title={text({
          ro: "Confirmare schimbare alocare",
          en: "Confirm allocation change",
          de: "Zuweisungsänderung bestätigen",
        })}
        message={getAllocationMessage()}
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
        loading={isChangingCurrent}
        loadingText={text({
          ro: "Se actualizează...",
          en: "Updating...",
          de: "Wird aktualisiert...",
        })}
        onConfirm={handleConfirmAllocationChange}
        onCancel={closeAllocationModal}
      />
    </>
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
