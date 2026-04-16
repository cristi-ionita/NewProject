import { api } from "@/lib/axios";

export type UserAlert = {
  id: number;
  full_name: string;
  unique_code?: string;
};

export type VehicleIssueAlert = {
  id: number;
  license_plate: string;
  brand: string;
  model: string;
  issues_count: number;
};

export type OccupiedVehicle = {
  assignment_id: number;
  vehicle: string;
  user: string;
  started_at: string;
};

type UsersResponse = {
  users: UserAlert[];
};

type VehiclesWithIssuesResponse = {
  vehicles: VehicleIssueAlert[];
};

type OccupiedVehiclesResponse = {
  vehicles: OccupiedVehicle[];
};

export async function getUsersWithoutProfile(): Promise<UserAlert[]> {
  const { data } = await api.get<UsersResponse>(
    "/admin-dashboard-alerts/users-without-profile"
  );

  return data.users;
}

export async function getUsersWithoutContract(): Promise<UserAlert[]> {
  const { data } = await api.get<UsersResponse>(
    "/admin-dashboard-alerts/users-without-contract"
  );

  return data.users;
}

export async function getUsersWithoutDriverLicense(): Promise<UserAlert[]> {
  const { data } = await api.get<UsersResponse>(
    "/admin-dashboard-alerts/users-without-driver-license"
  );

  return data.users;
}

export async function getVehiclesWithIssues(): Promise<VehicleIssueAlert[]> {
  const { data } = await api.get<VehiclesWithIssuesResponse>(
    "/admin-dashboard-alerts/vehicles-with-issues"
  );

  return data.vehicles;
}

export async function getOccupiedVehicles(): Promise<OccupiedVehicle[]> {
  const { data } = await api.get<OccupiedVehiclesResponse>(
    "/admin-dashboard-alerts/occupied-vehicles"
  );

  return data.vehicles;
}