import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h1 style={{ margin: 0 }}>{t("adminDashboard")}</h1>

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
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          <button
            onClick={() => navigate("/admin/users")}
            style={{
              background: "#fff",
              border: "none",
              padding: "40px 20px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {t("createUsers")}
          </button>

          <button
            onClick={() => navigate("/admin/vehicle-issues")}
            style={{
              background: "#fff",
              border: "none",
              padding: "40px 20px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {t("vehicleIssues")}
          </button>

          <button
            onClick={() => navigate("/admin/vehicles")}
            style={{
              background: "#fff",
              border: "none",
              padding: "40px 20px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {t("createVehicles")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;