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

import Animated, { FadeInUp } from "react-native-reanimated";

import { adminApi } from "@/src/roleApi";

import { useAuth } from "@/src/AuthContext";

import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/theme";

const { width } = Dimensions.get("window");

const ACTIONS = [
  {
    icon: "account-group-outline",
    label: "Customers",
    path: "/admin/users?role=customer",
    color: "#2563EB",
  },
  {
    icon: "store-outline",
    label: "Vendors",
    path: "/admin/users?role=vendor",
    color: "#F97316",
  },
  {
    icon: "moped-outline",
    label: "Delivery Partners",
    path: "/admin/users?role=delivery",
    color: "#16A34A",
  },
  {
    icon: "package-variant",
    label: "Products",
    path: "/admin/products",
    color: "#9333EA",
  },
  {
    icon: "tag-multiple-outline",
    label: "Categories",
    path: "/admin/categories",
    color: "#DB2777",
  },
  {
    icon: "image-multiple-outline",
    label: "Banners",
    path: "/admin/banners",
    color: "#0891B2",
  },
  {
    icon: "clipboard-list-outline",
    label: "All Orders",
    path: "/admin/orders",
    color: "#DC2626",
  },
  {
    icon: "currency-inr",
    label: "Commission",
    path: "/admin/commission",
    color: "#CA8A04",
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  const { user, logout } = useAuth();

  const [stats, setStats] = useState<any>(null);

  const [pendingStores, setPendingStores] = useState<any[]>([]);

  const [roojgarApplications, setRoojgarApplications] = useState<any[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  /*
   * EXISTING DASHBOARD DATA
   * This function is intentionally kept separate from Roojgar.
   * If Roojgar API has any problem, existing stats/orders/revenue
   * will still remain available.
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

  /*
   * ROOJGAR DATA
   * Separate API call so it cannot break existing dashboard stats.
   */
  const loadRoojgar = useCallback(async () => {
    try {
      const response = await adminApi.roojgarApplications();

      setRoojgarApplications(response || []);
    } catch (e) {
      console.log("Roojgar load error:", e);
      setRoojgarApplications([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadRoojgar();
    }, [load, loadRoojgar])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.all([load(), loadRoojgar()]);

    setRefreshing(false);
  };

  // APPROVE LOGIC
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

      if (confirmed) {
        executeApprove();
      }
    } else {
      Alert.alert(
        "Approve Store",
        `Approve '${name}' and make it live?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            style: "default",
            onPress: executeApprove,
          },
        ]
      );
    }
  };

  // REJECT LOGIC
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

      if (confirmed) {
        executeReject();
      }
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

  // ROOJGAR STATUS UPDATE
  const handleRoojgarStatus = async (
    applicationId: string,
    status: string
  ) => {
    try {
      await adminApi.updateRoojgarStatus(applicationId, status);

      await loadRoojgar();

      if (Platform.OS === "web") {
        window.alert(`Application status changed to ${status}.`);
      } else {
        Alert.alert(
          "Success",
          `Application status changed to ${status}.`
        );
      }
    } catch (e) {
      console.log("Roojgar status update error:", e);

      if (Platform.OS === "web") {
        window.alert("Could not update Roojgar application.");
      } else {
        Alert.alert(
          "Error",
          "Could not update Roojgar application."
        );
      }
    }
  };

  const confirmRoojgarStatus = (
    application: any,
    status: string
  ) => {
    const applicantName = application?.name || "Applicant";

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Change ${applicantName}'s application status to ${status}?`
      );

      if (confirmed) {
        handleRoojgarStatus(application.id, status);
      }

      return;
    }

    Alert.alert(
      "Update Application",
      `Change ${applicantName}'s application status to ${status}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () =>
            handleRoojgarStatus(application.id, status),
        },
      ]
    );
  };

  const maxChart = Math.max(
    1,
    ...((stats?.chart || []).map((c: any) => c.orders))
  );

  return (
    <View style={s.root} testID="admin-dashboard">
      <SafeAreaView edges={["top"]}>
        <LinearGradient
          colors={[COLORS.brand, COLORS.brandDark]}
          style={s.header}
        >
          <View style={s.headerTop}>
            <Image
              source={{ uri: LOGO_URL }}
              style={{ width: 36, height: 36 }}
              contentFit="contain"
            />

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.headerTitle}>Admin Console</Text>

              <Text style={s.headerSub}>
                Hi, {user?.name}
              </Text>
            </View>

            <Pressable
              testID="admin-logout"
              onPress={async () => {
                await logout();
                router.replace("/auth/login");
              }}
              hitSlop={10}
            >
              <MaterialCommunityIcons
                name="logout"
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 60,
        }}
        refreshControl={
          <RefreshControl
            tintColor={COLORS.brand}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* EXISTING KPI SECTION */}

        <View style={s.kpiRow}>
          <KPI
            label="Revenue"
            value={`₹${stats?.revenue ?? 0}`}
            icon="cash-multiple"
            color={COLORS.success}
          />

          <KPI
            label="Orders"
            value={stats?.orders ?? 0}
            icon="package-variant"
            color={COLORS.accent}
          />
        </View>

        <View style={s.kpiRow}>
          <KPI
            label="Platform Earnings"
            value={`₹${stats?.platform_earnings ?? 0}`}
            icon="currency-inr"
            color={COLORS.brand}
            sub={`${stats?.commission_percent ?? 10}% commission`}
          />

          <KPI
            label="Customers"
            value={stats?.users ?? 0}
            icon="account-multiple"
            color="#9333EA"
          />
        </View>

        <View style={s.kpiRow}>
          <KPI
            label="Vendors"
            value={stats?.vendors ?? 0}
            icon="store"
            color="#0891B2"
          />

          <KPI
            label="Delivery"
            value={stats?.delivery ?? 0}
            icon="moped"
            color="#DB2777"
          />
        </View>

        {/* EXISTING CHART */}

        <View style={s.chartCard}>
          <Text style={s.chartTitle}>
            Orders · Last 7 days
          </Text>

          <View style={s.chartRow}>
            {(stats?.chart || []).map(
              (c: any, i: number) => (
                <View key={i} style={s.chartCol}>
                  <View style={s.chartBarWrap}>
                    <Animated.View
                      entering={FadeInUp.delay(
                        i * 50
                      ).springify()}
                      style={[
                        s.chartBar,
                        {
                          height: Math.max(
                            8,
                            (c.orders / maxChart) * 100
                          ),
                        },
                      ]}
                    />
                  </View>

                  <Text style={s.chartVal}>
                    {c.orders}
                  </Text>

                  <Text style={s.chartDay}>
                    {c.day}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* EXISTING PENDING ORDERS */}

        <Pressable
          testID="pending-orders-shortcut"
          onPress={() =>
            router.push(
              "/admin/orders?status=pending"
            )
          }
          style={s.alertCard}
        >
          <View style={s.alertIcon}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={22}
              color={COLORS.accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>
              {stats?.pending_orders ?? 0} pending orders
            </Text>

            <Text style={s.alertSub}>
              Tap to review &amp; accept
            </Text>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={COLORS.textMuted}
          />
        </Pressable>

        {/* PENDING STORES LIST */}

        {pendingStores &&
          pendingStores.length > 0 && (
            <View style={{ marginTop: SPACING.md }}>
              <Text
                style={[
                  s.section,
                  { color: COLORS.error },
                ]}
              >
                Action Required: Store Approvals (
                {pendingStores.length})
              </Text>

              {pendingStores.map((st: any) => (
                <View
                  key={st.id}
                  style={s.approveCard}
                >
                  <Image
                    source={{
                      uri: st.image || LOGO_URL,
                    }}
                    style={s.approveImg}
                    contentFit="cover"
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={s.approveName}>
                      {st.name}
                    </Text>

                    <Text
                      style={s.approveMeta}
                      numberOfLines={1}
                    >
                      {st.address}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        handleRejectStore(
                          st.id,
                          st.name
                        )
                      }
                      style={s.rejectBtn}
                    >
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={20}
                        color="#fff"
                      />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        handleApproveStore(
                          st.id,
                          st.name
                        )
                      }
                      style={s.approveBtn}
                    >
                      <MaterialCommunityIcons
                        name="check-decagram"
                        size={16}
                        color="#fff"
                      />

                      <Text
                        style={s.approveBtnText}
                      >
                        Approve
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* ===================================================== */}
        {/* ROOJGAR APPLICATIONS */}
        {/* ===================================================== */}

        <View style={s.roojgarHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.section}>
              Roojgar Applications
            </Text>

            <Text style={s.roojgarSubtitle}>
              Job applications submitted from Roojgar form
            </Text>
          </View>

          <View style={s.roojgarCount}>
            <MaterialCommunityIcons
              name="briefcase-account-outline"
              size={20}
              color={COLORS.brand}
            />

            <Text style={s.roojgarCountText}>
              {roojgarApplications.length}
            </Text>
          </View>
        </View>

        {roojgarApplications.length === 0 ? (
          <View style={s.emptyRoojgar}>
            <View style={s.emptyRoojgarIcon}>
              <MaterialCommunityIcons
                name="briefcase-search-outline"
                size={30}
                color={COLORS.textMuted}
              />
            </View>

            <Text style={s.emptyRoojgarTitle}>
              No Roojgar Applications
            </Text>

            <Text style={s.emptyRoojgarText}>
              New applications submitted from the
              Roojgar form will appear here.
            </Text>
          </View>
        ) : (
          roojgarApplications.map(
            (application: any) => {
              const status =
                application?.status || "pending";

              return (
                <View
                  key={application.id}
                  style={s.roojgarCard}
                >
                  <View style={s.roojgarCardTop}>
                    <View style={s.applicantIcon}>
                      <MaterialCommunityIcons
                        name="account-outline"
                        size={24}
                        color={COLORS.brand}
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                        marginLeft: 10,
                      }}
                    >
                      <Text
                        style={s.applicantName}
                        numberOfLines={1}
                      >
                        {application.name ||
                          "Applicant"}
                      </Text>

                      <Text style={s.applicationDate}>
                        {formatApplicationDate(
                          application.appliedAt ||
                            application.created_at
                        )}
                      </Text>
                    </View>

                    <StatusBadge status={status} />
                  </View>

                  <View style={s.applicationDetails}>
                    <ApplicationDetail
                      icon="phone-outline"
                      label="Mobile"
                      value={
                        application.mobile ||
                        "Not provided"
                      }
                    />

                    <ApplicationDetail
                      icon="briefcase-outline"
                      label="Category"
                      value={
                        application.category ||
                        "Not provided"
                      }
                    />

                    <ApplicationDetail
                      icon="map-marker-outline"
                      label="Address"
                      value={
                        application.address ||
                        "Not provided"
                      }
                    />
                  </View>

                  {/* Aadhaar intentionally NOT displayed */}

                  <View style={s.roojgarActions}>
                    <Pressable
                      style={[
                        s.statusBtn,
                        s.approvedStatusBtn,
                      ]}
                      onPress={() =>
                        confirmRoojgarStatus(
                          application,
                          "approved"
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={18}
                        color="#fff"
                      />

                      <Text style={s.statusBtnText}>
                        Approve
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        s.statusBtn,
                        s.rejectedStatusBtn,
                      ]}
                      onPress={() =>
                        confirmRoojgarStatus(
                          application,
                          "rejected"
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={18}
                        color="#fff"
                      />

                      <Text style={s.statusBtnText}>
                        Reject
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        s.statusBtn,
                        s.completedStatusBtn,
                      ]}
                      onPress={() =>
                        confirmRoojgarStatus(
                          application,
                          "completed"
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        name="check-all"
                        size={18}
                        color="#fff"
                      />

                      <Text style={s.statusBtnText}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            }
          )
        )}

        {/* QUICK ACTIONS */}

        <Text style={s.section}>
          Quick Actions
        </Text>

        <View style={s.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.label}
              testID={`admin-action-${a.label}`}
              onPress={() =>
                router.push(a.path as any)
              }
              style={s.gridItem}
            >
              <View
                style={[
                  s.gridIcon,
                  {
                    backgroundColor:
                      a.color + "1A",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={a.icon as any}
                  size={26}
                  color={a.color}
                />
              </View>

              <Text style={s.gridLabel}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function KPI({
  label,
  value,
  icon,
  color,
  sub,
}: any) {
  return (
    <View style={s.kpiCard}>
      <View
        style={[
          s.kpiIcon,
          { backgroundColor: color + "1A" },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <Text style={s.kpiValue}>
        {value}
      </Text>

      <Text style={s.kpiLabel}>
        {label}
      </Text>

      {sub && (
        <Text style={s.kpiSub}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function ApplicationDetail({
  icon,
  label,
  value,
}: any) {
  return (
    <View style={s.detailRow}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={COLORS.textMuted}
      />

      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>
          {label}
        </Text>

        <Text
          style={s.detailValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let backgroundColor = "#FEF3C7";
  let textColor = "#92400E";

  if (status === "approved") {
    backgroundColor = "#DCFCE7";
    textColor = "#166534";
  } else if (status === "rejected") {
    backgroundColor = "#FEE2E2";
    textColor = "#991B1B";
  } else if (status === "completed") {
    backgroundColor = "#DBEAFE";
    textColor = "#1E40AF";
  }

  return (
    <View
      style={[
        s.statusBadge,
        { backgroundColor },
      ]}
    >
      <Text
        style={[
          s.statusBadgeText,
          { color: textColor },
        ]}
      >
        {String(status).toUpperCase()}
      </Text>
    </View>
  );
}

function formatApplicationDate(
  dateValue: any
) {
  if (!dateValue) {
    return "Date not available";
  }

  try {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateValue);
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
  },

  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },

  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  kpiValue: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 18,
  },

  kpiLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  kpiSub: {
    color: COLORS.brand,
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  chartTitle: {
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },

  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
  },

  chartCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  chartBarWrap: {
    height: 100,
    justifyContent: "flex-end",
    width: "70%",
  },

  chartBar: {
    backgroundColor: COLORS.brand,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    width: "100%",
  },

  chartVal: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "700",
  },

  chartDay: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    padding: 12,
    marginTop: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },

  alertTitle: {
    fontWeight: "800",
    color: COLORS.text,
  },

  alertSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  section: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  approveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error + "50",
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },

  approveImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSecondary,
  },

  approveName: {
    fontWeight: "800",
    color: COLORS.text,
    fontSize: 15,
  },

  approveMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  rejectBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
  },

  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  approveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  /* ROOJGAR */

  roojgarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  roojgarSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: -8,
    marginBottom: SPACING.md,
  },

  roojgarCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: SPACING.lg,
  },

  roojgarCountText: {
    color: COLORS.brand,
    fontWeight: "800",
    fontSize: 14,
  },

  roojgarCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },

  roojgarCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  applicantIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  applicantName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  applicationDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  applicationDetails: {
    marginTop: 14,
    gap: 10,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "600",
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },

  roojgarActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 14,
    flexWrap: "wrap",
  },

  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
  },

  approvedStatusBtn: {
    backgroundColor: COLORS.success,
  },

  rejectedStatusBtn: {
    backgroundColor: COLORS.error,
  },

  completedStatusBtn: {
    backgroundColor: "#2563EB",
  },

  statusBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },

  emptyRoojgar: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
  },

  emptyRoojgarIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyRoojgarTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  emptyRoojgarText: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 17,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  gridItem: {
    width:
      (width - SPACING.lg * 2 - 10 * 2) / 3,
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    gap: 8,
  },

  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  gridLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
});