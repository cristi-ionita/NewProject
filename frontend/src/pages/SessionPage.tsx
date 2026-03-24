import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  handover_start: {
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
  handover_end: {
    mileage_end: number | null;
    dashboard_warnings_end: string | null;
    damage_notes_end: string | null;
    notes_end: string | null;
    is_completed: boolean;
  } | null;
};

const MAX_REALISTIC_MILEAGE = 5_000_000;

function SessionPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [data, setData] = useState<VehicleSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mileageEnd, setMileageEnd] = useState("");
  const [dashboardWarningsEnd, setDashboardWarningsEnd] = useState("");
  const [damageNotesEnd, setDamageNotesEnd] = useState("");
  const [notesEnd, setNotesEnd] = useState("");

  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const userCode = localStorage.getItem("authUserCode");

  useEffect(() => {
    if (!assignmentId || !userCode) {
      setError(t("invalidSession"));
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/sessions/${assignmentId}?user_code=${encodeURIComponent(
            userCode
          )}`
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.detail || t("genericError"));
        }

        setData(json);

        if (json?.handover_end) {
          setMileageEnd(
            json.handover_end.mileage_end != null
              ? String(json.handover_end.mileage_end)
              : ""
          );
          setDashboardWarningsEnd(
            json.handover_end.dashboard_warnings_end ?? ""
          );
          setDamageNotesEnd(json.handover_end.damage_notes_end ?? "");
          setNotesEnd(json.handover_end.notes_end ?? "");
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t("genericError"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [assignmentId, userCode, t]);

  const cleanedMileage = mileageEnd.trim();
  const cleanedWarnings = dashboardWarningsEnd.trim();
  const cleanedDamage = damageNotesEnd.trim();
  const cleanedNotes = notesEnd.trim();

  const validationMessage = useMemo(() => {
    if (!data) return "";

    if (!cleanedMileage) {
      return t("fillReturnMileage");
    }

    const mileageNumber = Number(cleanedMileage);

    if (!Number.isInteger(mileageNumber) || mileageNumber < 0) {
      return t("returnMileageInvalid");
    }

    if (mileageNumber > MAX_REALISTIC_MILEAGE) {
      return t("returnMileageTooLarge");
    }

    const pickupMileage =
      data.handover_start?.mileage_start ?? data.vehicle.current_mileage;

    if (mileageNumber < pickupMileage) {
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
  }, [data, cleanedMileage, cleanedWarnings, cleanedDamage, cleanedNotes, t]);

  const handleReturnVehicle = async () => {
    if (!assignmentId || !userCode || !data) {
      setSubmitError(t("invalidData"));
      return;
    }

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitError("");
    setSaving(true);

    try {
      const handoverResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/sessions/${assignmentId}/handover-end`,
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

      const handoverJson = await handoverResponse.json();

      if (!handoverResponse.ok) {
        setSubmitError(handoverJson.detail || t("couldNotSaveReturn"));
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
            code: data.user.unique_code,
          }),
        }
      );

      const endSessionJson = await endSessionResponse.json();

      if (!endSessionResponse.ok) {
        setSubmitError(
          endSessionJson.detail || t("couldNotCloseSession")
        );
        return;
      }

      navigate("/user", { replace: true });
    } catch (err) {
      console.error(err);
      setSubmitError(t("saveErrorCheckData"));
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

  if (loading) {
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
              background: "#fff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {t("loadingSession")}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
              background: "#fff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {renderErrorBox(error)}
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
              {t("backToHome")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
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
              background: "#fff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {t("noData")}
          </div>
        </div>
      </div>
    );
  }

  const pickupMileage =
    data.handover_start?.mileage_start ?? data.vehicle.current_mileage;

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
              {t("returnVehicleTitle")}
            </h1>
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
            {t("backToHome")}
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
            {t("vehicle")}
          </h2>

          <p>
            <strong>{t("licensePlate")}:</strong> {data.vehicle.license_plate}
          </p>
          <p>
            <strong>{t("brand")}:</strong> {data.vehicle.brand}
          </p>
          <p>
            <strong>{t("model")}:</strong> {data.vehicle.model}
          </p>
          <p>
            <strong>{t("year")}:</strong> {data.vehicle.year}
          </p>
          <p>
            <strong>{t("status")}:</strong> {data.vehicle.status}
          </p>
          <p>
            <strong>{t("currentMileage")}:</strong> {data.vehicle.current_mileage}
          </p>
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
                min={pickupMileage}
                max={MAX_REALISTIC_MILEAGE}
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

            {validationMessage && (
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
              onClick={handleReturnVehicle}
              disabled={saving}
              style={{
                background: "#c62828",
                color: "#fff",
                border: "none",
                padding: "14px 18px",
                borderRadius: "10px",
                cursor: saving ? "not-allowed" : "pointer",
                marginTop: "4px",
                fontWeight: 700,
                fontSize: "15px",
                opacity: saving ? 0.8 : 1,
                width: "100%",
              }}
            >
              {saving ? t("returningVehicle") : t("returnVehicleButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;