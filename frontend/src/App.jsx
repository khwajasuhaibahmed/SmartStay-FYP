import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { homePath } from "./constants/roles";
import Activity from "./pages/Activity";
import Availability from "./pages/Availability";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import Platform from "./pages/Platform";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Rooms from "./pages/Rooms";
import RoomTypes from "./pages/RoomTypes";
import Setup from "./pages/Setup";
import Users from "./pages/Users";
import VerifyEmail from "./pages/VerifyEmail";
import { getUser } from "./services/api";

const HOSTEL_ROLES = ["admin", "warden", "staff", "resident"];

// =========================================================
// APP ROUTES
// =========================================================
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup" element={<Setup />} />

      {/* Any logged-in user */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Hostel users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={HOSTEL_ROLES}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin: Users & Roles · Warden: Staff */}
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={["admin", "warden"]}>
            <Users />
          </ProtectedRoute>
        }
      />

      {/* Hostel & Room Management: Admin sets up, Warden views + updates status */}
      <Route
        path="/rooms"
        element={
          <ProtectedRoute roles={["admin", "warden"]}>
            <Rooms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room-types"
        element={
          <ProtectedRoute roles={["admin", "warden"]}>
            <RoomTypes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/availability"
        element={
          <ProtectedRoute roles={["admin", "warden"]}>
            <Availability />
          </ProtectedRoute>
        }
      />

      {/* Hostel Admin only */}
      <Route
        path="/activity"
        element={
          <ProtectedRoute roles={["admin"]}>
            <Activity />
          </ProtectedRoute>
        }
      />

      {/* SmartStay Super Admin only */}
      <Route
        path="/platform"
        element={
          <ProtectedRoute roles={["super_admin"]}>
            <Platform />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={homePath(getUser())} replace />} />
    </Routes>
  );
}
