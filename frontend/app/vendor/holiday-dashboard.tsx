import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Alert } from "react-native";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { uploadImageAsset } from "@/src/api";

export default function HolidayVendorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, bookings, banner] = await Promise.all([
        vendorApi.serviceStats(),
        vendorApi.serviceBookings(),
        vendorApi.holidayBanner(),
      ]);
      setStats(st);
      setBookingCount((bookings || []).filter((x:any) => ["pending","booking_requested","confirmed","accepted"].includes(String(x.status || "").toLowerCase())).length);
      const urls = Array.isArray(banner?.urls) ? banner.urls.map((x:any) => String(x).trim()).filter(Boolean) : [];
      const fallback = banner?.url ? [String(banner.url)] : [];
      setBannerUrls(urls.length ? urls : fallback);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.root} testID="holiday-vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={s.header}>
          <View style={s.headerTop}>
            <View style={{ width: 32 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={s.headerIcon}><MaterialCommunityIcons name="airplane-takeoff" size={22} color="#2563EB" /></View>
              <Text style={s.headerTitle}>Holiday Vendor</Text>
              <Text style={s.headerSub}>Manage holiday packages & customer bookings</Text>
              <Text style={s.welcome}>Welcome, {user?.name}</Text>
            </View>
            <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
              <Pressable onPress={() => router.push("/service-vendor/service-bookings" as any)} hitSlop={10} style={s.bell}><MaterialCommunityIcons name="bell-outline" size={23} color="#fff" />{bookingCount>0&&<View style={s.badge}><Text style={s.badgeText}>{bookingCount}</Text></View>}</Pressable>
              <Pressable onPress={logout} hitSlop={10}><MaterialCommunityIcons name="logout" size={25} color="#fff" /></Pressable>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.kpiRow}>
          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash" color={COLORS.success} />
          <KPI label="Bookings" value={stats?.bookings ?? 0} icon="calendar-check" color={COLORS.accent} />
        </View>
        <View style={s.kpiRow}>
          <KPI label="Completed" value={stats?.completed ?? 0} icon="check-circle-outline" color={COLORS.success} />
          <KPI label="Pending" value={stats?.pending ?? 0} icon="clock-outline" color="#EAB308" />
        </View>

        <View style={s.payout}>
          <Text style={s.payoutLabel}>ESTIMATED PAYOUT</Text>
          <Text style={s.payoutValue}>{`₹${stats?.payout ?? 0}`}</Text>
          <Text style={s.payoutSub}>After {stats?.commission_percent ?? 10}% platform commission</Text>
        </View>

        <Text style={s.sectionTitle}>Holiday Banners</Text>
        <View style={s.bannerCard}>
          {bannerUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bannerList}>
              {bannerUrls.map((url, index) => (
                <View key={url + index} style={s.bannerItem}>
                  <Image source={{ uri: url }} style={s.bannerPreview} contentFit="cover" />
                  <View style={s.bannerItemBar}>
                    <Text style={s.bannerIndex}>Banner {index + 1}</Text>
                    <Pressable
                      disabled={uploadingBanner}
                      onPress={async () => {
                        try {
                          await vendorApi.deleteHolidayBanner(index);
                          setBannerUrls((prev) => prev.filter((_, i) => i !== index));
                        } catch (e:any) {
                          Alert.alert("Delete failed", e?.message || "Please try again.");
                        }
                      }}
                      style={s.bannerDelete}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={16} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={s.noBanner}><Text style={s.bannerSub}>No Holiday banners added yet.</Text></View>
          )}
          <View style={s.bannerInfo}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Live Holiday page banners</Text>
              <Text style={s.bannerSub}>Add multiple banners. They rotate automatically on the Holiday page.</Text>
            </View>
            <Pressable
              disabled={uploadingBanner || bannerUrls.length >= 20}
              style={[s.bannerBtn, (uploadingBanner || bannerUrls.length >= 20) && { opacity: 0.6 }]}
              onPress={async () => {
                try {
                  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!permission.granted) {
                    Alert.alert("Permission required", "Please allow photo access to choose a banner.");
                    return;
                  }
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    allowsEditing: true,
                    aspect: [16, 5],
                    quality: 0.9,
                  });
                  if (result.canceled || !result.assets?.[0]) return;
                  setUploadingBanner(true);
                  const asset = result.assets[0];
                  const url = await uploadImageAsset({
                    uri: asset.uri,
                    fileName: asset.fileName,
                    mimeType: asset.mimeType,
                    file: (asset as any).file,
                  });
                  await vendorApi.addHolidayBanner(url);
                  setBannerUrls((prev) => [...prev, url]);
                  Alert.alert("Banner added", "Your new Holiday banner is now live.");
                } catch (e: any) {
                  Alert.alert("Banner upload failed", e?.message || "Please try again.");
                } finally {
                  setUploadingBanner(false);
                }
              }}
            >
              <MaterialCommunityIcons name="image-plus" size={18} color="#fff" />
              <Text style={s.bannerBtnText}>{uploadingBanner ? "Uploading..." : "Add banner"}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={s.sectionTitle}>Holiday Management</Text>
        <Action icon="briefcase-outline" title="Holiday Packages" sub="Add, edit and manage your holiday packages" onPress={() => router.push("/service-vendor/services" as any)} />
        <Action icon="chart-line" title="Earnings" sub="Revenue, commission and estimated payout" onPress={() => router.push("/service-vendor/earnings" as any)} />
        <Action icon="calendar-check-outline" title="Bookings" sub="View and update customer holiday bookings" onPress={() => router.push("/service-vendor/service-bookings" as any)} />
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
    <View style={s.actionIcon}><MaterialCommunityIcons name={icon} size={23} color="#2563EB" /></View>
    <View style={{ flex: 1 }}>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionSub}>{sub}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={21} color={COLORS.textMuted} />
  </Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EFF6FF" },
  header: { padding: SPACING.lg, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  badge: { position: "absolute", right: -4, top: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  headerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  headerTitle: { color: "#fff", fontWeight: "900", fontSize: 21 },
  headerSub: { color: "rgba(255,255,255,0.88)", fontSize: 12, marginTop: 3, textAlign: "center" },
  welcome: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 3 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: "#fff", padding: 13, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#DBEAFE" },
  kpiIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  kpiValue: { fontWeight: "900", color: COLORS.text, fontSize: 19 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  payout: { backgroundColor: "#1D4ED8", padding: 18, borderRadius: RADIUS.lg, marginTop: 4, marginBottom: 20 },
  payoutLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800" },
  payoutValue: { color: "#fff", fontSize: 30, fontWeight: "900", marginTop: 3 },
  payoutSub: { color: "rgba(255,255,255,0.78)", fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: COLORS.text, marginBottom: 10 },
  bannerCard: { backgroundColor: "#fff", borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#DBEAFE", overflow: "hidden", marginBottom: 20 },
  bannerList: { gap: 10, padding: 12 },
  bannerItem: { width: 250, overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: "#DBEAFE", backgroundColor: "#fff" },
  bannerPreview: { width: "100%", height: 105, backgroundColor: "#F8FAFC" },
  bannerItemBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 },
  bannerIndex: { color: COLORS.text, fontSize: 11, fontWeight: "900" },
  bannerDelete: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  noBanner: { padding: 18 },
  bannerInfo: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  bannerTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14 },
  bannerSub: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  bannerBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  bannerBtnText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#DBEAFE", marginBottom: 10 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  actionTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14 },
  actionSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
});
