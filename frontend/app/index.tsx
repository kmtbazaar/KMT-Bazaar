import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL } from "@/src/theme";

const { width } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const titleOp = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withSpring(1.05, { damping: 8, stiffness: 90 }),
      withSpring(1, { damping: 10, stiffness: 120 })
    );
    glow.value = withDelay(200, withTiming(1, { duration: 800 }));
    titleY.value = withDelay(400, withSpring(0, { damping: 12, stiffness: 90 }));
    titleOp.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (user) {
        if (user.role === "customer") router.replace("/(tabs)/home");
        else if (user.role === "vendor") router.replace("/vendor");
        else if (user.role === "delivery") router.replace("/delivery");
        else if (user.role === "admin") router.replace("/admin");
      } else {
        router.replace("/auth/login");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [loading, user]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.6 }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }));

  return (
    <View style={s.root} testID="splash-screen">
      <LinearGradient colors={["#000000", "#0A0F1F", "#000000"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.glowWrap, glowStyle]}>
        <LinearGradient
          colors={["rgba(37,99,235,0.4)", "rgba(249,115,22,0.25)", "transparent"]}
          style={s.glow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={logoStyle}>
        <Image source={{ uri: LOGO_URL }} style={s.logo} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[s.titleWrap, titleStyle]}>
        <Text style={s.tagline}>Your Premium Marketplace</Text>
        <View style={s.dot} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  glowWrap: { position: "absolute", width: width * 1.2, height: width * 1.2, alignItems: "center", justifyContent: "center" },
  glow: { width: "100%", height: "100%", borderRadius: width },
  logo: { width: width * 0.7, height: width * 0.7 },
  titleWrap: { marginTop: 8, alignItems: "center" },
  tagline: { color: "#FFFFFF", fontSize: 14, letterSpacing: 4, textTransform: "uppercase", fontWeight: "600" },
  dot: { width: 36, height: 3, backgroundColor: COLORS.accent, marginTop: 10, borderRadius: 2 },
});
