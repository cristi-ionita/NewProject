import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  active_assignment_id: number | null;
};

type VehicleLiveStatusResponse = {
  vehicles: VehicleLiveStatusItem[];
};

type StartSessionResponse = {
  assignment_id: number;
  user_id: number;
  user_name: string;
  vehicle_id: number;
  license_plate: string;
  started_at: string;
  status: string;
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
  const [activeSession, setActiveSession] = useState<ActiveSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [startingVehicleId, setStartingVehicleId] = useState<number | null>(null);
  const [endingSession, setEndingSession] = useState(false);

  const navigate = useNavigate();

  const userCode = localStorage.getItem("authUserCode");
  const userName = localStorage.getItem("authUserName");
  const shiftNumber = localStorage.getItem("authShiftNumber");

  const extractErrorMessage = (data: unknown, fallback: string): string => {
    if (typeof data === "object" && data !== null && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;

      if (typeof detail === "string") {
        return detail;
      }

      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              "msg" in item &&
              typeof (item as { msg: unknown }).msg === "string"
            ) {
              return (item as { msg: string }).msg;
            }
            return "Eroare de validare.";
          })
          .join(" | ");
      }
    }

    return fallback;
  };

  const fetchVehicles = async () => {
    const response = await fetch("http://127.0.0.1:8000/api/v1/vehicles/live-status");
    const data: VehicleLiveStatusResponse | { detail?: unknown } = await response.json();

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Nu am putut încărca mașinile."));
    }

    if ("vehicles" in data) {
      setVehicles(data.vehicles);
    }
  };

  const fetchActiveSession = async () => {
    if (!userCode) {
      throw new Error("Sesiunea utilizatorului lipsește.");
    }

    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/auth/active-session/${userCode}`
    );
    const data: ActiveSessionResponse | { detail?: unknown } = await response.json();

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Nu am putut încărca sesiunea activă."));
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("A apărut o eroare.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userCode) {
      navigate("/");
      return;
    }

    fetchPageData();
  }, [userCode, navigate]);

  const handleStartSession = async (licensePlate: string, vehicleId: number) => {
    if (!userCode) {
      navigate("/");
      return;
    }

    setError("");
    setStartingVehicleId(vehicleId);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/start-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: userCode,
            license_plate: licensePlate,
          }),
        }
      );

      const data: StartSessionResponse | { detail?: unknown } = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(data, "Nu am putut porni sesiunea."));
        await fetchPageData();
        return;
      }

      if ("assignment_id" in data) {
        navigate(`/session/${data.assignment_id}`);
      }
    } catch {
      setError("Nu mă pot conecta la backend.");
    } finally {
      setStartingVehicleId(null);
    }
  };

  const handleEndSession = async () => {
    if (!userCode) {
      navigate("/");
      return;
    }

    setError("");
    setEndingSession(true);

    try {
      const response = await fetch(
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

      const data: { detail?: unknown } = await response.json();

      if (!response.ok) {
        setError(extractErrorMessage(data, "Nu am putut preda mașina."));
        return;
      }

      await fetchPageData();
    } catch {
      setError("Nu mă pot conecta la backend.");
    } finally {
      setEndingSession(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authUserCode");
    localStorage.removeItem("authUserName");
    localStorage.removeItem("authShiftNumber");
    navigate("/");
  };

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: "24px" }}>
        <h1>Mașinile firmei</h1>
        <p>
          <strong>Utilizator:</strong> {userName ?? "-"}
        </p>
        <p>
          <strong>Tură:</strong> {shiftNumber ?? "-"}
        </p>

        <button className="button button-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {activeSession?.has_active_session && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h2>Mașina mea curentă</h2>
          <p>
            <strong>Număr:</strong> {activeSession.license_plate}
          </p>
          <p>
            <strong>Marcă:</strong> {activeSession.brand} {activeSession.model}
          </p>
          <p>
            <strong>Start:</strong> {activeSession.started_at}
          </p>
          <p>
            <strong>Status:</strong> {activeSession.status}
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {activeSession.assignment_id && (
              <button
                className="button button-primary"
                onClick={() => navigate(`/session/${activeSession.assignment_id}`)}
              >
                Deschide fișa mașinii
              </button>
            )}

            <button
              className="button button-danger"
              onClick={handleEndSession}
              disabled={endingSession}
            >
              {endingSession ? "Se predă..." : "Predă mașina"}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="card">Se încarcă mașinile...</div>}

      {error && (
        <div
          className="card"
          style={{
            background: "#ffe5e5",
            border: "1px solid #ffb3b3",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {vehicles.map((vehicle) => (
            <div key={vehicle.vehicle_id} className="card">
              <h2>
                {vehicle.license_plate} — {vehicle.brand} {vehicle.model}
              </h2>

              <p>
                <strong>An:</strong> {vehicle.year}
              </p>
              <p>
                <strong>Status mașină:</strong> {vehicle.vehicle_status}
              </p>
              <p>
                <strong>Disponibilitate:</strong>{" "}
                {vehicle.availability === "free" ? "Liberă" : "Ocupată"}
              </p>

              {vehicle.availability === "occupied" && (
                <p>
                  <strong>În uz de:</strong> {vehicle.assigned_to_name ?? "-"}
                </p>
              )}

              {vehicle.availability === "free" ? (
                <button
                  className="button button-primary"
                  onClick={() =>
                    handleStartSession(vehicle.license_plate, vehicle.vehicle_id)
                  }
                  disabled={startingVehicleId === vehicle.vehicle_id}
                >
                  {startingVehicleId === vehicle.vehicle_id
                    ? "Se preia..."
                    : "Preia mașina"}
                </button>
              ) : (
                <button
                  className="button button-danger"
                  disabled
                  style={{ opacity: 0.85 }}
                >
                  Mașina este deja în uz
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelectVehiclePage;