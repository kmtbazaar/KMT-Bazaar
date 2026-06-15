import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function VendorEarnings() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  const load = useCallback(async () => { try { setStats(await vendorApi.stats()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-earnings-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Earnings</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <LinearGradient colors={[COLORS.success, "#15803D"]} style={s.hero}>
          <Text style={s.heroLabel}>Estimated Payout</Text>
          <Text style={s.heroValue}>₹{stats?.payout ?? 0}</Text>
          <Text style={s.heroSub}>After {stats?.commission_percent ?? 10}% platform commission</Text>
        </LinearGradient>

        <View style={s.row}>
          <Card label="Gross Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" color={COLORS.brand} />
          <Card label="Total Orders" value={stats?.orders ?? 0} icon="package-variant" color={COLORS.accent} />
        </View>
        <View style={s.row}>
          <Card label="Delivered" value={stats?.delivered ?? 0} icon="check-circle-outline" color={COLORS.success} />
          <Card label="Pending" value={stats?.pending ?? 0} icon="clock-outline" color="#EAB308" />
        </View>

        <View style={s.breakdown}>
          <Text style={s.bdTitle}>Payout Breakdown</Text>
          <Row l="Gross Revenue" v={`₹${stats?.revenue ?? 0}`} />
          <Row l={`Platform Commission (${stats?.commission_percent ?? 10}%)`} v={`-₹${((stats?.revenue || 0) * (stats?.commission_percent || 10) / 100).toFixed(2)}`} negative />
          <View style={s.divider} />
          <Row l="Net Payout" v={`₹${stats?.payout ?? 0}`} bold />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ label, value, icon, color }: any) {
  return (
    <View style={s.card}>
      <View style={[s.cardIcon, { backgroundColor: color + "1A" }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={s.cardValue}>{value}</Text>
      <Text style={s.cardLabel}>{label}</Text>
    </View>
  );
}

function Row({ l, v, bold, negative }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 6 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: bold ? 15 : 13, fontWeight: bold ? "800" : "500" }}>{l}</Text>
      <Text style={{ color: negative ? COLORS.error : COLORS.text, fontSize: bold ? 18 : 14, fontWeight: bold ? "800" : "700" }}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  hero: { padding: SPACING.xl, borderRadius: RADIUS.lg, alignItems: "center", marginBottom: 14 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontWeight: "600", letterSpacing: 1, fontSize: 12 },
  heroValue: { color: "#fff", fontWeight: "800", fontSize: 42, marginVertical: 6 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: { flex: 1, backgroundColor: "#fff", padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cardIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  cardLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  breakdown: { backgroundColor: "#fff", padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  bdTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
});
