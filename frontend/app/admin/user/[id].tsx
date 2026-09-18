import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  delivery: "Delivery",
  admin: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  customer: "#2563EB",
  vendor: "#F97316",
  delivery: "#16A34A",
  admin: "#9333EA",
};

export default function AdminUserDetails() {
  const { id, role } =
    useLocalSearchParams<{
      id: string;
      role: string;
    }>();

  const router = useRouter();

  const [user, setUser] =
    useState<any | null>(null);

  const [orders, setOrders] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadDetails = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        /*
         * Get users for the selected role.
         */
        const allUsers =
          await adminApi.users(
            role as string
          );

        const list =
          (allUsers || []) as any[];

        const foundUser =
          list.find(
            (u: any) =>
              String(u.id) === String(id)
          );

        setUser(foundUser || null);

        /*
         * Get admin orders.
         *
         * Orders are filtered below using the
         * user ID fields used by the order data.
         */
        const allOrders =
          await adminApi.orders();

        const orderList =
          (allOrders || []) as any[];

        const userId =
          String(id);

        const filteredOrders =
          orderList.filter(
            (order: any) => {
              const possibleIds = [
                order.user_id,
                order.customer_id,
                order.vendor_id,
                order.delivery_id,
                order.deliverer_id,
                order.assigned_delivery_id,
                order.delivery_partner_id,
                order.user?.id,
                order.customer?.id,
                order.vendor?.id,
                order.delivery?.id,
                order.deliverer?.id,
              ]
                .filter(
                  (value) =>
                    value !== undefined &&
                    value !== null
                )
                .map((value) =>
                  String(value)
                );

              return possibleIds.includes(
                userId
              );
            }
          );

        setOrders(filteredOrders);
      } catch (e: any) {
        console.log(
          "User details error:",
          e
        );

        setError(
          e?.message ||
            "Unable to load user details."
        );
      } finally {
        setLoading(false);
      }
    },
    [id, role]
  );

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  const roleName =
    ROLE_LABEL[role as string] ||
    "User";

  const roleColor =
    ROLE_COLOR[role as string] ||
    "#666";

  const formatAmount = (
    order: any
  ) => {
    const amount =
      order.total_amount ??
      order.total ??
      order.amount ??
      order.grand_total ??
      0;

    return `₹${Number(amount).toFixed(0)}`;
  };

  const formatDate = (
    order: any
  ) => {
    const rawDate =
      order.created_at ??
      order.createdAt ??
      order.date ??
      order.created_on;

    if (!rawDate) {
      return "Date unavailable";
    }

    try {
      return new Date(
        rawDate
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return String(rawDate);
    }
  };

  const getOrderId = (
    order: any
  ) => {
    return (
      order.order_number ||
      order.order_no ||
      order.id ||
      "Order"
    );
  };

  const getOrderStatus = (
    order: any
  ) => {
    return (
      order.status ||
      order.order_status ||
      "Unknown"
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={s.root}
        edges={["top"]}
      >
        <View style={s.header}>
          <Pressable
            onPress={() =>
              router.back()
            }
            style={s.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.text}
            />
          </Pressable>

          <Text style={s.title}>
            {roleName} Details
          </Text>

          <View
            style={{
              width: 44,
            }}
          />
        </View>

        <View
          style={s.loadingBox}
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={s.loadingText}
          >
            Loading details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={s.root}
        edges={["top"]}
      >
        <View style={s.header}>
          <Pressable
            onPress={() =>
              router.back()
            }
            style={s.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.text}
            />
          </Pressable>

          <Text style={s.title}>
            {roleName} Details
          </Text>

          <View
            style={{
              width: 44,
            }}
          />
        </View>

        <View style={s.empty}>
          <MaterialCommunityIcons
            name="account-off-outline"
            size={50}
            color="#94A3B8"
          />

          <Text style={s.emptyTitle}>
            User not found
          </Text>

          <Text style={s.emptyText}>
            This user may have been deleted.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={s.root}
      edges={["top"]}
    >
      <View style={s.header}>
        <Pressable
          onPress={() =>
            router.back()
          }
          hitSlop={10}
          style={s.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={s.title}>
          {roleName} Details
        </Text>

        <View
          style={{
            width: 44,
          }}
        />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(
          order,
          index
        ) =>
          String(
            order.id ||
              order.order_number ||
              index
          )
        }
        contentContainerStyle={{
          padding: SPACING.lg,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <View>
            {/* USER INFORMATION */}
            <View style={s.profileCard}>
              <View
                style={[
                  s.bigAvatar,
                  {
                    backgroundColor:
                      roleColor + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    s.bigAvatarText,
                    {
                      color: roleColor,
                    },
                  ]}
                >
                  {(user.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <Text
                style={s.userName}
              >
                {user.name ||
                  "Unknown User"}
              </Text>

              <View
                style={[
                  s.rolePill,
                  {
                    backgroundColor:
                      roleColor + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    s.roleText,
                    {
                      color: roleColor,
                    },
                  ]}
                >
                  {roleName}
                </Text>
              </View>
            </View>

            {/* CONTACT DETAILS */}
            <View style={s.infoCard}>
              <Text
                style={s.sectionTitle}
              >
                Personal Information
              </Text>

              <View style={s.infoRow}>
                <View
                  style={s.infoIcon}
                >
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={21}
                    color={roleColor}
                  />
                </View>

                <View
                  style={s.infoContent}
                >
                  <Text
                    style={s.infoLabel}
                  >
                    Name
                  </Text>

                  <Text
                    style={s.infoValue}
                  >
                    {user.name ||
                      "Not available"}
                  </Text>
                </View>
              </View>

              <View style={s.infoRow}>
                <View
                  style={s.infoIcon}
                >
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={21}
                    color={roleColor}
                  />
                </View>

                <View
                  style={s.infoContent}
                >
                  <Text
                    style={s.infoLabel}
                  >
                    Mobile Number
                  </Text>

                  <Text
                    style={s.infoValue}
                  >
                    {user.phone ||
                      "Not available"}
                  </Text>
                </View>
              </View>

              <View style={s.infoRow}>
                <View
                  style={s.infoIcon}
                >
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={21}
                    color={roleColor}
                  />
                </View>

                <View
                  style={s.infoContent}
                >
                  <Text
                    style={s.infoLabel}
                  >
                    Email
                  </Text>

                  <Text
                    style={s.infoValue}
                  >
                    {user.email ||
                      "Not available"}
                  </Text>
                </View>
              </View>

              <View style={s.infoRow}>
                <View
                  style={s.infoIcon}
                >
                  <MaterialCommunityIcons
                    name={
                      user.active === false
                        ? "account-off-outline"
                        : "account-check-outline"
                    }
                    size={21}
                    color={roleColor}
                  />
                </View>

                <View
                  style={s.infoContent}
                >
                  <Text
                    style={s.infoLabel}
                  >
                    Account Status
                  </Text>

                  <Text
                    style={[
                      s.infoValue,
                      {
                        color:
                          user.active ===
                          false
                            ? "#DC2626"
                            : "#16A34A",
                      },
                    ]}
                  >
                    {user.active ===
                    false
                      ? "Inactive"
                      : "Active"}
                  </Text>
                </View>
              </View>
            </View>

            {/* ORDERS HEADER */}
            <View
              style={s.ordersHeader}
            >
              <Text
                style={s.ordersTitle}
              >
                Orders
              </Text>

              <View
                style={[
                  s.orderCount,
                  {
                    backgroundColor:
                      roleColor + "22",
                  },
                ]}
              >
                <Text
                  style={[
                    s.orderCountText,
                    {
                      color:
                        roleColor,
                    },
                  ]}
                >
                  {orders.length}
                </Text>
              </View>
            </View>

            {error ? (
              <View
                style={s.errorBox}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={22}
                  color="#DC2626"
                />

                <Text
                  style={s.errorText}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {orders.length === 0 &&
            !error ? (
              <View
                style={s.noOrders}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={48}
                  color="#94A3B8"
                />

                <Text
                  style={s.noOrdersTitle}
                >
                  No Orders
                </Text>

                <Text
                  style={s.noOrdersText}
                >
                  No orders found for this user.
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const status =
            getOrderStatus(item);

          return (
            <View
              style={s.orderCard}
            >
              <View
                style={s.orderTop}
              >
                <View
                  style={s.orderIcon}
                >
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={22}
                    color={roleColor}
                  />
                </View>

                <View
                  style={s.orderMain}
                >
                  <Text
                    style={s.orderId}
                  >
                    #{getOrderId(item)}
                  </Text>

                  <Text
                    style={s.orderDate}
                  >
                    {formatDate(item)}
                  </Text>
                </View>

                <Text
                  style={s.orderAmount}
                >
                  {formatAmount(item)}
                </Text>
              </View>

              <View
                style={s.orderBottom}
              >
                <View
                  style={[
                    s.statusPill,
                    {
                      backgroundColor:
                        roleColor + "18",
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.statusText,
                      {
                        color:
                          roleColor,
                      },
                    ]}
                  >
                    {String(
                      status
                    ).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor:
      COLORS.surfaceSecondary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },

  profileCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  bigAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  bigAvatarText: {
    fontSize: 36,
    fontWeight: "900",
  },

  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: 8,
  },

  roleText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
    minWidth: 0,
  },

  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  ordersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  ordersTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.text,
  },

  orderCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  orderCountText: {
    fontSize: 13,
    fontWeight: "900",
  },

  orderCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },

  orderTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginRight: 10,
  },

  orderMain: {
    flex: 1,
    minWidth: 0,
  },

  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  orderDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  orderAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  orderBottom: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  noOrders: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 35,
    alignItems: "center",
  },

  noOrdersTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 10,
  },

  noOrdersText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    marginLeft: 8,
    color: "#B91C1C",
    fontSize: 13,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 12,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});