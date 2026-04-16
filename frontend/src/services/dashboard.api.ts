import { api } from "@/lib/axios";

export type VehicleStatus = "active" | "in_service" | "inactive" | "sold";
export type AssignmentStatus = "active" | "closed";
export type VehicleIssueStatus = "open" | "scheduled" | "in_progress" | "resolved";

export type AdminDashboardRecentIssue = {
  id: number;
  vehicle_id: number;
  vehicle_license_plate: string;
  reported_by_user_id: number;
  reported_by_name: string;
  status: VehicleIssueStatus;
  created_at: string;
  other_problems: string | null;
};

export type AdminDashboardActiveAssignment = {
  assignment_id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  started_at: string;
};

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
  recent_issues: AdminDashboardRecentIssue[];
  active_assignments: AdminDashboardActiveAssignment[];
};

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const { data } = await api.get<AdminDashboardSummaryResponse>(
    "/admin-dashboard/summary"
  );

  return data;
}