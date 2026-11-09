// =========================================================
// PREMIUM SAAS DESIGN TOKENS
// =========================================================
export const colors = {
  primary: "#10B981",
  primaryHover: "#059669",
  primaryLight: "#ECFDF5",

  indigo: "#6366F1",
  indigoLight: "#EEF2FF",
  rose: "#F43F5E",
  roseLight: "#FFF1F2",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  emerald: "#10B981",
  emeraldLight: "#ECFDF5",

  bgApp: "#F8FAFC",
  bgSurface: "#FFFFFF",
  bgInput: "#F8FAFC",

  textMain: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",

  borderLight: "#E2E8F0",
  borderSubtle: "#F1F5F9",

  sidebarBg: "#0B1120",
};

// Same fonts as the web app (Manrope for headings, Inter for text)
export const fonts = {
  display: "Manrope_800ExtraBold",
  displayBold: "Manrope_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

// Role themes for the mobile apps (resident = amber, staff = violet)
export const roleThemes = {
  resident: {
    primary: "#F59E0B",
    primaryHover: "#D97706",
    primaryLight: "#FFFBEB",
    bg: "#FFF9F2",
    border: colors.borderLight,
    text: colors.textMain,
    muted: colors.textMuted,
  },
  staff: {
    primary: "#8B5CF6",
    primaryHover: "#7C3AED",
    primaryLight: "#F5F3FF",
    bg: "#F8FAFC",
    border: colors.borderLight,
    text: colors.textMain,
    muted: colors.textMuted,
  },
};
