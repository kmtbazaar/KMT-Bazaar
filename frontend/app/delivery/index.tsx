import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, View, Text, StyleSheet, Pressable, Switch, RefreshControl, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { deliveryApi } from "@/src/roleApi";
import { api } from "@/src/api";
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
  const [unread, setUnread] = useState(0);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [popupOrder, setPopupOrder] = useState<any | null>(null);

  const previousAvailableIds = useRef<string[]>([]);
  const availabilityInitialized = useRef(false);
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslateY = useRef(new Animated.Value(-24)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUnread = useCallback(async () => {
    try {
      const result = await api.unreadCount();
      setUnread(Number(result?.count || 0));
    } catch {}
  }, []);

  const showIncomingPopup = useCallback((order: any) => {
    if (popupTimer.current) clearTimeout(popupTimer.current);

    setPopupOrder(order);
    popupOpacity.setValue(0);
    popupTranslateY.setValue(-24);

    Animated.parallel([
      Animated.timing(popupOpacity, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.spring(popupTranslateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: false }),
    ]).start();

    popupTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(popupOpacity, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.timing(popupTranslateY, { toValue: -24, duration: 180, useNativeDriver: false }),
      ]).start(() => setPopupOrder(null));
    }, 3000);
  }, [popupOpacity, popupTranslateY]);

  const load = useCallback(async (detectIncoming = true) => {
    try {
      const [me, st, av, my] = await Promise.all([
        deliveryApi.me(),
        deliveryApi.stats(),
        deliveryApi.available(),
        deliveryApi.my(),
      ]);

      const nextAvailable = Array.isArray(av) ? av : [];
      const nextIds = nextAvailable.map((o: any) => o.id).filter(Boolean);

      if (detectIncoming && availabilityInitialized.current) {
        const previous = new Set(previousAvailableIds.current);
        const incoming = nextAvailable.find((o: any) => o.id && !previous.has(o.id));
        if (incoming) showIncomingPopup(incoming);
      }

      previousAvailableIds.current = nextIds;
      availabilityInitialized.current = true;

      setOnline(!!me.online);
      setStats(st);
      setAvailable(nextAvailable);
      setMine(Array.isArray(my) ? my : []);
    } catch {}
  }, [showIncomingPopup]);

  useFocusEffect(
    useCallback(() => {
      load(false);
      loadUnread();

      const refreshTimer = setInterval(() => {
        load(true);
        loadUnread();
      }, 8000);

      return () => {
        clearInterval(refreshTimer);
        if (popupTimer.current) {
          clearTimeout(popupTimer.current);
          popupTimer.current = null;
        }
      };
    }, [load, loadUnread])
  );

  useEffect(() => {
    return () => {
      if (popupTimer.current) clearTimeout(popupTimer.current);
    };
  }, []);

  const onToggleOnline = async (v: boolean) => {
    setOnline(v);
    await deliveryApi.toggleOnline(v);
    load(false);
  };

  const onClaim = async (id: string) => {
    if (!online || acceptedId) return;

    setAcceptedId(id);
    cardScale.setValue(0.985);

    Animated.sequence([
      Animated.spring(cardScale, { toValue: 1.02, friction: 5, tension: 90, useNativeDriver: false }),
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: false }),
    ]).start();

    try {
      await deliveryApi.claim(id);
      await new Promise((resolve) => setTimeout(resolve, 350));
      await load(false);
    } catch {
      setAcceptedId(null);
    } finally {
      setAcceptedId(null);
    }
  };

  const onDeliver = async (id: string) => {
    await deliveryApi.markDelivered(id);
    load(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(false);
    await loadUnread();
    setRefreshing(false);
  };

  const openNotifications = () => {
    setUnread(0);
    router.push("/notifications" as any);
  };

  const active = mine.filter(o => o.status === "out_for_delivery");
  const history = mine.filter(o => o.status === "delivered");
  const display = tab === "available" ? available : tab === "active" ? active : history;
  const activeOrderIds = active.map((o: any) => o.id).filter(Boolean).join("|");

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let stopped = false;

    const startLocationTracking = async () => {
      if (!online || !activeOrderIds) return;

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (stopped || permission.status !== "granted") return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 15,
          },
          async (position) => {
            if (stopped) return;
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            await Promise.all(
              activeOrderIds
                .split("|")
                .filter(Boolean)
                .map((orderId) => deliveryApi.updateLocation(orderId, location).catch(() => null))
            );
          }
        );
      } catch (error) {
        console.log("Delivery location tracking unavailable:", error);
      }
    };

    startLocationTracking();

    return () => {
      stopped = true;
      if (subscription) subscription.remove();
    };
  }, [online, activeOrderIds]);

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
            <View style={s.headerActions}>
              <Pressable testID="delivery-notifications-bell" onPress={openNotifications} hitSlop={10} style={s.bellBtn}>
                <MaterialCommunityIcons name={unread > 0 ? "bell-ring-outline" : "bell-outline"} size={23} color="#fff" />
                {unread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable testID="delivery-logout" onPress={async () => { await logout(); router.replace("/auth/login"); }} hitSlop={10}>
                <MaterialCommunityIcons name="logout" size={22} color="#fff" />
              </Pressable>
            </View>
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

      {popupOrder && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.incomingPopup,
            {
              opacity: popupOpacity,
              transform: [{ translateY: popupTranslateY }],
            },
          ]}
        >
          <View style={s.popupIcon}>
            <MaterialCommunityIcons name="moped-electric" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.popupTitle}>New Pickup Available</Text>
            <Text style={s.popupSub}>Order #{popupOrder.order_no} is ready to accept</Text>
          </View>
          <Text style={s.popupAmount}>₹{popupOrder.total}</Text>
        </Animated.View>
      )}

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
          <View style={s.orderList}>
            {display.map((item: any) => {
              const isAccepted = acceptedId === item.id;

              return (
                <Animated.View
                  key={item.id}
                  style={[
                    s.card,
                    isAccepted && s.cardAccepted,
                    isAccepted && { transform: [{ scale: cardScale }] },
                  ]}
                  testID={`delivery-order-${item.id}`}
                >
                  <View style={s.cardHead}>
                    <View style={s.orderTitleRow}>
                      <Text style={s.orderNo}>#{item.order_no}</Text>
                      {isAccepted && (
                        <View style={s.acceptedPill}>
                          <MaterialCommunityIcons name="check-circle" size={13} color={COLORS.success} />
                          <Text style={s.acceptedPillText}>Accepted</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.total}>₹{item.total}</Text>
                  </View>

                  <Text style={s.cust}>
                    <MaterialCommunityIcons name="account" size={12} color={COLORS.textMuted} /> {item.customer?.name} · {item.customer?.phone}
                  </Text>

                  <Text style={s.addr}>
                    <MaterialCommunityIcons name="map-marker" size={12} color={COLORS.textMuted} /> {item.address?.line1}, {item.address?.city} - {item.address?.pincode}
                  </Text>

                  <Text style={s.itemsInfo}>
                    {item.items?.length || 0} item{(item.items?.length || 0) > 1 ? "s" : ""} · {item.payment_method?.toUpperCase()}
                  </Text>

                  {tab === "available" && (
                    <Pressable
                      testID={`claim-${item.id}`}
                      onPress={() => onClaim(item.id)}
                      disabled={!online || !!acceptedId}
                      style={[
                        s.btn,
                        isAccepted ? s.btnSuccess : s.btnAccent,
                        (!online || !!acceptedId) && !isAccepted && { opacity: 0.4 },
                      ]}
                    >
                      <MaterialCommunityIcons name={isAccepted ? "check-bold" : "moped"} size={16} color="#fff" />
                      <Text style={s.btnText}>
                        {isAccepted ? "Pickup Accepted" : online ? "Accept Pickup" : "Go online first"}
                      </Text>
                    </Pressable>
                  )}

                  {tab === "active" && (
                    <Pressable
                      testID={`deliver-${item.id}`}
                      onPress={() => onDeliver(item.id)}
                      style={[s.btn, s.btnSuccess]}
                    >
                      <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />
                      <Text style={s.btnText}>Mark Delivered</Text>
                    </Pressable>
                  )}
                </Animated.View>
              );
            })}
          </View>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  bellBtn: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -8, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
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

  orderList: { padding: SPACING.lg, paddingTop: 8, gap: 10 },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cardAccepted: { backgroundColor: "#ECFDF5", borderColor: COLORS.success, borderWidth: 1.5 },
  orderTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptedPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: "#DCFCE7" },
  acceptedPillText: { color: COLORS.success, fontSize: 9, fontWeight: "800" },
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

  incomingPopup: {
    position: "absolute",
    top: 112,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: "#14532D",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  popupIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" },
  popupTitle: { color: "#fff", fontWeight: "900", fontSize: 13 },
  popupSub: { color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 2 },
  popupAmount: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
