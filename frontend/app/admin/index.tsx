import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useEffect, useState } from "react";

import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { adminApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { LOGO_URL, SPACING } from "@/src/theme";
import AnimatedBrandLogo, { BrandingFooter } from "@/src/components/AnimatedBrandLogo";
import {
  DEFAULT_ADMIN_ACTIONS,
  loadAdminSettings,
} from "@/src/adminSettings";


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
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activityPeriod, setActivityPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [activityData, setActivityData] = useState<Array<{ start: string; label: string; orders: number }>>([]);
  const [selectedActivityKey, setSelectedActivityKey] = useState("");
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
          ["holiday", "car_rental", "premium_decorator", "photography"].includes(x.service_type)
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

  const loadActivity = useCallback(async () => {
    try {
      const response = await adminApi.orderActivity(activityPeriod);
      const buckets = Array.isArray(response?.buckets) ? response.buckets : [];
      setActivityData(buckets);
      setSelectedActivityKey((current) =>
        buckets.some((bucket: any) => bucket.start === current)
          ? current
          : String(buckets[buckets.length - 1]?.start || "")
      );
    } catch (error) {
      console.log("Admin order activity load error:", error);
      setActivityData([]);
      setSelectedActivityKey("");
    }
  }, [activityPeriod]);

  useFocusEffect(
    useCallback(() => {
      load();
      loadActivity();

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
    }, [load, loadActivity])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadActivity()]);
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

  const maxChart = Math.max(1, ...activityData.map((bucket) => bucket.orders));
  const selectedActivity = activityData.find((bucket) => bucket.start === selectedActivityKey)
    || activityData[activityData.length - 1]
    || null;
  const activityPeriodLabel = activityPeriod === "daily"
    ? "Last 7 days"
    : activityPeriod === "weekly"
      ? "Last 8 weeks"
      : "Last 12 months";
  const quickActionRows = Array.from(
    { length: Math.ceil(quickActions.length / 3) },
    (_, rowIndex) => quickActions.slice(rowIndex * 3, rowIndex * 3 + 3)
  );

  // Desktop web: keep all eight overview tiles in a compact 4 × 2 grid, including zoomed browser windows.
  const kpiColumnCount = Platform.OS === "web" && screenWidth >= 768 ? 4 : 2;
  const kpiCards = [
    <KPI key="revenue" label="Revenue" value={`₹${stats?.revenue ?? 0}`} icon="cash-multiple" color={THEME.success} route="/admin/orders" delay={150} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="orders" label="Orders" value={stats?.orders ?? 0} icon="package-variant" color={THEME.orange} route="/admin/orders" delay={200} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="platform-earnings" label="Platform Earnings" value={`₹${stats?.platform_earnings ?? 0}`} icon="currency-inr" color={THEME.sky} sub={`${stats?.commission_percent ?? 10}% commission`} route="/admin/commission" delay={250} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="customers" label="Customers" value={stats?.users ?? 0} icon="account-multiple" color={THEME.brownLight} route="/admin/users?role=customer" delay={300} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="service-vendor" label="Service Vendor" value={serviceVendorCount} icon="briefcase-outline" color={THEME.orange} route="/admin/service-vendors" delay={300} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="service-bookings" label="Service Bookings" value={serviceBookingTotal} icon="calendar-check-outline" color={THEME.success} route="/admin/service-bookings" delay={350} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="vendors" label="Vendors" value={stats?.vendors ?? 0} icon="store" color={THEME.orange} route="/admin/users?role=vendor" delay={400} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
    <KPI key="delivery" label="Delivery" value={stats?.delivery ?? 0} icon="moped" color={THEME.sky} route="/admin/users?role=delivery" delay={450} dark={adminSettings?.themeMode === "night"} compact={kpiColumnCount === 4} />,
  ];
  const kpiRows = Array.from(
    { length: Math.ceil(kpiCards.length / kpiColumnCount) },
    (_, rowIndex) => kpiCards.slice(rowIndex * kpiColumnCount, rowIndex * kpiColumnCount + kpiColumnCount)
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
              <AnimatedBrandLogo size={52} />
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
              colors={["#FDE047", "#FEF3C7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pendingGradient}
            >
              <View style={s.pendingIcon}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={23}
                  color="#92400E"
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

        <View style={[s.kpiGrid, kpiColumnCount === 4 && s.kpiGridCompact]}>
          {kpiRows.map((row, rowIndex) => (
            <View
              key={`admin-kpi-row-${rowIndex}`}
              style={[s.kpiRow, kpiColumnCount === 4 && s.kpiRowCompact]}
            >
              {row}
            </View>
          ))}
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
                Orders · {activityPeriodLabel}
              </Text>
            </View>
            <View style={s.chartIcon}>
              <MaterialCommunityIcons name="chart-bar" size={17} color={THEME.orange} />
            </View>
          </View>

          <View style={s.activityFilterRow} testID="admin-order-activity-filters">
            {(["daily", "weekly", "monthly"] as const).map((period) => {
              const active = activityPeriod === period;
              const label = period === "daily" ? "Daily" : period === "weekly" ? "Weekly" : "Monthly";
              return (
                <Pressable
                  key={period}
                  testID={`admin-order-activity-filter-${period}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setActivityPeriod(period)}
                  style={({ pressed }) => [
                    s.activityFilter,
                    active && s.activityFilterActive,
                    pressed && s.activityFilterPressed,
                  ]}
                >
                  <Text style={[s.activityFilterText, active && s.activityFilterTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.chartSelectedSummary} testID="admin-order-activity-selection">
            <View style={s.chartSelectedDot} />
            <Text style={s.chartSelectedLabel}>
              {selectedActivity?.label || "Order activity"}
            </Text>
            <Text style={s.chartSelectedValue}>
              {selectedActivity?.orders ?? 0} orders
            </Text>
          </View>

          <View style={s.chartRow} testID="admin-order-activity-chart">
            {activityData.map((bucket, index) => {
              const active = bucket.start === selectedActivity?.start;
              return (
                <Animated.View
                  key={bucket.start}
                  entering={FadeInUp.delay(120 + index * 35).duration(260)}
                  style={s.chartColOuter}
                >
                  <Pressable
                    testID={`admin-order-activity-point-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${bucket.label}: ${bucket.orders} orders`}
                    accessibilityState={{ selected: active }}
                    hitSlop={4}
                    onPress={() => setSelectedActivityKey(bucket.start)}
                    style={({ pressed }) => [
                      s.chartCol,
                      active && s.chartColSelected,
                      pressed && s.chartColPressed,
                    ]}
                  >
                    <Text style={[s.chartVal, active && s.chartValSelected]}>
                      {bucket.orders}
                    </Text>
                    <View style={[s.chartBarWrap, active && s.chartBarWrapSelected]}>
                      <Animated.View
                        style={[
                          s.chartBar,
                          active && s.chartBarSelected,
                          { height: Math.max(5, (bucket.orders / maxChart) * 70) },
                        ]}
                      />
                    </View>
                    <Text style={[s.chartDay, active && s.chartDaySelected]} numberOfLines={1}>
                      {bucket.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
          {activityData.length === 0 ? (
            <Text style={s.chartEmpty} testID="admin-order-activity-empty">
              No order activity is available for this period.
            </Text>
          ) : null}
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
            {quickActionRows.map((row, rowIndex) => (
              <View key={`quick-action-row-${rowIndex}`} style={s.gridRow}>
                {row.map((a) => (
                  <Animated.View key={a.label} style={s.gridWrapper}>
                    <Pressable
                      testID={`admin-action-${a.label}`}
                      onPress={() => router.push(a.path as any)}
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
                            backgroundColor: a.color + "18",
                            borderColor: a.color + "35",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name={a.icon as any} size={27} color={a.color} />
                      </View>
                      {a.label === "Service Bookings" && serviceBookingCount > 0 && (
                        <View pointerEvents="none" style={s.serviceBookingCountBadge}>
                          <Text style={s.serviceBookingCountBadgeText}>{serviceBookingCount}</Text>
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
                {row.length < 3 && Array.from(
                  { length: 3 - row.length },
                  (_, spacerIndex) => (
                    <View key={`quick-action-spacer-${rowIndex}-${spacerIndex}`} style={s.gridWrapper} />
                  )
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        <BrandingFooter caption="Admin Console · Secure Management" />
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
  compact = false,
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
          compact && s.kpiCardCompact,
          dark && s.kpiCardNight,
          pressed && s.kpiPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${label}`}
      >
        <View style={[s.kpiTop, compact && s.kpiTopCompact]}>
          <View
            style={[
              s.kpiIcon,
              compact && s.kpiIconCompact,
              {
                backgroundColor: color + "16",
                borderColor: color + "30",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={compact ? 15 : 20}
              color={color}
            />
          </View>

          <View
            style={[
              s.kpiArrow,
              compact && s.kpiArrowCompact,
              {
                backgroundColor: color + "12",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-top-right"
              size={compact ? 11 : 14}
              color={color}
            />
          </View>
        </View>

        <Text
          style={[s.kpiValue, compact && s.kpiValueCompact, dark && s.kpiTextNight]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>

        <Text style={[s.kpiLabel, compact && s.kpiLabelCompact]}>
          {label}
        </Text>

        {sub && (
          <Text
            style={[
              s.kpiSub,
              compact && s.kpiSubCompact,
              { color },
            ]}
          >
            {sub}
          </Text>
        )}

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
    paddingTop: 8,
    paddingBottom: 10,
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
    alignItems: "center",
  },

  headerEyebrow: {
    color: THEME.white,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },

  headerTitle: {
    color: THEME.orange,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 1,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  headerSub: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
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
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 4,
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
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 28,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  sectionTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionSub: {
    color: THEME.muted,
    fontSize: 10,
    marginTop: 2,
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
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 10,
    marginBottom: 8,
  },

  kpiGridCompact: {
    gap: 5,
    marginBottom: 2,
  },

  kpiRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  kpiRowCompact: {
    gap: 5,
  },

  kpiCardWrap: {
    flex: 1,
    minWidth: 0,
  },

  kpiCard: {
    width: "100%",
    height: 164,
    minHeight: 164,
    maxHeight: 164,
    flexGrow: 0,
    flexShrink: 0,
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

  kpiCardCompact: {
    height: 60,
    minHeight: 60,
    maxHeight: 60,
    padding: 5,
    borderRadius: 10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
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

  kpiTopCompact: {
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

  kpiIconCompact: {
    width: 18,
    height: 18,
    borderRadius: 6,
  },

  kpiValue: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 11,
  },

  kpiValueCompact: {
    fontSize: 13,
    marginTop: 1,
  },

  kpiLabel: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

  kpiLabelCompact: {
    fontSize: 8,
    marginTop: 0,
  },

  kpiSub: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },

  kpiSubCompact: {
    fontSize: 7,
    marginTop: 0,
  },

  kpiArrow: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  kpiArrowCompact: {
    width: 16,
    height: 16,
    borderRadius: 6,
  },

  kpiTapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 7,
    opacity: 0.9,
  },

  kpiTapHintCompact: {
    gap: 1,
    marginTop: 3,
  },

  kpiTapHintText: {
    fontSize: 9,
    fontWeight: "800",
  },

  kpiTapHintTextCompact: {
    fontSize: 8,
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

  activityFilterRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },

  activityFilter: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: "#FAFAF9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  activityFilterActive: {
    backgroundColor: "#FFF1E8",
    borderColor: THEME.orange,
  },

  activityFilterPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },

  activityFilterText: {
    color: THEME.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  activityFilterTextActive: {
    color: THEME.brown,
  },

  chartSelectedSummary: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    marginBottom: 5,
  },

  chartSelectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.orange,
  },

  chartSelectedLabel: {
    flex: 1,
    color: THEME.brown,
    fontSize: 11,
    fontWeight: "800",
  },

  chartSelectedValue: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 124,
    marginTop: 4,
  },

  chartColOuter: {
    flex: 1,
    minWidth: 0,
  },



  chartCol: {
    flex: 1,
    minHeight: 124,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: 1,
    paddingTop: 7,
    borderRadius: 8,
  },

  chartColSelected: {
    backgroundColor: "#FFF7ED",
  },

  chartColPressed: {
    opacity: 0.72,
  },

  chartBarWrapSelected: {
    backgroundColor: "#FDE68A",
  },

  chartBarSelected: {
    backgroundColor: THEME.brown,
  },

  chartValSelected: {
    color: THEME.brown,
  },

  chartDaySelected: {
    color: THEME.brown,
  },

  chartEmpty: {
    color: THEME.muted,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },

  chartBarWrap: {
    height: 76,
    width: "52%",
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
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#D97706",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  pendingGradient: {
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  pendingIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.58)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(146,64,14,0.14)",
  },

  pendingContent: {
    flex: 1,
  },

  pendingTitle: {
    color: "#713F12",
    fontSize: 13,
    fontWeight: "900",
  },

  pendingSub: {
    color: "#92400E",
    fontSize: 9,
    marginTop: 2,
  },

  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#D97706",
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
    width: "100%",
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 10,
  },

  gridRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },

  gridWrapper: {
    flex: 1,
    minWidth: 0,
  },

  gridItem: {
    width: "100%",
    height: 128,
    minHeight: 128,
    maxHeight: 128,
    flexGrow: 0,
    flexShrink: 0,
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