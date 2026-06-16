import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

interface Props {
  /** override destination route; defaults to /cart */
  route?: string;
  label?: string;
  /** distance from bottom of screen in pixels (tab bar height). default 70 */
  bottomOffset?: number;
}

export default function CheckoutBar({ route = "/cart", label = "View Cart", bottomOffset = 70 }: Props) {
  const router = useRouter();
  const { cart, itemCount } = useCart();

  if (!itemCount || itemCount <= 0) return null;
  const subtotal = cart?.subtotal || 0;

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
      testID="checkout-bar"
    >
      <Pressable
        testID="checkout-bar-btn"
        onPress={() => router.push(route as any)}
        style={styles.bar}
        android_ripple={{ color: "rgba(255,255,255,0.15)" }}
      >
        <View style={styles.left}>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
          <View>
            <Text style={styles.itemsText}>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Text>
            <Text style={styles.priceText}>₹{subtotal.toFixed(0)}</Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.cta}>{label}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    zIndex: 50,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    ...Platform.select({
      ios: shadow.card,
      android: shadow.card,
    }),
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  countPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    minWidth: 28,
    alignItems: "center",
  },
  countText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  itemsText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  priceText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  cta: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
