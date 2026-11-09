// =========================================================
// ROLE NAVIGATION
// Items with a `path` are built; items without one are "Soon".
// =========================================================
export const roleConfig = {
  super_admin: {
    label: "SmartStay Super Admin",
    nav: [
      { label: "Hostels", icon: "🏢", path: "/platform" },
      { label: "My Profile", icon: "👤", path: "/profile" },
    ],
  },
  admin: {
    label: "Administrator",
    nav: [
      { label: "Overview", icon: "📊", path: "/dashboard" },
      { label: "Users & Roles", icon: "🛡️", path: "/users" },
      { label: "Branches & Rooms", icon: "🏠", path: "/rooms" },
      { label: "Room Types & Rent", icon: "🏷️", path: "/room-types" },
      { label: "Availability", icon: "📋", path: "/availability" },
      { label: "Activity Log", icon: "🕒", path: "/activity" },
      { label: "My Profile", icon: "👤", path: "/profile" },
      { label: "Residents", icon: "👥" },
      { label: "Payments", icon: "💳" },
      { label: "Complaints", icon: "💬" },
    ],
  },
  warden: {
    label: "Warden / Manager",
    nav: [
      { label: "Overview", icon: "📊", path: "/dashboard" },
      { label: "Staff", icon: "🔧", path: "/users" },
      { label: "Rooms & Beds", icon: "🏠", path: "/rooms" },
      { label: "Room Types & Rent", icon: "🏷️", path: "/room-types" },
      { label: "Availability", icon: "📋", path: "/availability" },
      { label: "My Profile", icon: "👤", path: "/profile" },
      { label: "Residents", icon: "👥" },
      { label: "Payments", icon: "💳" },
      { label: "Complaints", icon: "💬" },
    ],
  },
  staff: {
    label: "Staff",
    nav: [
      { label: "Overview", icon: "📊", path: "/dashboard" },
      { label: "My Profile", icon: "👤", path: "/profile" },
      { label: "Complaints Queue", icon: "💬" },
      { label: "Maintenance Tasks", icon: "🔧" },
    ],
  },
  resident: {
    label: "Resident",
    nav: [
      { label: "Overview", icon: "📊", path: "/dashboard" },
      { label: "My Profile", icon: "👤", path: "/profile" },
      { label: "My Room", icon: "🏠" },
      { label: "My Payments", icon: "💳" },
      { label: "My Complaints", icon: "📝" },
    ],
  },
};

// Where a user should land after logging in.
export const homePath = (user) => {
  if (!user) return "/login";
  if (user.must_change_password) return "/change-password";
  if (user.role === "super_admin") return "/platform";
  return "/dashboard";
};

export const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
