import React from "react";
import { Tabs, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { COLORS } from "@/src/theme";
import { useCart } from "@/src/CartContext";

function CartIcon({ color, size }: { color: string; size: number }) {
  const { itemCount, badgePulse } = useCart();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (badgePulse > 0) {
      scale.value = withSequence(
        withSpring(1.4, { damping: 5 }),
        withSpring(1, { damping: 6 })
      );
    }
  }, [badgePulse]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View testID="cart-tab-icon">
      <MaterialCommunityIcons
        name="cart-outline"
        size={size}
        color={color}
      />
      {itemCount > 0 && (
        <Animated.View style={[s.badge, animStyle]} testID="cart-badge">
          <Text style={s.badgeText}>
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function RoojgarCharacterIcon() {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1100 }),
        withTiming(0, { duration: 1100 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[s.centerCharacterWrap, animatedStyle]} testID="center-character">
      <View style={s.centerCharacterGlow} />
      <View style={s.centerCharacterCard}>
        <Image
          source={require("../../assets/ai/kmt-bot.png")}
          style={s.centerCharacter}
          contentFit="contain"
        />
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          position: "absolute",
          borderTopColor: COLORS.border,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : "#FFFFFF",
          height: 65,
          paddingTop: 4,
          paddingBottom: 12,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-variant"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Categories */}
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Center character / next page */}
      <Tabs.Screen
        name="ai"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/assistant");
          },
        }}
        options={{
          title: "AI",
          tabBarIcon: () => <RoojgarCharacterIcon />,
        }}
      />

      {/* Cart */}
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <CartIcon color={color} size={size} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: COLORS.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  roojgarCharacterWrap: {
    width: 64,
    height: 70,
    marginTop: -17,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  roojgarGlow: {
    position: "absolute",
    bottom: 2,
    width: 56,
    height: 20,
    borderRadius: 28,
    backgroundColor: "rgba(255,107,0,0.16)",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  roojgarCharacterCard: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFB067",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  roojgarCharacter: {
    width: 58,
    height: 66,
  },
});
