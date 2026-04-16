import { api } from "@/lib/axios";

export type AuthRole = "employee" | "mechanic" | "admin";
export type SessionStatus = "active" | "closed";

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
  role: AuthRole;
};

export type MechanicLoginRequest = {
  identifier: string;
  pin: string;
};

export type MechanicLoginResponse = {
  user_id: number;
  full_name: string;
  unique_code: string;
  role: AuthRole;
};

export type ActiveSessionResponse = {
  has_active_session: boolean;
  assignment_id?: number;
  vehicle_id?: number;
  license_plate?: string;
  brand?: string;
  model?: string;
  started_at?: string;
  status?: SessionStatus;
};

export type StartSessionPayload = {
  license_plate: string;
};

export type StartSessionResponse = {
  assignment_id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  license_plate: string;
  started_at: string;
  status: SessionStatus;
};

export type EndSessionResponse = {
  assignment_id: number;
  user_id: number;
  vehicle_id: number;
  ended_at: string;
  status: SessionStatus;
};

function buildUserHeaders(userCode: string) {
  return {
    "X-User-Code": userCode,
  };
}

export async function adminLogin(
  payload: AdminLoginRequest
): Promise<AdminLoginResponse> {
  const { data } = await api.post<AdminLoginResponse>(
    "/auth/admin-login",
    payload
  );

  return data;
}

export async function userLogin(
  payload: UserLoginRequest
): Promise<UserLoginResponse> {
  const { data } = await api.post<UserLoginResponse>("/auth/login", payload);

  return data;
}

export async function mechanicLogin(
  payload: MechanicLoginRequest
): Promise<MechanicLoginResponse> {
  const { data } = await api.post<MechanicLoginResponse>(
    "/auth/mechanic-login",
    payload
  );

  return data;
}

export async function getActiveSession(
  userCode: string
): Promise<ActiveSessionResponse> {
  const { data } = await api.get<ActiveSessionResponse>("/auth/active-session", {
    headers: buildUserHeaders(userCode),
  });

  return data;
}

export async function startSession(
  userCode: string,
  payload: StartSessionPayload
): Promise<StartSessionResponse> {
  const { data } = await api.post<StartSessionResponse>(
    "/auth/start-session",
    payload,
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}

export async function endSession(
  userCode: string
): Promise<EndSessionResponse> {
  const { data } = await api.post<EndSessionResponse>(
    "/auth/end-session",
    {},
    {
      headers: buildUserHeaders(userCode),
    }
  );

  return data;
}