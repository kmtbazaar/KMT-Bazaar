import React, { useCallback, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from "react-native";

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

import { adminApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/theme";

const { width } = Dimensions.get("window");

/* =========================================================
   PRODUCTION ADMIN PALETTE
========================================================= */

const THEME = {
  black: "#0B0B0C",
  blackSoft: "#151517",
  brown: "#5A3825",
  brownLight: "#8A5A3B",
  orange: "#F97316",
  orangeLight: "#FFF1E8",
  sky: "#38BDF8",
  skyLight: "#E0F2FE",
  white: "#FFFFFF",
  grey: "#F5F5F4",
  text: "#171717",
  muted: "#737373",
  border: "#E7E5E4",
  success: "#16A34A",
  danger: "#DC2626",
};

const ACTIONS = [
  {
    icon: "account-group-outline",
    label: "Customers",
    path: "/admin/users?role=customer",
    color: THEME.sky,
  },
  {
    icon: "store-outline",
    label: "Vendors",
    path: "/admin/users?role=vendor",
    color: THEME.orange,
  },
  {
    icon: "moped-outline",
    label: "Delivery Partners",
    path: "/admin/users?role=delivery",
    color: THEME.success,
  },
  {
    icon: "package-variant",
    label: "Products",
    path: "/admin/products",
    color: "#8B5CF6",
  },
  {
    icon: "tag-multiple-outline",
    label: "Categories",
    path: "/admin/categories",
    color: "#EC4899",
  },
  {
    icon: "briefcase-outline",
    label: "Vendor Service",
    path: "/admin/vendor-services",
    color: THEME.orange,
  },
  {
    icon: "image-multiple-outline",
    label: "Banners",
    path: "/admin/banners",
    color: THEME.sky,
  },
  {
    icon: "clipboard-list-outline",
    label: "All Orders",
    path: "/admin/orders",
    color: THEME.orange,
  },
  {
    icon: "currency-inr",
    label: "Commission",
    path: "/admin/commission",
    color: THEME.brownLight,
  },
  {
    icon: "briefcase-account-outline",
    label: "Roojgar",
    path: "/admin/roojgar",
    color: THEME.brown,
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * EXISTING DATA LOGIC — UNCHANGED
   */

  const load = useCallback(async () => {
    try {
      const statsResponse = await adminApi.stats();
      setStats(statsResponse);

      const storesResponse = await adminApi.stores("pending");
      setPendingStores(storesResponse || []);
    } catch (e) {
      console.log("Admin dashboard load error:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* =========================================================
     APPROVE STORE
  ========================================================= */

  const handleApproveStore = async (id: string, name: string) => {
    const executeApprove = async () => {
      try {
        await adminApi.approveStore(id);

        if (Platform.OS === "web") {
          window.alert(`${name} is now LIVE!`);
        } else {
          Alert.alert("Success", `${name} is now LIVE!`);
        }

        load();
      } catch (e) {
        if (Platform.OS === "web") {
          window.alert("Error approving store.");
        } else {
          Alert.alert("Error", "Could not approve the store.");
        }
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to approve '${name}' and make it live?`
      );

      if (confirmed) executeApprove();
    } else {
      Alert.alert(
        "Approve Store",
        `Approve '${name}' and make it live?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: executeApprove,
          },
        ]
      );
    }
  };

  /* =========================================================
     REJECT STORE
  ========================================================= */

  const handleRejectStore = async (id: string, name: string) => {
    const executeReject = async () => {
      try {
        await adminApi.rejectStore(id);

        if (Platform.OS === "web") {
          window.alert(`${name} has been rejected and removed.`);
        } else {
          Alert.alert(
            "Rejected",
            `${name} has been rejected and removed.`
          );
        }

        load();
      } catch (e) {
        if (Platform.OS === "web") {
          window.alert("Error rejecting store.");
        } else {
          Alert.alert("Error", "Could not reject the store.");
        }
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to REJECT and delete '${name}'?`
      );

      if (confirmed) executeReject();
    } else {
      Alert.alert(
        "Reject Store",
        `Are you sure you want to REJECT and delete '${name}'?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: executeReject,
          },
        ]
      );
    }
  };

  const maxChart = Math.max(
    1,
    ...((stats?.chart || []).map((c: any) => c.orders))
  );

  return (
    <View style={s.root} testID="admin-dashboard">
      {/* =====================================================
          HERO HEADER
      ===================================================== */}

      <SafeAreaView edges={["top"]}>
        <LinearGradient
          colors={[THEME.black, THEME.brown, THEME.black]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.header}
        >
          <View style={s.orangeGlow} />

          <Animated.View
            entering={FadeInDown.duration(600)}
            style={s.headerTop}
          >
            <View style={s.logoBox}>
              <Image
                source={{ uri: LOGO_URL }}
                style={s.logo}
                contentFit="contain"
              />
            </View>

            <View style={s.headerText}>
              <Text style={s.headerEyebrow}>
                KMT BAZAAR
              </Text>

              <Text style={s.headerTitle}>
                Admin Console
              </Text>

              <Text style={s.headerSub}>
                Welcome back, {user?.name || "Admin"}
              </Text>
            </View>

            <Pressable
              testID="admin-logout"
              onPress={async () => {
                await logout();
                router.replace("/auth/login");
              }}
              style={s.logoutButton}
              hitSlop={10}
            >
              <MaterialCommunityIcons
                name="logout"
                size={21}
                color={THEME.white}
              />
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(700)}
            style={s.liveStatus}
          >
            <View style={s.liveDot} />

            <Text style={s.liveText}>
              Dashboard Live
            </Text>

            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={THEME.sky}
            />
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            tintColor={THEME.orange}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* ===================================================
            OVERVIEW
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
        >
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>
                Overview
              </Text>

              <Text style={s.sectionSub}>
                Your marketplace at a glance
              </Text>
            </View>

            <View style={s.todayBadge}>
              <MaterialCommunityIcons
                name="calendar-today"
                size={14}
                color={THEME.brown}
              />

              <Text style={s.todayText}>
                LIVE
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ===================================================
            KPI CARDS
        =================================================== */}

        <View style={s.kpiGrid}>
          <KPI
            label="Revenue"
            value={`₹${stats?.revenue ?? 0}`}
            icon="cash-multiple"
            color={THEME.success}
            delay={150}
          />

          <KPI
            label="Orders"
            value={stats?.orders ?? 0}
            icon="package-variant"
            color={THEME.orange}
            delay={200}
          />

          <KPI
            label="Platform Earnings"
            value={`₹${stats?.platform_earnings ?? 0}`}
            icon="currency-inr"
            color={THEME.sky}
            sub={`${stats?.commission_percent ?? 10}% commission`}
            delay={250}
          />

          <KPI
            label="Customers"
            value={stats?.users ?? 0}
            icon="account-multiple"
            color={THEME.brownLight}
            delay={300}
          />

          <KPI
            label="Vendors"
            value={stats?.vendors ?? 0}
            icon="store"
            color={THEME.orange}
            delay={350}
          />

          <KPI
            label="Delivery"
            value={stats?.delivery ?? 0}
            icon="moped"
            color={THEME.sky}
            delay={400}
          />
        </View>

        {/* ===================================================
            CHART
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(450).duration(600)}
          style={s.chartCard}
        >
          <View style={s.cardHeader}>
            <View>
              <Text style={s.cardTitle}>
                Order Activity
              </Text>

              <Text style={s.cardSub}>
                Orders · Last 7 days
              </Text>
            </View>

            <View style={s.chartIcon}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={20}
                color={THEME.orange}
              />
            </View>
          </View>

          <View style={s.chartRow}>
            {(stats?.chart || []).map(
              (c: any, i: number) => (
                <View key={i} style={s.chartCol}>
                  <Text style={s.chartVal}>
                    {c.orders}
                  </Text>

                  <View style={s.chartBarWrap}>
                    <Animated.View
                      entering={FadeInUp
                        .delay(500 + i * 80)
                        .springify()}
                      style={[
                        s.chartBar,
                        {
                          height: Math.max(
                            8,
                            (c.orders / maxChart) * 105
                          ),
                        },
                      ]}
                    />
                  </View>

                  <Text style={s.chartDay}>
                    {c.day}
                  </Text>
                </View>
              )
            )}
          </View>
        </Animated.View>

        {/* ===================================================
            PENDING ORDERS
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
        >
          <Pressable
            testID="pending-orders-shortcut"
            onPress={() =>
              router.push(
                "/admin/orders?status=pending"
              )
            }
            style={({ pressed }) => [
              s.pendingCard,
              pressed && s.pressed,
            ]}
          >
            <LinearGradient
              colors={[
                THEME.brown,
                THEME.black,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pendingGradient}
            >
              <View style={s.pendingIcon}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={25}
                  color={THEME.orange}
                />
              </View>

              <View style={s.pendingContent}>
                <Text style={s.pendingTitle}>
                  {stats?.pending_orders ?? 0} Pending Orders
                </Text>

                <Text style={s.pendingSub}>
                  Tap to review & accept orders
                </Text>
              </View>

              <View style={s.arrowCircle}>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={19}
                  color={THEME.white}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ===================================================
            PENDING STORES
        =================================================== */}

        {pendingStores &&
          pendingStores.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(550).duration(600)}
              style={s.approvalSection}
            >
              <View style={s.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.sectionTitle,
                      { color: THEME.brown },
                    ]}
                  >
                    Store Approvals
                  </Text>

                  <Text style={s.sectionSub}>
                    Action required · {pendingStores.length} waiting
                  </Text>
                </View>

                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>
                    {pendingStores.length}
                  </Text>
                </View>
              </View>

              {pendingStores.map(
                (st: any, index: number) => (
                  <Animated.View
                    key={st.id}
                    entering={FadeInUp
                      .delay(600 + index * 80)
                      .duration(450)}
                    style={s.approveCard}
                  >
                    <Image
                      source={{
                        uri: st.image || LOGO_URL,
                      }}
                      style={s.approveImg}
                      contentFit="cover"
                    />

                    <View style={s.approveInfo}>
                      <Text
                        style={s.approveName}
                        numberOfLines={1}
                      >
                        {st.name}
                      </Text>

                      <View style={s.addressRow}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={13}
                          color={THEME.muted}
                        />

                        <Text
                          style={s.approveMeta}
                          numberOfLines={1}
                        >
                          {st.address || "Address unavailable"}
                        </Text>
                      </View>
                    </View>

                    <View style={s.approveActions}>
                      <Pressable
                        onPress={() =>
                          handleRejectStore(
                            st.id,
                            st.name
                          )
                        }
                        style={({ pressed }) => [
                          s.rejectBtn,
                          pressed && s.pressedSmall,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={18}
                          color={THEME.white}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleApproveStore(
                            st.id,
                            st.name
                          )
                        }
                        style={({ pressed }) => [
                          s.approveBtn,
                          pressed && s.pressedSmall,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={17}
                          color={THEME.white}
                        />

                        <Text style={s.approveBtnText}>
                          Approve
                        </Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                )
              )}
            </Animated.View>
          )}

        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(650).duration(600)}
        >
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>
                Quick Actions
              </Text>

              <Text style={s.sectionSub}>
                Manage your marketplace
              </Text>
            </View>
          </View>

          <View style={s.grid}>
            {ACTIONS.map((a, index) => (
              <Animated.View
                key={a.label}
                entering={ZoomIn
                  .delay(700 + index * 60)
                  .duration(400)}
                style={s.gridWrapper}
              >
                <Pressable
                  testID={`admin-action-${a.label}`}
                  onPress={() =>
                    router.push(a.path as any)
                  }
                  style={({ pressed }) => [
                    s.gridItem,
                    pressed && s.gridPressed,
                  ]}
                >
                  <View
                    style={[
                      s.gridIcon,
                      {
                        backgroundColor:
                          a.color + "18",
                        borderColor:
                          a.color + "35",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={a.icon as any}
                      size={27}
                      color={a.color}
                    />
                  </View>

                  <Text
                    style={s.gridLabel}
                    numberOfLines={2}
                  >
                    {a.label}
                  </Text>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={15}
                    color={THEME.muted}
                    style={s.gridArrow}
                  />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={s.footer}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={16}
            color={THEME.sky}
          />

          <Text style={s.footerText}>
            KMT Bazaar Admin · Secure Management Console
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   KPI COMPONENT
========================================================= */

function KPI({
  label,
  value,
  icon,
  color,
  sub,
  delay = 0,
}: any) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      style={s.kpiCard}
    >
      <View style={s.kpiTop}>
        <View
          style={[
            s.kpiIcon,
            {
              backgroundColor: color + "16",
              borderColor: color + "30",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={color}
          />
        </View>

        <MaterialCommunityIcons
          name="arrow-top-right"
          size={15}
          color={THEME.muted}
        />
      </View>

      <Text
        style={s.kpiValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={s.kpiLabel}>
        {label}
      </Text>

      {sub && (
        <Text
          style={[
            s.kpiSub,
            { color },
          ]}
        >
          {sub}
        </Text>
      )}
    </Animated.View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.grey,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  orangeGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: THEME.orange,
    opacity: 0.08,
    right: -70,
    top: -80,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: THEME.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  logo: {
    width: 36,
    height: 36,
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerEyebrow: {
    color: THEME.orange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerTitle: {
    color: THEME.white,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 1,
  },

  headerSub: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    marginTop: 3,
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  liveStatus: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.20)",
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },

  liveText: {
    color: THEME.white,
    fontSize: 10,
    fontWeight: "800",
  },

  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 70,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionSub: {
    color: THEME.muted,
    fontSize: 11,
    marginTop: 3,
  },

  todayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: THEME.orangeLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },

  todayText: {
    color: THEME.brown,
    fontSize: 9,
    fontWeight: "900",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },

  kpiCard: {
    width: (width - SPACING.lg * 2 - 10) / 2,
    minHeight: 124,
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },

  kpiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  kpiIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  kpiValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 11,
  },

  kpiLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  kpiSub: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },

  chartCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },

  cardSub: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 3,
  },

  chartIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.orangeLight,
  },

  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 165,
    marginTop: 12,
  },

  chartCol: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },

  chartBarWrap: {
    height: 110,
    width: "52%",
    justifyContent: "flex-end",
    backgroundColor: "#F5F5F4",
    borderRadius: 8,
    overflow: "hidden",
  },

  chartBar: {
    width: "100%",
    backgroundColor: THEME.orange,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  chartVal: {
    color: THEME.brown,
    fontSize: 10,
    fontWeight: "900",
  },

  chartDay: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: "700",
  },

  pendingCard: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: THEME.brown,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 4,
  },

  pendingGradient: {
    minHeight: 78,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  pendingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(249,115,22,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.25)",
  },

  pendingContent: {
    flex: 1,
  },

  pendingTitle: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "900",
  },

  pendingSub: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    marginTop: 3,
  },

  arrowCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  approvalSection: {
    marginTop: 20,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  countBadgeText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: "900",
  },

  approveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: THEME.white,
    padding: 11,
    marginBottom: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderLeftWidth: 4,
    borderLeftColor: THEME.orange,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  approveImg: {
    width: 47,
    height: 47,
    borderRadius: 13,
    backgroundColor: THEME.grey,
  },

  approveInfo: {
    flex: 1,
    minWidth: 0,
  },

  approveName: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: "900",
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 2,
  },

  approveMeta: {
    flex: 1,
    color: THEME.muted,
    fontSize: 10,
  },

  approveActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  rejectBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
  },

  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.success,
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 13,
  },

  approveBtnText: {
    color: THEME.white,
    fontWeight: "900",
    fontSize: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  gridWrapper: {
    width: (width - SPACING.lg * 2 - 20) / 3,
  },

  gridItem: {
    minHeight: 128,
    backgroundColor: THEME.white,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 9,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  gridPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },

  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  gridLabel: {
    color: THEME.text,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 13,
  },

  gridArrow: {
    position: "absolute",
    right: 7,
    top: 7,
  },

  pressed: {
    opacity: 0.9,
  },

  pressedSmall: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
    paddingVertical: 12,
  },

  footerText: {
    color: THEME.muted,
    fontSize: 9,
    fontWeight: "600",
  },
});