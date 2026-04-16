export type ApiErrorResponse = {
  error?: string;
  message?: string;
  details?: Array<{ msg?: string }>;
  detail?:
    | string
    | Array<{ msg?: string }>
    | {
        msg?: string;
      };
};

export function extractErrorMessage(
  error: unknown,
  fallback = "Something went wrong."
): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: ApiErrorResponse;
      };
    };

    const status = err.response?.status;
    const data = err.response?.data;

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (Array.isArray(data?.details)) {
      return data.details
        .map((item) => item?.msg || "Invalid value")
        .join(", ");
    }

    const legacyDetail = data?.detail;

    if (typeof legacyDetail === "string" && legacyDetail.trim()) {
      return legacyDetail;
    }

    if (Array.isArray(legacyDetail)) {
      return legacyDetail
        .map((item) => item?.msg || "Invalid value")
        .join(", ");
    }

    if (
      typeof legacyDetail === "object" &&
      legacyDetail !== null &&
      typeof legacyDetail.msg === "string" &&
      legacyDetail.msg.trim()
    ) {
      return legacyDetail.msg;
    }

    if (status === 400) return "Invalid request.";
    if (status === 401) return "Invalid credentials.";
    if (status === 403) return "Access denied.";
    if (status === 404) return "Resource not found.";
    if (status === 422) return "Validation error.";

    if (status && status >= 500) {
      return "Server error. Please try again.";
    }
  }

  return fallback;
}