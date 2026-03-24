import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

type VehicleResponse = {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vin: string | null;
  status: string;
  current_mileage: number;
};

const MAX_REALISTIC_MILEAGE = 5_000_000;

function UserPickupPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userCode = localStorage.getItem("authUserCode");
  const userName = localStorage.getItem("authUserName");
  const shiftNumber = localStorage.getItem("authShiftNumber");

  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [mileageStart, setMileageStart] = useState("");
  const [dashboardWarningsStart, setDashboardWarningsStart] = useState("");
  const [damageNotesStart, setDamageNotesStart] = useState("");
  const [notesStart, setNotesStart] = useState("");

  const [hasDocuments, setHasDocuments] = useState(false);
  const [hasMedkit, setHasMedkit] = useState(false);
  const [hasExtinguisher, setHasExtinguisher] = useState(false);
  const [hasWarningTriangle, setHasWarningTriangle] = useState(false);
  const [hasSpareWheel, setHasSpareWheel] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userCode) {
      navigate("/", { replace: true });
      return;
    }

    if (!vehicleId) {
      setLoadError(t("invalidVehicle"));
      setLoading(false);
      return;
    }

    const fetchVehicle = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/vehicles/${vehicleId}`
        );

        const data = await response.json();

        if (!response.ok) {
          setLoadError(
            typeof data?.detail === "string"
              ? data.detail
              : t("couldNotLoadVehicle")
          );
          return;
        }

        setVehicle(data);
        setMileageStart(String(data.current_mileage ?? ""));
      } catch {
        setLoadError(t("backendConnectionError"));
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [navigate, userCode, vehicleId, t]);

  const cleanedMileage = mileageStart.trim();
  const cleanedWarnings = dashboardWarningsStart.trim();
  const cleanedDamage = damageNotesStart.trim();
  const cleanedNotes = notesStart.trim();

  const validationMessage = useMemo(() => {
    if (!vehicle) return "";

    if (!cleanedMileage) {
      return t("fillPickupMileage");
    }

    const mileageNumber = Number(cleanedMileage);

    if (!Number.isInteger(mileageNumber) || mileageNumber < 0) {
      return t("pickupMileageInvalid");
    }

    if (mileageNumber > MAX_REALISTIC_MILEAGE) {
      return t("pickupMileageTooLarge");
    }

    if (mileageNumber < vehicle.current_mileage) {
      return t("pickupMileageLessThanCurrent");
    }

    if (!cleanedWarnings) {
      return t("fillDashboardWarnings");
    }

    if (!cleanedDamage) {
      return t("fillDamageNotes");
    }

    if (!cleanedNotes) {
      return t("fillPickupNotes");
    }

    return "";
  }, [vehicle, cleanedMileage, cleanedWarnings, cleanedDamage, cleanedNotes, t]);

  const isFormValid = !validationMessage;

  const handleConfirmPickup = async () => {
    if (!userCode || !vehicle) {
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
      const startSessionResponse = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/start-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: userCode,
            license_plate: vehicle.license_plate,
          }),
        }
      );

      const startSessionData = await startSessionResponse.json();

      if (!startSessionResponse.ok) {
        setSubmitError(
          typeof startSessionData?.detail === "string"
            ? startSessionData.detail
            : t("couldNotStartSession")
        );
        return;
      }

      const assignmentId = startSessionData.assignment_id;

      const handoverResponse = await fetch(
        `http://127.0.0.1:8000/api/v1/sessions/${assignmentId}/handover-start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_code: userCode,
            mileage_start: Number(cleanedMileage),
            dashboard_warnings_start: cleanedWarnings,
            damage_notes_start: cleanedDamage,
            notes_start: cleanedNotes,
            has_documents: hasDocuments,
            has_medkit: hasMedkit,
            has_extinguisher: hasExtinguisher,
            has_warning_triangle: hasWarningTriangle,
            has_spare_wheel: hasSpareWheel,
          }),
        }
      );

      const handoverData = await handoverResponse.json();

      if (!handoverResponse.ok) {
        setSubmitError(
          typeof handoverData?.detail === "string"
            ? handoverData.detail
            : t("couldNotSavePickup")
        );
        return;
      }

      navigate("/user", {
        replace: true,
        state: {
          pickupSuccess: true,
          vehiclePlate: vehicle.license_plate,
        },
      });
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
            onClick={() => navigate("/vehicles")}
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
            {t("pickupVehicleTitle")}
          </h2>

          {loading ? (
            <p>{t("loading")}</p>
          ) : loadError ? (
            renderErrorBox(loadError)
          ) : vehicle ? (
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
                  {vehicle.license_plate}
                </h3>
                <p style={{ margin: "6px 0 0 0", color: "#666" }}>
                  {vehicle.brand} {vehicle.model} ({vehicle.year})
                </p>
                <p style={{ margin: "10px 0 0 0" }}>
                  <strong>{t("currentMileage")}:</strong> {vehicle.current_mileage}
                </p>
                {vehicle.vin && (
                  <p style={{ margin: "6px 0 0 0", color: "#555" }}>
                    <strong>VIN:</strong> {vehicle.vin}
                  </p>
                )}
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
                  <label style={labelStyle}>{t("pickupMileage")} *</label>
                  <input
                    type="number"
                    value={mileageStart}
                    onChange={(e) => setMileageStart(e.target.value)}
                    placeholder={t("pickupMileageExample")}
                    style={inputStyle}
                    min={vehicle.current_mileage}
                    max={MAX_REALISTIC_MILEAGE}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("dashboardWarningsPickup")} *</label>
                  <textarea
                    value={dashboardWarningsStart}
                    onChange={(e) => setDashboardWarningsStart(e.target.value)}
                    placeholder={t("dashboardWarningsExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("damagePickup")} *</label>
                  <textarea
                    value={damageNotesStart}
                    onChange={(e) => setDamageNotesStart(e.target.value)}
                    placeholder={t("damageNotesExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("notesPickup")} *</label>
                  <textarea
                    value={notesStart}
                    onChange={(e) => setNotesStart(e.target.value)}
                    placeholder={t("pickupNotesExample")}
                    style={{
                      ...inputStyle,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    background: "#fcfcfd",
                  }}
                >
                  <p
                    style={{
                      marginTop: 0,
                      marginBottom: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {t("equipmentCheck")}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasDocuments}
                        onChange={(e) => setHasDocuments(e.target.checked)}
                      />
                      {t("documentsPresent")}
                    </label>

                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasMedkit}
                        onChange={(e) => setHasMedkit(e.target.checked)}
                      />
                      {t("medicalKit")}
                    </label>

                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasExtinguisher}
                        onChange={(e) => setHasExtinguisher(e.target.checked)}
                      />
                      {t("fireExtinguisher")}
                    </label>

                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasWarningTriangle}
                        onChange={(e) => setHasWarningTriangle(e.target.checked)}
                      />
                      {t("warningTriangleReflective")}
                    </label>

                    <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasSpareWheel}
                        onChange={(e) => setHasSpareWheel(e.target.checked)}
                      />
                      {t("spareWheel")}
                    </label>
                  </div>
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
                  onClick={handleConfirmPickup}
                  disabled={saving || loading || !vehicle}
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
                  {saving ? t("saving") : t("confirmPickup")}
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

export default UserPickupPage;