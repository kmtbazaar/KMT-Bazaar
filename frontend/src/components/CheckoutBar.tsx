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
  const bagRotate = useSharedValue(0);
  const dropY = useSharedValue(-16);
  const dropScale = useSharedValue(0.78);
  const dropOpacity = useSharedValue(0);

  useEffect(() => {
    if (badgePulse > 0) {
      cartScale.value = withSequence(
        withTiming(1.16, { duration: 120 }),
        withTiming(1.04, { duration: 150 }),
        withSpring(1)
      );
      cartLift.value = withSequence(withTiming(-10, { duration: 140 }), withSpring(0));
      bagRotate.value = withSequence(
        withTiming(-5, { duration: 120 }),
        withTiming(5, { duration: 140 }),
        withTiming(-3.5, { duration: 120 }),
        withTiming(3.5, { duration: 120 }),
        withSpring(0)
      );
      dropOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(1, { duration: 1050 }),
        withTiming(0, { duration: 280 })
      );
      dropScale.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.9, { duration: 170 }),
        withTiming(0.72, { duration: 260 }),
        withTiming(0.78, { duration: 180 }),
        withTiming(0, { duration: 680 })
      );
      dropY.value = withSequence(
        withTiming(-16, { duration: 100 }),
        withTiming(5, { duration: 380 }),
        withTiming(1, { duration: 180 }),
        withTiming(6, { duration: 220 }),
        withTiming(0, { duration: 620 })
      );
    }
  }, [badgePulse]);

  const cartAnim = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value + cartLift.value },
      { rotate: bagRotate.value + "deg" },
      { scale: cartScale.value },
    ],
  }));

  const dropAnim = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [
      { translateY: dropY.value },
      { scale: dropScale.value },
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
          <Animated.View style={[styles.dropItem, dropAnim]} pointerEvents="none">
            <MaterialCommunityIcons name="package-variant-closed" size={17} color="#7F1D1D" />
          </Animated.View>
          <View style={styles.priceBubble}>
            <Text style={styles.priceBubbleText}>₹{subtotal.toFixed(0)}</Text>
          </View>
          <View style={styles.sackRope} />
          <View style={styles.sackKnot} />
          <View style={styles.bagMouth}>
            <View style={styles.mouthFoldLeft} />
            <View style={styles.mouthFoldRight} />
            <View style={styles.mouthTieBand} />
          </View>
          <View style={styles.bagBody}>
            <View style={styles.juteStitchLeft} />
            <View style={styles.juteStitchRight} />
            <View style={styles.bagLogo}>
              <MaterialCommunityIcons name="package-variant-closed" size={18} color="#3E2815" />
              <Text style={styles.bagKmt}>KMT</Text>
              <Text style={styles.bagBazaar}>BAZAAR</Text>
            </View>
            <View style={styles.juteFoldBottom} />
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
    right: 6,
    padding: 0,
    zIndex: 50,
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: {
    width: 92,
    height: 98,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  bagWrap: {
    width: 92,
    height: 98,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  sackRope: {
    position: "absolute",
    top: 13,
    width: 52,
    height: 13,
    borderTopWidth: 3,
    borderColor: "#6A451F",
    borderStyle: "dashed",
    borderRadius: 10,
    zIndex: 5,
  },
  sackKnot: {
    position: "absolute",
    top: 16,
    width: 15,
    height: 9,
    borderRadius: 6,
    backgroundColor: "#7A5227",
    zIndex: 6,
  },
  bagMouth: {
    position: "absolute",
    top: 23,
    width: 84,
    height: 18,
    borderRadius: 12,
    backgroundColor: "#C18A4C",
    borderWidth: 2,
    borderColor: "#714A26",
    zIndex: 3,
    overflow: "hidden",
    transform: [{ rotate: "-1deg" }],
    ...shadow.soft,
  },
  mouthFoldLeft: {
    position: "absolute",
    left: 7,
    top: 3,
    width: 22,
    height: 9,
    borderRadius: 8,
    backgroundColor: "#A86F32",
  },
  mouthFoldRight: {
    position: "absolute",
    right: 7,
    top: 3,
    width: 22,
    height: 9,
    borderRadius: 8,
    backgroundColor: "#A86F32",
  },
  mouthTieBand: {
    position: "absolute",
    left: 29,
    right: 29,
    bottom: 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#7A5227",
  },
  bagBody: {
    position: "absolute",
    bottom: 4,
    width: 74,
    height: 62,
    borderRadius: 18,
    backgroundColor: "#A86F32",
    borderWidth: 2,
    borderColor: "#6F4824",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadow.card,
  },
  bagLogo: {
    width: 58,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(216,165,94,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(81,52,25,0.35)",
  },
  bagKmt: {
    color: "#3E2815",
    fontSize: 12,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  bagBazaar: {
    color: "#5E3D20",
    fontSize: 7,
    lineHeight: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  juteStitchLeft: {
    position: "absolute",
    left: 6,
    top: 9,
    bottom: 8,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(62,40,21,0.5)",
  },
  juteStitchRight: {
    position: "absolute",
    right: 6,
    top: 9,
    bottom: 8,
    borderRightWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(62,40,21,0.5)",
  },
  juteFoldBottom: {
    position: "absolute",
    bottom: 5,
    left: 18,
    width: 38,
    height: 3,
    borderRadius: 3,
    backgroundColor: "rgba(73,47,23,0.35)",
  },
  dropItem: {
    position: "absolute",
    top: 21,
    zIndex: 4,
  },
  priceBubble: {
    position: "absolute",
    top: -8,
    minWidth: 70,
    paddingHorizontal: 10,
    height: 25,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#8A6A12",
    zIndex: 8,
    ...shadow.soft,
  },
  priceBubbleText: { color: "#FFF8DC", fontSize: 11, fontWeight: "900" },

  countBadge: {
    position: "absolute",
    top: 20,
    right: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#5B3A1E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  countText: { color: "#fff", fontWeight: "900", fontSize: 10 },

});
