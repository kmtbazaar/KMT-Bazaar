import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const statusColor: Record<string, string> = {
  pending: "#F59E0B",
  accepted: "#3B82F6",
  ready_for_pickup: "#8B5CF6",
  out_for_delivery: "#06B6D4",
  delivered: "#10B981",
  cancelled: "#6B7280",
  rejected: "#EF4444",
  preparing: "#F59E0B",
  packed: "#8B5CF6",
};

const escape = (str: string) =>
  String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildInvoiceHTML(o: any): string {
  const items = (o.order_items && o.order_items.length ? o.order_items : (o.items || []));
  const itemRows = items
    .map((it: any) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${it.product_image ? `<img src="${escape(it.product_image)}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;" />` : ""}
            <div>
              <div style="font-weight:700;">${escape(it.product_name || it.name || "")}</div>
              <div style="color:#666;font-size:11px;">${escape(it.product_unit || it.unit || "")} ${it.vendor_name ? "• " + escape(it.vendor_name) : ""}</div>
            </div>
          </div>
        </td>
        <td style="text-align:center;padding:8px;border-bottom:1px solid #eee;">${it.quantity || 1}</td>
        <td style="text-align:right;padding:8px;border-bottom:1px solid #eee;">₹${(it.unit_price || it.price || 0).toFixed(2)}</td>
        <td style="text-align:right;padding:8px;border-bottom:1px solid #eee;font-weight:700;">₹${(it.total_price || it.line_total || 0).toFixed(2)}</td>
      </tr>
    `)
    .join("");

  const addr = o.address || {};
  const cust = o.customer || {};
  const createdAt = o.created_at ? new Date(o.created_at).toLocaleString() : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escape(o.order_no || "")}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;padding:24px;max-width:780px;margin:auto;}
.head{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #F97316;padding-bottom:16px;margin-bottom:24px;}
.brand{font-size:24px;font-weight:800;color:#F97316;}
.brand-sub{font-size:11px;color:#666;margin-top:4px;}
.inv-meta{text-align:right;}
.inv-no{font-size:14px;font-weight:700;}
.inv-date{font-size:11px;color:#666;margin-top:4px;}
.row{display:flex;gap:24px;margin-bottom:24px;}
.box{flex:1;background:#F9FAFB;padding:12px;border-radius:8px;border:1px solid #E5E7EB;}
.box-title{font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:700;}
.box-line{font-size:13px;margin-bottom:2px;}
table{width:100%;border-collapse:collapse;margin-bottom:24px;}
th{background:#F3F4F6;text-align:left;padding:10px 8px;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:0.5px;}
th:nth-child(2){text-align:center;}
th:nth-child(3),th:nth-child(4){text-align:right;}
.totals{margin-left:auto;width:280px;}
.tot-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;}
.tot-row.grand{border-top:2px solid #111;margin-top:6px;padding-top:10px;font-size:16px;font-weight:800;color:#F97316;}
.status{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
.foot{text-align:center;color:#6B7280;font-size:11px;margin-top:32px;border-top:1px solid #E5E7EB;padding-top:12px;}
</style>
</head>
<body>
<div class="head">
  <div>
    <div class="brand">KMT Bazaar</div>
    <div class="brand-sub">Multi-vendor Marketplace</div>
  </div>
  <div class="inv-meta">
    <div class="inv-no">Invoice #${escape(o.order_no || "")}</div>
    <div class="inv-date">${escape(createdAt)}</div>
    <div style="margin-top:6px;" class="status" style="background:${(statusColor[o.status] || "#6B7280")}22;color:${(statusColor[o.status] || "#6B7280")};">${escape((o.status || "").toUpperCase())}</div>
  </div>
</div>

<div class="row">
  <div class="box">
    <div class="box-title">Bill To</div>
    <div class="box-line"><strong>${escape(cust.name || addr.full_name || "Customer")}</strong></div>
    <div class="box-line">${escape(cust.phone || addr.phone || "")}</div>
    ${cust.email ? `<div class="box-line">${escape(cust.email)}</div>` : ""}
  </div>
  <div class="box">
    <div class="box-title">Ship To</div>
    <div class="box-line">${escape(addr.full_name || cust.name || "")}</div>
    <div class="box-line">${escape(addr.line1 || "")}</div>
    ${addr.line2 ? `<div class="box-line">${escape(addr.line2)}</div>` : ""}
    <div class="box-line">${escape(addr.city || "")}, ${escape(addr.state || "")} ${escape(addr.pincode || "")}</div>
    ${addr.phone ? `<div class="box-line">${escape(addr.phone)}</div>` : ""}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="totals">
  <div class="tot-row"><span>Subtotal</span><span>₹${(o.subtotal || 0).toFixed(2)}</span></div>
  <div class="tot-row"><span>Delivery</span><span>₹${(o.delivery_fee || 0).toFixed(2)}</span></div>
  <div class="tot-row"><span>Tax</span><span>₹${(o.tax || 0).toFixed(2)}</span></div>
  ${o.discount ? `<div class="tot-row"><span>Discount</span><span>− ₹${o.discount.toFixed(2)}</span></div>` : ""}
  <div class="tot-row grand"><span>Grand Total</span><span>₹${(o.final_amount || o.total || 0).toFixed(2)}</span></div>
</div>

<div style="margin-top:24px;padding:12px;background:#F3F4F6;border-radius:8px;">
  <div style="font-size:11px;color:#6B7280;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Payment</div>
  <div style="font-size:13px;">Method: <strong>${escape((o.payment_method || "").toUpperCase())}</strong> · Status: <strong>${escape((o.payment_status || "").toUpperCase())}</strong></div>
</div>

<div class="foot">
  Thank you for shopping with KMT Bazaar.<br/>
  This is a computer-generated invoice and does not require a signature.
</div>
</body>
</html>`;
}

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const o = await adminApi.orderDetail(id);
      setOrder(o);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load order");
    } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onPrintOrShare = async (share = false) => {
    if (!order) return;
    setGenerating(true);
    try {
      const html = buildInvoiceHTML(order);
      if (share && Platform.OS !== "web") {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Invoice ${order.order_no}` });
        } else {
          Alert.alert("Saved", `Invoice saved to ${uri}`);
        }
      } else {
        // Print directly (also opens print dialog on web)
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to generate PDF");
    } finally { setGenerating(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.brand} /></View>;
  if (!order) return <View style={s.center}><Text>Order not found</Text></View>;

  const items = order.order_items && order.order_items.length ? order.order_items : (order.items || []);
  const addr = order.address || {};
  const cust = order.customer || {};

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-order-detail">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back-btn">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}>
        {/* Order summary */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View>
              <Text style={s.orderNo}>{order.order_no}</Text>
              <Text style={s.orderDate}>{order.created_at ? new Date(order.created_at).toLocaleString() : ""}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: (statusColor[order.status] || COLORS.brand) + "22", borderColor: statusColor[order.status] || COLORS.brand }]}>
              <Text style={[s.badgeText, { color: statusColor[order.status] || COLORS.brand }]}>{order.status}</Text>
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={s.card}>
          <Text style={s.sec}>Customer</Text>
          <Text style={s.line}><Text style={s.bold}>{cust.name || "—"}</Text></Text>
          {cust.phone && <Text style={s.line}>📞 {cust.phone}</Text>}
          {cust.email && <Text style={s.line}>✉ {cust.email}</Text>}
        </View>

        {/* Address */}
        <View style={s.card}>
          <Text style={s.sec}>Shipping Address</Text>
          <Text style={s.line}><Text style={s.bold}>{addr.full_name || cust.name}</Text></Text>
          <Text style={s.line}>{addr.line1}</Text>
          {addr.line2 ? <Text style={s.line}>{addr.line2}</Text> : null}
          <Text style={s.line}>{addr.city}, {addr.state} {addr.pincode}</Text>
          {addr.phone && <Text style={s.line}>📞 {addr.phone}</Text>}
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={s.sec}>Items ({items.length})</Text>
          {items.map((it: any, idx: number) => (
            <View key={it.id || idx} style={s.itemRow}>
              {it.product_image ? (
                <Image source={{ uri: it.product_image }} style={s.itemImg} contentFit="cover" />
              ) : (
                <View style={[s.itemImg, { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSecondary }]}>
                  <MaterialCommunityIcons name="image-off" size={20} color={COLORS.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{it.product_name || it.name}</Text>
                <Text style={s.itemMeta}>{it.product_unit || it.unit || "—"}</Text>
                {it.vendor_name && (
                  <Text style={s.itemVendor}>
                    <MaterialCommunityIcons name="store" size={10} color={COLORS.brand} /> {it.vendor_name}
                  </Text>
                )}
                <View style={s.itemBottom}>
                  <Text style={s.itemQty}>Qty: <Text style={s.bold}>{it.quantity}</Text></Text>
                  <Text style={s.itemTotal}>₹{(it.total_price || it.line_total || 0).toFixed(2)}</Text>
                </View>
                {it.status && (
                  <View style={[s.itemStatusBadge, { backgroundColor: (statusColor[it.status] || "#9CA3AF") + "22" }]}>
                    <Text style={[s.itemStatusText, { color: statusColor[it.status] || "#6B7280" }]}>
                      {String(it.status).replace(/_/g, " ")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.card}>
          <Text style={s.sec}>Bill Summary</Text>
          <View style={s.totRow}><Text style={s.totLbl}>Subtotal</Text><Text style={s.totVal}>₹{(order.subtotal || 0).toFixed(2)}</Text></View>
          <View style={s.totRow}><Text style={s.totLbl}>Delivery Charge</Text><Text style={s.totVal}>₹{(order.delivery_fee || 0).toFixed(2)}</Text></View>
          <View style={s.totRow}><Text style={s.totLbl}>Tax</Text><Text style={s.totVal}>₹{(order.tax || 0).toFixed(2)}</Text></View>
          {order.discount ? <View style={s.totRow}><Text style={s.totLbl}>Discount</Text><Text style={[s.totVal, { color: COLORS.success }]}>− ₹{order.discount.toFixed(2)}</Text></View> : null}
          <View style={[s.totRow, s.grandRow]}>
            <Text style={s.grandLbl}>Grand Total</Text>
            <Text style={s.grandVal}>₹{(order.final_amount || order.total || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={s.card}>
          <Text style={s.sec}>Payment</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.line}>Method: <Text style={s.bold}>{String(order.payment_method || "").toUpperCase()}</Text></Text>
            <Text style={s.line}>Status: <Text style={[s.bold, { color: order.payment_status === "paid" ? COLORS.success : COLORS.accent }]}>{String(order.payment_status || "").toUpperCase()}</Text></Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Actions */}
      <View style={s.bottomBar}>
        <Pressable testID="print-btn" onPress={() => onPrintOrShare(false)} disabled={generating} style={[s.btn, s.printBtn]}>
          {generating ? <ActivityIndicator color={COLORS.brand} size="small" /> : (
            <>
              <MaterialCommunityIcons name="printer" size={18} color={COLORS.brand} />
              <Text style={[s.btnText, { color: COLORS.brand }]}>Print</Text>
            </>
          )}
        </Pressable>
        <Pressable testID="share-pdf-btn" onPress={() => onPrintOrShare(true)} disabled={generating} style={[s.btn, s.shareBtn]}>
          {generating ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#fff" />
              <Text style={s.btnText}>Download PDF</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: 12, backgroundColor: COLORS.brand },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 17 },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNo: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  orderDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  sec: { fontWeight: "800", color: COLORS.text, fontSize: 14, marginBottom: 8 },
  line: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: "700", color: COLORS.text },
  itemRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemImg: { width: 56, height: 56, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSecondary },
  itemName: { fontWeight: "700", color: COLORS.text, fontSize: 13 },
  itemMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  itemVendor: { color: COLORS.brand, fontSize: 11, marginTop: 2, fontWeight: "700" },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  itemQty: { fontSize: 12, color: COLORS.text },
  itemTotal: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  itemStatusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill, marginTop: 6 },
  itemStatusText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totLbl: { color: COLORS.textSecondary, fontSize: 13 },
  totVal: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  grandRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 8 },
  grandLbl: { fontWeight: "800", color: COLORS.text, fontSize: 15 },
  grandVal: { fontWeight: "800", color: COLORS.brand, fontSize: 17 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, padding: SPACING.md, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: COLORS.border },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: RADIUS.sm, minHeight: 46 },
  printBtn: { borderWidth: 1.5, borderColor: COLORS.brand, backgroundColor: "#fff" },
  shareBtn: { backgroundColor: COLORS.brand },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
