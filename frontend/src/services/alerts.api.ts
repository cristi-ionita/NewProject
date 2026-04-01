import { api } from "@/lib/axios";

export type UserAlert = {
  user_id: number;
  full_name: string;
  unique_code: string;
  shift_number: string;
  is_active: boolean;
};

export type VehicleIssueAlert = {
  vehicle_id: number;
  license_plate: string;
  brand: string;
  model: string;
  open_issues_count: number;
  in_progress_issues_count: number;
  latest_issue_created_at: string | null;
};

export type OccupiedVehicle = {
  assignment_id: number;
  vehicle_id: number;
  license_plate: string;
  brand: string;
  model: string;
  user_id: number;
  user_name: string;
  started_at: string;
};

export async function getUsersWithoutProfile() {
  const { data } = await api.get("/admin-dashboard-alerts/users-without-profile");
  return data;
}

export async function getUsersWithoutContract() {
  const { data } = await api.get("/admin-dashboard-alerts/users-without-contract");
  return data;
}

export async function getUsersWithoutDriverLicense() {
  const { data } = await api.get("/admin-dashboard-alerts/users-without-driver-license");
  return data;
}

export async function getVehiclesWithIssues() {
  const { data } = await api.get("/admin-dashboard-alerts/vehicles-with-open-issues");
  return data;
}

export async function getOccupiedVehicles() {
  const { data } = await api.get("/admin-dashboard-alerts/occupied-vehicles");
  return data;
}