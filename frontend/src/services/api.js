const API_URL = "/api";

const TOKEN_KEY = "smartstay_token";
const USER_KEY = "smartstay_user";

// =========================================================
// REQUEST HELPER
// =========================================================
async function request(path, { method = "GET", body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.message || data.errors?.[0]?.msg || "Something went wrong";
    const error = new Error(message);
    error.status = res.status;
    error.code = data.code;
    error.wait = data.wait;
    throw error;
  }

  return data;
}

// =========================================================
// AUTH
// =========================================================
export function loginUser({ email, password }) {
  return request("/auth/login", { method: "POST", body: { email, password } });
}

export function registerUser({ fullName, email, phone, password, hostelCode }) {
  return request("/auth/register", {
    method: "POST",
    body: { fullName, email, phone, password, hostelCode },
  });
}

// =========================================================
// FIRST-TIME SETUP (creates the first Super Admin)
// =========================================================
export function getSetupStatus() {
  return request("/setup/status");
}

export function runSetup({ setupKey, fullName, email, password }) {
  return request("/setup", {
    method: "POST",
    body: { setupKey, fullName, email, password },
  });
}

// =========================================================
// PLATFORM (Super Admin only)
// =========================================================
export function getHostels() {
  return request("/platform/hostels");
}

export function createHostel({ hostelName, city, ownerName, ownerEmail, ownerPhone }) {
  return request("/platform/hostels", {
    method: "POST",
    body: { hostelName, city, ownerName, ownerEmail, ownerPhone },
  });
}

export function setHostelStatus(id, status) {
  return request(`/platform/hostels/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function getMe() {
  return request("/auth/me");
}

// =========================================================
// EMAIL VERIFICATION & PASSWORD RESET
// =========================================================
export function verifyEmail({ email, code }) {
  return request("/auth/verify-email", { method: "POST", body: { email, code } });
}

export function resendVerification(email) {
  return request("/auth/resend-verification", { method: "POST", body: { email } });
}

export function forgotPassword(email) {
  return request("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword({ email, code, newPassword }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { email, code, newPassword },
  });
}

// =========================================================
// PROFILE
// =========================================================
export function updateProfile({ fullName, phone }) {
  return request("/auth/me", { method: "PUT", body: { fullName, phone } });
}

export function changePassword({ currentPassword, newPassword }) {
  return request("/auth/me/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}

// =========================================================
// ADMIN
// =========================================================
export function getUsers() {
  return request("/users");
}

export function addUser({ fullName, email, phone, role }) {
  return request("/users", {
    method: "POST",
    body: { fullName, email, phone, role },
  });
}

export function setUserStatus(id, isActive) {
  return request(`/users/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export function getActivityLog() {
  return request("/users/activity");
}

// =========================================================
// DASHBOARD
// =========================================================
export function getUserStats() {
  return request("/users/stats");
}

// =========================================================
// HOSTEL & ROOM MANAGEMENT
// =========================================================
export function getStructure() {
  return request("/hostel/structure");
}

export function getAvailability() {
  return request("/hostel/availability");
}

export function createBranch({ name, address, city, wardenId }) {
  return request("/hostel/branches", {
    method: "POST",
    body: { name, address, city, wardenId },
  });
}

export function updateBranch(id, { name, address, city, wardenId }) {
  return request(`/hostel/branches/${id}`, {
    method: "PUT",
    body: { name, address, city, wardenId },
  });
}

export function deleteBranch(id) {
  return request(`/hostel/branches/${id}`, { method: "DELETE" });
}

export function createFloor({ branchId, floorNumber, label }) {
  return request("/hostel/floors", {
    method: "POST",
    body: { branchId, floorNumber, label },
  });
}

export function deleteFloor(id) {
  return request(`/hostel/floors/${id}`, { method: "DELETE" });
}

export function createRoom({ floorId, roomNumber, roomTypeId }) {
  return request("/hostel/rooms", {
    method: "POST",
    body: { floorId, roomNumber, roomTypeId },
  });
}

export function updateRoom(id, { roomNumber, roomTypeId }) {
  return request(`/hostel/rooms/${id}`, {
    method: "PUT",
    body: { roomNumber, roomTypeId },
  });
}

export function deleteRoom(id) {
  return request(`/hostel/rooms/${id}`, { method: "DELETE" });
}

export function setRoomStatus(id, status) {
  return request(`/hostel/rooms/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function addBed(roomId) {
  return request(`/hostel/rooms/${roomId}/beds`, { method: "POST" });
}

export function deleteBed(id) {
  return request(`/hostel/beds/${id}`, { method: "DELETE" });
}

export function setBedStatus(id, status) {
  return request(`/hostel/beds/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function getRoomTypes() {
  return request("/hostel/room-types");
}

export function createRoomType(roomType) {
  return request("/hostel/room-types", { method: "POST", body: roomType });
}

export function updateRoomType(id, roomType) {
  return request(`/hostel/room-types/${id}`, { method: "PUT", body: roomType });
}

export function deleteRoomType(id) {
  return request(`/hostel/room-types/${id}`, { method: "DELETE" });
}

export function getRentHistory(id) {
  return request(`/hostel/room-types/${id}/rent-history`);
}


// =========================================================
// SESSION STORAGE
// =========================================================
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Lets the sidebar show the new name right after a profile update
  window.dispatchEvent(new Event("smartstay-user-updated"));
}

export function getUser() {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
