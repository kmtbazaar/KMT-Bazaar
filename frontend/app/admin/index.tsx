import React, { useCallback, useState } from "react";

import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Dimensions, Alert, Platform } from "react-native";

import { Image } from "expo-image";

import { useFocusEffect, useRouter } from "expo-router";

import { LinearGradient } from "expo-linear-gradient";

import { SafeAreaView } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import Animated, { FadeInUp } from "react-native-reanimated";

import { adminApi } from "@/src/roleApi";

import { useAuth } from "@/src/AuthContext";

import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/theme";



const { width } = Dimensions.get("window");



const ACTIONS = [

  { icon: "account-group-outline", label: "Customers", path: "/admin/users?role=customer", color: "#2563EB" },

  { icon: "store-outline", label: "Vendors", path: "/admin/users?role=vendor", color: "#F97316" },

  { icon: "moped-outline", label: "Delivery Partners", path: "/admin/users?role=delivery", color: "#16A34A" },

  { icon: "package-variant", label: "Products", path: "/admin/products", color: "#9333EA" },

  { icon: "tag-multiple-outline", label: "Categories", path: "/admin/categories", color: "#DB2777" },

  { icon: "image-multiple-outline", label: "Banners", path: "/admin/banners", color: "#0891B2" },

  { icon: "clipboard-list-outline", label: "All Orders", path: "/admin/orders", color: "#DC2626" },

  { icon: "currency-inr", label: "Commission", path: "/admin/commission", color: "#CA8A04" },

];



