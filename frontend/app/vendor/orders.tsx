import { safeGoBack } from "@/src/navigation";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { formatRupees } from "@/src/utils/formatRupees";

const STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#EAB308" },
  accepted: { label: "Accepted", color: "#2563EB" },
  out_for_delivery: { label: "Out", color: "#F97316" },
  delivered: { label: "Delivered", color: "#16A34A" },
  cancelled: { label: "Cancelled", color: "#DC2626" },
};

function formatOrderDate(value: any) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getOrderAddress(address: any) {
  if (!address) return "Delivery address not provided";
  if (typeof address === "string") return address;
  return [
    address.full_name, address.line1, address.line2, address.landmark,
    address.city, address.state, address.pincode,
  ].filter(Boolean).join(", ") || "Delivery address not provided";
}

function formatMoney(value: any) {
  return formatRupees(value);
}

export default function VendorOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const load = useCallback(async () => { try { setOrders(await vendorApi.orders()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAccept = async (id: string) => {
    try {
      await vendorApi.acceptOrder(id);
      setSelectedOrder(null);
      await load();
    } catch (error: any) {
      Alert.alert("Could not accept order", error?.message || "Please refresh and try again.");
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-orders-screen">
      <View style={s.header}>
        <Pressable onPress={() => safeGoBack(router, "/vendor")} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
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
            <View style={s.card} testID={`vendor-order-card-${item.id}`}>
              <Pressable
                testID={`vendor-order-open-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`View full details for order ${item.order_no}`}
                accessibilityHint="Opens customer, item, size, colour, quantity, payment and delivery details"
                onPress={() => setSelectedOrder(item)}
              >
                <View style={s.cardHead}>
                  <Text style={s.orderNo}>#{item.order_no}</Text>
                  <View style={[s.pill, { borderColor: st?.color, backgroundColor: (st?.color || "#999") + "22" }]}>
                    <Text style={[s.pillText, { color: st?.color }]}>{st?.label}</Text>
                  </View>
                </View>
                <Text style={s.cust}>{item.customer?.name || "KMT Customer"} · {item.customer?.phone || "No phone"}</Text>
                {(item.my_items || []).map((it: any, index: number) => (
                  <View key={`${it.product_id}:${it.variant || "default"}:${it.color || "default"}:${index}`} style={s.itemRow}>
                    <Image source={{ uri: it.image }} style={s.itemImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName} numberOfLines={1}>{it.name}</Text>
                      <Text style={s.itemMeta}>
                        {it.unit ? `${it.unit} · ` : ""}Qty {it.quantity ?? it.qty ?? 1}
                        {it.color ? ` · ${it.color}` : ""} · {formatMoney(it.line_total ?? (Number(it.price || it.unit_price || 0) * Number(it.quantity || it.qty || 1)))}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={s.rev}>
                  <Text style={s.revLabel}>My Revenue</Text>
                  <Text style={s.revVal}>{formatMoney(item.my_revenue)}</Text>
                </View>
                <View style={s.openDetailsHint}>
                  <Text style={s.openDetailsText}>Touch to view complete order details</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.brand} />
                </View>
              </Pressable>
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

      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={s.detailOverlay}>
          <View style={s.detailModal} testID="vendor-order-detail-modal">
            {selectedOrder && (() => {
              const order = selectedOrder;
              const status = STATUSES[order.status];
              const address = order.address;
              const addressPhone = typeof address === "object" ? address?.phone : "";
              const itemCount = (order.my_items || []).reduce(
                (sum: number, current: any) => sum + Number(current.quantity ?? current.qty ?? 1), 0
              );
              return (
                <>
                  <View style={s.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailTitle}>Order Details</Text>
                      <Text style={s.detailOrderNo}>Order #{order.order_no}</Text>
                      {!!formatOrderDate(order.created_at) && (
                        <Text style={s.detailMuted}>{formatOrderDate(order.created_at)}</Text>
                      )}
                    </View>
                    <View style={[s.pill, { borderColor: status?.color || "#999", backgroundColor: (status?.color || "#999") + "22" }]}>
                      <Text style={[s.pillText, { color: status?.color || "#666" }]}>{status?.label || order.status}</Text>
                    </View>
                    <Pressable onPress={() => setSelectedOrder(null)} hitSlop={10} style={s.closeBtn}>
                      <MaterialCommunityIcons name="close" size={20} color={COLORS.text} />
                    </Pressable>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>Customer details</Text>
                      <Text style={s.detailCustomerName}>{order.customer?.name || address?.full_name || "KMT Customer"}</Text>
                      {!!(order.customer?.phone || addressPhone) && (
                        <Text style={s.detailBody}>Phone: {order.customer?.phone || addressPhone}</Text>
                      )}
                      {!!order.customer?.email && <Text style={s.detailBody}>Email: {order.customer.email}</Text>}
                    </View>

                    <View style={s.detailSection}>
                      <View style={s.detailSectionHeading}>
                        <Text style={s.detailSectionTitle}>Your ordered items</Text>
                        <Text style={s.detailMuted}>{(order.my_items || []).length} product(s) · {itemCount} unit(s)</Text>
                      </View>
                      {(order.my_items || []).map((it: any, index: number) => {
                        const quantity = Number(it.quantity ?? it.qty ?? 1);
                        const unitPrice = Number(it.price ?? it.unit_price ?? 0);
                        const lineTotal = Number(it.line_total ?? unitPrice * quantity);
                        const optionDetails = [
                          it.unit,
                          it.variant && typeof it.variant === "string" && it.variant !== it.unit ? it.variant : null,
                          it.size ? `Size: ${it.size}` : null,
                          it.color ? `Colour: ${it.color}` : null,
                        ].filter(Boolean).join(" · ");
                        return (
                          <View key={`${it.product_id || it.name || "item"}:${index}`} style={s.detailItem}>
                            <Image source={{ uri: it.image }} style={s.detailImage} contentFit="contain" />
                            <View style={{ flex: 1 }}>
                              <Text style={s.detailItemName}>{it.name || "Product"}</Text>
                              {!!optionDetails && <Text style={s.detailMuted}>{optionDetails}</Text>}
                              <Text style={s.detailBody}>Quantity: {quantity}</Text>
                              <Text style={s.detailMuted}>Rate: {formatMoney(unitPrice)} each</Text>
                            </View>
                            <Text style={s.detailLineTotal}>{formatMoney(lineTotal)}</Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>Pickup / delivery address</Text>
                      <Text style={s.detailBody}>{getOrderAddress(order.address)}</Text>
                      {!!addressPhone && <Text style={s.detailMuted}>Address phone: {addressPhone}</Text>}
                      {!!order.delivery_instructions && <Text style={s.detailMuted}>Instructions: {order.delivery_instructions}</Text>}
                    </View>

                    <View style={s.detailSection}>
                      <Text style={s.detailSectionTitle}>Payment and bill</Text>
                      <DetailRow label="Payment method" value={order.payment_method === "cod" ? "Cash on Delivery" : String(order.payment_method || "Not specified").toUpperCase()} />
                      {!!order.payment_status && <DetailRow label="Payment status" value={String(order.payment_status).toUpperCase()} />}
                      {!!order.transaction_id && <DetailRow label="Transaction ID" value={String(order.transaction_id)} />}
                      <View style={s.detailDivider} />
                      <DetailRow label="Your items total" value={formatMoney(order.my_revenue)} />
                      <DetailRow label="Order subtotal" value={formatMoney(order.subtotal)} />
                      <DetailRow label="Delivery fee" value={Number(order.delivery_fee || 0) > 0 ? formatMoney(order.delivery_fee) : "FREE"} />
                      {Number(order.tax || 0) > 0 && <DetailRow label="Tax" value={formatMoney(order.tax)} />}
                      <DetailRow label="Customer order total" value={formatMoney(order.total)} bold />
                    </View>

                    {!!(order.customer_note || order.notes || order.note) && (
                      <View style={s.detailSection}>
                        <Text style={s.detailSectionTitle}>Customer note</Text>
                        <Text style={s.detailBody}>{order.customer_note || order.notes || order.note}</Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={s.detailFooter}>
                    <Pressable onPress={() => setSelectedOrder(null)} style={s.closeAction}>
                      <Text style={s.closeActionText}>Close</Text>
                    </Pressable>
                    {order.status === "pending" && (
                      <Pressable testID={`detail-accept-${order.id}`} onPress={() => onAccept(order.id)} style={s.acceptBtn}>
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                        <Text style={s.acceptText}>Accept Order</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.detailTotalsRow}>
      <Text style={[s.detailTotalsLabel, bold && { fontWeight: "800", color: COLORS.text }]}>{label}</Text>
      <Text style={[s.detailTotalsValue, bold && { fontSize: 15, fontWeight: "900" }]}>{value}</Text>
    </View>
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
  openDetailsHint: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderColor: COLORS.border },
  openDetailsText: { color: COLORS.brand, fontSize: 11, fontWeight: "800" },
  detailOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  detailModal: { maxHeight: "92%", minHeight: "58%", backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 12 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  detailTitle: { fontSize: 19, fontWeight: "900", color: COLORS.text },
  detailOrderNo: { color: COLORS.brand, fontWeight: "800", marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  detailSection: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 13, marginTop: 12 },
  detailSectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  detailSectionTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text, marginBottom: 8 },
  detailCustomerName: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  detailBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 3 },
  detailMuted: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: COLORS.border },
  detailImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary },
  detailItemName: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  detailLineTotal: { color: COLORS.text, fontSize: 13, fontWeight: "900" },
  detailTotalsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 7 },
  detailTotalsLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  detailTotalsValue: { color: COLORS.text, fontSize: 12, fontWeight: "800", textAlign: "right" },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginTop: 10 },
  detailFooter: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: COLORS.border },
  closeAction: { minWidth: 90, paddingVertical: 12, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, alignItems: "center" },
  closeActionText: { color: COLORS.text, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
});
