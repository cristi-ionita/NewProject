import axios, { AxiosError, AxiosHeaders } from "axios";

import { clearAllSessions, getAdminToken } from "./auth";

export type ApiErrorResponse = {
  error?: string;
  code?: string;
  message?: string;
  details?: Array<{ msg?: string }>;
};

export type ApiClientError = {
  error?: string;
  code?: string;
  message: string;
  details?: Array<{ msg?: string }>;
  status?: number;
};

export const api = axios.create({
  baseURL: "/api",
});

function getLanguage(): string {
  if (typeof window === "undefined") {
    return "ro";
  }

  try {
    const stored = window.localStorage.getItem("lang")?.trim().toLowerCase();
    if (stored === "ro" || stored === "en" || stored === "de") {
      return stored;
    }
  } catch {
    // ignore storage read failures
  }

  const browserLang = window.navigator.language?.split("-")[0]?.toLowerCase();
  if (browserLang === "ro" || browserLang === "en" || browserLang === "de") {
    return browserLang;
  }

  return "ro";
}

function normalizeHeaders(headers?: unknown): AxiosHeaders {
  if (headers instanceof AxiosHeaders) {
    return headers;
  }

  if (typeof headers === "string") {
    return AxiosHeaders.from(headers);
  }

  if (headers && typeof headers === "object") {
    return AxiosHeaders.from(headers as Record<string, string>);
  }

  return new AxiosHeaders();
}

function normalizeApiError(error: unknown): ApiClientError {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;

  if (data?.message && typeof data.message === "string") {
    return {
      error: data.error,
      code: data.code,
      message: data.message,
      details: data.details,
      status,
    };
  }

  if (Array.isArray(data?.details) && data.details.length > 0) {
    return {
      error: data.error,
      code: data.code,
      message: data.details.map((item) => item?.msg || "Invalid value").join(", "),
      details: data.details,
      status,
    };
  }

  if (status === 400) {
    return {
      error: "BAD_REQUEST",
      code: "errors.http.bad_request",
      message: "Invalid request.",
      status,
    };
  }

  if (status === 401) {
    return {
      error: "UNAUTHORIZED",
      code: "errors.http.unauthorized",
      message: "Session expired. Please log in again.",
      status,
    };
  }

  if (status === 403) {
    return {
      error: "FORBIDDEN",
      code: "errors.http.forbidden",
      message: "Access denied.",
      status,
    };
  }

  if (status === 404) {
    return {
      error: "NOT_FOUND",
      code: "errors.http.not_found",
      message: "Resource not found.",
      status,
    };
  }

  if (status === 422) {
    return {
      error: "VALIDATION_ERROR",
      code: "errors.validation.invalid_request",
      message: "Validation error.",
      status,
    };
  }

  if (status && status >= 500) {
    return {
      error: "INTERNAL_SERVER_ERROR",
      code: "errors.internal",
      message: "Server error. Please try again.",
      status,
    };
  }

  return {
    error: "UNKNOWN_ERROR",
    code: "errors.unknown",
    message: "Unexpected error.",
    status,
  };
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  const headers = normalizeHeaders(config.headers);

  headers.set("Accept-Language", getLanguage());

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  config.headers = headers;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeApiError(error);

    // IMPORTANT:
    // Do not force logout on every 401.
    // Let each page/service decide how to handle unauthorized responses.
    return Promise.reject(normalized);
  }
);