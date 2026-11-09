import { Navigate, useLocation } from "react-router-dom";
import { homePath } from "../constants/roles";
import { getToken, getUser } from "../services/api";

// =========================================================
// PROTECTED ROUTE
// `roles` is optional; when given, only those roles may open the page.
// The backend enforces the same rules, so this only improves navigation.
// =========================================================
export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const user = getUser();

  if (!getToken() || !user) {
    return <Navigate to="/login" replace />;
  }

  // A temporary password must be changed before anything else.
  if (user.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath(user)} replace />;
  }

  return children;
}
