import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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

type HandoverStartPayload = {
  mileage_start: number | null;
  dashboard_warnings_start: string | null;
  damage_notes_start: string | null;
  notes_start: string | null;
  has_documents: boolean;
  has_medkit: boolean;
  has_extinguisher: boolean;
  has_warning_triangle: boolean;
  has_spare_wheel: boolean;
};

function SessionPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<VehicleSessionResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [mileageStart, setMileageStart] = useState("");
  const [dashboardWarningsStart, setDashboardWarningsStart] = useState("");
  const [damageNotesStart, setDamageNotesStart] = useState("");
  const [notesStart, setNotesStart] = useState("");

  const [hasDocuments, setHasDocuments] = useState(false);
  const [hasMedkit, setHasMedkit] = useState(false);
  const [hasExtinguisher, setHasExtinguisher] = useState(false);
  const [hasWarningTriangle, setHasWarningTriangle] = useState(false);
  const [hasSpareWheel, setHasSpareWheel] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [mileageEnd, setMileageEnd] = useState("");
  const [dashboardWarningsEnd, setDashboardWarningsEnd] = useState("");
  const [damageNotesEnd, setDamageNotesEnd] = useState("");
  const [notesEnd, setNotesEnd] = useState("");

  const [endSaveMessage, setEndSaveMessage] = useState("");
  const [endSaveError, setEndSaveError] = useState("");
  const [endingSave, setEndingSave] = useState(false);

  const [endSessionMessage, setEndSessionMessage] = useState("");
  const [endSessionError, setEndSessionError] = useState("");
  const [endingSession, setEndingSession] = useState(false);

  const userCode = localStorage.getItem("authUserCode");

  useEffect(() => {
    if (!userCode) {
      navigate("/");
      return;
    }

    if (!assignmentId) return;

    fetch(`http://127.0.0.1:8000/api/v1/sessions/${assignmentId}`)
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
  }, [assignmentId, navigate, userCode]);

  const handleSaveHandoverStart = async () => {
    if (!assignmentId || !userCode) {
      navigate("/");
      return;
    }

    setSaveMessage("");
    setSaveError("");
    setSaving(true);

    const payload: HandoverStartPayload = {
      mileage_start: mileageStart ? Number(mileageStart) : null,
      dashboard_warnings_start: dashboardWarningsStart || null,
      damage_notes_start: damageNotesStart || null,
      notes_start: notesStart || null,
      has_documents: hasDocuments,
      has_medkit: hasMedkit,
      has_extinguisher: hasExtinguisher,
      has_warning_triangle: hasWarningTriangle,
      has_spare_wheel: hasSpareWheel,
    };

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/sessions/${assignmentId}/handover-start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        setSaveError(json.detail || "Nu am putut salva datele.");
        return;
      }

      setSaveMessage("Datele de preluare au fost salvate.");
    } catch {
      setSaveError("Nu mă pot conecta la backend.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHandoverEnd = async () => {
    if (!assignmentId || !userCode) {
      navigate("/");
      return;
    }

    setEndSaveMessage("");
    setEndSaveError("");
    setEndingSave(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/sessions/${assignmentId}/handover-end`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mileage_end: mileageEnd ? Number(mileageEnd) : null,
            dashboard_warnings_end: dashboardWarningsEnd || null,
            damage_notes_end: damageNotesEnd || null,
            notes_end: notesEnd || null,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        setEndSaveError(json.detail || "Nu am putut salva predarea.");
        return;
      }

      setEndSaveMessage("Datele de predare au fost salvate.");
    } catch {
      setEndSaveError("Nu mă pot conecta la backend.");
    } finally {
      setEndingSave(false);
    }
  };

  const handleEndSession = async () => {
    if (!userCode) {
      navigate("/");
      return;
    }

    setEndSessionMessage("");
    setEndSessionError("");
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
            code: data?.user.unique_code,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        setEndSessionError(json.detail || "Nu am putut închide sesiunea.");
        return;
      }

      setEndSessionMessage("Sesiunea a fost închisă.");

      setTimeout(() => {
        navigate("/select-vehicle");
      }, 1200);
    } catch {
      setEndSessionError("Nu mă pot conecta la backend.");
    } finally {
      setEndingSession(false);
    }
  };

  if (loading) {
    return <div className="container">Se încarcă sesiunea...</div>;
  }

  if (error) {
    return <div className="container">Eroare: {error}</div>;
  }

  if (!data) {
    return <div className="container">Nu există date.</div>;
  }

  return (
    <div className="container">
      <h1>Fișa mașinii</h1>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Sesiune curentă</h2>
        <p>
          <strong>ID sesiune:</strong> {data.session.assignment_id}
        </p>
        <p>
          <strong>Status:</strong> {data.session.status}
        </p>
        <p>
          <strong>Start:</strong> {data.session.started_at}
        </p>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Șofer curent</h2>
        <p>
          <strong>Nume:</strong> {data.user.full_name}
        </p>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Mașină</h2>
        <p>
          <strong>Număr:</strong> {data.vehicle.license_plate}
        </p>
        <p>
          <strong>Marcă:</strong> {data.vehicle.brand}
        </p>
        <p>
          <strong>Model:</strong> {data.vehicle.model}
        </p>
        <p>
          <strong>An:</strong> {data.vehicle.year}
        </p>
        <p>
          <strong>Status:</strong> {data.vehicle.status}
        </p>
        <p>
          <strong>Kilometri curenți:</strong> {data.vehicle.current_mileage}
        </p>
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Ultimul șofer</h2>

        {data.previous_handover_report ? (
          <>
            <p>
              <strong>Nume:</strong>{" "}
              {data.previous_handover_report.previous_driver_name}
            </p>
            <p>
              <strong>Start sesiune:</strong>{" "}
              {data.previous_handover_report.previous_session_started_at}
            </p>
            <p>
              <strong>End sesiune:</strong>{" "}
              {data.previous_handover_report.previous_session_ended_at ?? "-"}
            </p>

            <Link
              to={`/vehicles/${data.vehicle.id}/history`}
              state={{ returnToSessionId: data.session.assignment_id }}
            >
              <button
                className="button button-primary"
                style={{ marginTop: "12px" }}
              >
                Vezi detalii
              </button>
            </Link>
          </>
        ) : (
          <p>Nu există încă informații despre șoferul anterior.</p>
        )}
      </div>

      <div className="card" style={{ marginBottom: "24px" }}>
        <h2>Preluare mașină</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            className="input"
            type="number"
            placeholder="Kilometri la preluare"
            value={mileageStart}
            onChange={(e) => setMileageStart(e.target.value)}
          />

          <textarea
            className="input"
            placeholder="Martori bord la preluare"
            value={dashboardWarningsStart}
            onChange={(e) => setDashboardWarningsStart(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <textarea
            className="input"
            placeholder="Lovituri / daune observate la preluare"
            value={damageNotesStart}
            onChange={(e) => setDamageNotesStart(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <textarea
            className="input"
            placeholder="Observații la preluare"
            value={notesStart}
            onChange={(e) => setNotesStart(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <label>
            <input
              type="checkbox"
              checked={hasDocuments}
              onChange={(e) => setHasDocuments(e.target.checked)}
            />{" "}
            Documente prezente
          </label>

          <label>
            <input
              type="checkbox"
              checked={hasMedkit}
              onChange={(e) => setHasMedkit(e.target.checked)}
            />{" "}
            Trusă medicală
          </label>

          <label>
            <input
              type="checkbox"
              checked={hasExtinguisher}
              onChange={(e) => setHasExtinguisher(e.target.checked)}
            />{" "}
            Stingător
          </label>

          <label>
            <input
              type="checkbox"
              checked={hasWarningTriangle}
              onChange={(e) => setHasWarningTriangle(e.target.checked)}
            />{" "}
            Triunghi
          </label>

          <label>
            <input
              type="checkbox"
              checked={hasSpareWheel}
              onChange={(e) => setHasSpareWheel(e.target.checked)}
            />{" "}
            Roată de rezervă
          </label>

          <button
            className="button button-primary"
            onClick={handleSaveHandoverStart}
            disabled={saving}
          >
            {saving ? "Se salvează..." : "Salvează preluarea"}
          </button>
        </div>

        {saveMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#e8f5e9",
              border: "1px solid #b7dfb9",
              borderRadius: "8px",
            }}
          >
            {saveMessage}
          </div>
        )}

        {saveError && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#ffe5e5",
              border: "1px solid #ffb3b3",
              borderRadius: "8px",
            }}
          >
            {saveError}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Predare mașină</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            className="input"
            type="number"
            placeholder="Kilometri la predare"
            value={mileageEnd}
            onChange={(e) => setMileageEnd(e.target.value)}
          />

          <textarea
            className="input"
            placeholder="Martori bord la predare"
            value={dashboardWarningsEnd}
            onChange={(e) => setDashboardWarningsEnd(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <textarea
            className="input"
            placeholder="Lovituri / daune observate la predare"
            value={damageNotesEnd}
            onChange={(e) => setDamageNotesEnd(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <textarea
            className="input"
            placeholder="Observații la predare"
            value={notesEnd}
            onChange={(e) => setNotesEnd(e.target.value)}
            style={{ minHeight: "80px" }}
          />

          <button
            className="button button-primary"
            onClick={handleSaveHandoverEnd}
            disabled={endingSave}
          >
            {endingSave ? "Se salvează..." : "Salvează predarea"}
          </button>

          <button
            className="button button-danger"
            onClick={handleEndSession}
            disabled={endingSession}
          >
            {endingSession ? "Se închide..." : "Închide sesiunea"}
          </button>
        </div>

        {endSaveMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#e8f5e9",
              border: "1px solid #b7dfb9",
              borderRadius: "8px",
            }}
          >
            {endSaveMessage}
          </div>
        )}

        {endSaveError && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#ffe5e5",
              border: "1px solid #ffb3b3",
              borderRadius: "8px",
            }}
          >
            {endSaveError}
          </div>
        )}

        {endSessionMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#e8f5e9",
              border: "1px solid #b7dfb9",
              borderRadius: "8px",
            }}
          >
            {endSessionMessage}
          </div>
        )}

        {endSessionError && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background: "#ffe5e5",
              border: "1px solid #ffb3b3",
              borderRadius: "8px",
            }}
          >
            {endSessionError}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionPage;