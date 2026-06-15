import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import { useCart } from "@/src/CartContext";
import { useRouter } from "expo-router";

export default function ProductCard({ p, compact = false }: { p: any; compact?: boolean }) {
  const router = useRouter();
  const { add } = useCart();
  const scale = useSharedValue(1);

  const onAdd = async (e: any) => {
    e?.stopPropagation?.();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(withSpring(0.92, { damping: 10 }), withSpring(1, { damping: 8 }));
    try { await add(p.id, 1); } catch {}
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

  return (
    <Animated.View style={[animStyle, compact ? s.cardCompact : s.card]}>
      <Pressable testID={`product-card-${p.id}`} onPress={() => router.push(`/product/${p.id}` as any)} style={{ flex: 1 }}>
        <View style={s.imgWrap}>
          <Image source={{ uri: p.image }} style={s.img} contentFit="cover" transition={200} />
          {discount > 0 && (
            <View style={s.badge}><Text style={s.badgeText}>{discount}% OFF</Text></View>
          )}
        </View>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={2}>{p.name}</Text>
          <Text style={s.unit}>{p.unit}</Text>
          <View style={s.priceRow}>
            <View>
              <Text style={s.price}>₹{p.price}</Text>
              {discount > 0 && <Text style={s.mrp}>₹{p.mrp}</Text>}
            </View>
            <Pressable testID={`add-to-cart-${p.id}`} onPress={onAdd} style={s.addBtn} hitSlop={8}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.accent} />
              <Text style={s.addText}>ADD</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: { width: 160, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, marginRight: SPACING.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  cardCompact: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, margin: 6, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  imgWrap: { backgroundColor: COLORS.surfaceSecondary, aspectRatio: 1 },
  img: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: "600", color: COLORS.text, minHeight: 34 },
  unit: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: "line-through" },
  addBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm, backgroundColor: COLORS.accentLight, gap: 2 },
  addText: { color: COLORS.accent, fontWeight: "800", fontSize: 12 },
});
