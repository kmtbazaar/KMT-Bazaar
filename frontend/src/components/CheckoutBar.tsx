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
        <Animated.View style={[styles.bagWrap, cartAnim]}>
          <View style={styles.priceBubble}>
            <Text style={styles.priceBubbleText}>₹{subtotal.toFixed(0)}</Text>
          </View>
          <View style={styles.bagHandle} />
          <View style={styles.bag}>
            <View style={styles.bagTop} />
            <View style={styles.bagBody}>
              <MaterialCommunityIcons name="shopping-bag-outline" size={21} color="#fff7ed" />
              <Text style={styles.bagKmt}>KMT</Text>
              <Text style={styles.bagBazaar}>BAZAAR</Text>
            </View>
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
    width: 72,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  bagWrap: {
    width: 70,
    height: 78,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  bagHandle: {
    position: "absolute",
    top: 12,
    width: 28,
    height: 17,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: "#FACC15",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    zIndex: 1,
  },
  bag: {
    width: 66,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FACC15",
    ...shadow.card,
  },
  bagTop: {
    height: 12,
    backgroundColor: "#FACC15",
  },
  bagBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  bagKmt: {
    color: "#FFF7ED",
    fontSize: 13,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  bagBazaar: {
    color: "#FDE68A",
    fontSize: 7,
    lineHeight: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
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

  countBadge: {
    position: "absolute",
    top: 17,
    right: -2,
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

});
