import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/CartContext";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { shadow } from "@/src/theme";

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
        style={styles.cartButton}
        android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
      >
        <Animated.View style={[styles.trolleyWrap, cartAnim]}>
          <View style={styles.priceBubble}>
            <Text style={styles.priceBubbleText}>₹{subtotal.toFixed(0)}</Text>
          </View>
          <View style={styles.trolleyCircle}>
            <MaterialCommunityIcons name="cart-variant" size={27} color="#fff" />
          </View>
          <View style={styles.trolleyWheels}>
            <View style={styles.wheel} />
            <View style={styles.wheel} />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 10,
    padding: 0,
    zIndex: 50,
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "transparent",
  },
  trolleyWrap: {
    width: 58,
    height: 62,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  trolleyCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    ...shadow.card,
  },
  priceBubble: {
    position: "absolute",
    top: -3,
    minWidth: 48,
    paddingHorizontal: 7,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF6B00",
    zIndex: 3,
    ...shadow.soft,
  },
  priceBubbleText: { color: "#FF6B00", fontSize: 10, fontWeight: "900" },
  trolleyWheels: { position: "absolute", bottom: 0, width: 28, flexDirection: "row", justifyContent: "space-between" },
  wheel: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#334155", borderWidth: 1, borderColor: "#fff" },
  countBadge: {
    position: "absolute",
    top: 18,
    right: -1,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  countText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  itemsText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  priceText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  cta: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
