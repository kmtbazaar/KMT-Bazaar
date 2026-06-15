import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

const ACTIONS = [
  { icon: "package-variant", label: "My Products", path: "/vendor/products", color: "#2563EB" },
  { icon: "clipboard-list-outline", label: "Orders", path: "/vendor/orders", color: "#F97316" },
  { icon: "chart-line", label: "Earnings", path: "/vendor/earnings", color: "#16A34A" },
];

export default function VendorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { try { setStats(await vendorApi.stats()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.root} testID="vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.header}>
          <View style={s.headerTop}>
            <Image source={{ uri: LOGO_URL }} style={{ width: 36, height: 36 }} contentFit="contain" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.headerTitle}>Vendor Dashboard</Text>
              <Text style={s.headerSub}>Welcome, {user?.name}</Text>
            </View>
            <Pressable testID="vendor-logout" onPress={async () => { await logout(); router.replace("/auth/login"); }} hitSlop={10}>
              <MaterialCommunityIcons name="logout" size={22} color="#fff" />
            </Pressable>
          </View>
          <Text style={s.bigStat}>₹{stats?.payout ?? 0}</Text>
          <Text style={s.bigLabel}>Estimated Payout (after {stats?.commission_percent ?? 10}% commission)</Text>
        </LinearGradient>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
        refreshControl={<RefreshControl tintColor={COLORS.accent} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.kpiRow}>
          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" color={COLORS.success} />
          <KPI label="Products" value={stats?.products ?? 0} icon="package" color={COLORS.brand} />
        </View>
        <View style={s.kpiRow}>
          <KPI label="Orders" value={stats?.orders ?? 0} icon="clipboard-list" color={COLORS.accent} />
          <KPI label="Pending" value={stats?.pending ?? 0} icon="clock-outline" color="#EAB308" />
        </View>

        <Text style={s.section}>My Stores</Text>
        {(stats?.stores || []).map((st: any) => (
          <View key={st.id} style={s.storeCard}>
            <Image source={{ uri: st.image }} style={s.storeImg} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.storeName}>{st.name}</Text>
              <Text style={s.storeMeta}>★ {st.rating} · {st.delivery_min} min · {st.address}</Text>
            </View>
          </View>
        ))}
        {(stats?.stores || []).length === 0 && <Text style={s.empty}>No stores assigned. Contact admin.</Text>}

        <Text style={s.section}>Quick Actions</Text>
        <View style={s.actions}>
          {ACTIONS.map((a) => (
            <Pressable key={a.label} testID={`vendor-${a.label}`} onPress={() => router.push(a.path as any)} style={s.actionCard}>
              <View style={[s.actionIcon, { backgroundColor: a.color + "1A" }]}>
                <MaterialCommunityIcons name={a.icon as any} size={24} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function KPI({ label, value, icon, color }: any) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIcon, { backgroundColor: color + "1A" }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  bigStat: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 18 },
  bigLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  kpiIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiValue: { fontWeight: "800", color: COLORS.text, fontSize: 18 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  section: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.md },
  storeCard: { flexDirection: "row", gap: 10, padding: 12, backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  storeImg: { width: 50, height: 50, borderRadius: 8 },
  storeName: { fontWeight: "800", color: COLORS.text },
  storeMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.textMuted, textAlign: "center", padding: 16 },

  actions: { gap: 8 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontWeight: "700", color: COLORS.text },
});
