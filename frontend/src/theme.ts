import { StyleSheet } from "react-native";

export const COLORS = {
  brand: "#2563EB",        // Royal Blue
  brandDark: "#1E40AF",
  brandLight: "#EFF6FF",
  accent: "#F97316",       // Vibrant Orange
  accentDark: "#EA580C",
  accentLight: "#FFF7ED",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",
  surfaceTertiary: "#F1F5F9",
  surfaceInverse: "#0A0A0A",
  text: "#171717",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  success: "#16A34A",
  warning: "#EAB308",
  error: "#DC2626",
  black: "#0A0A0A",
  white: "#FFFFFF",
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const RADIUS = { sm: 6, md: 12, lg: 20, pill: 999 };

export const FONT = {
  display: "System",
  body: "System",
};

export const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_1ae74cf0-8aee-427c-ac11-8ee2e0303df6/artifacts/xvwo5fui_file_00000000af4c720b99befeb2888762a7.png";

export const shadow = {
  card: {
    shadowColor: "#0A0A0A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  soft: {
    shadowColor: "#0A0A0A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};

export default StyleSheet.create({});
