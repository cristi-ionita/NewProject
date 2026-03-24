import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type VehicleLiveStatusItem = {
  vehicle_id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vehicle_status: string;
  availability: string;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  assigned_to_shift_number: string | null;
  active_assignment_id: number | null;
};

type VehicleLiveStatusResponse = {
  vehicles: VehicleLiveStatusItem[];
};

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

function SelectVehiclePage() {
  const [vehicles, setVehicles] = useState<VehicleLiveStatusItem[]>([]);
  const [activeSession, setActiveSession] =
    useState<ActiveSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const userCode = localStorage.getItem("authUserCode");

  const extractErrorMessage = (data: unknown, fallback: string): string => {
    if (typeof data === "object" && data !== null && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;

      if (typeof detail === "string") return detail;

      if (Array.isArray(detail)) {
        return detail
          .map((item) =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof (item as { msg: unknown }).msg === "string"
              ? (item as { msg: string }).msg
              : t("validationError")
          )
          .join(" | ");
      }
    }

    return fallback;
  };

  const getVehicleStatusLabel = (status: string) => {
    if (status === "active") return t("vehicleActive");
    if (status === "in_service") return t("vehicleInService");
    if (status === "inactive") return t("vehicleInactive");
    return status;
  };

  const getAvailabilityLabel = (availability: string) => {
    if (availability === "free") return t("available");
    if (availability === "occupied") return t("occupied");
    return availability;
  };

  const getCardBackground = (vehicle: VehicleLiveStatusItem) => {
    if (vehicle.availability === "occupied") return "#f8d7da";
    if (vehicle.vehicle_status === "in_service") return "#fff3cd";
    if (vehicle.vehicle_status === "inactive") return "#e9ecef";
    if (
      vehicle.availability === "free" &&
      vehicle.vehicle_status === "active"
    ) {
      return "#d4edda";
    }
    return "#ffffff";
  };

  const fetchVehicles = async () => {
    const response = await fetch(
      "http://127.0.0.1:8000/api/v1/vehicles/live-status"
    );
    const data: VehicleLiveStatusResponse | { detail?: unknown } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(data, t("couldNotLoadVehicles"))
      );
    }

    if ("vehicles" in data) {
      setVehicles(data.vehicles);
    }
  };

  const fetchActiveSession = async () => {
    if (!userCode) throw new Error(t("missingUserSession"));

    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/auth/active-session/${userCode}`
    );
    const data: ActiveSessionResponse | { detail?: unknown } =
      await response.json();

    if (!response.ok) {
      throw new Error(
        extractErrorMessage(data, t("couldNotLoadActiveSession"))
      );
    }

    if ("has_active_session" in data) {
      setActiveSession(data);
    }
  };

  const fetchPageData = async () => {
    setError("");
    setLoading(true);

    try {
      await Promise.all([fetchVehicles(), fetchActiveSession()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userCode) {
      navigate("/", { replace: true });
      return;
    }

    fetchPageData();
  }, [userCode, navigate]);

  const handleSelectVehicle = (vehicleId: number) => {
    if (!userCode) {
      navigate("/", { replace: true });
      return;
    }

    if (activeSession?.has_active_session) {
      navigate("/user", { replace: true });
      return;
    }

    setError("");
    navigate(`/vehicles/${vehicleId}/pickup`);
  };

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "24px" }}>
        <h1>{t("selectVehicle")}</h1>

        <button
          className="button button-primary"
          onClick={() => navigate("/user")}
        >
          {t("backToHome")}
        </button>
      </div>

      {loading && <div className="card">{t("loadingVehicles")}</div>}

      {error && (
        <div className="card" style={{ background: "#ffe5e5" }}>
          {error}
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {vehicles.map((vehicle) => {
            const isAvailable =
              vehicle.availability === "free" &&
              vehicle.vehicle_status === "active";

            const isBlockedByOwnSession = !!activeSession?.has_active_session;

            return (
              <div
                key={vehicle.vehicle_id}
                className="card"
                style={{
                  background: getCardBackground(vehicle),
                }}
              >
                <h2>
                  {vehicle.license_plate} — {vehicle.brand} {vehicle.model}
                </h2>

                <p>
                  <strong>{t("year")}:</strong> {vehicle.year}
                </p>
                <p>
                  <strong>{t("vehicleStatus")}:</strong>{" "}
                  {getVehicleStatusLabel(vehicle.vehicle_status)}
                </p>
                <p>
                  <strong>{t("availability")}:</strong>{" "}
                  {getAvailabilityLabel(vehicle.availability)}
                </p>

                {vehicle.availability === "occupied" && (
                  <>
                    <p>
                      <strong>{t("usedBy")}:</strong>{" "}
                      {vehicle.assigned_to_name ?? "-"}
                    </p>
                    <p>
                      <strong>{t("shift")}:</strong>{" "}
                      {vehicle.assigned_to_shift_number ?? "-"}
                    </p>
                  </>
                )}

                {isAvailable ? (
                  <button
                    onClick={() => handleSelectVehicle(vehicle.vehicle_id)}
                    disabled={isBlockedByOwnSession}
                  >
                    {isBlockedByOwnSession
                      ? t("alreadyAssignedVehicle")
                      : t("continuePickup")}
                  </button>
                ) : (
                  <button disabled>
                    {vehicle.availability === "occupied"
                      ? t("vehicleInUse")
                      : vehicle.vehicle_status === "in_service"
                      ? t("vehicleInService")
                      : vehicle.vehicle_status === "inactive"
                      ? t("vehicleInactive")
                      : t("unavailable")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SelectVehiclePage;