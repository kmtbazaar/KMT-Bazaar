import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/src/CartContext";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { shadow } from "@/src/theme";
import * as Haptics from "expo-haptics";

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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const didDrag = useRef(false);
  const lastVibrateAt = useRef(0);
  const cartScale = useSharedValue(1);
  const cartLift = useSharedValue(0);

  useEffect(() => {
    if (badgePulse > 0) {
      cartScale.value = withSequence(withTiming(1.18, { duration: 110 }), withSpring(1));
      cartLift.value = withSequence(withTiming(-8, { duration: 120 }), withSpring(0));
    }
  }, [badgePulse]);

  const cartAnim = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value + cartLift.value },
      { scale: cartScale.value },
    ],
  }));

  const panResponder = useMemo(() => {
    const minX = -(screenWidth - 92);
    const maxX = 8;
    const minY = -(screenHeight - bottomOffset - 92);
    const maxY = 10;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartX.current = dragX.value;
        dragStartY.current = dragY.value;
        didDrag.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        const nextX = clamp(dragStartX.current + gesture.dx, minX, maxX);
        const nextY = clamp(dragStartY.current + gesture.dy, minY, maxY);

        if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
          didDrag.current = true;
          const now = Date.now();
          if (now - lastVibrateAt.current > 90) {
            lastVibrateAt.current = now;
            Haptics.selectionAsync().catch(() => {});
            try {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
            } catch {}
          }
        }

        dragX.value = nextX;
        dragY.value = nextY;
      },
      onPanResponderRelease: () => {
        if (!didDrag.current) {
          router.push(route as any);
        } else {
          dragX.value = withSpring(dragX.value, { damping: 18, stiffness: 220 });
          dragY.value = withSpring(dragY.value, { damping: 18, stiffness: 220 });
        }
      },
      onPanResponderTerminate: () => {
        dragX.value = withSpring(dragX.value, { damping: 18, stiffness: 220 });
        dragY.value = withSpring(dragY.value, { damping: 18, stiffness: 220 });
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [bottomOffset, route, router, screenHeight, screenWidth]);

  if (!itemCount || itemCount <= 0) return null;
  const subtotal = cart?.subtotal || 0;

  return (
    <View
      style={[styles.wrap, { bottom: bottomOffset }]}
      pointerEvents="box-none"
      testID="checkout-bar"
    >
      <View
        testID="checkout-bar-btn"
        style={styles.cartButton}
        {...panResponder.panHandlers}
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
      </View>
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
    top: 8,
    width: 30,
    height: 18,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: "#7F1D1D",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    zIndex: 1,
  },
  bag: {
    width: 68,
    height: 62,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FACC15",
    ...shadow.card,
  },
  bagTop: {
    height: 8,
    backgroundColor: "#FACC15",
  },
  bagBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(127,29,29,0.45)",
  },
  bagKmt: {
    color: "#FFF7ED",
    fontSize: 12,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  bagBazaar: {
    color: "#FDE68A",
    fontSize: 7,
    lineHeight: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  priceBubble: {
    position: "absolute",
    top: -7,
    minWidth: 52,
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
