import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCart } from "@/src/CartContext";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { shadow } from "@/src/theme";
import * as Haptics from "expo-haptics";


const REALISTIC_SACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="460" viewBox="0 0 360 460">
<defs>
  <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f6d86a"/>
    <stop offset="0.22" stop-color="#d8b23d"/>
    <stop offset="0.52" stop-color="#b99024"/>
    <stop offset="0.8" stop-color="#d3ae39"/>
    <stop offset="1" stop-color="#9d7817"/>
  </linearGradient>
  <linearGradient id="edgeShade" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6f5314" stop-opacity=".7"/>
    <stop offset=".16" stop-color="#b38c24" stop-opacity=".12"/>
    <stop offset=".5" stop-color="#fff0a8" stop-opacity=".18"/>
    <stop offset=".84" stop-color="#b38c24" stop-opacity=".12"/>
    <stop offset="1" stop-color="#60470f" stop-opacity=".72"/>
  </linearGradient>
  <pattern id="weave" width="10" height="10" patternUnits="userSpaceOnUse">
    <path d="M0 2 H10 M0 7 H10" stroke="#6c5216" stroke-opacity=".26" stroke-width="1.2"/>
    <path d="M2 0 V10 M7 0 V10" stroke="#fff0a2" stroke-opacity=".22" stroke-width="1"/>
    <path d="M0 5 L5 0 M5 10 L10 5" stroke="#8b6a18" stroke-opacity=".14" stroke-width="1"/>
  </pattern>
  <linearGradient id="rope" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7b5926"/>
    <stop offset=".5" stop-color="#c09249"/>
    <stop offset="1" stop-color="#5a3e1b"/>
  </linearGradient>
  <radialGradient id="topShadow" cx=".5" cy="0" r=".9">
    <stop offset="0" stop-color="#3d2a0b" stop-opacity=".72"/>
    <stop offset=".55" stop-color="#5b410e" stop-opacity=".28"/>
    <stop offset="1" stop-color="#5b410e" stop-opacity="0"/>
  </radialGradient>
  <filter id="softShadow" x="-30%" y="-30%" width="160%" height="180%">
    <feGaussianBlur stdDeviation="6"/>
  </filter>
  <filter id="roughen">
    <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="8" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.8" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</defs>

<ellipse cx="180" cy="429" rx="108" ry="16" fill="#4b3510" fill-opacity=".18"/>

<path d="M82 105
C74 132 68 171 70 213
C72 268 70 332 83 383
C90 412 113 425 180 429
C247 425 270 412 277 383
C290 332 288 268 290 213
C292 171 286 132 278 105
C259 112 236 116 180 116
C124 116 101 112 82 105Z"
fill="url(#cloth)" stroke="#61470f" stroke-width="5" filter="url(#roughen)"/>

<path d="M84 105 C104 112 128 116 180 116 C232 116 256 112 276 105
L288 150 C260 142 224 138 180 138 C136 138 100 142 72 150Z"
fill="#b58b24" fill-opacity=".76" stroke="#6e5213" stroke-width="4"/>

<path d="M76 147 C104 138 140 135 180 136 C220 135 256 138 284 147
L290 380 C278 409 250 421 180 427 C110 421 82 409 70 380Z"
fill="url(#weave)" opacity=".82"/>

<path d="M79 151 C106 142 141 140 180 141 C219 140 254 142 281 151"
fill="none" stroke="#6e5011" stroke-opacity=".56" stroke-width="5"/>

<path d="M88 118 C93 156 95 204 96 249 C97 305 99 360 107 397"
fill="none" stroke="#fff0a3" stroke-opacity=".17" stroke-width="10"/>
<path d="M271 118 C266 156 264 204 263 249 C262 305 260 360 253 397"
fill="none" stroke="#58410d" stroke-opacity=".21" stroke-width="11"/>

<path d="M72 160 C76 235 75 313 87 378" stroke="url(#edgeShade)" stroke-width="8" fill="none" stroke-linecap="round"/>
<path d="M288 160 C284 235 285 313 273 378" stroke="url(#edgeShade)" stroke-width="8" fill="none" stroke-linecap="round"/>

<path d="M95 115 C118 129 145 132 180 132 C215 132 242 129 265 115"
fill="none" stroke="#5c4210" stroke-width="6" stroke-dasharray="4 5" stroke-linecap="round"/>

<path d="M96 104 C119 121 146 126 180 126 C214 126 241 121 264 104"
fill="none" stroke="url(#rope)" stroke-width="10" stroke-linecap="round"/>
<path d="M110 100 C128 114 148 119 180 119 C212 119 232 114 250 100"
fill="none" stroke="#d0a35b" stroke-opacity=".65" stroke-width="3" stroke-dasharray="5 4"/>

