export type UserSession = {
  user_id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
};

export type MechanicSession = {
  user_id: number;
  full_name: string;
  unique_code: string;
  role: string;
};

export function saveAdminToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function clearAdminToken() {
  localStorage.removeItem("admin_token");
}

export function saveUserSession(session: UserSession) {
  localStorage.setItem("user_session", JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user_session");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    localStorage.removeItem("user_session");
    return null;
  }
}

export function clearUserSession() {
  localStorage.removeItem("user_session");
}

export function saveMechanicSession(session: MechanicSession) {
  localStorage.setItem("mechanic_session", JSON.stringify(session));
}

export function getMechanicSession(): MechanicSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("mechanic_session");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MechanicSession;
  } catch {
    localStorage.removeItem("mechanic_session");
    return null;
  }
}

export function clearMechanicSession() {
  localStorage.removeItem("mechanic_session");
}