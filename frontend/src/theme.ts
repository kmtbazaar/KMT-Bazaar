import { StyleSheet } from "react-native";

export const COLORS = {
  // ===== BRAND =====
  brand: "#f6750b",
  brandDark: "#eceef4",
  brandLight: "#DBEAFE",

  // ===== ACCENT =====
  accent: "#F97316",
  accentDark: "#EA580C",
  accentLight: "#FFF7ED",

  // ===== BACKGROUND =====
  background: "#F4F7FC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",
  surfaceTertiary: "#EEF2FF",
  surfaceInverse: "#111827",

  // ===== TEXT =====
  text: "#050c1c",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",

  // ===== BORDER =====
  border: "#cbd8f1",
  borderStrong: "#CBD5E1",

  // ===== STATUS =====
  success: "#22C55E",
  warning: "#FACC15",
  error: "#EF4444",

  // ===== EXTRA =====
  white: "#FFFFFF",
  black: "#000000",

  // ===== PREMIUM COLORS =====
  gold: "#FBBF24",
  purple: "#7C3AED",
  pink: "#EC4899",
  sky: "#0EA5E9",

  // ===== GLASS =====
  glass: "rgba(255,255,255,0.75)",
  overlay: "rgba(0,0,0,0.45)",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  round: 40,
  pill: 999,
};

export const FONT = {
  display: "System",
  body: "System",
};

export const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_1ae74cf0-8aee-427c-ac11-8ee2e0303df6/artifacts/xvwo5fui_file_00000000af4c720b99befeb2888762a7.png";

export const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },

  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
};

export default StyleSheet.create({});