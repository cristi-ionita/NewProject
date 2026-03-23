import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

type VehicleHistoryItem = {
  assignment_id: number;
  driver_name: string;
  started_at: string;
  ended_at: string | null;
  mileage_start: number | null;
  mileage_end: number | null;
  dashboard_warnings_start: string | null;
  dashboard_warnings_end: string | null;
  damage_notes_start: string | null;
  damage_notes_end: string | null;
  notes_start: string | null;
  notes_end: string | null;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
};

type VehicleHistoryResponse = {
  vehicle_id: number;
  history: VehicleHistoryItem[];
};

function VehicleHistoryPage() {
  const { vehicleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const returnToSessionId = location.state?.returnToSessionId as number | undefined;

  const [data, setData] = useState<VehicleHistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const userCode = localStorage.getItem("authUserCode");

  useEffect(() => {
    if (!userCode) {
      navigate("/");
      return;
    }

    if (!vehicleId) return;

    fetch(`http://127.0.0.1:8000/api/v1/vehicles/${vehicleId}/history`)
      .then(async (res) => {
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.detail || "A apărut o eroare.");
        }

        return json;
      })
      .then((json) => {
        setData(json);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [vehicleId, navigate, userCode]);

  if (loading) {
    return <div className="container">Se încarcă istoricul...</div>;
  }

  if (error) {
    return <div className="container">Eroare: {error}</div>;
  }

  if (!data) {
    return <div className="container">Nu există date.</div>;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: "20px" }}>
        {returnToSessionId ? (
          <Link
            to={`/session/${returnToSessionId}`}
            style={{ textDecoration: "none" }}
          >
            ← Înapoi la sesiunea curentă
          </Link>
        ) : (
          <span>Istoric vehicul</span>
        )}
      </div>

      <h1>Istoric vehicul</h1>
      <p>
        <strong>ID vehicul:</strong> {data.vehicle_id}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {data.history.map((item) => (
          <div key={item.assignment_id} className="card">
            <h2>Sesiunea #{item.assignment_id}</h2>
            <p><strong>Șofer:</strong> {item.driver_name}</p>
            <p><strong>Start:</strong> {item.started_at}</p>
            <p><strong>End:</strong> {item.ended_at ?? "-"}</p>

            <hr />

            <p><strong>Km preluare:</strong> {item.mileage_start ?? "-"}</p>
            <p><strong>Km predare:</strong> {item.mileage_end ?? "-"}</p>

            <p><strong>Martori bord la preluare:</strong> {item.dashboard_warnings_start ?? "-"}</p>
            <p><strong>Martori bord la predare:</strong> {item.dashboard_warnings_end ?? "-"}</p>

            <p><strong>Daune la preluare:</strong> {item.damage_notes_start ?? "-"}</p>
            <p><strong>Daune la predare:</strong> {item.damage_notes_end ?? "-"}</p>

            <p><strong>Observații la preluare:</strong> {item.notes_start ?? "-"}</p>
            <p><strong>Observații la predare:</strong> {item.notes_end ?? "-"}</p>

            <hr />

            <p><strong>Documente:</strong> {item.has_documents ? "Da" : "Nu"}</p>
            <p><strong>Trusă medicală:</strong> {item.has_medkit ? "Da" : "Nu"}</p>
            <p><strong>Stingător:</strong> {item.has_extinguisher ? "Da" : "Nu"}</p>
            <p><strong>Triunghi:</strong> {item.has_warning_triangle ? "Da" : "Nu"}</p>
            <p><strong>Roată de rezervă:</strong> {item.has_spare_wheel ? "Da" : "Nu"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VehicleHistoryPage;