import { api } from "@/lib/axios";

export type AssignmentItem = {
  id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  status: string;
  started_at: string;
  ended_at: string | null;
};

export type AssignmentListResponse = {
  assignments: AssignmentItem[];
};

export async function listAssignments() {
  const { data } = await api.get<AssignmentListResponse>("/admin-assignments");
  return data;
}

export async function createAssignment(payload: {
  user_id: number;
  vehicle_id: number;
}) {
  const { data } = await api.post<AssignmentItem>("/admin-assignments", payload);
  return data;
}

export async function closeAssignment(assignmentId: number) {
  const { data } = await api.patch(`/admin-assignments/${assignmentId}/close`);
  return data;
}

export async function deleteAssignment(assignmentId: number) {
  const { data } = await api.delete(`/admin-assignments/${assignmentId}`);
  return data;
}