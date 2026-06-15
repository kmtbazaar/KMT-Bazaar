import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCart } from "@/src/CartContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

export default function Cart() {
  const router = useRouter();
  const { cart, refresh, update } = useCart();
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, []));

  const onQty = async (pid: string, qty: number) => {
    setBusy(true);
    await Haptics.selectionAsync();
    try { await update(pid, qty); } finally { setBusy(false); }
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <SafeAreaView style={s.root} edges={["top"]} testID="cart-screen">
        <Text style={s.title}>My Cart</Text>
        <View style={s.empty}>
          <MaterialCommunityIcons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySub}>Add items to get started</Text>
          <Pressable testID="cart-empty-shop" onPress={() => router.replace("/(tabs)/home")} style={s.shopBtn}>
            <Text style={s.shopBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="cart-screen">
      <Text style={s.title}>My Cart ({cart.item_count})</Text>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        {cart.items.map((it: any) => (
          <View key={it.product_id} style={s.itemCard} testID={`cart-item-${it.product_id}`}>
            <Image source={{ uri: it.image }} style={s.itemImg} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.itemName} numberOfLines={2}>{it.name}</Text>
              <Text style={s.itemUnit}>{it.unit}</Text>
              <View style={s.itemRow}>
                <Text style={s.itemPrice}>₹{it.line_total}</Text>
                <View style={s.qtyBox}>
                  <Pressable testID={`qty-dec-${it.product_id}`} onPress={() => onQty(it.product_id, it.quantity - 1)} hitSlop={8}>
                    <MaterialCommunityIcons name="minus" size={18} color="#fff" />
                  </Pressable>
                  <Text style={s.qtyText}>{it.quantity}</Text>
                  <Pressable testID={`qty-inc-${it.product_id}`} onPress={() => onQty(it.product_id, it.quantity + 1)} hitSlop={8}>
                    <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={s.bill} testID="cart-bill">
          <Text style={s.billTitle}>Bill Details</Text>
          <Row label="Item total" value={`₹${cart.subtotal}`} />
          <Row label="Delivery fee" value={cart.delivery_fee ? `₹${cart.delivery_fee}` : "FREE"} valueColor={cart.delivery_fee ? undefined : COLORS.success} />
          <Row label="Taxes (5%)" value={`₹${cart.tax}`} />
          <View style={s.dash} />
          <Row label="To Pay" value={`₹${cart.total}`} bold />
        </View>

        <View style={s.promise}>
          <Image source={{ uri: LOGO_URL }} style={{ width: 36, height: 36 }} contentFit="contain" />
          <Text style={s.promiseText}>Delivered by KMT Bazaar in 30–45 mins</Text>
        </View>
      </ScrollView>

      <View style={s.checkoutBar}>
        <View>
          <Text style={s.checkoutTotal}>₹{cart.total}</Text>
          <Text style={s.checkoutSub}>Total · {cart.item_count} items</Text>
        </View>
        <Pressable testID="proceed-to-checkout" onPress={() => router.push("/checkout" as any)} style={{ flex: 1, marginLeft: 12 }} disabled={busy}>
          <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.checkoutBtn}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={s.checkoutBtnText}>Proceed to Checkout</Text>
                <MaterialCommunityIcons name="arrow-right" color="#fff" size={20} />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, bold, valueColor }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 4 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: bold ? 16 : 14, fontWeight: bold ? "800" : "500" }}>{label}</Text>
      <Text style={{ color: valueColor || COLORS.text, fontSize: bold ? 18 : 14, fontWeight: bold ? "800" : "700" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, backgroundColor: COLORS.surface },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xl, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginTop: 16 },
  emptySub: { color: COLORS.textMuted },
  shopBtn: { marginTop: 20, backgroundColor: COLORS.accent, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.pill },
  shopBtnText: { color: "#fff", fontWeight: "800" },
  itemCard: { flexDirection: "row", gap: SPACING.md, backgroundColor: "#fff", padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  itemImg: { width: 80, height: 80, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  itemName: { fontWeight: "700", color: COLORS.text, fontSize: 14 },
  itemUnit: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  itemPrice: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.brand, paddingHorizontal: 8, paddingVertical: 6, borderRadius: RADIUS.sm, gap: 12 },
  qtyText: { color: "#fff", fontWeight: "800", minWidth: 20, textAlign: "center" },

  bill: { backgroundColor: "#fff", padding: SPACING.lg, borderRadius: RADIUS.md, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  billTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 8, fontSize: 15 },
  dash: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  promise: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginTop: 12, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md },
  promiseText: { color: COLORS.brandDark, fontWeight: "600", fontSize: 13, flex: 1 },

  checkoutBar: { position: "absolute", left: 0, right: 0, bottom: 70, backgroundColor: "#fff", padding: SPACING.md, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: COLORS.border },
  checkoutTotal: { fontWeight: "800", fontSize: 18, color: COLORS.text },
  checkoutSub: { fontSize: 11, color: COLORS.textMuted },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 8 },
  checkoutBtnText: { color: "#fff", fontWeight: "800" },
});
