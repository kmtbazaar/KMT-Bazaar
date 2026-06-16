import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending", color: "#EAB308" },
  { key: "accepted", label: "Accepted", color: "#2563EB" },
  { key: "out_for_delivery", label: "Out", color: "#F97316" },
  { key: "delivered", label: "Delivered", color: "#16A34A" },
];

const NEXT: Record<string, string> = { pending: "accepted", accepted: "out_for_delivery", out_for_delivery: "delivered" };

export default function AdminOrders() {
  const { status: initStatus } = useLocalSearchParams<{ status?: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>(initStatus || "all");

  const load = useCallback(async () => {
    try { setOrders(await adminApi.orders(filter === "all" ? undefined : filter)); } catch {}
  }, [filter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const advance = async (o: any) => {
    const next = NEXT[o.status]; if (!next) return;
    await adminApi.updateOrderStatus(o.id, next);
    load();
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-orders-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>All Orders</Text>
        <View style={{ width: 22 }} />
      </View>
      {/* Filter chips */}
      <View style={s.chipsWrap}>
        <FlatList
          horizontal
          data={STATUSES}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(c) => c.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`filter-${item.key}`}
              onPress={() => setFilter(item.key)}
              style={[s.chip, filter === item.key && { backgroundColor: item.color || COLORS.brand, borderColor: item.color || COLORS.brand }]}
            >
              <Text style={[s.chipText, filter === item.key && { color: "#fff" }]}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingTop: 4 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={s.empty}>No orders</Text>}
        renderItem={({ item }) => {
          const st = STATUSES.find((x) => x.key === item.status);
          return (
            <Pressable
              style={s.card}
              testID={`order-row-${item.id}`}
              onPress={() => router.push(`/admin/orders/${item.id}` as any)}
            >
              <View style={s.cardHead}>
                <Text style={s.orderNo}>#{item.order_no}</Text>
                <View style={[s.statusPill, { borderColor: st?.color || COLORS.brand, backgroundColor: (st?.color || COLORS.brand) + "22" }]}>
                  <Text style={[s.statusText, { color: st?.color || COLORS.brand }]}>{st?.label || item.status}</Text>
                </View>
              </View>
              <Text style={s.cust}>{item.customer?.name || "Customer"} · {item.customer?.phone || ""}</Text>
              <View style={s.row}>
                {item.items?.[0] && <Image source={{ uri: item.items[0].image }} style={s.img} contentFit="cover" />}
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={1}>{item.items?.[0]?.name}{(item.items?.length ?? 0) > 1 ? ` + ${item.items.length - 1}` : ""}</Text>
                  <Text style={s.meta}>{new Date(item.created_at).toLocaleString()}</Text>
                  <Text style={s.total}>₹{item.final_amount ?? item.total} · {item.payment_method?.toUpperCase()}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} />
              </View>
              {NEXT[item.status] && (
                <Pressable testID={`advance-${item.id}`} onPress={(e) => { e.stopPropagation?.(); advance(item); }} style={s.actionBtn}>
                  <Text style={s.actionText}>Mark as {NEXT[item.status].replace(/_/g, " ").toUpperCase()}</Text>
                  <MaterialCommunityIcons name="arrow-right" color="#fff" size={16} />
                </Pressable>
              )}
            </Pressable>
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
  chipsWrap: { backgroundColor: "#fff", borderBottomWidth: 1, borderColor: COLORS.border },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", flexShrink: 0 },
  chipText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 12 },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNo: { fontWeight: "800", color: COLORS.text, fontSize: 13 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  statusText: { fontWeight: "800", fontSize: 11 },
  cust: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  img: { width: 50, height: 50, borderRadius: 8, backgroundColor: COLORS.surfaceTertiary },
  itemName: { fontWeight: "700", color: COLORS.text, fontSize: 13 },
  meta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  total: { fontWeight: "800", color: COLORS.text, marginTop: 4 },
  actionBtn: { marginTop: 10, backgroundColor: COLORS.brand, paddingVertical: 10, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
});
