import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const returnToSessionId = location.state?.returnToSessionId as
    | number
    | undefined;

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
          throw new Error(json.detail || t("genericError"));
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
  }, [vehicleId, navigate, userCode, t]);

  if (loading) {
    return <div className="container">{t("loadingHistory")}</div>;
  }

  if (error) {
    return (
      <div className="container">
        {t("error")}: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="container">{t("noData")}</div>;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: "20px" }}>
        {returnToSessionId ? (
          <Link
            to={`/session/${returnToSessionId}`}
            style={{ textDecoration: "none" }}
          >
            ← {t("backToCurrentSession")}
          </Link>
        ) : (
          <span>{t("vehicleHistory")}</span>
        )}
      </div>

      <h1>{t("vehicleHistory")}</h1>
      <p>
        <strong>{t("vehicleId")}:</strong> {data.vehicle_id}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {data.history.map((item) => (
          <div key={item.assignment_id} className="card">
            <h2>
              {t("session")} #{item.assignment_id}
            </h2>

            <p>
              <strong>{t("driver")}:</strong> {item.driver_name}
            </p>
            <p>
              <strong>{t("start")}:</strong> {item.started_at}
            </p>
            <p>
              <strong>{t("end")}:</strong> {item.ended_at ?? "-"}
            </p>

            <hr />

            <p>
              <strong>{t("pickupMileage")}:</strong> {item.mileage_start ?? "-"}
            </p>
            <p>
              <strong>{t("returnMileageHistory")}:</strong>{" "}
              {item.mileage_end ?? "-"}
            </p>

            <p>
              <strong>{t("dashboardWarningsPickup")}:</strong>{" "}
              {item.dashboard_warnings_start ?? "-"}
            </p>
            <p>
              <strong>{t("dashboardWarningsReturnHistory")}:</strong>{" "}
              {item.dashboard_warnings_end ?? "-"}
            </p>

            <p>
              <strong>{t("damagePickup")}:</strong>{" "}
              {item.damage_notes_start ?? "-"}
            </p>
            <p>
              <strong>{t("damageReturn")}:</strong>{" "}
              {item.damage_notes_end ?? "-"}
            </p>

            <p>
              <strong>{t("notesPickup")}:</strong> {item.notes_start ?? "-"}
            </p>
            <p>
              <strong>{t("notesReturnHistory")}:</strong>{" "}
              {item.notes_end ?? "-"}
            </p>

            <hr />

            <p>
              <strong>{t("documents")}:</strong>{" "}
              {item.has_documents ? t("yes") : t("no")}
            </p>
            <p>
              <strong>{t("medicalKit")}:</strong>{" "}
              {item.has_medkit ? t("yes") : t("no")}
            </p>
            <p>
              <strong>{t("fireExtinguisher")}:</strong>{" "}
              {item.has_extinguisher ? t("yes") : t("no")}
            </p>
            <p>
              <strong>{t("warningTriangle")}:</strong>{" "}
              {item.has_warning_triangle ? t("yes") : t("no")}
            </p>
            <p>
              <strong>{t("spareWheel")}:</strong>{" "}
              {item.has_spare_wheel ? t("yes") : t("no")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VehicleHistoryPage;