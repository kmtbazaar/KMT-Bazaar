import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { vendorApi } from "@/src/roleApi";
import { COLORS, SPACING } from "@/src/theme";
import AnimatedBrandLogo, { BrandingFooter } from "@/src/components/AnimatedBrandLogo";

export default function EventServiceVendorDashboard({ serviceType }: { serviceType?: "premium_decorator" | "photography" }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isDecorator = (serviceType || user?.service_type) === "premium_decorator";
  const title = isDecorator ? "Premium Decorator" : "Photography";
  const [stats, setStats] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState(0);

  const load = useCallback(async () => {
    try {
      const [summary, bookings] = await Promise.all([
        vendorApi.serviceStats(),
        vendorApi.serviceBookings(),
      ]);
      setStats(summary);
      setPendingBookings((bookings || []).filter((item: any) =>
        ["pending", "booking_requested"].includes(String(item.status || "").toLowerCase())
      ).length);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.root} testID="event-service-vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={isDecorator ? ["#7C2D5A", "#4A1741"] : ["#1D4ED8", "#172554"]} style={s.header}>
          <View style={s.top}>
            <View style={{ width: 28 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <AnimatedBrandLogo size={46} />
              <Text style={s.title}>{title} Vendor</Text>
              <Text style={s.sub}>{isDecorator ? "Premium event decoration and occasion packages" : "Photography packages and customer shoot bookings"}</Text>
              <Text style={s.welcome}>Welcome, {user?.name}</Text>
            </View>
            <Pressable onPress={logout} hitSlop={10}><MaterialCommunityIcons name="logout" size={24} color="#fff" /></Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.kpis}>
          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" />
          <KPI label="Bookings" value={stats?.bookings ?? 0} icon="calendar-check" />
        </View>
        <View style={s.kpis}>
          <KPI label="Completed" value={stats?.completed ?? 0} icon="check-circle-outline" />
          <KPI label="Pending" value={pendingBookings} icon="clock-outline" />
        </View>
        <Text style={s.section}>{isDecorator ? "Event Decoration" : "Photography Studio"}</Text>
        <Action icon="briefcase-outline" title={isDecorator ? "Decoration Packages" : "Photography Packages"} sub={isDecorator ? "Add wedding, birthday and celebration packages" : "Add wedding, event and professional shoot packages"} onPress={() => router.push("/service-vendor/services" as any)} />
        {!isDecorator && <Action icon="movie-open-play-outline" title="Wedding Reels & Karizma Album" sub="Manage Haldi, Mehndi and wedding YouTube reels plus your 40-page album PDF" onPress={() => router.push("/service-vendor/photography-showcase" as any)} />}
        <Action icon="calendar-check-outline" title="Bookings" sub="View customer details and update event / shoot status" onPress={() => router.push("/service-vendor/service-bookings" as any)} badge={pendingBookings} />
        <Action icon="chart-line" title="Earnings" sub="Revenue, commission and estimated payout" onPress={() => router.push("/service-vendor/earnings" as any)} />
        <BrandingFooter caption={`${title} Partner · Powered by KMT Bazaar`} />
      </ScrollView>
    </View>
  );
}

function KPI({ label, value, icon }: any) {
  return <View style={s.kpi}>
    <MaterialCommunityIcons name={icon} size={19} color="#0284C7" />
    <Text style={s.value}>{value}</Text>
    <Text style={s.label}>{label}</Text>
  </View>;
}
function Action({ icon, title, sub, onPress, badge }: any) {
  return <Pressable style={s.action} onPress={onPress}>
    <View style={s.actionIcon}><MaterialCommunityIcons name={icon} size={22} color="#0284C7" /></View>
    <View style={{ flex: 1 }}>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionSub}>{sub}</Text>
    </View>
    {!!badge && <View style={s.count}><Text style={s.countText}>{badge}</Text></View>}
    <MaterialCommunityIcons name="chevron-right" size={21} color={COLORS.textMuted} />
  </Pressable>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 5 },
  sub: { color: "#E2E8F0", fontSize: 11, textAlign: "center", marginTop: 4 },
  welcome: { color: "#fff", fontSize: 12, marginTop: 8, fontWeight: "700" },
  body: { padding: SPACING.lg, paddingBottom: 90 },
  kpis: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: "#fff", borderRadius: 15, padding: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  value: { fontSize: 19, color: "#0F172A", fontWeight: "900", marginTop: 8 },
  label: { fontSize: 11, color: "#64748B", marginTop: 3 },
  section: { fontSize: 17, color: "#0F172A", fontWeight: "900", marginTop: 18, marginBottom: 9 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 9 },
  actionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  actionTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  actionSub: { color: "#64748B", fontSize: 10, marginTop: 3 },
  count: { minWidth: 23, height: 23, borderRadius: 12, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { color: "#fff", fontSize: 10, fontWeight: "900" },
});
