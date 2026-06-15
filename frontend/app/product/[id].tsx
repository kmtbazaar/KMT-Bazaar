import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const [p, setP] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { (async () => setP(await api.product(id as string)))(); }, [id]);

  const onAdd = async () => {
    setAdding(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try { await add(p.id, qty); setToast("Added to cart!"); setTimeout(() => setToast(null), 1500); }
    finally { setAdding(false); }
  };

  if (!p) return <View style={s.center}><ActivityIndicator color={COLORS.brand} /></View>;
  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <View style={s.root} testID="product-screen">
      <SafeAreaView edges={["top"]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.hbtn} hitSlop={8}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Pressable style={s.hbtn} hitSlop={8}><MaterialCommunityIcons name="share-variant" size={20} color={COLORS.text} /></Pressable>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: p.image }} style={s.img} contentFit="cover" />
        <View style={s.card}>
          <Text style={s.name} testID="product-name">{p.name}</Text>
          <Text style={s.unit}>{p.unit} · In stock</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{p.price}</Text>
            {discount > 0 && <Text style={s.mrp}>₹{p.mrp}</Text>}
            {discount > 0 && <View style={s.discPill}><Text style={s.discText}>{discount}% OFF</Text></View>}
          </View>
          <View style={s.divider} />
          <Text style={s.sectionTitle}>About this product</Text>
          <Text style={s.desc}>{p.description}</Text>
          <View style={s.deliveryCard}>
            <MaterialCommunityIcons name="moped-electric" size={24} color={COLORS.brand} />
            <View style={{ flex: 1 }}>
              <Text style={s.delTitle}>Free delivery on orders above ₹199</Text>
              <Text style={s.delSub}>Estimated delivery: 30-45 mins</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {toast && (
        <View style={s.toast} testID="add-toast">
          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}
      <View style={s.bottomBar}>
        <View style={s.qtyBox}>
          <Pressable testID="pdp-qty-dec" onPress={() => setQty(Math.max(1, qty - 1))} hitSlop={8}><MaterialCommunityIcons name="minus" size={20} color={COLORS.text} /></Pressable>
          <Text style={s.qtyT}>{qty}</Text>
          <Pressable testID="pdp-qty-inc" onPress={() => setQty(qty + 1)} hitSlop={8}><MaterialCommunityIcons name="plus" size={20} color={COLORS.text} /></Pressable>
        </View>
        <Pressable testID="pdp-add-to-cart" onPress={onAdd} style={{ flex: 1, marginLeft: 12 }} disabled={adding}>
          <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.addBtn}>
            {adding ? <ActivityIndicator color="#fff" /> : (
              <><MaterialCommunityIcons name="cart-plus" color="#fff" size={20} /><Text style={s.addBtnText}>Add to Cart · ₹{p.price * qty}</Text></>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.lg, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  hbtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow.soft },
  img: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  card: { padding: SPACING.lg },
  name: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  unit: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  price: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 16, color: COLORS.textMuted, textDecorationLine: "line-through" },
  discPill: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  discText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  sectionTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  desc: { color: COLORS.textSecondary, lineHeight: 22 },
  deliveryCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: COLORS.brandLight, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.lg },
  delTitle: { fontWeight: "700", color: COLORS.brandDark },
  delSub: { color: COLORS.brandDark, fontSize: 12, marginTop: 2 },
  toast: { position: "absolute", top: 80, left: 20, right: 20, backgroundColor: COLORS.success, padding: 12, borderRadius: RADIUS.md, flexDirection: "row", alignItems: "center", gap: 10, ...shadow.card, zIndex: 20 },
  toastText: { color: "#fff", fontWeight: "700" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: SPACING.md, paddingBottom: 24, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: COLORS.border },
  qtyBox: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 8, borderRadius: RADIUS.pill, gap: 14 },
  qtyT: { fontWeight: "800", minWidth: 18, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 8 },
  addBtnText: { color: "#fff", fontWeight: "800" },
});
