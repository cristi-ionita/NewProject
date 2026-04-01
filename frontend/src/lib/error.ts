export function extractErrorMessage(
  error: unknown,
  fallback = "Something went wrong."
): string {
  // axios / backend error
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as {
      response?: {
        status?: number;
        data?: {
          detail?: unknown;
        };
      };
    };

    const status = err.response?.status;
    const detail = err.response?.data?.detail;

    // ✅ dacă backend trimite string → îl folosim direct
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    // ✅ dacă backend trimite listă de erori (FastAPI validation)
    if (Array.isArray(detail)) {
      return detail
        .map((item: any) => item?.msg || "Invalid value")
        .join(", ");
    }

    // ✅ fallback pe status code
    if (status === 400) return "Invalid request.";
    if (status === 401) return "Invalid credentials.";
    if (status === 403) return "Access denied.";
    if (status === 404) return "Resource not found.";
    if (status === 422) return "Validation error.";

    if (status && status >= 500) {
      return "Server error. Please try again.";
    }
  }

  // ❌ fallback general
  return fallback;
}