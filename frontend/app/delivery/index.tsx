import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Switch, RefreshControl, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { deliveryApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/theme";

export default function DeliveryDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [online, setOnline] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [available, setAvailable] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [tab, setTab] = useState<"available" | "active" | "history">("available");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, st, av, my] = await Promise.all([deliveryApi.me(), deliveryApi.stats(), deliveryApi.available(), deliveryApi.my()]);
      setOnline(!!me.online); setStats(st); setAvailable(av); setMine(my);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleOnline = async (v: boolean) => {
    setOnline(v); await deliveryApi.toggleOnline(v);
  };

  const onClaim = async (id: string) => { await deliveryApi.claim(id); load(); };
  const onDeliver = async (id: string) => { await deliveryApi.markDelivered(id); load(); };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const active = mine.filter(o => o.status === "out_for_delivery");
  const history = mine.filter(o => o.status === "delivered");
  const display = tab === "available" ? available : tab === "active" ? active : history;

  return (
    <View style={s.root} testID="delivery-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient colors={["#16A34A", "#15803D"]} style={s.header}>
          <View style={s.headerTop}>
            <Image source={{ uri: LOGO_URL }} style={{ width: 36, height: 36 }} contentFit="contain" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.headerTitle}>Delivery Partner</Text>
              <Text style={s.headerSub}>Welcome, {user?.name}</Text>
            </View>
            <Pressable testID="delivery-logout" onPress={async () => { await logout(); router.replace("/auth/login"); }} hitSlop={10}>
              <MaterialCommunityIcons name="logout" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={s.statusRow}>
            <View>
              <Text style={s.statusLabel}>Status</Text>
              <Text style={s.statusVal}>{online ? "ONLINE · Accepting Orders" : "OFFLINE"}</Text>
            </View>
            <Switch
              testID="online-toggle"
              value={online}
              onValueChange={onToggleOnline}
              trackColor={{ true: COLORS.accent, false: "rgba(255,255,255,0.3)" }}
              thumbColor="#fff"
            />
          </View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.success} />}
      >
        <View style={s.statsRow}>
          <StatCard label="Earnings" value={`₹${stats?.earnings ?? 0}`} icon="wallet" color={COLORS.success} sub="₹30 per delivery" />
          <StatCard label="Delivered" value={stats?.delivered ?? 0} icon="check-circle" color={COLORS.brand} />
          <StatCard label="Today" value={stats?.today_orders ?? 0} icon="calendar-today" color={COLORS.accent} />
        </View>

        <View style={s.tabs}>
          {(["available", "active", "history"] as const).map((t) => (
            <Pressable
              key={t}
              testID={`tab-${t}`}
              onPress={() => setTab(t)}
              style={[s.tab, tab === t && s.tabActive]}
            >
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === "available" ? `Available (${available.length})` : t === "active" ? `Active (${active.length})` : `History (${history.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {display.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="moped-electric" size={64} color={COLORS.textMuted} />
            <Text style={s.emptyText}>
              {tab === "available" ? "No orders waiting for pickup" : tab === "active" ? "No active deliveries" : "No delivery history"}
            </Text>
            {!online && tab === "available" && <Text style={s.emptySub}>Go online to start accepting orders</Text>}
          </View>
        ) : (
          <FlatList
            data={display}
            scrollEnabled={false}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: SPACING.lg, paddingTop: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={s.card} testID={`delivery-order-${item.id}`}>
                <View style={s.cardHead}>
                  <Text style={s.orderNo}>#{item.order_no}</Text>
                  <Text style={s.total}>₹{item.total}</Text>
                </View>
                <Text style={s.cust}><MaterialCommunityIcons name="account" size={12} color={COLORS.textMuted} /> {item.customer?.name} · {item.customer?.phone}</Text>
                <Text style={s.addr}><MaterialCommunityIcons name="map-marker" size={12} color={COLORS.textMuted} /> {item.address?.line1}, {item.address?.city} - {item.address?.pincode}</Text>
                <Text style={s.itemsInfo}>{item.items.length} item{item.items.length > 1 ? "s" : ""} · {item.payment_method?.toUpperCase()}</Text>
                {tab === "available" && (
                  <Pressable testID={`claim-${item.id}`} onPress={() => onClaim(item.id)} disabled={!online} style={[s.btn, s.btnAccent, !online && { opacity: 0.4 }]}>
                    <MaterialCommunityIcons name="moped" size={16} color="#fff" />
                    <Text style={s.btnText}>{online ? "Accept Pickup" : "Go online first"}</Text>
                  </Pressable>
                )}
                {tab === "active" && (
                  <Pressable testID={`deliver-${item.id}`} onPress={() => onDeliver(item.id)} style={[s.btn, s.btnSuccess]}>
                    <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />
                    <Text style={s.btnText}>Mark Delivered</Text>
                  </Pressable>
                )}
              </View>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color, sub }: any) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: color + "1A" }]}><MaterialCommunityIcons name={icon} size={18} color={color} /></View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { padding: SPACING.lg, paddingBottom: SPACING.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 18 },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: RADIUS.md },
  statusLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },
  statusVal: { color: "#fff", fontWeight: "800", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 8, padding: SPACING.lg },
  statCard: { flex: 1, backgroundColor: "#fff", padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontWeight: "800", color: COLORS.text, fontSize: 15 },
  statLabel: { color: COLORS.textMuted, fontSize: 10 },
  statSub: { color: COLORS.success, fontSize: 9, marginTop: 1 },

  tabs: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: SPACING.lg, padding: 4, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.brand },
  tabText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 11 },
  tabTextActive: { color: "#fff" },

  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: SPACING.lg, gap: 8 },
  emptyText: { color: COLORS.textMuted, marginTop: 10, fontWeight: "600" },
  emptySub: { color: COLORS.textMuted, fontSize: 12 },

  card: { backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between" },
  orderNo: { fontWeight: "800", color: COLORS.text },
  total: { fontWeight: "800", color: COLORS.success, fontSize: 15 },
  cust: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  addr: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  itemsInfo: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  btn: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: RADIUS.pill, marginTop: 10 },
  btnAccent: { backgroundColor: COLORS.accent },
  btnSuccess: { backgroundColor: COLORS.success },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
