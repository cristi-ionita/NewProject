import { api } from "@/lib/axios";

export type AssignmentStatus = "active" | "closed";
export type VehicleStatus = "active" | "in_service" | "inactive" | "sold";

export type SessionPageSession = {
  assignment_id: number;
  status: AssignmentStatus;
  started_at: string;
};

export type SessionPageUser = {
  id: number;
  full_name: string;
  unique_code: string;
};

export type SessionPageVehicle = {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  status: VehicleStatus;
  current_mileage: number;
};

export type PreviousHandoverReport = {
  assignment_id: number;
  previous_driver_name: string;
  previous_session_started_at: string;
  previous_session_ended_at: string | null;
};

export type SessionHandoverStart = {
  mileage_start: number | null;
  dashboard_warnings_start: string | null;
  damage_notes_start: string | null;
  notes_start: string | null;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
  is_completed: boolean;
};

export type SessionHandoverEnd = {
  mileage_end: number | null;
  dashboard_warnings_end: string | null;
  damage_notes_end: string | null;
  notes_end: string | null;
  is_completed: boolean;
};

export type SessionPageResponse = {
  session: SessionPageSession;
  user: SessionPageUser;
  vehicle: SessionPageVehicle;
  previous_handover_report: PreviousHandoverReport | null;
  handover_start: SessionHandoverStart | null;
  handover_end: SessionHandoverEnd | null;
};

export type HandoverStartPayload = {
  mileage_start: number;
  dashboard_warnings_start?: string;
  damage_notes_start?: string;
  notes_start?: string;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
};

export type HandoverEndPayload = {
  mileage_end: number;
  dashboard_warnings_end?: string;
  damage_notes_end?: string;
  notes_end?: string;
};

function buildUserHeaders(userCode: string) {
  return {
    "X-User-Code": userCode,
  };
}

export async function getSessionPage(
  assignmentId: number,
  userCode: string
): Promise<SessionPageResponse> {
  const { data } = await api.get<SessionPageResponse>(`/sessions/${assignmentId}`, {
    headers: buildUserHeaders(userCode),
  });

  return data;
}

export async function saveHandoverStart(
  assignmentId: number,
  userCode: string,
  payload: HandoverStartPayload
): Promise<SessionHandoverStart> {
  const { data } = await api.post<SessionHandoverStart>(
    `/sessions/${assignmentId}/handover-start`,
    payload,
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}

export async function saveHandoverEnd(
  assignmentId: number,
  userCode: string,
  payload: HandoverEndPayload
): Promise<SessionHandoverEnd> {
  const { data } = await api.post<SessionHandoverEnd>(
    `/sessions/${assignmentId}/handover-end`,
    payload,
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}