export default function AdminDashboard() {

  const router = useRouter();

  const { user, logout } = useAuth();

  const [stats, setStats] = useState<any>(null);

 

  const [pendingStores, setPendingStores] = useState<any[]>([]);

  const [refreshing, setRefreshing] = useState(false);



  const load = useCallback(async () => {

    try {

      setStats(await adminApi.stats());

      const storesResponse = await adminApi.stores("pending");

      setPendingStores(storesResponse || []);

    } catch (e) {

      console.log(e);

    }

  }, []);



  useFocusEffect(useCallback(() => { load(); }, [load]));



  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

 

  // APPROVE LOGIC

  const handleApproveStore = async (id: string, name: string) => {

    const executeApprove = async () => {

      try {

        await adminApi.approveStore(id);

        if (Platform.OS === 'web') { window.alert(`${name} is now LIVE!`); }

        else { Alert.alert("Success", `${name} is now LIVE!`); }

        load();

      } catch (e) {

        if (Platform.OS === 'web') { window.alert("Error approving store."); }

        else { Alert.alert("Error", "Could not approve the store."); }

      }

    };



    if (Platform.OS === 'web') {

      const confirmed = window.confirm(`Are you sure you want to approve '${name}' and make it live?`);

      if (confirmed) { executeApprove(); }

    } else {

      Alert.alert("Approve Store", `Approve '${name}' and make it live?`, [

        { text: "Cancel", style: "cancel" },

        { text: "Approve", style: "default", onPress: executeApprove }

      ]);

    }

  };



  // 🔥 NAYA: REJECT LOGIC

  const handleRejectStore = async (id: string, name: string) => {

    const executeReject = async () => {

      try {

        await adminApi.rejectStore(id);

        if (Platform.OS === 'web') { window.alert(`${name} has been rejected and removed.`); }

        else { Alert.alert("Rejected", `${name} has been rejected and removed.`); }

        load();

      } catch (e) {

        if (Platform.OS === 'web') { window.alert("Error rejecting store."); }

        else { Alert.alert("Error", "Could not reject the store."); }

      }

    };



    if (Platform.OS === 'web') {

      const confirmed = window.confirm(`Are you sure you want to REJECT and delete '${name}'?`);

      if (confirmed) { executeReject(); }

    } else {

      Alert.alert("Reject Store", `Are you sure you want to REJECT and delete '${name}'?`, [

        { text: "Cancel", style: "cancel" },

        { text: "Reject", style: "destructive", onPress: executeReject }

      ]);

    }

  };



  const maxChart = Math.max(1, ...((stats?.chart || []).map((c: any) => c.orders)));



  return (

    <View style={s.root} testID="admin-dashboard">

      <SafeAreaView edges={["top"]}>

        <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.header}>

          <View style={s.headerTop}>

            <Image source={{ uri: LOGO_URL }} style={{ width: 36, height: 36 }} contentFit="contain" />

            <View style={{ flex: 1, marginLeft: 10 }}>

              <Text style={s.headerTitle}>Admin Console</Text>

              <Text style={s.headerSub}>Hi, {user?.name}</Text>

            </View>

            <Pressable testID="admin-logout" onPress={async () => { await logout(); router.replace("/auth/login"); }} hitSlop={10}>

              <MaterialCommunityIcons name="logout" size={22} color="#fff" />

            </Pressable>

          </View>

        </LinearGradient>

      </SafeAreaView>

      <ScrollView

        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}

        refreshControl={<RefreshControl tintColor={COLORS.brand} refreshing={refreshing} onRefresh={onRefresh} />}

      >

        <View style={s.kpiRow}>

          <KPI label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash-multiple" color={COLORS.success} />

          <KPI label="Orders" value={stats?.orders ?? 0} icon="package-variant" color={COLORS.accent} />

        </View>

        <View style={s.kpiRow}>

          <KPI label="Platform Earnings" value={`₹${stats?.platform_earnings ?? 0}`} icon="currency-inr" color={COLORS.brand} sub={`${stats?.commission_percent ?? 10}% commission`} />

          <KPI label="Customers" value={stats?.users ?? 0} icon="account-multiple" color="#9333EA" />

        </View>

        <View style={s.kpiRow}>

          <KPI label="Vendors" value={stats?.vendors ?? 0} icon="store" color="#0891B2" />

          <KPI label="Delivery" value={stats?.delivery ?? 0} icon="moped" color="#DB2777" />

        </View>



        <View style={s.chartCard}>

          <Text style={s.chartTitle}>Orders · Last 7 days</Text>

          <View style={s.chartRow}>

            {(stats?.chart || []).map((c: any, i: number) => (

              <View key={i} style={s.chartCol}>

                <View style={s.chartBarWrap}>

                  <Animated.View entering={FadeInUp.delay(i * 50).springify()} style={[s.chartBar, { height: Math.max(8, (c.orders / maxChart) * 100) }]} />

                </View>

                <Text style={s.chartVal}>{c.orders}</Text>

                <Text style={s.chartDay}>{c.day}</Text>

              </View>

            ))}

          </View>

        </View>



        <Pressable testID="pending-orders-shortcut" onPress={() => router.push("/admin/orders?status=pending")} style={s.alertCard}>

          <View style={s.alertIcon}><MaterialCommunityIcons name="alert-circle-outline" size={22} color={COLORS.accent} /></View>

          <View style={{ flex: 1 }}>

            <Text style={s.alertTitle}>{stats?.pending_orders ?? 0} pending orders</Text>

            <Text style={s.alertSub}>Tap to review &amp; accept</Text>

          </View>

          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />

        </Pressable>



        {/* PENDING STORES LIST */}

        {pendingStores && pendingStores.length > 0 && (

          <View style={{ marginTop: SPACING.md }}>

            <Text style={[s.section, { color: COLORS.error }]}>Action Required: Store Approvals ({pendingStores.length})</Text>

            {pendingStores.map((st: any) => (

              <View key={st.id} style={s.approveCard}>

                <Image source={{ uri: st.image || LOGO_URL }} style={s.approveImg} contentFit="cover" />

                <View style={{ flex: 1 }}>

                  <Text style={s.approveName}>{st.name}</Text>

                  <Text style={s.approveMeta} numberOfLines={1}>{st.address}</Text>

                </View>

               

                {/* 🔥 NAYA: Buttons Row (Reject & Approve) */}

                <View style={{ flexDirection: 'row', gap: 6 }}>

                  <Pressable onPress={() => handleRejectStore(st.id, st.name)} style={s.rejectBtn}>

                    <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" />

                  </Pressable>

                  <Pressable onPress={() => handleApproveStore(st.id, st.name)} style={s.approveBtn}>

                    <MaterialCommunityIcons name="check-decagram" size={16} color="#fff" />

                    <Text style={s.approveBtnText}>Approve</Text>

                  </Pressable>

                </View>



              </View>

            ))}

          </View>

        )}



        <Text style={s.section}>Quick Actions</Text>

        <View style={s.grid}>

          {ACTIONS.map((a) => (

            <Pressable

              key={a.label}

              testID={`admin-action-${a.label}`}

              onPress={() => router.push(a.path as any)}

              style={s.gridItem}

            >

              <View style={[s.gridIcon, { backgroundColor: a.color + "1A" }]}>

                <MaterialCommunityIcons name={a.icon as any} size={26} color={a.color} />

              </View>

              <Text style={s.gridLabel}>{a.label}</Text>

            </Pressable>

          ))}

        </View>

      </ScrollView>

    </View>

  );

}



