import { useLanguage } from "@/src/LanguageContext";
import React from "react";
import { Tabs, router } from "expo-router";;
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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

function TabIconShell({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.navIconStage}>
      <LinearGradient
        colors={focused ? ["#FFF0DA", "#F97316", "#B94B0A"] : ["#FFFFFF", "#E9EEF5", "#C9D4E0"]}
        locations={[0, 0.58, 1]}
        start={{ x: 0.18, y: 0 }}
        end={{ x: 0.82, y: 1 }}
        style={[s.navIconSurface, focused && s.navIconSurfaceActive]}
      >
        <View pointerEvents="none" style={s.navIconGloss} />
        <View pointerEvents="none" style={s.navIconLowerBevel} />
        {children}
      </LinearGradient>
    </View>
  );
}

function TabIcon3D({
  name,
  color,
  size,
  focused,
}: {
  name: string;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <TabIconShell focused={focused}>
      <View style={s.navGlyphStack}>
        <MaterialCommunityIcons
          name={name as any}
          size={size + 1}
          color={focused ? "#8D3B08" : "#A8B4C1"}
          style={s.navGlyphShadow}
        />
        <MaterialCommunityIcons
          name={name as any}
          size={size}
          color={focused ? "#FFFFFF" : color}
          style={s.navGlyphFace}
        />
      </View>
    </TabIconShell>
  );
}

function CartIcon({
  color,
  size,
  focused,
}: {
  color: string;
  size: number;
  focused: boolean;
}) {
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
    <TabIconShell focused={focused}>
      <Animated.View style={[s.navGlyphStack, animStyle]} testID="cart-tab-icon">
        <MaterialCommunityIcons
          name="cart-variant"
          size={size + 1}
          color={focused ? "#8D3B08" : "#A8B4C1"}
          style={s.navGlyphShadow}
        />
        <MaterialCommunityIcons
          name="cart-variant"
          size={size}
          color={focused ? "#FFFFFF" : color}
          style={s.navGlyphFace}
        />
      </Animated.View>
      {itemCount > 0 && (
        <Animated.View
          style={[s.badge, animStyle]}
          testID="cart-badge"
        >
          <Text style={s.badgeText}>
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </Animated.View>
      )}
    </TabIconShell>
  );
}

export default function TabsLayout() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Keep mobile navigation above the device safe area instead of shifting it off-screen.
  // A wider mobile browser viewport is still treated as compact navigation up to 1024px.
  const isMobileTabBar = Platform.OS !== "web" || width <= 1024;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: "#475569",
        tabBarStyle: {
          position: "absolute",
          // Move the customer bar below the reported mobile safe-area gap; leave desktop/iOS as-is.
          bottom: isMobileTabBar ? 0 : -18,
          borderTopColor: COLORS.border,
          backgroundColor:
            Platform.OS === "ios" ? "transparent" : "#FFFFFF",
          height: isMobileTabBar ? 92 + insets.bottom : 82,
          paddingTop: 2,
          paddingBottom: isMobileTabBar ? Math.max(insets.bottom, 8) : 0,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          alignItems: "center",
          // Anchor every mobile icon and label to the bottom of the content area.
          // The tab bar's paddingBottom above reserves the full device safe-area inset.
          justifyContent: isMobileTabBar ? "flex-end" : "center",
          paddingHorizontal: 0,
          paddingBottom: isMobileTabBar ? 2 : 0,
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
          fontSize: isMobileTabBar ? 12 : 13,
          lineHeight: isMobileTabBar ? 16 : 18,
          fontWeight: "800",
          marginTop: isMobileTabBar ? 1 : 2,
          marginBottom: 0,
          includeFontPadding: false,
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: t("Home"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon3D name="home-variant" color={color} size={size + 6} focused={focused} />
          ),
        }}
      />

      {/* Categories */}
      <Tabs.Screen
        name="categories"
        options={{
          title: t("Categories"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon3D name="view-grid" color={color} size={size + 6} focused={focused} />
          ),
        }}
      />

      {/* Cart */}
      <Tabs.Screen
        name="cart"
        options={{
          title: t("Cart"),
          tabBarIcon: ({ color, size, focused }) => (
            <CartIcon color={color} size={size + 6} focused={focused} />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("Profile"),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon3D name="account-circle" color={color} size={size + 6} focused={focused} />
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
  navIconStage: {
    width: 54,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  navIconSurface: {
    width: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  navIconSurfaceActive: {
    borderColor: "rgba(255,239,215,0.98)",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.36,
    shadowRadius: 6,
    elevation: 7,
  },
  navIconGloss: {
    position: "absolute",
    top: 2,
    left: 6,
    right: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  navIconLowerBevel: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 2,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.48)",
  },
  navGlyphStack: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  navGlyphShadow: {
    position: "absolute",
    top: 2,
    left: 1,
    textShadowColor: "rgba(55,30,12,0.32)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navGlyphFace: {
    position: "absolute",
    top: 0,
    left: 0,
    textShadowColor: "rgba(255,255,255,0.28)",
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 1,
  },
  assistantTabIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 5,
  },
  assistantTabIconActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    shadowColor: "#E2E8F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.62,
    shadowRadius: 12,
    elevation: 6,
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