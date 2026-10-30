import React, { useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { LOGO_URL } from "@/src/theme";

type Props = { size?: number; intensity?: "hero" | "normal" | "compact"; testID?: string };
type ParticleProps = { phase: SharedValue<number>; size: number; index: number; color: string };
const PARTICLE_COLORS = ["#FDBA74", "#67E8F9", "#FDE68A", "#FB923C", "#FFFFFF", "#7DD3FC", "#F9A8D4", "#FED7AA", "#A5B4FC", "#86EFAC"];

function OrbitParticle({ phase, size, index, color }: ParticleProps) {
  const dotSize = Math.max(2.5, size * (index % 3 === 0 ? 0.075 : 0.055));
  const radius = size * (index % 2 === 0 ? 0.34 : 0.43);
  const animatedStyle = useAnimatedStyle(() => {
    const angle = phase.value + (index * Math.PI * 2) / PARTICLE_COLORS.length;
    const depth = 0.72 + ((Math.sin(angle) + 1) * 0.14);
    return { opacity: 0.38 + depth * 0.58, transform: [
      { translateX: Math.cos(angle) * radius },
      { translateY: Math.sin(angle) * radius * 0.72 }, { scale: depth },
    ] };
  }, [index, radius]);
  return <Animated.View pointerEvents="none" style={[
    styles.particle,
    { width: dotSize, height: dotSize, left: size / 2 - dotSize / 2, top: size / 2 - dotSize / 2,
      borderRadius: dotSize / 2, backgroundColor: color, shadowColor: color, shadowRadius: Math.max(4, dotSize * 1.8) },
    animatedStyle,
  ]} />;
}

export default function AnimatedBrandLogo({ size = 44, intensity = "normal", testID }: Props) {
  const phase = useSharedValue(0);
  const float = useSharedValue(0);
  const tilt = useSharedValue(-8);
  const glow = useSharedValue(0.5);
  const isHero = intensity === "hero";
  const ringScale = intensity === "compact" ? 0.90 : 0.96;

  useEffect(() => {
    phase.value = withRepeat(withTiming(Math.PI * 2, { duration: isHero ? 8200 : 10500, easing: Easing.linear }), -1, false);
    float.value = withRepeat(withSequence(
      withTiming(-size * 0.035, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      withTiming(size * 0.035, { duration: 1900, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    tilt.value = withRepeat(withSequence(
      withTiming(9, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      withTiming(-9, { duration: 2600, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
    glow.value = withRepeat(withSequence(
      withTiming(0.95, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.35, { duration: 1700, easing: Easing.inOut(Easing.ease) })
    ), -1, true);
  }, [float, glow, isHero, phase, size, tilt]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.48 + glow.value * 0.40,
    transform: [{ perspective: 900 }, { rotateX: "66deg" }, { rotateZ: `${phase.value * (180 / Math.PI)}deg` }, { scale: ringScale }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + glow.value * (isHero ? 0.30 : 0.19), transform: [{ scale: 0.88 + glow.value * 0.20 }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { translateY: float.value }, { rotateY: `${tilt.value}deg` },
      { rotateX: `${-tilt.value * 0.35}deg` }, { scale: 1 + glow.value * 0.025 }],
  }));

  return (
    <View pointerEvents="none" testID={testID} accessible accessibilityLabel="KMT Bazaar animated logo"
      style={{ width: size, height: size }}>
      <Animated.View style={[styles.halo,
        { width: size * 0.88, height: size * 0.88, borderRadius: size * 0.44, left: size * 0.06, top: size * 0.06 }, glowStyle]} />
      <Animated.View style={[styles.orbitRing,
        { width: size * 0.90, height: size * 0.90, borderRadius: size * 0.45, left: size * 0.05, top: size * 0.05 }, ringStyle]} />
      {PARTICLE_COLORS.map((color, index) => (
        <OrbitParticle key={`brand-particle-${index}`} phase={phase} size={size} index={index} color={color} />
      ))}
      <Animated.View style={[styles.logoPlate,
        { width: size * 0.64, height: size * 0.64, borderRadius: size * 0.20, left: size * 0.18, top: size * 0.18 }, logoStyle]}>
        <Image source={{ uri: LOGO_URL }} style={styles.logoImage} contentFit="contain" cachePolicy="memory-disk" />
      </Animated.View>
    </View>
  );
}

export function BrandingFooter({ caption = "Trusted Shopping · Fast Delivery" }: { caption?: string }) {
  return (
    <View style={styles.footer} testID="kmt-branding-footer">
      <AnimatedBrandLogo size={34} intensity="compact" />
      <View style={styles.footerCopy}>
        <Text style={styles.footerTitle}>KMT BAZAAR</Text>
        <Text style={styles.footerCaption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: "absolute", backgroundColor: "rgba(249,115,22,0.18)", shadowColor: "#F97316", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 18, elevation: 5 },
  orbitRing: { position: "absolute", borderWidth: 1, borderColor: "rgba(255,255,255,0.82)", shadowColor: "#67E8F9", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 6 },
  particle: { position: "absolute", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, elevation: 4 },
  logoPlate: { position: "absolute", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.42)", shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 9, elevation: 5 },
  logoImage: { width: "82%", height: "82%" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 26, marginBottom: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.18)" },
  footerCopy: { alignItems: "flex-start" },
  footerTitle: { color: "#64748B", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  footerCaption: { color: "#94A3B8", fontSize: 9, fontWeight: "600", marginTop: 2 },
});