function KPI({ label, value, icon, color, sub }: any) {

  return (

    <View style={s.kpiCard}>

      <View style={[s.kpiIcon, { backgroundColor: color + "1A" }]}>

        <MaterialCommunityIcons name={icon} size={20} color={color} />

      </View>

      <Text style={s.kpiValue}>{value}</Text>

      <Text style={s.kpiLabel}>{label}</Text>

      {sub && <Text style={s.kpiSub}>{sub}</Text>}

    </View>

  );

}



const s = StyleSheet.create({

  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },

  header: { padding: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },

  headerTop: { flexDirection: "row", alignItems: "center" },

  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },

  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },

  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },

  kpiCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },

  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },

  kpiValue: { fontWeight: "800", color: COLORS.text, fontSize: 18 },

  kpiLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  kpiSub: { color: COLORS.brand, fontSize: 10, marginTop: 2, fontWeight: "600" },

  chartCard: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginTop: 8, borderWidth: 1, borderColor: COLORS.border },

  chartTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 12 },

  chartRow: { flexDirection: "row", alignItems: "flex-end", height: 140 },

  chartCol: { flex: 1, alignItems: "center", gap: 4 },

  chartBarWrap: { height: 100, justifyContent: "flex-end", width: "70%" },

  chartBar: { backgroundColor: COLORS.brand, borderTopLeftRadius: 6, borderTopRightRadius: 6, width: "100%" },

  chartVal: { fontSize: 11, color: COLORS.text, fontWeight: "700" },

  chartDay: { fontSize: 10, color: COLORS.textMuted },

  alertCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", padding: 12, marginTop: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent },

  alertIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentLight, alignItems: "center", justifyContent: "center" },

  alertTitle: { fontWeight: "800", color: COLORS.text },

  alertSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  section: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.md },

 

  approveCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.error + "50", marginBottom: 8, borderLeftWidth: 4, borderLeftColor: COLORS.error },

  approveImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary },

  approveName: { fontWeight: "800", color: COLORS.text, fontSize: 15 },

  approveMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

 

  // 🔥 NAYA: Reject Button Style

  rejectBtn: { backgroundColor: COLORS.error, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, justifyContent: "center" },

  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },

  approveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

 

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  gridItem: { width: (width - SPACING.lg * 2 - 10 * 2) / 3, aspectRatio: 1, backgroundColor: "#fff", borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, padding: 8, gap: 8 },

  gridIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },

  gridLabel: { fontSize: 11, fontWeight: "700", color: COLORS.text, textAlign: "center" },

}); 

