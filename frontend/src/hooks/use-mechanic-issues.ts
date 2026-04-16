import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";

export type IssueItem = {
  id: number;
  vehicle_id: number;
  vehicle_license_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  assignment_id: number | null;
  reported_by_user_id: number;
  reported_by_name: string;
  need_service_in_km: number | null;
  need_brakes: boolean;
  need_tires: boolean;
  need_oil: boolean;
  dashboard_checks: string | null;
  other_problems: string | null;
  status: string;
  assigned_mechanic_id: number | null;
  scheduled_for: string | null;
  scheduled_location: string | null;
  created_at: string;
  updated_at: string;
};

type IssuesResponse = {
  issues: IssueItem[];
};

function normalizeStatus(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
        message?: string;
      };
    };
    message?: string;
  };

  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || "Error").join(", ");
  }
  if (typeof detail === "object" && detail?.msg) return detail.msg;
  if (typeof err?.response?.data?.message === "string") {
    return err.response.data.message;
  }
  if (typeof err?.message === "string") return err.message;

  return "Could not load issues.";
}

export function useMechanicIssues(userCode?: string) {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadIssues = useCallback(async () => {
    if (!userCode) {
      setIssues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } = await api.get<IssuesResponse>("/vehicle-issues/mechanic", {
        headers: {
          "X-User-Code": userCode,
        },
      });

      setIssues(data.issues);
    } catch (err: unknown) {
      setIssues([]);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const openIssues = useMemo(
    () =>
      issues.filter((issue) => {
        const status = normalizeStatus(issue.status);
        return status === "open" || status === "in_progress";
      }),
    [issues]
  );

  const scheduledIssues = useMemo(
    () => issues.filter((issue) => normalizeStatus(issue.status) === "scheduled"),
    [issues]
  );

  const resolvedIssues = useMemo(
    () => issues.filter((issue) => normalizeStatus(issue.status) === "resolved"),
    [issues]
  );

  const counts = useMemo(
    () => ({
      total: issues.length,
      open: openIssues.length,
      scheduled: scheduledIssues.length,
      resolved: resolvedIssues.length,
    }),
    [issues.length, openIssues.length, scheduledIssues.length, resolvedIssues.length]
  );

  return {
    issues,
    loading,
    error,
    openIssues,
    scheduledIssues,
    resolvedIssues,
    counts,
    reload: loadIssues,
  };
}