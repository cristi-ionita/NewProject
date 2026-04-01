import { api } from "@/lib/axios";

export type VehicleStatus = "active" | "inactive" | "in_service" | "sold";

export type VehicleItem = {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vin: string | null;
  status: VehicleStatus;
  current_mileage: number;
};

export type CreateVehiclePayload = {
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vin?: string;
};

export type VehicleLiveStatusItem = {
  vehicle_id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vehicle_status: string;
  availability: "occupied" | "free";
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  assigned_to_shift_number: string | null;
  active_assignment_id: number | null;
};

export type VehicleLiveStatusResponse = {
  vehicles: VehicleLiveStatusItem[];
};

export async function listVehicles() {
  const { data } = await api.get<VehicleItem[]>("/vehicles");
  return data;
}

export async function createVehicle(payload: CreateVehiclePayload) {
  const { data } = await api.post<VehicleItem>("/vehicles", payload);
  return data;
}

export async function updateVehicle(
  vehicleId: number,
  payload: Partial<{
    brand: string;
    model: string;
    license_plate: string;
    year: number;
    vin: string | null;
    status: VehicleStatus;
    current_mileage: number;
  }>
) {
  const { data } = await api.put<VehicleItem>(`/vehicles/${vehicleId}`, payload);
  return data;
}

export async function deleteVehicle(vehicleId: number) {
  await api.delete(`/vehicles/${vehicleId}`);
}

export async function getVehicleLiveStatus() {
  const { data } = await api.get<VehicleLiveStatusResponse>("/vehicles/live-status");
  return data;
}

export type VehicleHistoryItem = {
  assignment_id: number;
  driver_name: string;
  started_at: string;
  ended_at: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  dashboard_warnings_start: string | null;
  dashboard_warnings_end: string | null;
  damage_notes_start: string | null;
  damage_notes_end: string | null;
  notes_start: string | null;
  notes_end: string | null;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
};

export type VehicleHistoryResponse = {
  vehicle_id: number;
  history: VehicleHistoryItem[];
};

export async function getVehicleHistory(vehicleId: number) {
  const { data } = await api.get<VehicleHistoryResponse>(`/vehicles/${vehicleId}/history`);
  return data;
}