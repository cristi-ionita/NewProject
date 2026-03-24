import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type UserItem = {
  id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
  is_active: boolean;
};

function AdminUsersPage() {
  const [fullName, setFullName] = useState("");
  const [shiftNumber, setShiftNumber] = useState("");
  const [pin, setPin] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();

  const getHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      "X-Admin-Token": token || "",
    };
  };

  const fetchUsers = async () => {
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/users", {
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
            : t("couldNotLoadUsers")
        );
        return;
      }

      setUsers(data);
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

    fetchUsers();
  }, [navigate]);

  const resetForm = () => {
    setFullName("");
    setShiftNumber("");
    setPin("");
    setIsActive(true);
    setEditingUserId(null);
  };

  const handleCreateOrUpdateUser = async () => {
    setError("");
    setSuccess("");

    if (!fullName.trim() || !shiftNumber.trim()) {
      setError(t("fillNameAndShift"));
      return;
    }

    if (!editingUserId && !pin.trim()) {
      setError(t("pinRequiredOnCreate"));
      return;
    }

    try {
      const isEditing = editingUserId !== null;
      const url = isEditing
        ? `http://127.0.0.1:8000/api/v1/users/${editingUserId}`
        : "http://127.0.0.1:8000/api/v1/users";

      const method = isEditing ? "PUT" : "POST";

      const body = isEditing
        ? {
            full_name: fullName,
            shift_number: shiftNumber,
            pin: pin.trim() || undefined,
            is_active: isActive,
          }
        : {
            full_name: fullName,
            shift_number: shiftNumber,
            pin,
          };

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
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
            : t("couldNotSaveUser")
        );
        return;
      }

      setSuccess(
        editingUserId ? t("userUpdatedSuccessfully") : t("userCreatedSuccessfully")
      );

      resetForm();
      fetchUsers();
    } catch {
      setError(t("backendConnectionError"));
    }
  };

  const handleEditUser = (user: UserItem) => {
    setError("");
    setSuccess("");
    setEditingUserId(user.id);
    setFullName(user.full_name);
    setShiftNumber(user.shift_number ?? "");
    setPin("");
    setIsActive(user.is_active);
  };

  const handleDeactivateUser = async (userId: number) => {
    const confirmed = window.confirm(t("confirmDeactivateUser"));

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/users/${userId}/deactivate`,
        {
          method: "PATCH",
          headers: getHeaders(),
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
            : t("couldNotDeactivateUser")
        );
        return;
      }

      setSuccess(t("userDeactivated"));
      if (editingUserId === userId) {
        resetForm();
      }
      fetchUsers();
    } catch {
      setError(t("backendConnectionError"));
    }
  };

  const handleActivateUser = async (userId: number) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/users/${userId}/activate`,
        {
          method: "PATCH",
          headers: getHeaders(),
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
            : t("couldNotReactivateUser")
        );
        return;
      }

      setSuccess(t("userReactivated"));
      fetchUsers();
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
            <h1 style={{ margin: 0 }}>{t("adminUsersTitle")}</h1>
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
          <h3 style={{ marginTop: 0 }}>
            {editingUserId ? t("editUser") : t("createUser")}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <input
              placeholder={t("fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />

            <input
              placeholder={t("shiftNumber")}
              value={shiftNumber}
              onChange={(e) => setShiftNumber(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />

            <input
              placeholder={
                editingUserId ? t("newPinOptional") : t("pin4Digits")
              }
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />

            <button
              onClick={handleCreateOrUpdateUser}
              style={{
                background: "#4CAF50",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {editingUserId ? t("save") : t("create")}
            </button>
          </div>

          {editingUserId && (
            <div style={{ marginTop: "12px" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {t("activeUser")}
              </label>

              <button
                onClick={resetForm}
                style={{
                  marginLeft: "12px",
                  background: "#eee",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
            </div>
          )}

          {error && <p style={{ color: "red", marginTop: "12px" }}>{error}</p>}
          {success && (
            <p style={{ color: "green", marginTop: "12px" }}>{success}</p>
          )}
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                opacity: u.is_active ? 1 : 0.65,
              }}
            >
              <div>
                <strong style={{ fontSize: "18px" }}>
                  {t("shift")} {u.shift_number ?? "-"}
                </strong>
                <div
                  style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}
                >
                  {u.full_name} • {u.is_active ? t("active") : t("inactive")}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleEditUser(u)}
                  style={{
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  {t("edit")}
                </button>

                {u.is_active ? (
                  <button
                    onClick={() => handleDeactivateUser(u.id)}
                    style={{
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    {t("deactivate")}
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivateUser(u.id)}
                    style={{
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    {t("activate")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;