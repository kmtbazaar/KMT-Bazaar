import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

const FEATURES: Record<string, { title: string; sub: string; items: { icon: string; label: string }[] }> = {
  vendor: {
    title: "Vendor Dashboard",
    sub: "Manage your store & products",
    items: [
      { icon: "store", label: "Store Profile" },
      { icon: "package-variant", label: "My Products" },
      { icon: "warehouse", label: "Inventory" },
      { icon: "clipboard-list-outline", label: "Orders Received" },
      { icon: "chart-line", label: "Earnings" },
      { icon: "cog-outline", label: "Settings" },
    ],
  },
  delivery: {
    title: "Delivery Partner",
    sub: "Accept & deliver orders",
    items: [
      { icon: "moped-electric", label: "Available Orders" },
      { icon: "map-marker-path", label: "Active Delivery" },
      { icon: "history", label: "Delivery History" },
      { icon: "wallet-outline", label: "Today's Earnings" },
      { icon: "toggle-switch", label: "Online / Offline" },
      { icon: "cog-outline", label: "Settings" },
    ],
  },
  admin: {
    title: "Admin Console",
    sub: "Manage marketplace",
    items: [
      { icon: "view-dashboard-outline", label: "Dashboard" },
      { icon: "account-group-outline", label: "Users" },
      { icon: "store-outline", label: "Vendors" },
      { icon: "moped-outline", label: "Delivery Partners" },
      { icon: "tag-multiple-outline", label: "Categories" },
      { icon: "image-multiple-outline", label: "Banners" },
      { icon: "package-variant", label: "Products" },
      { icon: "currency-inr", label: "Commission" },
    ],
  },
};

export default function RolePanel() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const cfg = FEATURES[role as string] || FEATURES.vendor;

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID={`role-${role}-screen`}>
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.header}>
        <View style={s.headerTop}>
          <Image source={{ uri: LOGO_URL }} style={{ width: 40, height: 40 }} contentFit="contain" />
          <Pressable testID="role-logout" onPress={async () => { await logout(); router.replace("/auth/login"); }} hitSlop={10}>
            <MaterialCommunityIcons name="logout" size={22} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.title}>{cfg.title}</Text>
        <Text style={s.sub}>{cfg.sub}</Text>
        <Text style={s.user}>Hello, {user?.name}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <View style={s.stats}>
          <Stat label="Today" value={role === "delivery" ? "8 deliveries" : "12 orders"} icon="trending-up" />
          <Stat label={role === "delivery" ? "Earned" : "Revenue"} value="₹4,250" icon="currency-inr" />
        </View>

        <Text style={s.section}>Quick Actions</Text>
        <View style={s.grid}>
          {cfg.items.map((it) => (
            <Pressable key={it.label} testID={`role-feature-${it.label}`} style={s.gridItem}>
              <View style={s.gridIcon}>
                <MaterialCommunityIcons name={it.icon as any} size={26} color={COLORS.brand} />
              </View>
              <Text style={s.gridLabel}>{it.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.notice}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.brand} />
          <Text style={s.noticeText}>Full {role} panel coming in Phase 2. Customer flow is live for end-to-end purchases.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: any) {
  return (
    <View style={s.statCard}>
      <View style={s.statIcon}><MaterialCommunityIcons name={icon} size={22} color={COLORS.accent} /></View>
      <View>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: SPACING.md },
  sub: { color: "rgba(255,255,255,0.85)", marginTop: 4 },
  user: { color: "#fff", marginTop: 8, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 10, marginTop: -SPACING.xl },
  statCard: { flex: 1, flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#fff", padding: 14, borderRadius: RADIUS.md, ...shadow.card },
  statIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accentLight, alignItems: "center", justifyContent: "center" },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },
  statValue: { color: COLORS.text, fontWeight: "800", fontSize: 16 },
  section: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "31.5%", aspectRatio: 1, backgroundColor: "#fff", borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, padding: 8 },
  gridIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  gridLabel: { fontSize: 11, fontWeight: "700", color: COLORS.text, marginTop: 8, textAlign: "center" },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, marginTop: SPACING.lg, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md },
  noticeText: { flex: 1, color: COLORS.brandDark, fontSize: 12, lineHeight: 18 },
});
