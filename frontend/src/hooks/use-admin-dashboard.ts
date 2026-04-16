"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getAllLeaveRequests,
  type LeaveRequestItem,
} from "@/services/leave.api";
import { listIssues } from "@/services/issues.api";
import { listVehicles } from "@/services/vehicles.api";
import { getAdminDashboardSummary } from "@/services/dashboard.api";
import { isApiClientError } from "@/lib/axios";

export type DashboardSection = "leave" | "issues" | "vehicles" | null;

export type DashboardIssueItem = {
  id: number | string;
  status: string;
  vehicle_license_plate?: string | null;
};

export type DashboardVehicleItem = {
  id: number | string;
  license_plate: string;
  status: string;
};

type UseAdminDashboardResult = {
  loading: boolean;
  error: string;
  activeUsers: number;
  todayLeaves: LeaveRequestItem[];
  issues: DashboardIssueItem[];
  vehicles: DashboardVehicleItem[];
  refresh: () => Promise<void>;
  counts: {
    todayLeaves: number;
    issues: number;
    vehicles: number;
    activeUsers: number;
  };
};

export function useAdminDashboard(): UseAdminDashboardResult {
  const [todayLeaves, setTodayLeaves] = useState<LeaveRequestItem[]>([]);
  const [issues, setIssues] = useState<DashboardIssueItem[]>([]);
  const [vehicles, setVehicles] = useState<DashboardVehicleItem[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const [summary, leaveRes, issuesRes, vehiclesRes] = await Promise.all([
        getAdminDashboardSummary(),
        getAllLeaveRequests(),
        listIssues(),
        listVehicles(),
      ]);

      setActiveUsers(summary.users.active);

      const today = new Date().toISOString().slice(0, 10);

      setTodayLeaves(
        leaveRes.requests.filter((item: LeaveRequestItem) =>
          item.start_date.startsWith(today)
        )
      );

      setIssues(
        issuesRes.issues.filter(
          (item: DashboardIssueItem) =>
            item.status === "open" || item.status === "in_progress"
        )
      );

      setVehicles(
        vehiclesRes.filter(
          (item: DashboardVehicleItem) => item.status === "active"
        )
      );
    } catch (err: unknown) {
      setError(
        isApiClientError(err)
          ? err.message
          : "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const counts = useMemo(
    () => ({
      todayLeaves: todayLeaves.length,
      issues: issues.length,
      vehicles: vehicles.length,
      activeUsers,
    }),
    [todayLeaves, issues, vehicles, activeUsers]
  );

  return {
    loading,
    error,
    activeUsers,
    todayLeaves,
    issues,
    vehicles,
    refresh,
    counts,
  };
}