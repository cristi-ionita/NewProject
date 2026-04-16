import {
  defaultLocale,
  dictionaries,
  getTranslation,
  locales,
  type Locale,
  type TranslationKey,
  type TranslationNamespace,
} from "./dictionaries";
import {
  getAdminToken,
  getMechanicSession,
  getUserSession,
} from "@/lib/auth";

export {
  dictionaries,
  defaultLocale,
  getTranslation,
  locales,
  type Locale,
  type TranslationKey,
  type TranslationNamespace,
} from "./dictionaries";

const GUEST_LOCALE_STORAGE_KEY = "lang:guest";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeRead(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ro" || value === "en" || value === "de";
}

function getScopedLocaleStorageKey(): string {
  if (!isBrowser()) {
    return GUEST_LOCALE_STORAGE_KEY;
  }

  const userSession = getUserSession();
  if (userSession) {
    return `lang:user:${userSession.unique_code}`;
  }

  const mechanicSession = getMechanicSession();
  if (mechanicSession) {
    return `lang:mechanic:${mechanicSession.unique_code}`;
  }

  const adminToken = getAdminToken();
  if (adminToken) {
    return "lang:admin";
  }

  return GUEST_LOCALE_STORAGE_KEY;
}

export function getStoredLocale(): Locale | null {
  const scopedKey = getScopedLocaleStorageKey();
  const raw = safeRead(scopedKey);

  if (isLocale(raw)) {
    return raw;
  }

  const guestRaw = safeRead(GUEST_LOCALE_STORAGE_KEY);
  if (isLocale(guestRaw)) {
    return guestRaw;
  }

  return null;
}

export function setStoredLocale(locale: Locale): void {
  const scopedKey = getScopedLocaleStorageKey();
  safeWrite(scopedKey, locale);

  if (scopedKey === GUEST_LOCALE_STORAGE_KEY) {
    safeWrite(GUEST_LOCALE_STORAGE_KEY, locale);
  }
}

export function getCurrentLocale(): Locale {
  const stored = getStoredLocale();

  if (stored) {
    return stored;
  }

  return defaultLocale;
}