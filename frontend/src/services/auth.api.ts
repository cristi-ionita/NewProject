import { api } from "@/lib/axios";

export type AdminLoginRequest = {
  password: string;
};

export type AdminLoginResponse = {
  token: string;
};

export type UserLoginRequest = {
  identifier: string;
  pin: string;
};

export type UserLoginResponse = {
  user_id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
  role: string;
};

export type MechanicLoginRequest = {
  identifier: string;
  pin: string;
};

export type MechanicLoginResponse = {
  user_id: number;
  full_name: string;
  unique_code: string;
  role: string;
};

export type ActiveSessionResponse = {
  has_active_session: boolean;
  assignment_id?: number;
  vehicle_id?: number;
  license_plate?: string;
  brand?: string;
  model?: string;
  started_at?: string;
  status?: string;
};

export type StartSessionPayload = {
  code: string;
  license_plate: string;
};

export type StartSessionResponse = {
  assignment_id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  license_plate: string;
  started_at: string;
  status: string;
};

export type EndSessionPayload = {
  code: string;
};

export type EndSessionResponse = {
  assignment_id: number;
  user_id: number;
  vehicle_id: number;
  ended_at: string;
  status: string;
};

export async function adminLogin(payload: AdminLoginRequest) {
  const { data } = await api.post<AdminLoginResponse>("/auth/admin-login", payload);
  return data;
}

export async function userLogin(payload: UserLoginRequest) {
  const { data } = await api.post<UserLoginResponse>("/auth/login", payload);
  return data;
}

export async function mechanicLogin(payload: MechanicLoginRequest) {
  const { data } = await api.post<MechanicLoginResponse>(
    "/auth/mechanic-login",
    payload
  );
  return data;
}

export async function getActiveSession(code: string) {
  const { data } = await api.get<ActiveSessionResponse>(
    `/auth/active-session/${code}`
  );
  return data;
}

export async function startSession(payload: StartSessionPayload) {
  const { data } = await api.post<StartSessionResponse>(
    "/auth/start-session",
    payload
  );
  return data;
}

export async function endSession(payload: EndSessionPayload) {
  const { data } = await api.post<EndSessionResponse>(
    "/auth/end-session",
    payload
  );
  return data;
}