import { api } from "@/lib/axios";

export type AdminDashboardSummaryResponse = {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  vehicles: {
    total: number;
    active: number;
    in_service: number;
    inactive: number;
    sold: number;
  };
  assignments: {
    active: number;
    closed: number;
  };
  issues: {
    open: number;
    in_progress: number;
    resolved: number;
    total: number;
  };
  documents: {
    total: number;
    personal: number;
    company: number;
    contracts: number;
    payslips: number;
    driver_licenses: number;
  };
  recent_issues: Array<{
    id: number;
    vehicle_id: number;
    vehicle_license_plate: string;
    reported_by_user_id: number;
    reported_by_name: string;
    status: string;
    created_at: string;
    other_problems: string | null;
  }>;
  active_assignments: Array<{
    assignment_id: number;
    user_id: number;
    user_name: string;
    vehicle_id: number;
    vehicle_license_plate: string;
    vehicle_brand: string;
    vehicle_model: string;
    started_at: string;
  }>;
};

export async function getAdminDashboardSummary() {
  const { data } =
    await api.get<AdminDashboardSummaryResponse>("/admin-dashboard/summary");
  return data;
}