<path d="M168 122 C174 114 186 114 192 122 L190 145 C186 152 174 152 170 145Z"
fill="url(#rope)" stroke="#5c421b" stroke-width="3"/>

<path d="M118 159 C137 151 160 148 180 149 C200 148 223 151 242 159"
fill="none" stroke="#4a3510" stroke-opacity=".34" stroke-width="3" stroke-dasharray="3 6"/>

<path d="M111 178 C125 172 141 169 155 168" stroke="#fff0a4" stroke-opacity=".18" stroke-width="4" stroke-linecap="round"/>
<path d="M205 394 C225 391 242 386 255 377" stroke="#553d0d" stroke-opacity=".2" stroke-width="5" stroke-linecap="round"/>

<rect x="123" y="214" width="114" height="92" rx="16" fill="#efcf61" fill-opacity=".74" stroke="#8c6a16" stroke-width="2.5"/>
<rect x="130" y="221" width="100" height="78" rx="12" fill="#d4ad35" fill-opacity=".28"/>
<path d="M135 236 H225 M135 246 H225 M135 256 H225 M135 266 H225 M135 276 H225 M135 286 H225" stroke="#6d5111" stroke-opacity=".22" stroke-width="1"/>

<path d="M112 396 C136 405 155 410 180 411 C205 410 224 405 248 396"
fill="none" stroke="#684b10" stroke-width="5" stroke-linecap="round"/>
</svg>`;

interface Props {
  /** override destination route; defaults to /cart */
  route?: string;
  label?: string;
  /** distance from bottom of screen in pixels (tab bar height). default 70 */
  bottomOffset?: number;
}

export function CheckoutSackVisual({ subtotal = 0, itemCount = 0 }: { subtotal?: number; itemCount?: number }) {
  return (
    <View style={styles.inlineSack}>
      <View style={styles.inlineSackInner}>
        <View style={styles.realSack}>
          <ExpoImage
            source={{ uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(REALISTIC_SACK_SVG)}` }}
            style={styles.realSackImage}
            contentFit="contain"
          />
          <View style={styles.sackOpenOverlay} pointerEvents="none" />
          <View style={styles.brandPlate}>
            <Text style={styles.brandPlateTitle}>KMT BAZAAR</Text>
            <Text style={styles.brandPlatePrice}>₹{subtotal.toFixed(0)}</Text>
          </View>
          <View style={styles.countTagConnector} />
          <View style={styles.countBadge}>
            <Text style={styles.countLabel}>ITEMS</Text>
            <Text style={styles.countText}>{itemCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
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
  const sackOpen = useSharedValue(0);

  useEffect(() => {
    if (badgePulse > 0) {
      sackOpen.value = withSequence(
        withTiming(1, { duration: 260 }),
        withTiming(1, { duration: 1300 }),
        withTiming(0.75, { duration: 180 }),
        withTiming(0, { duration: 760 }),
        withTiming(0, { duration: 500 })
      );
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
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 720 }),
        withTiming(0.82, { duration: 380 }),
        withTiming(0, { duration: 420 })
      );
      dropScale.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.94, { duration: 150 }),
        withTiming(0.76, { duration: 330 }),
        withTiming(0.62, { duration: 240 }),
        withTiming(0.8, { duration: 280 }),
        withTiming(0, { duration: 420 })
      );
      dropY.value = withSequence(
        withTiming(-20, { duration: 100 }),
        withTiming(-2, { duration: 360 }),
        withTiming(8, { duration: 300 }),
        withTiming(4, { duration: 240 }),
        withTiming(8, { duration: 260 }),
        withTiming(0, { duration: 420 })
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

  const sackOpenAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: -3 * sackOpen.value },
      { scaleY: 1 + 0.07 * sackOpen.value },
    ],
  }));

  const mouthOpenAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: -4 * sackOpen.value },
      { scaleX: 1 + 0.08 * sackOpen.value },
      { scaleY: 1 + 0.25 * sackOpen.value },
    ],
  }));

  const ropeOpenAnim = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + 0.18 * sackOpen.value },
      { translateY: -2 * sackOpen.value },
    ],
  }));

  const panResponder = useMemo(() => {
    // Keep the whole sack + attached tag inside the viewport.
    // The visual center starts near the lower-right corner.
    const visualHalfW = 72;
    const visualHalfH = 72;
    const centerX = screenWidth - 66;
    const centerY = screenHeight - bottomOffset - 58;
    const minX = -(centerX - visualHalfW);
    const maxX = Math.min(0, screenWidth - visualHalfW - centerX);
    const minY = -(centerY - visualHalfH);
    const maxY = Math.min(0, screenHeight - visualHalfH - centerY);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    return PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        const x = event.nativeEvent.locationX;
        const y = event.nativeEvent.locationY;

        // Sack-only hit area: reject the transparent corners/empty space.
        const dx = (x - 54) / 48;
        const dy = (y - 66) / 60;
        return (dx * dx) + (dy * dy) <= 1;
      },
      onPanResponderGrant: () => {
        dragStartX.current = dragX.value;
        dragStartY.current = dragY.value;
        didDrag.current = false;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(18);
        } catch {}
      },
      onPanResponderMove: (_, gesture) => {
        const nextX = clamp(dragStartX.current + gesture.dx, minX, maxX);
        const nextY = clamp(dragStartY.current + gesture.dy, minY, maxY);

        if (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5) {
          didDrag.current = true;
          const now = Date.now();
          if (now - lastVibrateAt.current > 180) {
            lastVibrateAt.current = now;
            Haptics.selectionAsync().catch(() => {});
            try {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
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
    <Animated.View
      style={[styles.wrap, { bottom: bottomOffset }, cartAnim]}
      pointerEvents="box-none"
      testID="checkout-bar"
    >
      <View
        testID="checkout-bar-btn"
        style={styles.cartButton}
        {...panResponder.panHandlers}
      >
        <View style={styles.bagWrap}>
          <Animated.View style={[styles.dropItem, dropAnim]} pointerEvents="none">
            <MaterialCommunityIcons name="package-variant-closed" size={17} color="#7F1D1D" />
          </Animated.View>
          <Animated.View style={styles.realSack}>
            <ExpoImage
              source={{ uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(REALISTIC_SACK_SVG)}` }}
              style={styles.realSackImage}
              contentFit="contain"
            />
            <Animated.View style={[styles.sackOpenOverlay, sackOpenAnim]} pointerEvents="none" />
            <Animated.View style={[styles.brandPlate, sackOpenAnim]}>
              <Text style={styles.brandPlateTitle}>KMT BAZAAR</Text>
              <Text style={styles.brandPlatePrice}>₹{subtotal.toFixed(0)}</Text>
            </Animated.View>
            <View style={styles.countTagConnector} />
            <View style={styles.countBadge}>
              <Text style={styles.countLabel}>ITEMS</Text>
              <Text style={styles.countText}>{itemCount}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inlineSack: {
    width: 58,
    height: 58,
    position: "relative",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSackInner: {
    position: "absolute",
    width: 108,
    height: 128,
    left: -25,
    top: -34,
    overflow: "visible",
    transform: [{ scale: 0.48 }],
  },
  wrap: {
    position: "absolute",
    right: 18,
    padding: 0,
    zIndex: 50,
    width: 108,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: {
    width: 108,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  bagWrap: {
    width: 108,
    height: 128,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  realSack: {
    position: "absolute",
    width: 108,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
  },
  realSackImage: {
    width: "100%",
    height: "100%",
  },
  sackOpenOverlay: {
    position: "absolute",
    top: 18,
    width: 66,
    height: 19,
    borderRadius: 12,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(86,57,12,0.55)",
    backgroundColor: "rgba(72,48,9,0.34)",
  },
  brandPlate: {
    position: "absolute",
    top: 50,
    width: 66,
    height: 54,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
    borderRadius: 10,
    backgroundColor: "rgba(239,207,97,0.78)",
    borderWidth: 1,
    borderColor: "rgba(91,67,12,0.36)",
    ...shadow.soft,
  },
  brandPlateTitle: {
    color: "#0369A1",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  brandPlatePrice: {
    color: "#15803D",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
  },
  dropItem: {
    position: "absolute",
    top: 20,
    zIndex: 12,
  },
  countTagConnector: {
    position: "absolute",
    right: -2,
    bottom: 60,
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6B4A22",
    zIndex: 18,
  },
  countBadge: {
    position: "absolute",
    right: -26,
    bottom: 44,
    minWidth: 42,
    height: 36,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#C79A53",
    borderWidth: 1.5,
    borderColor: "#6F4A22",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    transform: [{ rotate: "-2deg" }],
    ...shadow.soft,
  },
  countLabel: {
    color: "#6B481E",
    fontSize: 6,
    lineHeight: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  countText: {
    color: "#3B250F",
    fontWeight: "900",
    fontSize: 13,
    lineHeight: 15,
  },

});
