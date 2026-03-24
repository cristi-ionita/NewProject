import { Navigate, Route, Routes } from "react-router-dom";
import LanguageSwitcher from "./components/LanguageSwitcher";

import LoginPage from "./pages/LoginPage";
import UserHomePage from "./pages/UserHomePage";
import SelectVehiclePage from "./pages/SelectVehiclePage";
import SessionPage from "./pages/SessionPage";
import VehicleHistoryPage from "./pages/VehicleHistoryPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminVehiclesPage from "./pages/AdminVehiclesPage";
import UserPickupPage from "./pages/UserPickupPage";
import UserReturnPage from "./pages/UserReturnPage";
import AdminVehicleIssuesPage from "./pages/AdminVehicleIssuesPage";

import GuestRoute from "./routes/GuestRoute";
import UserRoute from "./routes/UserRoute";
import AdminRoute from "./routes/AdminRoute";

function App() {
  return (
    <div>
      {/* 🌍 Language Switcher centrat sus */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#ffffff",
          padding: "8px 12px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <LanguageSwitcher />
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          path="/user"
          element={
            <UserRoute>
              <UserHomePage />
            </UserRoute>
          }
        />

        <Route
          path="/vehicles"
          element={
            <UserRoute>
              <SelectVehiclePage />
            </UserRoute>
          }
        />

        <Route
          path="/vehicles/:vehicleId/pickup"
          element={
            <UserRoute>
              <UserPickupPage />
            </UserRoute>
          }
        />

        <Route
          path="/user/return-vehicle"
          element={
            <UserRoute>
              <UserReturnPage />
            </UserRoute>
          }
        />

        <Route
          path="/session/:assignmentId"
          element={
            <UserRoute>
              <SessionPage />
            </UserRoute>
          }
        />

        <Route
          path="/vehicles/:vehicleId/history"
          element={
            <UserRoute>
              <VehicleHistoryPage />
            </UserRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/vehicles"
          element={
            <AdminRoute>
              <AdminVehiclesPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/vehicle-issues"
          element={
            <AdminRoute>
              <AdminVehicleIssuesPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;