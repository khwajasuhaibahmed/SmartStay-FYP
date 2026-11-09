// =========================================================
// FORM VALIDATION (same rules as the backend)
// Each function returns an error message, or "" when valid.
// =========================================================

// Must start with a letter; only letters and spaces.
export const checkName = (value, label = "Name") => {
  const name = value.trim();
  if (!name) return `Please enter your ${label.toLowerCase()}`;
  if (!/^[A-Za-z]/.test(name)) return `${label} must start with a letter`;
  if (!/^[A-Za-z][A-Za-z ]*$/.test(name))
    return `${label} can contain only letters and spaces`;
  if (name.length < 2) return `${label} must be at least 2 characters`;
  return "";
};

// Must contain @ and look like name@domain.com
export const checkEmail = (value) => {
  const email = value.trim();
  if (!email) return "Please enter your email";
  if (!email.includes("@")) return "Email must contain the @ sign (e.g. name@gmail.com)";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email (e.g. name@gmail.com)";
  return "";
};

// At least 6 characters.
export const checkPassword = (value, label = "Password") => {
  if (!value) return `Please enter your ${label.toLowerCase()}`;
  if (value.length < 6) return `${label} must be at least 6 characters`;
  return "";
};

// Optional Pakistani mobile number, e.g. 0300-1234567
export const checkPhone = (value) => {
  const phone = value.trim();
  if (phone && !/^03\d{2}-?\d{7}$/.test(phone))
    return "Please enter a valid phone (e.g. 0300-1234567)";
  return "";
};

// Hostel join code, e.g. IGH-4821
export const checkHostelCode = (value) => {
  const code = value.trim().toUpperCase();
  if (!code) return "Please enter your hostel code (ask your warden)";
  if (!/^[A-Z]{2,6}-\d{4}$/.test(code)) return "Hostel code must look like IGH-4821";
  return "";
};

// Branch / room type name: starts with a letter; letters, digits, spaces, - . '
export const checkPlaceName = (value, label = "Name") => {
  const name = value.trim();
  if (!name) return `Please enter the ${label.toLowerCase()}`;
  if (!/^[A-Za-z]/.test(name)) return `${label} must start with a letter`;
  if (!/^[A-Za-z][A-Za-z0-9 .'-]*$/.test(name))
    return `${label} can contain only letters, digits, spaces and - . '`;
  if (name.length < 2) return `${label} must be at least 2 characters`;
  return "";
};

// Optional city: letters and spaces only.
export const checkCity = (value) => {
  const city = value.trim();
  if (city && !/^[A-Za-z][A-Za-z ]*$/.test(city)) return "City can contain only letters and spaces";
  return "";
};

// Room number, e.g. 101, G-04, A12
export const checkRoomNumber = (value) => {
  const room = value.trim();
  if (!room) return "Please enter the room number";
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(room))
    return "Room number can contain only letters, digits and - (e.g. 101 or G-04)";
  if (room.length > 20) return "Room number must be at most 20 characters";
  return "";
};

// Money: a number, 0 or more.
export const checkAmount = (value, label = "Amount") => {
  if (value === "" || value === null) return `Please enter the ${label.toLowerCase()}`;
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) return `${label} must be a number, 0 or more`;
  return "";
};
