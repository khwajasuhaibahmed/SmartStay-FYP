// =========================================================
// ROOM & BED STATUS (same four values as the database)
// =========================================================
export const statusConfig = {
  available: { label: "Available", className: "green" },
  occupied: { label: "Occupied", className: "indigo" },
  reserved: { label: "Reserved", className: "amber" },
  maintenance: { label: "Under Maintenance", className: "red" },
};

// =========================================================
// FACILITIES a room type can offer (backend checks the same list)
// =========================================================
export const FACILITIES = [
  "WiFi",
  "Attached Bathroom",
  "Study Table",
  "Wardrobe",
  "Geyser",
  "Balcony",
  "Laundry",
  "Meals Included",
];

// Floor 0 = Ground, -1 = Basement, 1 = 1st Floor ...
export const floorName = (floor) => {
  if (floor.label) return floor.label;
  const n = floor.floor_number;
  if (n === 0) return "Ground Floor";
  if (n < 0) return `Basement ${Math.abs(n)}`;
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix} Floor`;
};

export const formatRs = (value) =>
  value === null || value === undefined ? "—" : `Rs ${Number(value).toLocaleString("en-PK")}`;
