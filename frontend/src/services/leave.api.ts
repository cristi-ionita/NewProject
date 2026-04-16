import { api } from "@/lib/axios";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequestCreatePayload = {
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
  status: LeaveStatus;
  created_at: string;
};

export type LeaveRequestItem = {
  id: number;
  user_id: number;
  user_name?: string;
  user_code?: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: LeaveStatus;
  reviewed_by_admin_id?: number | null;
  reviewed_at?: string | null;
  created_at: string;
};

export type LeaveRequestListResponse = {
  requests: LeaveRequestItem[];
};

export type LeaveReviewPayload = {
  status: Exclude<LeaveStatus, "pending">;
};

export type LeaveReviewResponse = {
  id: number;
  status: LeaveStatus;
  reviewed_by_admin_id?: number | null;
  reviewed_at?: string | null;
};

function buildUserHeaders(userCode: string) {
  return {
    "X-User-Code": userCode,
  };
}

export async function createLeaveRequest(
  userCode: string,
  payload: LeaveRequestCreatePayload
): Promise<LeaveRequestCreateResponse> {
  const { data } = await api.post<LeaveRequestCreateResponse>(
    "/leave-requests",
    payload,
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}

export async function getMyLeaveRequests(
  userCode: string
): Promise<LeaveRequestListResponse> {
  const { data } = await api.get<LeaveRequestListResponse>("/leave-requests/me", {
    headers: buildUserHeaders(userCode),
  });

  return data;
}

export async function getAllLeaveRequests(): Promise<LeaveRequestListResponse> {
  const { data } = await api.get<LeaveRequestListResponse>("/leave-requests");

  return data;
}

export async function reviewLeaveRequest(
  leaveId: number,
  payload: LeaveReviewPayload
): Promise<LeaveReviewResponse> {
  const { data } = await api.patch<LeaveReviewResponse>(
    `/leave-requests/${leaveId}`,
    payload
  );

  return data;
}