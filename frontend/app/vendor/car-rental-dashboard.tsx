import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function CarRentalVendorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);\n  const [bookingCount, setBookingCount] = useState(0);

  const load = useCallback(async () => {
    try { const [st, bookings] = await Promise.all([vendorApi.serviceStats(), vendorApi.serviceBookings()]); setStats(st); setBookingCount((bookings || []).filter((x:any) => ["pending","booking_requested","confirmed","accepted"].includes(String(x.status || "").toLowerCase())).length); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.root} testID="car-rental-vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={["#111827", "#0F172A"]} style={s.header}>
          <View style={s.headerTop}>
            <View style={{ width: 32 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={s.headerIcon}><MaterialCommunityIcons name="car" size={23} color="#111827" /></View>
              <Text style={s.headerTitle}>Car Rental Vendor</Text>
              <Text style={s.headerSub}>Manage vehicles, rentals & trip bookings</Text>
              <Text style={s.welcome}>Welcome, {user?.name}</Text>
            </View>
            <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
              <Pressable onPress={() => router.push("/vendor/service-bookings" as any)} hitSlop={10} style={s.bell}><MaterialCommunityIcons name="bell-outline" size={23} color="#fff" />{bookingCount>0&&<View style={s.badge}><Text style={s.badgeText}>{bookingCount}</Text></View>}</Pressable>
              <Pressable onPress={logout} hitSlop={10}><MaterialCommunityIcons name="logout" size={25} color="#fff" /></Pressable>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.kpiRow}>
          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" color="#16A34A" />
          <KPI label="Bookings" value={stats?.bookings ?? 0} icon="calendar-check" color="#0EA5E9" />
        </View>
        <View style={s.kpiRow}>
          <KPI label="Completed" value={stats?.completed ?? 0} icon="check-circle-outline" color="#16A34A" />
          <KPI label="Pending" value={stats?.pending ?? 0} icon="clock-outline" color="#F59E0B" />
        </View>

        <View style={s.payout}>
          <Text style={s.payoutLabel}>ESTIMATED PAYOUT</Text>
          <Text style={s.payoutValue}>{`₹${stats?.payout ?? 0}`}</Text>
          <Text style={s.payoutSub}>After {stats?.commission_percent ?? 10}% platform commission</Text>
        </View>

        <Text style={s.sectionTitle}>Car Rental Management</Text>
        <Action icon="car-multiple" title="Rental Fleet" sub="Add, edit and manage your rental vehicles" onPress={() => router.push("/vendor/services" as any)} />
        <Action icon="chart-line" title="Earnings" sub="Revenue, commission and estimated payout" onPress={() => router.push("/vendor/earnings" as any)} />
        <Action icon="calendar-check-outline" title="Rental Bookings" sub="View and update customer rental bookings" onPress={() => router.push("/vendor/service-bookings" as any)} />
      </ScrollView>
    </View>
  );
}

function KPI({ label, value, icon, color }: any) {
  return <View style={s.kpiCard}>
    <View style={[s.kpiIcon, { backgroundColor: color + "1A" }]}><MaterialCommunityIcons name={icon} size={18} color={color} /></View>
    <Text style={s.kpiValue}>{value}</Text>
    <Text style={s.kpiLabel}>{label}</Text>
  </View>;
}

function Action({ icon, title, sub, onPress }: any) {
  return <Pressable style={s.actionCard} onPress={onPress}>
    <View style={s.actionIcon}><MaterialCommunityIcons name={icon} size={23} color="#0EA5E9" /></View>
    <View style={{ flex: 1 }}>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionSub}>{sub}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={21} color={COLORS.textMuted} />
  </Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: SPACING.lg, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerTop: { flexDirection: "row", alignItems: "center" },\n  bell: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },\n  badge: { position: "absolute", right: -4, top: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },\n  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  headerTitle: { color: "#fff", fontWeight: "900", fontSize: 21 },
  headerSub: { color: "rgba(255,255,255,0.84)", fontSize: 12, marginTop: 3, textAlign: "center" },
  welcome: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 3 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: "#fff", padding: 13, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#E2E8F0" },
  kpiIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiValue: { fontWeight: "900", color: COLORS.text, fontSize: 19 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  payout: { backgroundColor: "#0F172A", padding: 18, borderRadius: RADIUS.lg, marginTop: 4, marginBottom: 20 },
  payoutLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800" },
  payoutValue: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 3 },
  payoutSub: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: COLORS.text, marginBottom: 10 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  actionTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14 },
  actionSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
});
