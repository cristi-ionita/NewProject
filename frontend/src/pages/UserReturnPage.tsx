import { useEffect, useMemo, useState } from "react";
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
  handover_start?: {
    mileage_start: number | null;
    dashboard_warnings_start: string | null;
    damage_notes_start: string | null;
    notes_start: string | null;
    has_documents: boolean;
    has_medkit: boolean;
    has_extinguisher: boolean;
    has_warning_triangle: boolean;
    has_spare_wheel: boolean;
    is_completed: boolean;
  } | null;
  handover_end?: {
    mileage_end: number | null;
    dashboard_warnings_end: string | null;
    damage_notes_end: string | null;
    notes_end: string | null;
    is_completed: boolean;
  } | null;
};

function UserReturnPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userCode = localStorage.getItem("authUserCode");
  const userName = localStorage.getItem("authUserName");
  const shiftNumber = localStorage.getItem("authShiftNumber");

  const [activeSession, setActiveSession] =
    useState<ActiveSessionResponse | null>(null);
  const [sessionDetails, setSessionDetails] =
    useState<VehicleSessionResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const [mileageEnd, setMileageEnd] = useState("");
  const [dashboardWarningsEnd, setDashboardWarningsEnd] = useState("");
  const [damageNotesEnd, setDamageNotesEnd] = useState("");
  const [notesEnd, setNotesEnd] = useState("");

  useEffect(() => {
    if (!userCode) {
      navigate("/", { replace: true });
      return;
    }

    const fetchPageData = async () => {
      setLoading(true);
      setLoadError("");
      setSessionDetails(null);

      try {
        const activeResponse = await fetch(
          `http://127.0.0.1:8000/api/v1/auth/active-session/${userCode}`
        );
        const activeData = await activeResponse.json();

        if (!activeResponse.ok) {
          setLoadError(
            typeof activeData?.detail === "string"
              ? activeData.detail
              : t("couldNotLoadActiveSession")
          );
          return;
        }

        setActiveSession(activeData);

        if (!activeData.has_active_session || !activeData.assignment_id) {
          navigate("/user", { replace: true });
          return;
        }

        const detailsResponse = await fetch(
          `http://127.0.0.1:8000/api/v1/sessions/${activeData.assignment_id}?user_code=${encodeURIComponent(
            userCode
          )}`
        );
        const detailsData = await detailsResponse.json();

        if (!detailsResponse.ok) {
          setLoadError(
            typeof detailsData?.detail === "string"
              ? detailsData.detail
              : t("couldNotLoadSessionDetails")
          );
          return;
        }

        setSessionDetails(detailsData);

        if (detailsData?.handover_end) {
          setMileageEnd(
            detailsData.handover_end.mileage_end != null
              ? String(detailsData.handover_end.mileage_end)
              : ""
          );
          setDashboardWarningsEnd(
            detailsData.handover_end.dashboard_warnings_end ?? ""
          );
          setDamageNotesEnd(detailsData.handover_end.damage_notes_end ?? "");
          setNotesEnd(detailsData.handover_end.notes_end ?? "");
        }
      } catch {
        setLoadError(t("backendConnectionError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [navigate, userCode, t]);

  const cleanedMileage = mileageEnd.trim();
  const cleanedWarnings = dashboardWarningsEnd.trim();
  const cleanedDamage = damageNotesEnd.trim();
  const cleanedNotes = notesEnd.trim();

  const validationMessage = useMemo(() => {
    if (!sessionDetails) return "";

    if (!cleanedMileage) {
      return t("fillReturnMileage");
    }

    const mileageNumber = Number(cleanedMileage);

    if (Number.isNaN(mileageNumber) || mileageNumber < 0) {
      return t("returnMileageInvalid");
    }

    const minimumMileage =
      sessionDetails.handover_start?.mileage_start ??
      sessionDetails.vehicle.current_mileage;

    if (mileageNumber < minimumMileage) {
      return t("returnMileageLessThanPickup");
    }

    if (!cleanedWarnings) {
      return t("fillDashboardWarnings");
    }

    if (!cleanedDamage) {
      return t("fillDamageNotes");
    }

    if (!cleanedNotes) {
      return t("fillReturnNotes");
    }

    return "";
  }, [
    sessionDetails,
    cleanedMileage,
    cleanedWarnings,
    cleanedDamage,
    cleanedNotes,
    t,
  ]);

  const isFormValid = !validationMessage;

  const handleConfirmReturn = async () => {
    if (!userCode || !activeSession?.assignment_id || !sessionDetails) {
      setSubmitError(t("invalidData"));
      return;
    }

    if (!isFormValid) {
      setSubmitError(validationMessage);
      return;
    }

    setSaving(true);
    setSubmitError("");

    try {
      const handoverResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/sessions/${activeSession.assignment_id}/handover-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_code: userCode,
            mileage_end: Number(cleanedMileage),
            dashboard_warnings_end: cleanedWarnings,
            damage_notes_end: cleanedDamage,
            notes_end: cleanedNotes,
          }),
        }
      );

      const handoverData = await handoverResponse.json();

      if (!handoverResponse.ok) {
        setSubmitError(
          typeof handoverData?.detail === "string"
            ? handoverData.detail
            : t("couldNotSaveReturn")
        );
        return;
      }

      const endSessionResponse = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/end-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: userCode,
          }),
        }
      );

      const endSessionData = await endSessionResponse.json();

      if (!endSessionResponse.ok) {
        setSubmitError(
          typeof endSessionData?.detail === "string"
            ? endSessionData.detail
            : t("couldNotCloseSession")
        );
        return;
      }

      navigate("/user", {
        replace: true,
        state: {
          returnSuccess: true,
          vehiclePlate: sessionDetails.vehicle.license_plate,
        },
      });
    } catch {
      setSubmitError(t("backendConnectionError"));
    } finally {
      setSaving(false);
    }
  };

  const renderErrorBox = (message: string) => (
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
      {message}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d5dd",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontWeight: 600,
    fontSize: "14px",
    color: "#222",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "28px" }}>
              {userName ?? t("user")}
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#666" }}>
              {t("shift")}: {shiftNumber ?? "-"}
            </p>
          </div>

          <button
            onClick={() => navigate("/user")}
            style={{
              background: "#eee",
              border: "none",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {t("back")}
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
            {t("returnVehicleTitle")}
          </h2>

          {loading ? (
            <p>{t("loading")}</p>
          ) : loadError ? (
            renderErrorBox(loadError)
          ) : sessionDetails ? (
            <>
              <div
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "26px" }}>
                  {sessionDetails.vehicle.license_plate}
                </h3>
                <p style={{ margin: "6px 0 0 0", color: "#666" }}>
                  {sessionDetails.vehicle.brand} {sessionDetails.vehicle.model} (
                  {sessionDetails.vehicle.year})
                </p>
                <p style={{ margin: "10px 0 0 0" }}>
                  <strong>{t("currentMileage")}:</strong>{" "}
                  {sessionDetails.vehicle.current_mileage}
                </p>
                <p style={{ margin: "6px 0 0 0", color: "#555" }}>
                  <strong>{t("sessionStart")}:</strong>{" "}
                  {sessionDetails.session.started_at}
                </p>
              </div>

              {submitError && renderErrorBox(submitError)}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>{t("returnMileage")} *</label>
                  <input
                    type="number"
                    value={mileageEnd}
                    onChange={(e) => setMileageEnd(e.target.value)}
                    placeholder={t("mileageExample")}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("dashboardWarningsReturn")} *</label>
                  <textarea
                    value={dashboardWarningsEnd}
                    onChange={(e) => setDashboardWarningsEnd(e.target.value)}
                    placeholder={t("dashboardWarningsExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("damageNotesReturn")} *</label>
                  <textarea
                    value={damageNotesEnd}
                    onChange={(e) => setDamageNotesEnd(e.target.value)}
                    placeholder={t("damageNotesExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("returnNotes")} *</label>
                  <textarea
                    value={notesEnd}
                    onChange={(e) => setNotesEnd(e.target.value)}
                    placeholder={t("returnNotesExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {!isFormValid && (
                  <div
                    style={{
                      background: "#fff7e6",
                      border: "1px solid #f3d28b",
                      color: "#8a6116",
                      padding: "12px 14px",
                      borderRadius: "10px",
                    }}
                  >
                    {validationMessage}
                  </div>
                )}

                <button
                  onClick={handleConfirmReturn}
                  disabled={saving || loading || !sessionDetails}
                  style={{
                    background: saving ? "#333" : "#000",
                    color: "#fff",
                    border: "none",
                    padding: "14px 18px",
                    borderRadius: "10px",
                    cursor: saving ? "not-allowed" : "pointer",
                    marginTop: "4px",
                    fontWeight: 700,
                    fontSize: "15px",
                    opacity: saving ? 0.8 : 1,
                  }}
                >
                  {saving ? t("saving") : t("confirmReturn")}
                </button>
              </div>
            </>
          ) : (
            <p>{t("noData")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserReturnPage;