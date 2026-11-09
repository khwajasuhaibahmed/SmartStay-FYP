import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { initials, roleConfig } from "../constants/roles";
import { clearSession, getMe, getUser, saveUser } from "../services/api";
import "../styles/dashboard.css";

// =========================================================
// DASHBOARD LAYOUT
// =========================================================
export default function DashboardLayout({ title, children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(getUser());

  const currentRole = roleConfig[user?.role] || roleConfig.resident;

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  // Refresh the logged-in user from the server; log out if deactivated
  useEffect(() => {
    getMe()
      .then((data) => saveUser(data.user))
      .catch(() => handleLogout());
  }, []);

  // Keep the sidebar in sync when the profile is updated
  useEffect(() => {
    const onUserUpdated = () => setUser(getUser());
    window.addEventListener("smartstay-user-updated", onUserUpdated);
    return () => window.removeEventListener("smartstay-user-updated", onUserUpdated);
  }, []);

  if (!user) return null;

  return (
    <div className="dash-page" data-theme={user.role}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sb-header">
          <Logo />
          <div className="sb-brand">SmartStay</div>
        </div>

        {/* Which hostel this user belongs to (Super Admin: the whole platform) */}
        <div className="sb-workspace">
          <div className="sb-ws-avatar">
            {user.role === "super_admin" ? "S" : initials(user.hostel_name || "H")}
          </div>
          <div className="sb-ws-info">
            <div className="sb-ws-name">
              {user.role === "super_admin" ? "SmartStay Platform" : user.hostel_name}
            </div>
            <div className="sb-ws-role">
              {user.role === "super_admin" ? "All hostels" : `Code: ${user.hostel_code}`}
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-label">Workspace</div>
          {currentRole.nav.map((item) =>
            item.path ? (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `sb-item ${isActive ? "active" : ""}`}
              >
                <span className="sb-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ) : (
              <div
                key={item.label}
                className="sb-item disabled"
                title="Coming in the next module"
              >
                <span className="sb-icon">{item.icon}</span>
                {item.label}
                <span className="sb-soon">Soon</span>
              </div>
            ),
          )}
        </nav>

        <div className="sb-footer">
          <NavLink to="/profile" className="sb-user">
            <div className="sb-avatar">{initials(user.full_name)}</div>
            <div className="sb-info">
              <div className="sb-name">{user.full_name}</div>
              <div className="sb-role">{currentRole.label}</div>
            </div>
          </NavLink>
          <button className="btn btn-secondary btn-sm sb-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>SmartStay</span> <span>/</span>{" "}
            <span className="current">{title}</span>
          </div>
          <div className="topbar-date">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        <div className="page-content">
          <div className="stage">{children}</div>
        </div>
      </main>
    </div>
  );
}
