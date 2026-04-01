import { api } from "@/lib/axios";

export type MyVehicleUser = {
  id: number;
  full_name: string;
  unique_code: string;
  shift_number: string;
  is_active: boolean;
};

export type MyVehicleVehicle = {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vin: string | null;
  status: string;
  current_mileage: number;
};

export type MyVehicleAssignment = {
  id: number;
  status: string;
  started_at: string;
  ended_at: string | null;
};

export type MyVehicleHandoverStart = {
  mileage_start: number | null;
  dashboard_warnings_start: string | null;
  damage_notes_start: string | null;
  notes_start: string | null;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
  is_completed: boolean;
};

export type MyVehicleHandoverEnd = {
  mileage_end: number | null;
  dashboard_warnings_end: string | null;
  damage_notes_end: string | null;
  notes_end: string | null;
  is_completed: boolean;
};

export type MyVehicleIssue = {
  id: number;
  status: string;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  created_at: string;
  updated_at: string;
};

export type MyVehicleResponse = {
  user: MyVehicleUser;
  vehicle: MyVehicleVehicle | null;
  assignment: MyVehicleAssignment | null;
  handover_start: MyVehicleHandoverStart | null;
  handover_end: MyVehicleHandoverEnd | null;
  open_issues: MyVehicleIssue[];
};

export async function getMyVehicle(code: string) {
  const { data } = await api.get<MyVehicleResponse>(`/my-vehicle/${code}`);
  return data;
}