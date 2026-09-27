import { useEffect, useState } from "react";
import { Appearance, StyleSheet } from "react-native";
import { loadAdminSettings, type AdminThemeMode } from "./adminSettings";

export function useAdminTheme() {
  const [mode, setMode] = useState<AdminThemeMode>("day");
  const [systemDark, setSystemDark] = useState(Appearance.getColorScheme() === "dark");

  useEffect(() => {
    let active = true;

    const read = async () => {
      const settings = await loadAdminSettings();
      if (active) setMode(settings.themeMode);
    };

    read();

    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (active) setSystemDark(colorScheme === "dark");
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return mode === "night" || (mode === "system" && systemDark);
}

const NIGHT_COLORS: Record<string, string> = {
  "#fff": "#111827",
  "#FFF": "#111827",
  "#ffffff": "#111827",
  "#FFFFFF": "#111827",
  "#F8FAFC": "#111827",
  "#f8fafc": "#111827",
  "#F5F5F4": "#0F172A",
  "#f5f5f4": "#0F172A",
  "#F4F7FC": "#020617",
  "#f4f7fc": "#020617",
  "#EEF2FF": "#172554",
  "#eef2ff": "#172554",
  "#E7E5E4": "#334155",
  "#e7e5e4": "#334155",
  "#E2E8F0": "#334155",
  "#e2e8f0": "#334155",
  "#CBD8F1": "#334155",
  "#cbd8f1": "#334155",
  "#CBD5E1": "#334155",
  "#cbd5e1": "#334155",
  "#050c1c": "#F8FAFC",
  "#0F172A": "#F8FAFC",
  "#171717": "#F8FAFC",
  "#1F2937": "#F8FAFC",
  "#4B5563": "#CBD5E1",
  "#475569": "#CBD5E1",
  "#737373": "#94A3B8",
  "#64748B": "#94A3B8",
  "#9CA3AF": "#94A3B8",
  "#FFF1E8": "#2A170D",
  "#fff1e8": "#2A170D",
  "#FFF7ED": "#2A170D",
  "#fff7ed": "#2A170D",
  "#FFF7F7": "#2A1010",
  "#FEF2F2": "#2A1010",
  "#fef2f2": "#2A1010",
  "#FEE2E2": "#3A1414",
  "#fee2e2": "#3A1414",
  "#FEF3C7": "#2A2107",
  "#fef3c7": "#2A2107",
  "#DCFCE7": "#0A2415",
  "#dcfce7": "#0A2415",
};

function transform(value: any): any {
  if (typeof value === "string") return NIGHT_COLORS[value] || value;
  if (Array.isArray(value)) return value.map(transform);
  if (value && typeof value === "object") {
    const next: any = {};
    Object.keys(value).forEach((key) => {
      next[key] = transform(value[key]);
    });
    return next;
  }
  return value;
}

export function makeAdminStyles(styles: Record<string, any>, isNight: boolean) {
  return StyleSheet.create(isNight ? transform(styles) : styles);
}
