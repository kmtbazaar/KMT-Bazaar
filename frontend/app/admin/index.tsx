import React, { useCallback, useEffect, useState } from "react";

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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { adminApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { LOGO_URL, SPACING } from "@/src/theme";
import {
  DEFAULT_ADMIN_ACTIONS,
  loadAdminSettings,
} from "@/src/adminSettings";

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


export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceBookingCount, setServiceBookingCount] = useState(0);
  const [serviceBookingTotal, setServiceBookingTotal] = useState(0);
  const [serviceVendorCount, setServiceVendorCount] = useState(0);
  const [quickActions, setQuickActions] = useState(DEFAULT_ADMIN_ACTIONS);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const activityPulse = useSharedValue(0.55);

  useEffect(() => {
    activityPulse.value = withRepeat(
      withTiming(1, { duration: 1250 }),
      -1,
      true
    );
  }, [activityPulse]);

  const activityPulseStyle = useAnimatedStyle(() => ({
    opacity: activityPulse.value,
    transform: [{ scale: 0.92 + activityPulse.value * 0.08 }],
  }));

  /*
   * EXISTING DATA LOGIC — UNCHANGED
   */

  const load = useCallback(async () => {
    try {
      const statsResponse = await adminApi.stats();
      setStats(statsResponse);

      const storesResponse = await adminApi.stores("pending");
      setPendingStores(storesResponse || []);

      const [serviceBookings, serviceVendors] = await Promise.all([
        adminApi.serviceBookings(),
        adminApi.serviceVendors(),
      ]);
      setServiceBookingTotal((serviceBookings || []).length);
      setServiceVendorCount(
        (serviceVendors || []).filter((x: any) =>
          x.vendor_type === "service" &&
          ["holiday", "car_rental"].includes(x.service_type)
        ).length
      );
      setServiceBookingCount(
        (serviceBookings || []).filter((x: any) =>
          ["pending", "booking_requested"].includes(
            String(x.status || "").toLowerCase()
          )
        ).length
      );
    } catch (e) {
      console.log("Admin dashboard load error:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();

      let cancelled = false;
      loadAdminSettings().then((settings) => {
        if (cancelled) return;
        setAdminSettings(settings);
        const byLabel = new Map(
          DEFAULT_ADMIN_ACTIONS.map((action) => [action.label, action])
        );

        const ordered = settings.quickActionOrder
          .map((label) => byLabel.get(label))
          .filter(Boolean)
          .filter(
            (action) => !settings.hiddenQuickActions.includes(action!.label)
          ) as typeof DEFAULT_ADMIN_ACTIONS;

        setQuickActions(ordered);
      });

      return () => {
        cancelled = true;
      };
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
    <View style={[s.root, adminSettings?.themeMode === "night" && s.rootNight]} testID="admin-dashboard">
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
              testID="admin-settings"
              onPress={() => router.push("/admin/settings")}
              style={s.logoutButton}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Admin settings"
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
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
            PENDING ORDERS
        =================================================== */}

        <Animated.View
          entering={FadeInDown.delay(80).duration(520).springify()}
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
              colors={[THEME.brown, THEME.black]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pendingGradient}
            >
              <View style={s.pendingIcon}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={23}
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
                  size={18}
                  color={THEME.white}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ===================================================
            OVERVIEW
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
        >
          <View style={s.sectionHeader}>
            <View>
              <Text style={[s.sectionTitle, adminSettings?.themeMode === "night" && s.textNight]}>
                Overview
              </Text>

              <Text style={[s.sectionSub, adminSettings?.themeMode === "night" && s.mutedNight]}>
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
            route="/admin/orders"
            delay={150}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Orders"
            value={stats?.orders ?? 0}
            icon="package-variant"
            color={THEME.orange}
            route="/admin/orders"
            delay={200}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Platform Earnings"
            value={`₹${stats?.platform_earnings ?? 0}`}
            icon="currency-inr"
            color={THEME.sky}
            sub={`${stats?.commission_percent ?? 10}% commission`}
            route="/admin/commission"
            delay={250}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Customers"
            value={stats?.users ?? 0}
            icon="account-multiple"
            color={THEME.brownLight}
            route="/admin/users?role=customer"
            delay={300}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Service Vendor"
            value={serviceVendorCount}
            icon="briefcase-outline"
            color={THEME.orange}
            route="/admin/service-vendors"
            delay={300}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Service Bookings"
            value={serviceBookingTotal}
            icon="calendar-check-outline"
            color={THEME.success}
            route="/admin/service-bookings"
            delay={350}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Vendors"
            value={stats?.vendors ?? 0}
            icon="store"
            color={THEME.orange}
            route="/admin/users?role=vendor"
            delay={400}
            dark={adminSettings?.themeMode === "night"}
          />

          <KPI
            label="Delivery"
            value={stats?.delivery ?? 0}
            icon="moped"
            color={THEME.sky}
            route="/admin/users?role=delivery"
            delay={450}
            dark={adminSettings?.themeMode === "night"}
          />
        </View>

        {/* ===================================================
            CHART
        =================================================== */}

        <Animated.View
          entering={FadeInUp.delay(450).duration(600)}
          style={[s.chartCard, adminSettings?.themeMode === "night" && s.cardNight]}
        >
          <View style={s.cardHeader}>
            <View>
              <View style={s.activityTitleRow}>
                <Text style={[s.cardTitle, adminSettings?.themeMode === "night" && s.textNight]}>
                  Order Activity
                </Text>

                <Animated.View style={[s.activityLiveDot, activityPulseStyle]} />
              </View>

              <Text style={[s.cardSub, adminSettings?.themeMode === "night" && s.mutedNight]}>
                Orders · Last 7 days
              </Text>
            </View>

            <View style={s.chartIcon}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={17}
                color={THEME.orange}
              />
            </View>
          </View>

          <View style={s.chartRow}>
            {(stats?.chart || []).map(
              (c: any, i: number) => (
                <Animated.View
                  key={i}
                  entering={FadeInUp
                    .delay(500 + i * 90)
                    .duration(520)
                    .springify()}
                  style={s.chartCol}
                >
                  <Text style={s.chartVal}>
                    {c.orders}
                  </Text>

                  <View style={s.chartBarWrap}>
                    <Animated.View
                      entering={FadeInUp
                        .delay(540 + i * 90)
                        .duration(620)
                        .springify()}
                      style={[
                        s.chartBar,
                        {
                          height: Math.max(
                            6,
                            (c.orders / maxChart) * 72
                          ),
                        },
                      ]}
                    />
                  </View>

                  <Text style={s.chartDay}>
                    {c.day}
                  </Text>
                </Animated.View>
              )
            )}
          </View>
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
            {quickActions.map((a, index) => (
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
                    adminSettings?.themeMode === "night" && s.cardNight,
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

                  {a.label === "Service Bookings" && serviceBookingCount > 0 && (
                    <View pointerEvents="none" style={s.serviceBookingCountBadge}>
                      <Text style={s.serviceBookingCountBadgeText}>
                        {serviceBookingCount}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[s.gridLabel, adminSettings?.themeMode === "night" && s.textNight]}
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
  route,
  dark = false,
  delay = 0,
}: any) {
  const router = useRouter();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      style={s.kpiCardWrap}
    >
      <Pressable
        testID={`admin-kpi-${label.toLowerCase().replace(/\\s+/g, "-")}`}
        onPress={() => router.push(route as any)}
        style={({ pressed }) => [
          s.kpiCard,
          dark && s.kpiCardNight,
          pressed && s.kpiPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${label}`}
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

          <View
            style={[
              s.kpiArrow,
              {
                backgroundColor: color + "12",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={14}
              color={color}
            />
          </View>
        </View>

        <Text
          style={[s.kpiValue, dark && s.kpiTextNight]}
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

        <View style={[s.kpiTapHint, dark && s.kpiTapHintNight]}>
          <Text style={[s.kpiTapHintText, { color }]}>
            View details
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={13}
            color={color}
          />
        </View>
      </Pressable>
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

  kpiCardWrap: {
    width: (width - SPACING.lg * 2 - 10) / 2,
  },

  kpiCard: {
    width: "100%",
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

  kpiPressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
    borderColor: THEME.orange,
  },

  rootNight: {
    backgroundColor: "#020617",
  },

  textNight: {
    color: "#F8FAFC",
  },

  mutedNight: {
    color: "#94A3B8",
  },

  cardNight: {
    backgroundColor: "#111827",
    borderColor: "#334155",
  },

  kpiCardNight: {
    backgroundColor: "#111827",
    borderColor: "#334155",
  },

  kpiTextNight: {
    color: "#F8FAFC",
  },

  kpiTapHintNight: {
    borderTopColor: "#334155",
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

  kpiArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  kpiTapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 7,
    opacity: 0.9,
  },

  kpiTapHintText: {
    fontSize: 9,
    fontWeight: "800",
  },

  chartCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 13,
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
    fontSize: 15,
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

  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  activityLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.success,
  },

  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 124,
    marginTop: 8,
  },

  chartCol: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  chartBarWrap: {
    height: 76,
    width: "42%",
    justifyContent: "flex-end",
    backgroundColor: "#F5F5F4",
    borderRadius: 7,
    overflow: "hidden",
  },

  chartBar: {
    width: "100%",
    backgroundColor: THEME.orange,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },

  chartVal: {
    color: THEME.brown,
    fontSize: 9,
    fontWeight: "900",
  },

  chartDay: {
    color: THEME.muted,
    fontSize: 8,
    fontWeight: "800",
  },

  pendingCard: {
    marginTop: 0,
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

  servicePendingNotice: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: THEME.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 9,
    zIndex: 20,
    elevation: 4,
  },

  servicePendingNoticeText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: "900",
  },

  serviceBookingCountBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 20,
  },

  serviceBookingCountBadgeText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: "900",
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