import { api } from "@/lib/axios";

export type SessionPageResponse = {
  session: {
    assignment_id: number;
    status: string;
    started_at: string;
  };
  user: {
    id: number;
    full_name: string;
    unique_code: string;
  };
  vehicle: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    year: number;
    status: string;
    current_mileage: number;
  };
  previous_handover_report: {
    assignment_id: number;
    previous_driver_name: string;
    previous_session_started_at: string;
    previous_session_ended_at: string | null;
  } | null;
  handover_start: {
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
  } | null;
  handover_end: {
    mileage_end: number | null;
    dashboard_warnings_end: string | null;
    damage_notes_end: string | null;
    notes_end: string | null;
    is_completed: boolean;
  } | null;
};

export type HandoverStartPayload = {
  user_code: string;
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
  user_code: string;
  mileage_end: number;
  dashboard_warnings_end?: string;
  damage_notes_end?: string;
  notes_end?: string;
};

export async function getSessionPage(assignmentId: number, userCode: string) {
  const { data } = await api.get<SessionPageResponse>(`/sessions/${assignmentId}`, {
    params: { user_code: userCode },
  });
  return data;
}

export async function saveHandoverStart(
  assignmentId: number,
  payload: HandoverStartPayload
) {
  const { data } = await api.post(
    `/sessions/${assignmentId}/handover-start`,
    payload
  );
  return data;
}

export async function saveHandoverEnd(
  assignmentId: number,
  payload: HandoverEndPayload
) {
  const { data } = await api.post(
    `/sessions/${assignmentId}/handover-end`,
    payload
  );
  return data;
}