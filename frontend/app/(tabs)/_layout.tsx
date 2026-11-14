import { useLanguage } from "@/src/LanguageContext";
import React from "react";
import { Tabs, router } from "expo-router";;
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";
import { COLORS } from "@/src/theme";
import { useCart } from "@/src/CartContext";
import RobotCompanion3D from "@/src/components/RobotCompanion3D";

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

export default function TabsLayout() {
  const { t } = useLanguage();
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
          height: 82,
          paddingTop: 1,
          paddingBottom: 8,
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
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: t("Home"),
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
          title: t("Categories"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Cart */}
      <Tabs.Screen
        name="cart"
        options={{
          title: t("Cart"),
          tabBarIcon: ({ color, size }) => (
            <CartIcon color={color} size={size} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("Profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Assistant - far right; the 3D mascot is the touch/drag control */}
      <Tabs.Screen
        name="ai"
        options={{
          title: t("AI"),
          tabBarIcon: ({ focused }) => (
            <View style={[s.assistantTabIcon, focused && s.assistantTabIconActive]}>
              <RobotCompanion3D
                size={48}
                interactive
                onActivate={() => router.push("/assistant")}
              />
            </View>
          ),
        }}
      />

      {/* Wishlist route is opened from Profile, not shown in bottom navigation */}
      <Tabs.Screen
        name="wishlist"
        options={{ href: null }}
      />

    </Tabs>
  );
}

const s = StyleSheet.create({
  assistantTabIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    backgroundColor: "rgba(8,145,178,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.34)",
  },
  assistantTabIconActive: {
    backgroundColor: "rgba(34,211,238,0.16)",
    borderColor: "rgba(6,182,212,0.72)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
    elevation: 4,
  },
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
});