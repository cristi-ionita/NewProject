import { api } from "@/lib/axios";

export type IssueItem = {
  id: number;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  assignment_id: number | null;
  reported_by_user_id: number;
  reported_by_name: string;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type IssuesResponse = {
  issues: IssueItem[];
};

export type UpdateIssueStatusPayload = {
  status: string;
};

export type CreateIssuePayload = {
  user_code: string;
  assignment_id: number;
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
  status: string;
  created_at: string;
};

export async function listIssues() {
  const { data } = await api.get<IssuesResponse>("/vehicle-issues");
  return data;
}

export async function updateIssueStatus(
  issueId: number,
  payload: UpdateIssueStatusPayload
) {
  const { data } = await api.patch(`/vehicle-issues/${issueId}/status`, payload);
  return data;
}

export async function listMyIssues(code: string) {
  const { data } = await api.get<IssuesResponse>(`/vehicle-issues/me/${code}`);
  return data;
}

export async function createMyIssue(payload: CreateIssuePayload) {
  const { data } = await api.post<CreateIssueResponse>("/vehicle-issues", payload);
  return data;
}