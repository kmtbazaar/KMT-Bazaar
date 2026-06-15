import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

const STAGES = [
  { key: "pending", label: "Order Placed", icon: "receipt" },
  { key: "accepted", label: "Accepted", icon: "store-check-outline" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "moped" },
  { key: "delivered", label: "Delivered", icon: "package-variant-closed-check" },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => { (async () => setOrder(await api.order(id as string)))(); }, [id]);
  if (!order) return <View style={s.center}><ActivityIndicator color={COLORS.brand} /></View>;

  const curIdx = STAGES.findIndex((st) => st.key === order.status);

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="order-detail-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Order #{order.order_no}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View entering={ZoomIn.duration(500)} style={s.confirm}>
          <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.confirmGrad}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#fff" />
            <Text style={s.confirmTitle}>Order placed successfully!</Text>
            <Text style={s.confirmSub}>Thank you for shopping with KMT Bazaar</Text>
          </LinearGradient>
        </Animated.View>

        <View style={s.box}>
          <Text style={s.boxTitle}>Track Order</Text>
          <View style={s.tracker}>
            {STAGES.map((st, idx) => {
              const done = idx <= Math.max(curIdx, 0);
              return (
                <View key={st.key} style={s.stage}>
                  <View style={[s.stageIcon, done && { backgroundColor: COLORS.brand }]}>
                    <MaterialCommunityIcons name={st.icon as any} size={18} color={done ? "#fff" : COLORS.textMuted} />
                  </View>
                  <Text style={[s.stageLabel, done && { color: COLORS.brand, fontWeight: "800" }]}>{st.label}</Text>
                  {idx < STAGES.length - 1 && <View style={[s.connector, done && { backgroundColor: COLORS.brand }]} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.boxTitle}>Items ({order.items.length})</Text>
          {order.items.map((it: any) => (
            <View key={it.product_id} style={s.itemRow}>
              <Image source={{ uri: it.image }} style={s.itemImg} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{it.name}</Text>
                <Text style={s.itemUnit}>{it.unit} · Qty {it.quantity}</Text>
              </View>
              <Text style={s.itemPrice}>₹{it.line_total}</Text>
            </View>
          ))}
        </View>

        <View style={s.box}>
          <Text style={s.boxTitle}>Delivery Address</Text>
          <Text style={s.addrLabel}>{order.address.label} · {order.address.full_name}</Text>
          <Text style={s.addrText}>{order.address.line1}, {order.address.city} - {order.address.pincode}</Text>
          <Text style={s.addrPhone}>{order.address.phone}</Text>
        </View>

        <View style={s.box}>
          <Text style={s.boxTitle}>Bill Summary</Text>
          <Row l="Subtotal" v={`₹${order.subtotal}`} />
          <Row l="Delivery" v={order.delivery_fee ? `₹${order.delivery_fee}` : "FREE"} />
          <Row l="Tax" v={`₹${order.tax}`} />
          <View style={s.divider} />
          <Row l="Total Paid" v={`₹${order.total}`} bold />
          <Row l="Payment" v={order.payment_method === "cod" ? "Cash on Delivery" : "Online"} small />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ l, v, bold, small }: any) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 4 }}>
    <Text style={{ color: COLORS.textSecondary, fontSize: bold ? 16 : 13, fontWeight: bold ? "800" : "500" }}>{l}</Text>
    <Text style={{ color: COLORS.text, fontSize: bold ? 18 : (small ? 12 : 13), fontWeight: bold ? "800" : "700" }}>{v}</Text>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  confirm: { margin: SPACING.lg, borderRadius: RADIUS.lg, overflow: "hidden" },
  confirmGrad: { padding: SPACING.xl, alignItems: "center" },
  confirmTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 8 },
  confirmSub: { color: "rgba(255,255,255,0.85)", marginTop: 4, fontSize: 13 },
  box: { backgroundColor: "#fff", margin: SPACING.lg, marginTop: 0, padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  boxTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 10 },
  tracker: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  stage: { flex: 1, alignItems: "center", position: "relative" },
  stageIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceTertiary, alignItems: "center", justifyContent: "center", zIndex: 2 },
  stageLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 6, textAlign: "center", paddingHorizontal: 2 },
  connector: { position: "absolute", top: 19, left: "60%", right: "-40%", height: 2, backgroundColor: COLORS.border },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  itemImg: { width: 48, height: 48, borderRadius: 8 },
  itemName: { fontWeight: "600", color: COLORS.text, fontSize: 13 },
  itemUnit: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  itemPrice: { fontWeight: "800", color: COLORS.text },
  addrLabel: { fontWeight: "700", color: COLORS.text },
  addrText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  addrPhone: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
});
