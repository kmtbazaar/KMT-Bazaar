import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";
import AnimatedBrandLogo, { BrandingFooter } from "@/src/components/AnimatedBrandLogo";

export default function CarRentalVendorDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [bannerForm, setBannerForm] = useState<any>({ title: "", subtitle: "", image: "", active: true });
  const [savingBanner, setSavingBanner] = useState(false);

  const load = useCallback(async () => {
    const [st, bookings, banner] = await Promise.all([
      vendorApi.serviceStats().catch(() => null),
      vendorApi.serviceBookings().catch(() => []),
      vendorApi.carRentalBanner().catch(() => null),
    ]);
    if (st) setStats(st);
    setBookingCount((bookings || []).filter((x:any) => ["pending","booking_requested","confirmed","accepted"].includes(String(x.status || "").toLowerCase())).length);
    if (banner) {
      setBannerForm({
        title: banner.title || "",
        subtitle: banner.subtitle || "",
        image: banner.image || "",
        active: banner.active !== false,
      });
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveBanner = async () => {
    setSavingBanner(true);
    try {
      const saved = await vendorApi.updateCarRentalBanner({
        title: String(bannerForm.title || "").trim(),
        subtitle: String(bannerForm.subtitle || "").trim(),
        image: String(bannerForm.image || "").trim(),
        active: bannerForm.active !== false,
      });
      setBannerForm({
        title: saved.title || "",
        subtitle: saved.subtitle || "",
        image: saved.image || "",
        active: saved.active !== false,
      });
      const message = "Car Rental banner settings saved.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Banner saved", message);
    } catch (e: any) {
      const message = e?.message || "Could not save banner settings.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Save failed", message);
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <View style={s.root} testID="car-rental-vendor-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={["#111827", "#0F172A"]} style={s.header}>
          <View style={s.headerTop}>
            <View style={{ width: 32 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <AnimatedBrandLogo size={48} />
              <Text style={s.headerTitle}>Car Rental Vendor</Text>
              <Text style={s.headerSub}>Manage vehicles, rentals & trip bookings</Text>
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

        <Text style={s.sectionTitle}>Customer Page Banner</Text>
        <View style={s.bannerCard} testID="car-rental-banner-settings">
          <Text style={s.bannerHelp}>Customize the image and message shown on the public Car Rental page.</Text>
          <Text style={s.bannerFieldLabel}>Banner title</Text>
          <TextInput
            value={bannerForm.title}
            onChangeText={(value) => setBannerForm((prev: any) => ({ ...prev, title: value }))}
            placeholder="Explore your next ride"
            maxLength={120}
            style={s.bannerInput}
            testID="car-rental-banner-title"
          />
          <Text style={s.bannerFieldLabel}>Banner subtitle</Text>
          <TextInput
            value={bannerForm.subtitle}
            onChangeText={(value) => setBannerForm((prev: any) => ({ ...prev, subtitle: value }))}
            placeholder="City rides · Family trips · Outstation travel"
            maxLength={240}
            style={s.bannerInput}
            testID="car-rental-banner-subtitle"
          />
          <ImageUploader
            value={bannerForm.image}
            onChange={(image) => setBannerForm((prev: any) => ({ ...prev, image }))}
            label="Banner image (wide landscape)"
            aspect={[16, 5]}
            testID="car-rental-banner-image"
          />
          <View style={s.bannerToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerToggleTitle}>Show custom banner</Text>
              <Text style={s.bannerHelp}>Turn off to use the automatic fleet-photo banner.</Text>
            </View>
            <Switch
              value={bannerForm.active !== false}
              onValueChange={(active) => setBannerForm((prev: any) => ({ ...prev, active }))}
              trackColor={{ false: "#CBD5E1", true: "#7DD3FC" }}
              thumbColor={bannerForm.active !== false ? "#0284C7" : "#64748B"}
              testID="car-rental-banner-active"
            />
          </View>
          <Pressable
            disabled={savingBanner}
            onPress={saveBanner}
            style={[s.bannerSave, savingBanner && { opacity: 0.65 }]}
            testID="car-rental-banner-save"
          >
            <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />
            <Text style={s.bannerSaveText}>{savingBanner ? "Saving..." : "Save Banner Settings"}</Text>
          </Pressable>
        </View>

        <Text style={s.sectionTitle}>Car Rental Management</Text>
        <Action icon="car-multiple" title="Rental Fleet" sub="Add, edit and manage your rental vehicles" onPress={() => router.push("/service-vendor/services" as any)} />
        <Action icon="chart-line" title="Earnings" sub="Revenue, commission and estimated payout" onPress={() => router.push("/service-vendor/earnings" as any)} />
        <Action icon="calendar-check-outline" title="Rental Bookings" sub="View and update customer rental bookings" onPress={() => router.push("/service-vendor/service-bookings" as any)} />
        <BrandingFooter caption="Car Rental Partner · Powered by KMT Bazaar" />
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
  headerTop: { flexDirection: "row", alignItems: "center" },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  badge: { position: "absolute", right: -4, top: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
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
  bannerCard: { backgroundColor: "#fff", padding: 15, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "#BAE6FD", marginBottom: 20 },
  bannerHelp: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16, marginBottom: 10 },
  bannerFieldLabel: { color: COLORS.text, fontSize: 11, fontWeight: "800", marginBottom: 5 },
  bannerInput: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, marginBottom: 12 },
  bannerToggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, marginBottom: 8 },
  bannerToggleTitle: { color: COLORS.text, fontSize: 12, fontWeight: "900", marginBottom: 3 },
  bannerSave: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0284C7", paddingVertical: 13, borderRadius: 12, marginTop: 3 },
  bannerSaveText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  actionTitle: { color: COLORS.text, fontWeight: "900", fontSize: 14 },
  actionSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
});
