import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#EAB308" },
  accepted: { label: "Accepted", color: "#2563EB" },
  out_for_delivery: { label: "Out", color: "#F97316" },
  delivered: { label: "Delivered", color: "#16A34A" },
  cancelled: { label: "Cancelled", color: "#DC2626" },
};

export default function VendorOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);

  const load = useCallback(async () => { try { setOrders(await vendorApi.orders()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAccept = async (id: string) => { await vendorApi.acceptOrder(id); load(); };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-orders-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Orders Received ({orders.length})</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={s.empty}>No orders yet</Text>}
        renderItem={({ item }) => {
          const st = STATUSES[item.status];
          return (
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.orderNo}>#{item.order_no}</Text>
                <View style={[s.pill, { borderColor: st?.color, backgroundColor: (st?.color || "#999") + "22" }]}>
                  <Text style={[s.pillText, { color: st?.color }]}>{st?.label}</Text>
                </View>
              </View>
              <Text style={s.cust}>{item.customer?.name} · {item.customer?.phone}</Text>
              {item.my_items.map((it: any) => (
                <View key={it.product_id} style={s.itemRow}>
                  <Image source={{ uri: it.image }} style={s.itemImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName} numberOfLines={1}>{it.name}</Text>
                    <Text style={s.itemMeta}>Qty {it.quantity} · ₹{it.line_total}</Text>
                  </View>
                </View>
              ))}
              <View style={s.rev}>
                <Text style={s.revLabel}>My Revenue</Text>
                <Text style={s.revVal}>₹{item.my_revenue}</Text>
              </View>
              {item.status === "pending" && (
                <Pressable testID={`accept-${item.id}`} onPress={() => onAccept(item.id)} style={s.acceptBtn}>
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  <Text style={s.acceptText}>Accept Order</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNo: { fontWeight: "800", color: COLORS.text },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  pillText: { fontWeight: "800", fontSize: 11 },
  cust: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  itemRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: COLORS.border },
  itemImg: { width: 36, height: 36, borderRadius: 6 },
  itemName: { fontWeight: "600", color: COLORS.text, fontSize: 13 },
  itemMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  rev: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, padding: 10, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.sm },
  revLabel: { color: COLORS.brandDark, fontWeight: "700" },
  revVal: { color: COLORS.brandDark, fontWeight: "800" },
  acceptBtn: { marginTop: 10, backgroundColor: COLORS.success, padding: 10, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  acceptText: { color: "#fff", fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
});
