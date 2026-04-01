import { api } from "@/lib/axios";

export type LeaveRequestCreatePayload = {
  user_code: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
};

export type LeaveRequestCreateResponse = {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: string;
  created_at: string;
};

export type LeaveRequestItem = {
  id: number;
  user_id: number;
  user_name: string;
  user_code: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: string;
  reviewed_by_admin_id?: number | null;
  reviewed_at?: string | null;
  created_at: string;
};

export type LeaveRequestListResponse = {
  requests: LeaveRequestItem[];
};

export type LeaveReviewPayload = {
  status: string;
};

export type LeaveReviewResponse = {
  id: number;
  status: string;
  reviewed_by_admin_id?: number | null;
  reviewed_at?: string | null;
};

export async function createLeaveRequest(payload: LeaveRequestCreatePayload) {
  const { data } = await api.post<LeaveRequestCreateResponse>(
    "/leave-requests",
    payload
  );
  return data;
}

export async function getMyLeaveRequests(code: string) {
  const { data } = await api.get<LeaveRequestListResponse>(
    `/leave-requests/me/${code}`
  );
  return data;
}

export async function getAllLeaveRequests() {
  const { data } = await api.get<LeaveRequestListResponse>("/leave-requests");
  return data;
}

export async function reviewLeaveRequest(
  leaveId: number,
  payload: LeaveReviewPayload
) {
  const { data } = await api.patch<LeaveReviewResponse>(
    `/leave-requests/${leaveId}`,
    payload
  );
  return data;
}