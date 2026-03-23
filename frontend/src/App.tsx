import { Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SelectVehiclePage from "./pages/SelectVehiclePage";
import SessionPage from "./pages/SessionPage";
import VehicleHistoryPage from "./pages/VehicleHistoryPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/select-vehicle" element={<SelectVehiclePage />} />
      <Route path="/session/:assignmentId" element={<SessionPage />} />
      <Route
        path="/vehicles/:vehicleId/history"
        element={<VehicleHistoryPage />}
      />

      {/* ADMIN */}
      <Route path="/admin/users" element={<AdminUsersPage />} />
    </Routes>
  );
}

export default App;