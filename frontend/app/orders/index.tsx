import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const STATUS_COLOR: Record<string, string> = {
  pending: "#EAB308", accepted: "#2563EB", out_for_delivery: "#F97316", delivered: "#16A34A", cancelled: "#DC2626",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", accepted: "Accepted", out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => { try { setOrders(await api.orders()); } catch {} })();
  }, []));

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="orders-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>My Orders</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ListEmptyComponent={<Text style={s.empty}>No orders yet</Text>}
        renderItem={({ item }) => (
          <Pressable testID={`order-${item.id}`} onPress={() => router.push(`/orders/${item.id}` as any)} style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.orderNo}>#{item.order_no}</Text>
              <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[item.status] + "22", borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.statusText, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <View style={s.row}>
              <Image source={{ uri: item.items[0]?.image }} style={s.img} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={1}>{item.items[0]?.name}{item.items.length > 1 ? ` + ${item.items.length - 1} more` : ""}</Text>
                <Text style={s.meta}>{new Date(item.created_at).toLocaleString()}</Text>
                <Text style={s.total}>₹{item.total} · {item.payment_method === "cod" ? "COD" : "Online"}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNo: { fontWeight: "800", color: COLORS.text, fontSize: 13 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  statusText: { fontWeight: "800", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  img: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.surfaceTertiary },
  itemName: { fontWeight: "700", color: COLORS.text },
  meta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  total: { fontWeight: "800", color: COLORS.text, marginTop: 4 },
});
