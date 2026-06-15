import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

const ITEMS = [
  { icon: "package-variant", label: "My Orders", path: "/orders" },
  { icon: "map-marker-multiple-outline", label: "Saved Addresses", path: "/addresses" },
  { icon: "bell-outline", label: "Notifications", path: "/notifications" },
  { icon: "heart-outline", label: "Wishlist", path: null },
  { icon: "tag-outline", label: "Offers & Coupons", path: null },
  { icon: "headset", label: "Help & Support", path: null },
  { icon: "shield-check-outline", label: "Privacy Policy", path: null },
  { icon: "information-outline", label: "About KMT Bazaar", path: null },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="profile-screen">
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.header}>
        <View style={s.avatarWrap}>
          <Image source={{ uri: LOGO_URL }} style={s.avatar} contentFit="contain" />
        </View>
        <Text style={s.name} testID="profile-user-name">{user?.name || "Guest"}</Text>
        <Text style={s.email}>{user?.email || user?.phone || "—"}</Text>
        <View style={s.rolePill}>
          <Text style={s.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {ITEMS.map((it, idx) => (
            <Pressable
              key={it.label}
              testID={`profile-item-${it.icon}`}
              onPress={() => it.path && router.push(it.path as any)}
              style={[s.row, idx < ITEMS.length - 1 && s.rowBorder]}
            >
              <View style={s.iconWrap}>
                <MaterialCommunityIcons name={it.icon as any} size={20} color={COLORS.brand} />
              </View>
              <Text style={s.rowLabel}>{it.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable testID="logout-button" onPress={async () => { await logout(); router.replace("/auth/login"); }} style={s.logout}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
          <Text style={s.logoutText}>Logout</Text>
        </Pressable>

        <Text style={s.version}>KMT Bazaar v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.xl, paddingTop: SPACING.xl, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow.card },
  avatar: { width: 64, height: 64 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 10 },
  email: { color: "rgba(255,255,255,0.85)", marginTop: 2, fontSize: 13 },
  rolePill: { marginTop: 10, backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 4, borderRadius: RADIUS.pill },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: "row", alignItems: "center", padding: SPACING.md, gap: SPACING.md },
  rowBorder: { borderBottomWidth: 1, borderColor: COLORS.border },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, color: COLORS.text, fontWeight: "600" },

  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: SPACING.lg, padding: 14, borderWidth: 1.5, borderColor: COLORS.error, borderRadius: RADIUS.pill, backgroundColor: "#fff" },
  logoutText: { color: COLORS.error, fontWeight: "800" },
  version: { textAlign: "center", color: COLORS.textMuted, marginTop: SPACING.lg, fontSize: 12 },
});
