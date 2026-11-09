import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { initials } from "../constants/roles";
import { getActivityLog } from "../services/api";

// =========================================================
// ACTION BADGES
// =========================================================
const actionConfig = {
  LOGIN: { label: "Login", icon: "🔑", className: "indigo" },
  REGISTER: { label: "Registered", icon: "✨", className: "green" },
  PROFILE_UPDATE: { label: "Profile Updated", icon: "✏️", className: "cyan" },
  PASSWORD_CHANGE: { label: "Password Changed", icon: "🔒", className: "amber" },
  PASSWORD_RESET: { label: "Password Reset", icon: "🔑", className: "amber" },
  EMAIL_VERIFIED: { label: "Email Verified", icon: "✉️", className: "green" },
  HOSTEL_CREATED: { label: "Hostel Created", icon: "🏢", className: "indigo" },
  HOSTEL_ACTIVATED: { label: "Hostel Activated", icon: "✅", className: "green" },
  HOSTEL_SUSPENDED: { label: "Hostel Suspended", icon: "⛔", className: "red" },
  HOSTEL_TRIAL: { label: "Set to Free Trial", icon: "⏳", className: "amber" },
  USER_CREATED: { label: "User Added", icon: "➕", className: "indigo" },
  USER_ACTIVATED: { label: "User Activated", icon: "✅", className: "green" },
  USER_DEACTIVATED: { label: "User Deactivated", icon: "⛔", className: "red" },
  BRANCH_CREATED: { label: "Branch Added", icon: "🏠", className: "green" },
  BRANCH_UPDATED: { label: "Branch Updated", icon: "✏️", className: "cyan" },
  BRANCH_DELETED: { label: "Branch Deleted", icon: "🗑️", className: "red" },
  FLOOR_CREATED: { label: "Floor Added", icon: "🏢", className: "green" },
  FLOOR_DELETED: { label: "Floor Deleted", icon: "🗑️", className: "red" },
  ROOM_CREATED: { label: "Room Added", icon: "🚪", className: "green" },
  ROOM_UPDATED: { label: "Room Updated", icon: "✏️", className: "cyan" },
  ROOM_DELETED: { label: "Room Deleted", icon: "🗑️", className: "red" },
  ROOM_STATUS: { label: "Room Status", icon: "🔄", className: "amber" },
  BED_ADDED: { label: "Bed Added", icon: "🛏️", className: "green" },
  BED_DELETED: { label: "Bed Removed", icon: "🗑️", className: "red" },
  BED_STATUS: { label: "Bed Status", icon: "🔄", className: "amber" },
  ROOM_TYPE_CREATED: { label: "Room Type Added", icon: "🏷️", className: "green" },
  ROOM_TYPE_UPDATED: { label: "Room Type Updated", icon: "✏️", className: "cyan" },
  ROOM_TYPE_DELETED: { label: "Room Type Deleted", icon: "🗑️", className: "red" },
  RENT_UPDATED: { label: "Rent Changed", icon: "💰", className: "indigo" },
};

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

// =========================================================
// ACTIVITY LOG PAGE
// =========================================================
export default function Activity() {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityLog()
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err.message || "Could not load activity log"))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs =
    actionFilter === "all" ? logs : logs.filter((l) => l.action === actionFilter);

  return (
    <DashboardLayout title="Activity Log">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">
            Who did what, and when · latest {logs.length} events
          </p>
        </div>
        <select
          className="select"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All actions</option>
          {Object.entries(actionConfig).map(([key, a]) => (
            <option key={key} value={key}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="table-empty">Loading activity...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="4" className="table-empty">No activity found.</td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const a = actionConfig[log.action] || {
                  label: log.action,
                  icon: "•",
                  className: "indigo",
                };
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="avatar-group">
                        <div className="avatar avatar-soft">
                          {log.full_name ? initials(log.full_name) : "?"}
                        </div>
                        <div>
                          <div className="cell-title">
                            {log.full_name || "Deleted user"}
                          </div>
                          <div className="cell-sub">{log.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${a.className}`}>
                        {a.icon} {a.label}
                      </span>
                    </td>
                    <td className="cell-muted">{log.details || "—"}</td>
                    <td>
                      <div className="cell-title">{timeAgo(log.created_at)}</div>
                      <div className="cell-sub">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
