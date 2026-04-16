import { api } from "@/lib/axios";

export type AssignmentStatus = "active" | "closed";

export type AssignmentItem = {
  id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  status: AssignmentStatus;
  started_at: string;
  ended_at: string | null;
};

export type AssignmentListResponse = {
  assignments: AssignmentItem[];
};

export type CreateAssignmentPayload = {
  user_id: number;
  vehicle_id: number;
};

export async function listAssignments(): Promise<AssignmentListResponse> {
  const { data } = await api.get<AssignmentListResponse>("/admin-assignments");

  return data;
}

export async function createAssignment(
  payload: CreateAssignmentPayload
): Promise<AssignmentItem> {
  const { data } = await api.post<AssignmentItem>("/admin-assignments", payload);

  return data;
}

export async function closeAssignment(assignmentId: number): Promise<AssignmentItem> {
  const { data } = await api.patch<AssignmentItem>(
    `/admin-assignments/${assignmentId}/close`
  );

  return data;
}

export async function deleteAssignment(assignmentId: number): Promise<void> {
  await api.delete(`/admin-assignments/${assignmentId}`);
}