import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type VehicleItem = {
  id: number;
  brand: string;
  model: string;
  license_plate: string;
  year: number;
  vin: string | null;
  status: string;
  current_mileage: number;
};

function AdminVehiclesPage() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingVehicleId, setUpdatingVehicleId] = useState<number | null>(null);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const getHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      "X-Admin-Token": token || "",
    };
  };

  const fetchVehicles = async () => {
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/vehicles", {
        headers: getHeaders(),
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : t("couldNotLoadVehicles")
        );
        return;
      }

      setVehicles(data);
    } catch {
      setError(t("backendConnectionError"));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/");
      return;
    }

    fetchVehicles();
  }, [navigate]);

  const resetForm = () => {
    setBrand("");
    setModel("");
    setLicensePlate("");
    setYear("");
    setVin("");
    setCurrentMileage("");
  };

  const getVehicleStatusLabel = (status: string) => {
    if (status === "active") return t("vehicleActive");
    if (status === "in_service") return t("vehicleInService");
    if (status === "inactive") return t("vehicleInactive");
    return status;
  };

  const handleCreateVehicle = async () => {
    setError("");
    setSuccess("");

    if (
      !brand.trim() ||
      !model.trim() ||
      !licensePlate.trim() ||
      !year.trim() ||
      !currentMileage.trim()
    ) {
      setError(t("fillAllRequiredFields"));
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/vehicles", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          brand,
          model,
          license_plate: licensePlate,
          year: Number(year),
          vin: vin.trim() || null,
          status: "active",
          current_mileage: Number(currentMileage),
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : t("couldNotCreateVehicle")
        );
        return;
      }

      setSuccess(t("vehicleCreatedSuccessfully"));
      resetForm();
      fetchVehicles();
    } catch {
      setError(t("backendConnectionError"));
    }
  };

  const handleUpdateStatus = async (vehicleId: number, newStatus: string) => {
    setError("");
    setSuccess("");
    setUpdatingVehicleId(vehicleId);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/vehicles/${vehicleId}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : t("couldNotUpdateVehicleStatus")
        );
        return;
      }

      setSuccess(t("vehicleStatusUpdated"));
      fetchVehicles();
    } catch {
      setError(t("backendConnectionError"));
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    const confirmed = window.confirm(t("confirmDeleteVehicle"));

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/vehicles/${vehicleId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/");
        return;
      }

      if (response.status === 204) {
        setSuccess(t("vehicleDeleted"));
        fetchVehicles();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : t("couldNotDeleteVehicle")
        );
        return;
      }

      setSuccess(t("vehicleDeleted"));
      fetchVehicles();
    } catch {
      setError(t("backendConnectionError"));
    }
  };

  const handleLogoutAdmin = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
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
            <h1 style={{ margin: 0 }}>{t("adminVehiclesTitle")}</h1>
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
            padding: "24px",
            borderRadius: "12px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>{t("createVehicle")}</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
            }}
          >
            <input
              placeholder={t("brand")}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <input
              placeholder={t("model")}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <input
              placeholder={t("licensePlate")}
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <input
              placeholder={t("year")}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <input
              placeholder={t("vinOptional")}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <input
              placeholder={t("mileage")}
              value={currentMileage}
              onChange={(e) => setCurrentMileage(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
            />

            <button
              onClick={handleCreateVehicle}
              style={{
                background: "#4CAF50",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {t("create")}
            </button>
          </div>

          {error && <p style={{ color: "red", marginTop: "12px" }}>{error}</p>}
          {success && (
            <p style={{ color: "green", marginTop: "12px" }}>{success}</p>
          )}
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <strong>
                  {vehicle.license_plate} — {vehicle.brand} {vehicle.model}
                </strong>
                <div style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>
                  {t("year")} {vehicle.year} • {vehicle.current_mileage} km
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <select
                  value={vehicle.status}
                  onChange={(e) =>
                    handleUpdateStatus(vehicle.id, e.target.value)
                  }
                  disabled={updatingVehicleId === vehicle.id}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="active">{t("vehicleActive")}</option>
                  <option value="in_service">{t("vehicleInService")}</option>
                  <option value="inactive">{t("vehicleInactive")}</option>
                </select>

                <button
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                  style={{
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminVehiclesPage;