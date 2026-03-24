import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type VehicleIssueItem = {
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
  created_at: string;
};

type VehicleIssueListResponse = {
  issues: VehicleIssueItem[];
};

type ErrorResponse = {
  detail?: string;
};

function AdminVehicleIssuesPage() {
  const [issues, setIssues] = useState<VehicleIssueItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const getHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      "X-Admin-Token": token || "",
    };
  };

  const fetchIssues = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/vehicle-issues", {
        headers: getHeaders(),
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/", { replace: true });
        return;
      }

      const data: VehicleIssueListResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        setError(
          "detail" in data && typeof data.detail === "string"
            ? data.detail
            : t("loadIssuesError")
        );
        return;
      }

      if ("issues" in data) {
        setIssues(data.issues);
      }
    } catch {
      setError(t("backendConnectionError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    fetchIssues();
  }, [navigate]);

  const handleLogoutAdmin = () => {
    localStorage.removeItem("adminToken");
    navigate("/", { replace: true });
  };

  const getTranslatedStatus = (status: string) => {
    if (status === "OPEN") return t("open");
    if (status === "IN_PROGRESS") return t("inProgress");
    if (status === "RESOLVED") return t("resolved");
    return status;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navigate("/admin")}
              style={{
                background: "#eee",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {t("back")}
            </button>
            <h1 style={{ margin: 0 }}>{t("adminVehicleIssues")}</h1>
          </div>

          <button
            onClick={handleLogoutAdmin}
            style={{
              background: "#eee",
              border: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {t("logout")}
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "18px 20px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>
            {t("totalIssues")}: {issues.length}
          </strong>

          <button
            onClick={fetchIssues}
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {t("refresh")}
          </button>
        </div>

        {loading && (
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {t("loading")}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#ffe5e5",
              border: "1px solid #ffb3b3",
              color: "#8a1f1f",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "grid", gap: "12px" }}>
            {issues.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  padding: "20px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {t("noIssues")}
              </div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    background: "#fff",
                    padding: "18px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px 0" }}>
                    {issue.vehicle_license_plate} — {issue.vehicle_brand}{" "}
                    {issue.vehicle_model}
                  </h3>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("reportedBy")}:</strong> {issue.reported_by_name}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("status")}:</strong>{" "}
                    {getTranslatedStatus(issue.status)}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("serviceInKm")}:</strong>{" "}
                    {issue.need_service_in_km ?? "-"}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("brakes")}:</strong>{" "}
                    {issue.need_brakes ? t("yes") : t("no")} •{" "}
                    <strong>{t("tires")}:</strong>{" "}
                    {issue.need_tires ? t("yes") : t("no")} •{" "}
                    <strong>{t("oil")}:</strong>{" "}
                    {issue.need_oil ? t("yes") : t("no")}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("dashboardChecks")}:</strong>{" "}
                    {issue.dashboard_checks ?? "-"}
                  </p>

                  <p style={{ margin: "6px 0" }}>
                    <strong>{t("otherProblems")}:</strong>{" "}
                    {issue.other_problems ?? "-"}
                  </p>

                  <p style={{ margin: "6px 0", color: "#666" }}>
                    <strong>{t("createdAt")}:</strong> {issue.created_at}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminVehicleIssuesPage;