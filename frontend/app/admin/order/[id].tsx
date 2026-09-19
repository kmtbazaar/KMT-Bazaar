import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const list = await adminApi.orders();

        const found = (list || []).find(
          (o: any) =>
            String(o.id) === String(id) ||
            String(o.order_no) === String(id) ||
            String(o.order_number) === String(id)
        );

        setOrder(found || null);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={COLORS.brand} />

        <Text
          style={{
            marginTop: 10,
            color: COLORS.textMuted,
          }}
        >
          Loading order...
        </Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.center}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={44}
          color={COLORS.textMuted}
        />

        <Text
          style={{
            marginTop: 10,
            color: COLORS.textMuted,
          }}
        >
          Order not found
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={s.backButton}
        >
          <Text style={s.backButtonText}>
            Go Back
          </Text>
        </Pressable>
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
          onPress={() => router.back()}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={s.title}>
          Order #{order.order_no}
        </Text>

        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
        }}
      >
        <LinearGradient
          colors={["#16A34A", "#15803D"]}
          style={s.success}
        >
          <MaterialCommunityIcons
            name="check-circle"
            size={44}
            color="#fff"
          />

          <Text style={s.successTitle}>
            Order Details
          </Text>

          <Text style={s.successSub}>
            {String(
              order.status || ""
            )
              .replace(/_/g, " ")
              .toUpperCase()}
          </Text>
        </LinearGradient>

        <Box title="Customer">
          <Text style={s.bold}>
            {order.customer?.name || "Customer"}
          </Text>

          <Text style={s.text}>
            {order.customer?.phone ||
              "Phone unavailable"}
          </Text>

          <Text style={s.text}>
            {order.customer?.email || ""}
          </Text>
        </Box>

        <Box
          title={`Items (${
            order.items?.length || 0
          })`}
        >
          {(order.items || []).map(
            (it: any, i: number) => (
              <View
                key={String(
                  it.product_id || i
                )}
                style={s.item}
              >
                <Image
                  source={{
                    uri: it.image,
                  }}
                  style={s.img}
                  contentFit="cover"
                />

                <View style={{ flex: 1 }}>
                  <Text style={s.bold}>
                    {it.name}
                  </Text>

                  <Text style={s.text}>
                    {it.unit} · Qty{" "}
                    {it.quantity}
                  </Text>
                </View>

                <Text style={s.bold}>
                  ₹{it.line_total}
                </Text>
              </View>
            )
          )}
        </Box>

        <Box title="Delivery Address">
          <Text style={s.bold}>
            {order.address?.label || ""}
            {" · "}
            {order.address?.full_name || ""}
          </Text>

          <Text style={s.text}>
            {order.address?.line1 || ""}
            {order.address?.city
              ? `, ${order.address.city}`
              : ""}
            {order.address?.pincode
              ? ` - ${order.address.pincode}`
              : ""}
          </Text>

          <Text style={s.text}>
            {order.address?.phone || ""}
          </Text>
        </Box>

        <Box title="Bill Summary">
          <Row
            l="Subtotal"
            v={`₹${order.subtotal ?? 0}`}
          />

          <Row
            l="Delivery"
            v={
              order.delivery_fee
                ? `₹${order.delivery_fee}`
                : "FREE"
            }
          />

          <Row
            l="Tax"
            v={`₹${order.tax ?? 0}`}
          />

          <View style={s.divider} />

          <Row
            l="Total Paid"
            v={`₹${order.total ?? 0}`}
            bold
          />

          <Row
            l="Payment"
            v={
              order.payment_method === "cod"
                ? "Cash on Delivery"
                : "Online"
            }
          />
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

function Box({
  title,
  children,
}: any) {
  return (
    <View style={s.box}>
      <Text style={s.boxTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function Row({
  l,
  v,
  bold,
}: any) {
  return (
    <View style={s.row}>
      <Text
        style={[
          s.text,
          bold && s.bold,
        ]}
      >
        {l}
      </Text>

      <Text
        style={[
          s.text,
          bold && s.total,
        ]}
      >
        {v}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor:
      COLORS.surfaceSecondary,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  success: {
    margin: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
  },

  successTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },

  successSub: {
    color: "#fff",
    marginTop: 4,
    fontSize: 12,
  },

  box: {
    backgroundColor: "#fff",
    marginHorizontal: SPACING.lg,
    marginBottom: 12,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  boxTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  img: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },

  bold: {
    fontWeight: "800",
    color: COLORS.text,
  },

  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },

  total: {
    fontSize: 18,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 7,
  },

  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brand,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
});