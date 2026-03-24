import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type ActiveSessionResponse = {
  has_active_session: boolean;
  assignment_id: number | null;
  vehicle_id: number | null;
  license_plate: string | null;
  brand: string | null;
  model: string | null;
  started_at: string | null;
  status: string | null;
};

type VehicleSessionResponse = {
  session: {
    assignment_id: number;
    status: string;
    started_at: string;
  };
  user: {
    id: number;
    full_name: string;
    unique_code: string;
  };
  vehicle: {
    id: number;
    brand: string;
    model: string;
    license_plate: string;
    year: number;
    status: string;
    current_mileage: number;
  };
  previous_handover_report: {
    assignment_id: number;
    previous_driver_name: string;
    previous_session_started_at: string;
    previous_session_ended_at: string | null;
  } | null;
};

function UserHomePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const userCode = localStorage.getItem("authUserCode");
  const shiftNumber = localStorage.getItem("authShiftNumber");

  const [activeSession, setActiveSession] =
    useState<ActiveSessionResponse | null>(null);
  const [sessionDetails, setSessionDetails] =
    useState<VehicleSessionResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const [needServiceInKm, setNeedServiceInKm] = useState("");
  const [needBrakes, setNeedBrakes] = useState(false);
  const [needTires, setNeedTires] = useState(false);
  const [needOil, setNeedOil] = useState(false);
  const [dashboardChecks, setDashboardChecks] = useState("");
  const [otherProblems, setOtherProblems] = useState("");

  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesSuccess, setIssuesSuccess] = useState("");

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale =
      i18n.language === "de"
        ? "de-DE"
        : i18n.language === "en"
        ? "en-GB"
        : "ro-RO";

    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  useEffect(() => {
    if (!userCode) {
      navigate("/", { replace: true });
      return;
    }

    const fetchPageData = async () => {
      setLoading(true);
      setError("");
      setSessionDetails(null);

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/auth/active-session/${userCode}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(
            typeof data?.detail === "string"
              ? data.detail
              : t("couldNotLoadActiveSession")
          );
          return;
        }

        setActiveSession(data);

        if (data.has_active_session && data.assignment_id) {
          setDetailsLoading(true);

          try {
            const detailsResponse = await fetch(
              `http://127.0.0.1:8000/api/v1/sessions/${data.assignment_id}?user_code=${encodeURIComponent(
                userCode
              )}`
            );
            const detailsData = await detailsResponse.json();

            if (!detailsResponse.ok) {
              setError(
                typeof detailsData?.detail === "string"
                  ? detailsData.detail
                  : t("couldNotLoadVehicleDetails")
              );
              return;
            }

            setSessionDetails(detailsData);
          } finally {
            setDetailsLoading(false);
          }
        }
      } catch {
        setError(t("backendConnectionError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [navigate, userCode, t]);

  const handleLogout = () => {
    localStorage.removeItem("authUserCode");
    localStorage.removeItem("authUserName");
    localStorage.removeItem("authShiftNumber");
    navigate("/", { replace: true });
  };

  const handleSubmitIssues = async () => {
    if (!userCode || !activeSession?.assignment_id) {
      setError(t("invalidData"));
      return;
    }

    setError("");
    setIssuesSuccess("");
    setIssuesLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/vehicle-issues",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_code: userCode,
            assignment_id: activeSession.assignment_id,
            need_service_in_km: needServiceInKm.trim()
              ? Number(needServiceInKm)
              : null,
            need_brakes: needBrakes,
            need_tires: needTires,
            need_oil: needOil,
            dashboard_checks: dashboardChecks.trim() || null,
            other_problems: otherProblems.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : t("couldNotSubmitIssues")
        );
        return;
      }

      setIssuesSuccess(t("issuesSubmittedSuccessfully"));

      setNeedServiceInKm("");
      setNeedBrakes(false);
      setNeedTires(false);
      setNeedOil(false);
      setDashboardChecks("");
      setOtherProblems("");
    } catch {
      setError(t("backendConnectionError"));
    } finally {
      setIssuesLoading(false);
    }
  };

  const hasCurrentVehicle = Boolean(activeSession?.has_active_session);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>
              {t("shift")}: {shiftNumber ?? "-"}
            </h1>
          </div>

          <button
            onClick={handleLogout}
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

        {error && (
          <div
            style={{
              background: "#ffe5e5",
              border: "1px solid #ffb3b3",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "20px",
              color: "#a40000",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.9fr",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: "24px" }}>
            <div
              style={{
                background: "#fff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                minHeight: "220px",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
                {t("currentVehicle")}
              </h2>

              {loading || detailsLoading ? (
                <p>{t("loading")}</p>
              ) : !hasCurrentVehicle ? (
                <p>{t("noAssignedVehicle")}</p>
              ) : sessionDetails ? (
                <>
                  <div style={{ marginBottom: "14px" }}>
                    <h3 style={{ margin: 0, fontSize: "28px" }}>
                      {sessionDetails.vehicle.license_plate}
                    </h3>
                    <p style={{ margin: "6px 0 0 0", color: "#666" }}>
                      {sessionDetails.vehicle.brand} {sessionDetails.vehicle.model}{" "}
                      ({sessionDetails.vehicle.year})
                    </p>
                  </div>

                  <p style={{ margin: "8px 0" }}>
                    <strong>{t("currentMileage")}:</strong>{" "}
                    {sessionDetails.vehicle.current_mileage}
                  </p>
                  <p style={{ margin: "8px 0" }}>
                    <strong>{t("sessionStart")}:</strong>{" "}
                    {formatDateTime(sessionDetails.session.started_at)}
                  </p>

                  {sessionDetails.previous_handover_report && (
                    <p style={{ margin: "8px 0" }}>
                      <strong>{t("lastDriver")}:</strong>{" "}
                      {
                        sessionDetails.previous_handover_report
                          .previous_driver_name
                      }
                    </p>
                  )}
                </>
              ) : (
                <p>{t("couldNotLoadVehicleDetails")}</p>
              )}
            </div>

            {hasCurrentVehicle && (
              <div
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <h2 style={{ marginTop: 0 }}>{t("commentsAndChecks")}</h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <input
                    type="number"
                    placeholder={t("needServiceInKmPlaceholder")}
                    value={needServiceInKm}
                    onChange={(e) => setNeedServiceInKm(e.target.value)}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                    }}
                  />

                  <label>
                    <input
                      type="checkbox"
                      checked={needBrakes}
                      onChange={(e) => setNeedBrakes(e.target.checked)}
                    />{" "}
                    {t("needBrakes")}
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={needTires}
                      onChange={(e) => setNeedTires(e.target.checked)}
                    />{" "}
                    {t("needTires")}
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      checked={needOil}
                      onChange={(e) => setNeedOil(e.target.checked)}
                    />{" "}
                    {t("needOil")}
                  </label>

                  <textarea
                    placeholder={t("dashboardChecks")}
                    value={dashboardChecks}
                    onChange={(e) => setDashboardChecks(e.target.value)}
                    style={{
                      minHeight: "90px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                    }}
                  />

                  <textarea
                    placeholder={t("otherProblems")}
                    value={otherProblems}
                    onChange={(e) => setOtherProblems(e.target.value)}
                    style={{
                      minHeight: "100px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                    }}
                  />

                  <button
                    onClick={handleSubmitIssues}
                    disabled={issuesLoading}
                    style={{
                      marginTop: "8px",
                      background: "#000",
                      color: "#fff",
                      border: "none",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      cursor: issuesLoading ? "not-allowed" : "pointer",
                      opacity: issuesLoading ? 0.8 : 1,
                    }}
                  >
                    {issuesLoading ? t("submitting") : t("submitIssues")}
                  </button>

                  {issuesSuccess && (
                    <div
                      style={{
                        background: "#e8f5e9",
                        border: "1px solid #b7dfb9",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        color: "#256029",
                        marginTop: "4px",
                      }}
                    >
                      {issuesSuccess}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                background: "#fff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                position: "sticky",
                top: "24px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {hasCurrentVehicle ? t("vehicleReturn") : t("vehiclePickup")}
              </h2>

              <button
                onClick={() =>
                  hasCurrentVehicle
                    ? navigate(`/session/${activeSession?.assignment_id}`)
                    : navigate("/vehicles")
                }
                style={{
                  marginTop: "12px",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {hasCurrentVehicle ? t("returnVehicle") : t("pickUpVehicle")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHomePage;