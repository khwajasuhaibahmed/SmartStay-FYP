import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// The phone can't reach "localhost" on the laptop, so use the laptop's
// LAN IP that Expo is already serving from.
const host = Constants.expoConfig?.hostUri?.split(":")[0] || "localhost";
const API_URL = `http://${host}:5000/api`;

const TOKEN_KEY = "smartstay_token";
const USER_KEY = "smartstay_user";

// =========================================================
// REQUEST HELPER
// =========================================================
async function request(path, { method = "GET", body } = {}) {
  const token = await getToken();

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
// SESSION STORAGE
// =========================================================
export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const stored = await AsyncStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
