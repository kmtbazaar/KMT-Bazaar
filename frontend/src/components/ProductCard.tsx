import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import { useCart } from "@/src/CartContext";
import { useRouter } from "expo-router";

const SCREEN_W = Dimensions.get("window").width;
const RAIL = 88;
const GRID_INNER_PAD = 8;
const CARD_MARGIN = 12;
const GRID_W = SCREEN_W - RAIL - GRID_INNER_PAD;
const COMPACT_CARD_W = Math.floor((GRID_W - CARD_MARGIN * 2) / 2);

export default function ProductCard({ p, compact = false }: { p: any; compact?: boolean }) {
  const router = useRouter();
  const { add, update, cart } = useCart();
  const scale = useSharedValue(1);

  const qty = useMemo(() => {
    const item = cart?.items?.find((i: any) => i.product_id === p.id || i.id === p.id);
    return item?.quantity || 0;
  }, [cart, p.id]);

  const bump = () => {
    scale.value = withSequence(withSpring(0.94, { damping: 10 }), withSpring(1, { damping: 8 }));
  };

  const onAdd = async (e: any) => {
    e?.stopPropagation?.();
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    bump();
    try { await add(p.id, 1); } catch {}
  };

  const onInc = async (e: any) => {
    e?.stopPropagation?.();
    try { await Haptics.selectionAsync(); } catch {}
    bump();
    try { await update(p.id, qty + 1); } catch {}
  };

  const onDec = async (e: any) => {
    e?.stopPropagation?.();
    try { await Haptics.selectionAsync(); } catch {}
    bump();
    try { await update(p.id, Math.max(0, qty - 1)); } catch {}
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const outOfStock = (p.stock ?? 0) <= 0;

  return (
    <Animated.View style={[animStyle, compact ? s.cardCompact : s.card]}>
      <Pressable testID={`product-card-${p.id}`} onPress={() => router.push(`/product/${p.id}` as any)} style={{ flex: 1 }}>
        <View style={s.imgWrap}>
          <Image source={{ uri: p.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
          {discount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{discount}% OFF</Text>
            </View>
          )}
          {outOfStock && (
            <View style={s.oosOverlay}>
              <Text style={s.oosText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={2} ellipsizeMode="tail">{p.name}</Text>
          <Text style={s.unit} numberOfLines={1}>{p.unit || " "}</Text>
          <View style={s.priceRow}>
            <View style={s.priceCol}>
              <Text style={s.price}>₹{p.price}</Text>
              <Text style={[s.mrp, !(discount > 0) && { opacity: 0 }]}>₹{p.mrp || p.price}</Text>
            </View>
            {qty > 0 ? (
              <View style={s.stepper} testID={`qty-stepper-${p.id}`}>
                <Pressable testID={`qty-dec-${p.id}`} onPress={onDec} hitSlop={8} style={s.stepBtn}>
                  <MaterialCommunityIcons name="minus" size={16} color="#fff" />
                </Pressable>
                <Text style={s.qtyText}>{qty}</Text>
                <Pressable
                  testID={`qty-inc-${p.id}`}
                  onPress={onInc}
                  hitSlop={8}
                  style={[s.stepBtn, qty >= (p.stock ?? 99) && { opacity: 0.4 }]}
                  disabled={qty >= (p.stock ?? 99)}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID={`add-to-cart-${p.id}`}
                onPress={onAdd}
                style={[s.addBtn, outOfStock && s.addBtnDisabled]}
                hitSlop={8}
                disabled={outOfStock}
              >
                <MaterialCommunityIcons name="plus" size={16} color={outOfStock ? COLORS.textMuted : COLORS.accent} />
                <Text style={[s.addText, outOfStock && { color: COLORS.textMuted }]}>ADD</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
 card: { flex: 1, width: "100%", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, paddingBottom: 8 },
  cardCompact: { width: COMPACT_CARD_W, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, margin: 6, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
 imgWrap: { width: "100%", height: 115, backgroundColor: COLORS.surfaceSecondary, overflow: "hidden", position: "relative" },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  oosOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  oosText: { color: COLORS.error, fontWeight: "800", fontSize: 11, letterSpacing: 0.5 },
  body: { padding: 6, paddingTop: 6, flex: 1 },
  name: { fontSize: 13, fontWeight: "600", color: COLORS.text, height: 16, lineHeight: 15 },
  unit: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, height: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", width: "100%" },
  priceCol: { flexDirection: "column", alignItems: "flex-start", gap: 0, flexShrink: 1 },
  price: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: "line-through", minHeight: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, backgroundColor: COLORS.accentLight, gap: 2, height: 32 },
  addBtnDisabled: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  addText: { color: COLORS.accent, fontWeight: "800", fontSize: 12 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.accent, borderRadius: RADIUS.sm, paddingHorizontal: 4, height: 32 },
  stepBtn: { width: 26, height: 28, alignItems: "center", justifyContent: "center" },
  qtyText: { color: "#fff", fontWeight: "800", fontSize: 13, minWidth: 18, textAlign: "center" },
});