import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/CartContext";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
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
  const { cart, itemCount, badgePulse } = useCart();
  const cartScale = useSharedValue(1);
  const cartLift = useSharedValue(0);

  useEffect(() => {
    if (badgePulse > 0) {
      cartScale.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1));
      cartLift.value = withSequence(withTiming(-8, { duration: 120 }), withSpring(0));
    }
  }, [badgePulse]);

  const cartAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: cartLift.value }, { scale: cartScale.value }],
  }));

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
          <Animated.View style={[styles.trolleyWrap, cartAnim]}>
            <View style={styles.priceBubble}>
              <Text style={styles.priceBubbleText}>₹{subtotal.toFixed(0)}</Text>
            </View>
            <View style={styles.trolleyCircle}>
              <MaterialCommunityIcons name="cart-variant" size={29} color="#fff" />
            </View>
            <View style={styles.trolleyWheels}>
              <View style={styles.wheel} />
              <View style={styles.wheel} />
            </View>
          </Animated.View>
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
  trolleyWrap: { width: 62, height: 58, alignItems: "center", justifyContent: "flex-end", position: "relative" },
  trolleyCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.9)", ...shadow.soft },
  priceBubble: { position: "absolute", top: -2, minWidth: 48, paddingHorizontal: 7, height: 22, borderRadius: 11, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FF6B00", zIndex: 3 },
  priceBubbleText: { color: "#FF6B00", fontSize: 11, fontWeight: "900" },
  trolleyWheels: { position: "absolute", bottom: 0, width: 28, flexDirection: "row", justifyContent: "space-between" },
  wheel: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#334155", borderWidth: 1, borderColor: "#fff" },
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
