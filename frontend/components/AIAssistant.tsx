import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import RobotCompanion3D from "../src/components/RobotCompanion3D";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

export default function AIAssistant({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const scanPosition = useSharedValue(0);
  const framePulse = useSharedValue(0.55);
  const floatOffset = useSharedValue(0);

  useEffect(() => {
    scanPosition.value = withRepeat(
      withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    framePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1050, easing: Easing.inOut(Easing.ease) })
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
      cancelAnimation(scanPosition);
      cancelAnimation(framePulse);
      cancelAnimation(floatOffset);
    };
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scanPosition.value, [0, 0.18, 0.82, 1], [0, 0.9, 0.9, 0]),
    transform: [{ translateY: interpolate(scanPosition.value, [0, 1], [-27, 27]) }],
  }));

  const frameStyle = useAnimatedStyle(() => ({
    opacity: 0.58 + framePulse.value * 0.4,
    transform: [{ scale: 0.98 + framePulse.value * 0.025 }],
  }));

  const robotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatOffset.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, embedded && styles.embeddedContainer]}
      testID="login-ai-assistant-hud"
    >
      <Animated.View pointerEvents="none" style={[styles.hudFrame, frameStyle]}>
        <View style={[styles.bracket, styles.topLeft]} />
        <View style={[styles.bracket, styles.topRight]} />
        <View style={[styles.bracket, styles.bottomLeft]} />
        <View style={[styles.bracket, styles.bottomRight]} />
        <View style={styles.leftTelemetry}>
          <View style={styles.telemetryBright} />
          <View style={styles.telemetryDim} />
          <View style={styles.telemetryBrightShort} />
        </View>
        <View style={styles.rightTelemetry}>
          <View style={styles.telemetryDim} />
          <View style={styles.telemetryBright} />
          <View style={styles.telemetryBrightShort} />
        </View>
      </Animated.View>

      <Animated.View pointerEvents="box-none" style={[styles.robotFloat, robotStyle]}>
        <RobotCompanion3D
          size={76}
          interactive={true}
          fallbackOrbit={false}
          onActivate={() => router.push("/assistant")}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.scanBeam, scanStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    bottom: 16,
    zIndex: 9999,
    width: 100,
    height: 116,
    alignItems: "center",
    justifyContent: "center",
  },
  embeddedContainer: {
    position: "relative",
    right: 0,
    bottom: 0,
    width: 120,
    height: 124,
    alignSelf: "center",
  },
  hudFrame: {
    position: "absolute",
    width: 92,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  bracket: {
    position: "absolute",
    width: 15,
    height: 15,
    borderColor: "#42E8FF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 5,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 5,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 5,
    borderColor: "#FF9A45",
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 5,
    borderColor: "#FF9A45",
  },
  leftTelemetry: {
    position: "absolute",
    left: 4,
    top: 38,
    gap: 4,
    alignItems: "flex-end",
  },
  rightTelemetry: {
    position: "absolute",
    right: 4,
    top: 38,
    gap: 4,
    alignItems: "flex-start",
  },
  telemetryBright: {
    width: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.95,
    shadowRadius: 5,
    elevation: 4,
  },
  telemetryDim: {
    width: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(103,232,249,0.42)",
  },
  telemetryBrightShort: {
    width: 3,
    height: 3,
    borderRadius: 1,
    backgroundColor: "#FDBA74",
    shadowColor: "#F97316",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  scanBeam: {
    position: "absolute",
    top: 57,
    width: 54,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#C9FBFF",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  robotFloat: {
    alignItems: "center",
    justifyContent: "center",
  },
});
