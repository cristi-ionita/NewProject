import { api } from "@/lib/axios";

export type VehicleIssueStatus =
  | "open"
  | "scheduled"
  | "in_progress"
  | "resolved";

export type IssueItem = {
  id: number;
  vehicle_id: number;
  assignment_id: number | null;
  reported_by_user_id: number;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  status: VehicleIssueStatus;
  assigned_mechanic_id?: number | null;
  scheduled_for?: string | null;
  scheduled_location?: string | null;
  created_at: string;
  updated_at: string;

  // optional fields used by frontend if backend enriches later
  vehicle_license_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  reported_by_name?: string;
};

export type IssuesResponse = {
  issues: IssueItem[];
};

export type UpdateIssueStatusPayload = {
  status: VehicleIssueStatus;
};

export type CreateIssuePayload = {
  need_service_in_km?: number;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks?: string;
  other_problems?: string;
};

export type CreateIssueResponse = {
  id: number;
  vehicle_id: number;
  assignment_id: number;
  reported_by_user_id: number;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  status: VehicleIssueStatus;
  created_at: string;
};

function buildUserHeaders(userCode: string) {
  return {
    "X-User-Code": userCode,
  };
}

export async function listIssues(): Promise<IssuesResponse> {
  const { data } = await api.get<IssuesResponse>("/vehicle-issues");
  return data;
}

export async function updateIssueStatus(
  issueId: number,
  payload: UpdateIssueStatusPayload
): Promise<IssueItem> {
  const { data } = await api.patch<IssueItem>(
    `/vehicle-issues/${issueId}/status`,
    payload
  );

  return data;
}

export async function listMyIssues(userCode: string): Promise<IssuesResponse> {
  const { data } = await api.get<IssuesResponse>("/vehicle-issues/me", {
    headers: buildUserHeaders(userCode),
  });

  return data;
}

export async function createMyIssue(
  userCode: string,
  payload: CreateIssuePayload
): Promise<CreateIssueResponse> {
  const { data } = await api.post<CreateIssueResponse>(
    "/vehicle-issues",
    payload,
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}