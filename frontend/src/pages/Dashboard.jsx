import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { roleConfig } from "../constants/roles";
import { getUser, getUserStats } from "../services/api";

// =========================================================
// ROLE CONTENT
// =========================================================
const roleContent = {
  admin: {
    showStats: true,
    quickActions: [
      { icon: "➕", text: "Add a user (admin, warden or staff)", path: "/users?add=1" },
      { icon: "🏠", text: "Set up branches, floors, rooms and beds", path: "/rooms" },
      { icon: "🏷️", text: "Room types and rent packages", path: "/room-types" },
      { icon: "📋", text: "Floor-wise availability", path: "/availability" },
      { icon: "🕒", text: "View activity log", path: "/activity" },
    ],
    upcoming: [
      { icon: "🛏️", text: "Assign residents to beds (check-in / check-out)" },
      { icon: "💳", text: "Onboard residents and record payments" },
      { icon: "💬", text: "Track and assign complaints" },
    ],
  },
  warden: {
    showStats: true,
    quickActions: [
      { icon: "➕", text: "Add a staff member", path: "/users?add=1" },
      { icon: "🏠", text: "Update room and bed status", path: "/rooms" },
      { icon: "📋", text: "Floor-wise availability", path: "/availability" },
      { icon: "🔧", text: "View staff", path: "/users" },
    ],
    upcoming: [
      { icon: "🛏️", text: "Assign residents to vacant beds" },
      { icon: "💳", text: "Collect rent and track outstanding dues" },
      { icon: "💬", text: "Review and assign resident complaints" },
    ],
  },
  staff: {
    showStats: false,
    quickActions: [{ icon: "👤", text: "Edit my profile", path: "/profile" }],
    upcoming: [
      { icon: "💬", text: "Pick up complaints assigned to you" },
      { icon: "🔧", text: "Update maintenance task status" },
    ],
  },
  resident: {
    showStats: false,
    quickActions: [{ icon: "👤", text: "Edit my profile", path: "/profile" }],
    upcoming: [
      { icon: "🏠", text: "View your room, bed and dues" },
      { icon: "📝", text: "Submit complaints and maintenance requests" },
      { icon: "🤝", text: "Fill the roommate preference questionnaire" },
    ],
  },
};

// =========================================================
// DASHBOARD PAGE
// =========================================================
export default function Dashboard() {
  const navigate = useNavigate();

  const [user] = useState(getUser());
  const [stats, setStats] = useState(null);

  const roleLabel = roleConfig[user?.role]?.label || "Resident";
  const content = roleContent[user?.role] || roleContent.resident;

  // Stats are only shown to admin / warden
  useEffect(() => {
    if (!content.showStats) return;
    getUserStats()
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [content.showStats]);

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const kpis = [
    { title: "Total Accounts", value: stats?.total, icon: "👥", color: "blue", role: "all" },
    ...(isAdmin
      ? [
          {
            title: "Admins",
            value: stats?.counts?.admin,
            icon: "🛡️",
            color: "rose",
            role: "admin",
          },
        ]
      : []),
    { title: "Wardens", value: stats?.counts?.warden, icon: "🏢", color: "amber", role: "warden" },
    { title: "Staff", value: stats?.counts?.staff, icon: "🔧", color: "cyan", role: "staff" },
    {
      title: "Residents",
      value: stats?.counts?.resident,
      icon: "🏡",
      color: "emerald",
      role: "resident",
    },
  ];

  return (
    <DashboardLayout title="Overview">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user.full_name.split(" ")[0]}</h1>
          <p className="page-subtitle">
            Signed in as <strong>{roleLabel}</strong> at <strong>{user.hostel_name}</strong>{" "}
            · {user.email}
          </p>
        </div>
        <span className="badge indigo">
          <span className="dot" />
          {roleLabel}
        </span>
      </div>

      {/* Hostel code: residents need it to sign up */}
      {content.showStats && (
        <div className="bento-card mb-6 code-card">
          <div>
            <div className="card-title">Resident sign-up code</div>
            <p className="card-text form-intro">
              Share this code with new residents. They enter it on the Sign Up page to
              join {user.hostel_name}.
            </p>
          </div>
          <div className="code-value">{user.hostel_code}</div>
        </div>
      )}

      {/* KPI Cards (admin / warden) or Profile (staff / resident) */}
      {content.showStats ? (
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div
              key={k.title}
              className={`kpi ${isAdmin ? "clickable" : ""}`}
              onClick={
                isAdmin
                  ? () => navigate(k.role === "all" ? "/users" : `/users?role=${k.role}`)
                  : undefined
              }
            >
              <div className="kpi-top">
                <div className="kpi-title">{k.title}</div>
                <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
              </div>
              <div className="kpi-value">{k.value ?? "—"}</div>
              {isAdmin && (
                <div className="kpi-link">
                  View {k.role === "all" ? "all users" : k.title.toLowerCase()} →
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bento-card mb-6">
          <div className="card-header">
            <div className="card-title">Your Profile</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/profile")}
            >
              Edit Profile
            </button>
          </div>
          <div className="profile-grid">
            <div>
              <div className="profile-label">Full Name</div>
              <div className="profile-value">{user.full_name}</div>
            </div>
            <div>
              <div className="profile-label">Email</div>
              <div className="profile-value">{user.email}</div>
            </div>
            <div>
              <div className="profile-label">Phone</div>
              <div className="profile-value">{user.phone || "Not set"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bento bento-even">
        {/* Quick Actions */}
        <div className="bento-card align-start">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>
          {content.quickActions.map((a) => (
            <button
              key={a.text}
              className="task-row action"
              onClick={() => navigate(a.path)}
            >
              <div className="task-icon">{a.icon}</div>
              <div className="task-text">{a.text}</div>
              <span className="task-arrow">→</span>
            </button>
          ))}
        </div>

        {/* Coming Up Next */}
        <div className="bento-card align-start">
          <div className="card-header">
            <div className="card-title">Coming Up Next</div>
          </div>
          {content.upcoming.map((item) => (
            <div key={item.text} className="task-row">
              <div className="task-icon">{item.icon}</div>
              <div className="task-text">{item.text}</div>
              <span className="badge amber">Soon</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
