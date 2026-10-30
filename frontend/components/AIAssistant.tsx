import React, { useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";

export default function AIAssistant() {
  const router = useRouter();
  const orbitRotation = useSharedValue(0);
  const lightPulse = useSharedValue(0.55);
  const floatOffset = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 7200, easing: Easing.linear }),
      -1,
      false
    );
    lightPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    floatOffset.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(orbitRotation);
      cancelAnimation(lightPulse);
      cancelAnimation(floatOffset);
      cancelAnimation(pressScale);
    };
  }, []);

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: lightPulse.value,
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.38 + lightPulse.value * 0.34,
    transform: [{ scale: 0.94 + lightPulse.value * 0.08 }],
  }));

  const robotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatOffset.value },
      { scale: pressScale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      <Animated.View pointerEvents="none" style={[styles.orbit, orbitStyle]}>
        <View style={styles.orbitLightBlue} />
        <View style={styles.orbitLightAmber} />
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open KMT Bazaar AI assistant"
        testID="login-ai-assistant"
        onPressIn={() => {
          pressScale.value = withSpring(0.92);
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1);
        }}
        onPress={() => router.push("/assistant")}
        style={styles.pressable}
      >
        <Animated.View style={[styles.robotFloat, robotStyle]}>
          <LinearGradient
            colors={["#164E63", "#0B1E33", "#101827"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.robotShell}
          >
            <View style={styles.antennaStem} />
            <View style={styles.antennaLight} />
            <View style={styles.sidePanelLeft} />
            <View style={styles.sidePanelRight} />
            <View style={styles.visor}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.mouthLight} />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    bottom: 16,
    zIndex: 9999,
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: "rgba(34, 211, 238, 0.72)",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 7,
  },
  orbit: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: "rgba(34, 211, 238, 0.12)",
    borderTopColor: "#22D3EE",
    borderBottomColor: "#F59E0B",
  },
  orbitLightBlue: {
    position: "absolute",
    top: 5,
    right: 17,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  orbitLightAmber: {
    position: "absolute",
    bottom: 8,
    left: 15,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FDBA74",
    shadowColor: "#F97316",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
  pressable: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 33,
  },
  robotFloat: {
    alignItems: "center",
    justifyContent: "center",
  },
  robotShell: {
    width: 54,
    height: 54,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "rgba(125, 211, 252, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.82,
    shadowRadius: 13,
    elevation: 9,
  },
  antennaStem: {
    position: "absolute",
    top: -6,
    width: 2,
    height: 7,
    borderRadius: 1,
    backgroundColor: "#67E8F9",
  },
  antennaLight: {
    position: "absolute",
    top: -10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  sidePanelLeft: {
    position: "absolute",
    left: -4,
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#0891B2",
    borderWidth: 1,
    borderColor: "#67E8F9",
  },
  sidePanelRight: {
    position: "absolute",
    right: -4,
    width: 5,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#0891B2",
    borderWidth: 1,
    borderColor: "#67E8F9",
  },
  visor: {
    width: 37,
    height: 20,
    borderRadius: 9,
    backgroundColor: "#06111F",
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.65)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.38,
    shadowRadius: 5,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 3,
  },
  mouthLight: {
    width: 12,
    height: 2.5,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: "#F59E0B",
    shadowColor: "#F97316",
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
});
