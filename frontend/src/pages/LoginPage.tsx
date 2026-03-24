import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type UserOption = {
  id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
};

type LoginResponse = {
  user_id: number;
  full_name: string;
  shift_number: string | null;
  unique_code: string;
};

type ErrorResponse = {
  detail?: string;
};

type AdminLoginResponse = {
  token: string;
};

function LoginPage() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [pin, setPin] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    const authUserCode = localStorage.getItem("authUserCode");

    if (adminToken) {
      navigate("/admin", { replace: true });
      return;
    }

    if (authUserCode) {
      navigate("/user", { replace: true });
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/users?active_only=true"
        );
        const data = await response.json();

        if (!response.ok) {
          setError(t("couldNotLoadUsers"));
          return;
        }

        setUsers(data);
      } catch {
        setError(t("backendConnectionError"));
      }
    };

    fetchUsers();
  }, [navigate, t]);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      if (!selectedValue) {
        setError(t("selectUser"));
        return;
      }

      if (selectedValue === "admin") {
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/auth/admin-login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: adminPassword,
            }),
          }
        );

        const data: AdminLoginResponse | ErrorResponse = await response.json();

        if (!response.ok) {
          if ("detail" in data && typeof data.detail === "string") {
            setError(data.detail);
          } else {
            setError(t("wrongAdminPassword"));
          }
          return;
        }

        if ("token" in data) {
          localStorage.setItem("adminToken", data.token);
          localStorage.removeItem("authUserCode");
          localStorage.removeItem("authUserName");
          localStorage.removeItem("authShiftNumber");
          navigate("/admin", { replace: true });
        }

        return;
      }

      if (!pin.trim()) {
        setError(t("enterPin"));
        return;
      }

      const selectedUser = users.find((u) => u.unique_code === selectedValue);

      if (!selectedUser) {
        setError(t("invalidUser"));
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unique_code: selectedUser.unique_code,
            pin: pin,
          }),
        }
      );

      const data: LoginResponse | ErrorResponse = await response.json();

      if (!response.ok) {
        if ("detail" in data && typeof data.detail === "string") {
          setError(data.detail);
        } else {
          setError(t("loginFailed"));
        }
        return;
      }

      if ("unique_code" in data) {
        localStorage.setItem("authUserCode", data.unique_code);
        localStorage.setItem("authUserName", data.full_name);
        localStorage.setItem("authShiftNumber", data.shift_number ?? "");
        localStorage.removeItem("adminToken");
        navigate("/user", { replace: true });
      }
    } catch {
      setError(t("backendConnectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f6f8",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "10px",
          width: "400px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          {t("login")}
        </h2>

        <select
          value={selectedValue}
          onChange={(e) => {
            setSelectedValue(e.target.value);
            setError("");
          }}
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
        >
          <option value="">{t("selectUserOption")}</option>
          <option value="admin">{t("admin")}</option>

          {users.map((u) => (
            <option key={u.unique_code} value={u.unique_code}>
              {u.full_name} - {t("shift")} {u.shift_number}
            </option>
          ))}
        </select>

        {selectedValue === "admin" ? (
          <input
            type="password"
            placeholder={t("adminPassword")}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          />
        ) : (
          selectedValue && (
            <input
              type="password"
              placeholder={t("pinPlaceholder")}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", padding: "10px", marginTop: "10px" }}
            />
          )
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "10px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {loading ? t("connecting") : t("login")}
        </button>

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;