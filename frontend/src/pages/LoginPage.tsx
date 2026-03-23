import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/users?active_only=true"
        );
        const data = await response.json();

        if (!response.ok) {
          setError("Nu am putut încărca utilizatorii.");
          return;
        }

        setUsers(data);
      } catch {
        setError("Nu mă pot conecta la backend.");
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      if (!selectedValue) {
        setError("Selectează utilizatorul.");
        return;
      }

      // ADMIN LOGIN
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

        const data: AdminLoginResponse | ErrorResponse =
          await response.json();

        if (!response.ok) {
          if ("detail" in data && typeof data.detail === "string") {
            setError(data.detail);
          } else {
            setError("Parola admin greșită.");
          }
          return;
        }

        if ("token" in data) {
          localStorage.setItem("adminToken", data.token);
          localStorage.removeItem("authUserCode");
          localStorage.removeItem("authUserName");
          localStorage.removeItem("authShiftNumber");
          navigate("/admin/users");
        }

        return;
      }

      // USER LOGIN
      if (!pin.trim()) {
        setError("Introdu PIN-ul.");
        return;
      }

      const selectedUser = users.find(
        (u) => u.unique_code === selectedValue
      );

      if (!selectedUser) {
        setError("Utilizator invalid.");
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
          setError("Autentificare eșuată.");
        }
        return;
      }

      if ("unique_code" in data) {
        localStorage.setItem("authUserCode", data.unique_code);
        localStorage.setItem("authUserName", data.full_name);
        localStorage.setItem("authShiftNumber", data.shift_number ?? "");
        localStorage.removeItem("adminToken");
        navigate("/select-vehicle");
      }
    } catch {
      setError("Nu mă pot conecta la backend.");
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
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>

        <select
          value={selectedValue}
          onChange={(e) => {
            setSelectedValue(e.target.value);
            setError("");
          }}
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
        >
          <option value="">Selectează utilizator</option>
          <option value="admin">Admin</option>

          {users.map((u) => (
            <option key={u.unique_code} value={u.unique_code}>
              {u.full_name} - Tura {u.shift_number}
            </option>
          ))}
        </select>

        {selectedValue === "admin" ? (
          <input
            type="password"
            placeholder="Parola admin"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          />
        ) : (
          selectedValue && (
            <input
              type="password"
              placeholder="PIN (4 cifre)"
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
          {loading ? "Se conectează..." : "Login"}
        </button>

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>{error}</p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;