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
  role: "mechanic";
};

const STORAGE_KEYS = {
  adminToken: "admin_token",
  userSession: "user_session",
  mechanicSession: "mechanic_session",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorage(): Storage | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function removeStorage(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseStoredJson<T>(
  key: string,
  validator: (value: unknown) => value is T
): T | null {
  const raw = readStorage(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!validator(parsed)) {
      removeStorage(key);
      return null;
    }

    return parsed;
  } catch {
    removeStorage(key);
    return null;
  }
}

function isValidUserSession(value: unknown): value is UserSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<UserSession>;

  return (
    isFiniteNumber(session.user_id) &&
    isNonEmptyString(session.full_name) &&
    isNonEmptyString(session.unique_code) &&
    (session.shift_number === null || typeof session.shift_number === "string")
  );
}

function isValidMechanicSession(value: unknown): value is MechanicSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<MechanicSession>;

  return (
    isFiniteNumber(session.user_id) &&
    isNonEmptyString(session.full_name) &&
    isNonEmptyString(session.unique_code) &&
    session.role === "mechanic"
  );
}

function normalizeToken(token: string): string | null {
  const normalized = token.trim();
  return normalized.length > 0 ? normalized : null;
}

export function saveAdminToken(token: string): void {
  const normalized = normalizeToken(token);

  if (!normalized) {
    removeStorage(STORAGE_KEYS.adminToken);
    return;
  }

  writeStorage(STORAGE_KEYS.adminToken, normalized);
}

export function getAdminToken(): string | null {
  const raw = readStorage(STORAGE_KEYS.adminToken);
  if (!raw) return null;

  const normalized = normalizeToken(raw);

  if (!normalized) {
    removeStorage(STORAGE_KEYS.adminToken);
    return null;
  }

  return normalized;
}

export function clearAdminToken(): void {
  removeStorage(STORAGE_KEYS.adminToken);
}

export function saveUserSession(session: UserSession): void {
  if (!isValidUserSession(session)) {
    return;
  }

  writeStorage(STORAGE_KEYS.userSession, JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  return parseStoredJson(STORAGE_KEYS.userSession, isValidUserSession);
}

export function clearUserSession(): void {
  removeStorage(STORAGE_KEYS.userSession);
}

export function saveMechanicSession(session: MechanicSession): void {
  if (!isValidMechanicSession(session)) {
    return;
  }

  writeStorage(STORAGE_KEYS.mechanicSession, JSON.stringify(session));
}

export function getMechanicSession(): MechanicSession | null {
  return parseStoredJson(STORAGE_KEYS.mechanicSession, isValidMechanicSession);
}

export function clearMechanicSession(): void {
  removeStorage(STORAGE_KEYS.mechanicSession);
}

export function clearAllSessions(): void {
  clearAdminToken();
  clearUserSession();
  clearMechanicSession();
}

export function hasActiveAdminSession(): boolean {
  return getAdminToken() !== null;
}

export function hasActiveUserSession(): boolean {
  return getUserSession() !== null;
}

export function hasActiveMechanicSession(): boolean {
  return getMechanicSession() !== null;
}