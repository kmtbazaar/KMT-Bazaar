import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/src/AuthContext";
import {
  DEFAULT_ADMIN_ACTIONS,
  DEFAULT_ADMIN_SETTINGS,
  loadAdminSettings,
  saveAdminSettings,
  type AdminSettings,
  type AdminThemeMode,
} from "@/src/adminSettings";

const THEME = {
  black: "#0B0B0C",
  brown: "#5A3825",
  orange: "#F97316",
  orangeLight: "#FFF1E8",
  sky: "#38BDF8",
  white: "#FFFFFF",
  grey: "#F5F5F4",
  text: "#171717",
  muted: "#737373",
  border: "#E7E5E4",
  success: "#16A34A",
  danger: "#DC2626",
};

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setSettings(await loadAdminSettings());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.classList.toggle(
        "kmt-admin-night",
        settings.themeMode === "night"
      );
    }
  }, [settings.themeMode]);

  const persist = async (next: AdminSettings) => {
    setSaving(true);
    setSettings(next);
    await saveAdminSettings(next);
    setSaving(false);
  };

  const setThemeMode = (themeMode: AdminThemeMode) => {
    persist({ ...settings, themeMode });
  };

  const toggleAction = (label: string) => {
    const hidden = settings.hiddenQuickActions.includes(label)
      ? settings.hiddenQuickActions.filter((x) => x !== label)
      : [...settings.hiddenQuickActions, label];

    persist({ ...settings, hiddenQuickActions: hidden });
  };

  const moveAction = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.quickActionOrder.length) return;

    const order = [...settings.quickActionOrder];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    persist({ ...settings, quickActionOrder: order });
  };

  const reset = () => {
    const execute = () => persist({ ...DEFAULT_ADMIN_SETTINGS });
    if (Platform.OS === "web") {
      if (window.confirm("Reset all Admin Settings to default?")) execute();
    } else {
      Alert.alert("Reset Settings", "Reset all Admin Settings to default?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: execute },
      ]);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const byLabel = new Map(DEFAULT_ADMIN_ACTIONS.map((a) => [a.label, a]));
  const ordered = settings.quickActionOrder
    .map((label) => byLabel.get(label))
    .filter(Boolean) as typeof DEFAULT_ADMIN_ACTIONS;

  const isNight = settings.themeMode === "night";

  return (
    <View style={[s.root, isNight && s.nightRoot]}>
      <SafeAreaView edges={["top"]}>
        <LinearGradient
          colors={isNight ? ["#020617", "#111827", "#020617"] : [THEME.black, THEME.brown, THEME.black]}
          style={s.header}
        >
          <Animated.View entering={FadeInDown.duration(450)} style={s.headerRow}>
            <Pressable onPress={() => router.back()} style={s.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={21} color={THEME.white} />
            </Pressable>
            <View style={s.headerText}>
              <Text style={s.eyebrow}>KMT BAZAAR</Text>
              <Text style={s.title}>Admin Settings</Text>
              <Text style={s.subtitle}>Control your admin workspace</Text>
            </View>
            <View style={s.settingsIcon}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={THEME.orange} />
            </View>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(450)}>
          <Text style={[s.sectionTitle, isNight && s.nightText]}>Appearance</Text>
          <Text style={[s.sectionSub, isNight && s.nightMuted]}>Choose how the Admin Console looks</Text>

          <View style={s.themeRow}>
            {([
              ["day", "white-balance-sunny", "Day"],
              ["night", "moon-waning-crescent", "Night"],
              ["system", "theme-light-dark", "System"],
            ] as const).map(([mode, icon, label]) => {
              const active = settings.themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[s.themeCard, active && s.themeActive]}
                >
                  <MaterialCommunityIcons name={icon as any} size={22} color={active ? THEME.orange : THEME.muted} />
                  <Text style={[s.themeLabel, active && { color: THEME.orange }]}>{label}</Text>
                  {active && <View style={s.activeDot} />}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(450)} style={s.section}>
          <View style={s.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.sectionTitle, isNight && s.nightText]}>Quick Actions</Text>
              <Text style={[s.sectionSub, isNight && s.nightMuted]}>Show, hide and change the position of shortcuts</Text>
            </View>
            <View style={s.countPill}>
              <Text style={s.countText}>{ordered.filter((a) => !settings.hiddenQuickActions.includes(a.label)).length} active</Text>
            </View>
          </View>

          <View style={s.actionList}>
            {ordered.map((action, index) => {
              const hidden = settings.hiddenQuickActions.includes(action.label);
              return (
                <View key={action.label} style={[s.actionRow, isNight && s.nightCard, hidden && s.hiddenRow]}>
                  <View style={[s.actionIcon, { backgroundColor: action.color + "18", borderColor: action.color + "35" }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <Text style={[s.actionLabel, isNight && s.nightText]} numberOfLines={1}>{action.label}</Text>

                  <Pressable onPress={() => moveAction(index, -1)} disabled={index === 0} style={s.smallButton}>
                    <MaterialCommunityIcons name="chevron-up" size={18} color={index === 0 ? "#D4D4D4" : THEME.text} />
                  </Pressable>
                  <Pressable onPress={() => moveAction(index, 1)} disabled={index === ordered.length - 1} style={s.smallButton}>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={index === ordered.length - 1 ? "#D4D4D4" : THEME.text} />
                  </Pressable>
                  <Pressable onPress={() => toggleAction(action.label)} style={[s.visibilityButton, hidden && s.visibilityOff]}>
                    <MaterialCommunityIcons name={hidden ? "eye-off-outline" : "eye-outline"} size={19} color={hidden ? THEME.danger : THEME.success} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).duration(450)} style={s.section}>
          <Text style={[s.sectionTitle, isNight && s.nightText]}>Account</Text>
          <Text style={[s.sectionSub, isNight && s.nightMuted]}>Admin access and workspace controls</Text>

          <Pressable onPress={reset} style={s.resetButton}>
            <MaterialCommunityIcons name="restore" size={20} color={THEME.brown} />
            <View style={{ flex: 1 }}>
              <Text style={s.resetTitle}>Reset Quick Actions</Text>
              <Text style={s.resetSub}>Restore default order and visibility</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.muted} />
          </Pressable>

          <Pressable onPress={signOut} style={s.signOutButton}>
            <View style={s.signOutIcon}>
              <MaterialCommunityIcons name="logout" size={20} color={THEME.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.signOutTitle}>Sign Out</Text>
              <Text style={s.signOutSub}>Securely leave the Admin Console</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.danger} />
          </Pressable>
        </Animated.View>

        <Text style={s.saved}>{saving ? "Saving settings…" : "Settings saved automatically"}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.grey },
  nightRoot: { backgroundColor: "#0F172A" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, marginLeft: 11 },
  eyebrow: { color: THEME.orange, fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  title: { color: THEME.white, fontSize: 21, fontWeight: "900", marginTop: 2 },
  subtitle: { color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 3 },
  settingsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 50 },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: THEME.text, fontSize: 17, fontWeight: "900" },
  sectionSub: { color: THEME.muted, fontSize: 10, marginTop: 3 },
  nightText: { color: THEME.white },
  nightMuted: { color: "#94A3B8" },
  themeRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  themeCard: { flex: 1, minHeight: 78, backgroundColor: THEME.white, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, alignItems: "center", justifyContent: "center", gap: 5 },
  themeActive: { borderColor: THEME.orange, borderWidth: 2, backgroundColor: THEME.orangeLight },
  themeLabel: { color: THEME.muted, fontSize: 10, fontWeight: "800" },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: THEME.orange },
  actionList: { gap: 8, marginTop: 2 },
  actionRow: { minHeight: 60, backgroundColor: THEME.white, borderRadius: 15, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  nightCard: { backgroundColor: "#111827", borderColor: "#334155" },
  hiddenRow: { opacity: 0.5 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, color: THEME.text, fontSize: 11, fontWeight: "800" },
  smallButton: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#F5F5F4", alignItems: "center", justifyContent: "center" },
  visibilityButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  visibilityOff: { backgroundColor: "#FEF2F2" },
  countPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: THEME.orangeLight },
  countText: { color: THEME.brown, fontSize: 9, fontWeight: "900" },
  resetButton: { marginTop: 12, minHeight: 64, backgroundColor: THEME.white, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  resetTitle: { color: THEME.text, fontSize: 12, fontWeight: "900" },
  resetSub: { color: THEME.muted, fontSize: 9, marginTop: 2 },
  signOutButton: { marginTop: 10, minHeight: 68, backgroundColor: "#FFF7F7", borderRadius: 16, borderWidth: 1, borderColor: "#FECACA", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  signOutIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  signOutTitle: { color: THEME.danger, fontSize: 12, fontWeight: "900" },
  signOutSub: { color: "#991B1B", fontSize: 9, marginTop: 2 },
  saved: { textAlign: "center", color: THEME.muted, fontSize: 9, marginTop: 20 },
});
