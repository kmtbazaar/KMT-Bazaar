import React, { useEffect } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type RobotAvatarProps = {
  size?: number;
  talking?: boolean;
  showOrbit?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function RobotAvatar({
  size = 96,
  talking = false,
  showOrbit = true,
  style,
}: RobotAvatarProps) {
  const lightPulse = useSharedValue(0.55);
  const orbitRotation = useSharedValue(0);
  const floatOffset = useSharedValue(0);
  const mouthPulse = useSharedValue(0.25);

  useEffect(() => {
    lightPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 760, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 8200, easing: Easing.linear }),
      -1,
      false
    );
    floatOffset.value = withRepeat(
      withSequence(
        withTiming(-size * 0.018, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
        withTiming(size * 0.018, { duration: 1350, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    mouthPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 170, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 210, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(lightPulse);
      cancelAnimation(orbitRotation);
      cancelAnimation(floatOffset);
      cancelAnimation(mouthPulse);
    };
  }, [size]);

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + lightPulse.value * 0.52,
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatOffset.value }],
    shadowOpacity: 0.46 + lightPulse.value * 0.48,
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    opacity: 0.62 + lightPulse.value * 0.38,
    shadowOpacity: 0.62 + lightPulse.value * 0.38,
  }));

  const mouthStyle = useAnimatedStyle(() => ({
    opacity: talking ? 0.55 + mouthPulse.value * 0.45 : 0.72,
    transform: [{ scaleX: talking ? 0.55 + mouthPulse.value * 0.65 : 1 }],
  }), [talking]);

  const unit = size;
  const headWidth = unit * 0.62;
  const headHeight = unit * 0.54;

  return (
    <View style={[{ width: unit, height: unit }, styles.container, style]}>
      {showOrbit && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbit,
            {
              width: unit * 0.94,
              height: unit * 0.94,
              borderRadius: unit * 0.47,
              borderWidth: Math.max(1, unit * 0.012),
            },
            orbitStyle,
          ]}
        >
          <View style={[styles.orbitBlue, { width: unit * 0.055, height: unit * 0.055, borderRadius: unit * 0.03, top: unit * 0.12, right: unit * 0.16 }]} />
          <View style={[styles.orbitAmber, { width: unit * 0.043, height: unit * 0.043, borderRadius: unit * 0.025, bottom: unit * 0.15, left: unit * 0.13 }]} />
        </Animated.View>
      )}

      <View
        pointerEvents="none"
        style={[
          styles.body,
          {
            width: unit * 0.43,
            height: unit * 0.24,
            bottom: unit * 0.075,
            borderRadius: unit * 0.12,
          },
        ]}
      >
        <LinearGradient
          colors={["#164E63", "#0B1E33", "#101827"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bodyFace, { borderRadius: unit * 0.12 }]}
        >
          <View style={[styles.chestPanel, { width: unit * 0.19, height: unit * 0.075, borderRadius: unit * 0.04 }]}>
            <Animated.View style={[styles.chestCore, { width: unit * 0.045, height: unit * 0.045, borderRadius: unit * 0.025 }, eyeStyle]} />
          </View>
        </LinearGradient>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.head,
          {
            width: headWidth,
            height: headHeight,
            borderRadius: unit * 0.19,
            top: unit * 0.19,
            borderWidth: Math.max(1.2, unit * 0.016),
          },
          headStyle,
        ]}
      >
        <LinearGradient
          colors={["#15566A", "#0B243B", "#091321"]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={[styles.headFace, { borderRadius: unit * 0.18 }]}
        >
          <View style={[styles.antennaStem, { width: Math.max(2, unit * 0.018), height: unit * 0.105, top: -unit * 0.105 }]} />
          <Animated.View style={[styles.antennaLight, { width: unit * 0.085, height: unit * 0.085, borderRadius: unit * 0.05, top: -unit * 0.15 }, eyeStyle]} />
          <View style={[styles.sidePanel, styles.leftPanel, { width: unit * 0.09, height: unit * 0.19, borderRadius: unit * 0.045, left: -unit * 0.065 }]} />
          <View style={[styles.sidePanel, styles.rightPanel, { width: unit * 0.09, height: unit * 0.19, borderRadius: unit * 0.045, right: -unit * 0.065 }]} />

          <View style={[styles.visor, { width: unit * 0.44, height: unit * 0.22, borderRadius: unit * 0.075, marginTop: unit * 0.075 }]}>
            <Animated.View style={[styles.eye, { width: unit * 0.065, height: unit * 0.105, borderRadius: unit * 0.04 }, eyeStyle]} />
            <Animated.View style={[styles.eye, { width: unit * 0.065, height: unit * 0.105, borderRadius: unit * 0.04 }, eyeStyle]} />
          </View>

          <Animated.View style={[styles.mouthLight, { width: unit * 0.17, height: Math.max(2, unit * 0.018), borderRadius: unit * 0.02, marginTop: unit * 0.055 }, mouthStyle]} />
          <View style={[styles.faceStatus, { width: unit * 0.035, height: unit * 0.035, borderRadius: unit * 0.02, bottom: unit * 0.075, right: unit * 0.085 }]} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    position: "absolute",
    borderColor: "rgba(34, 211, 238, 0.18)",
    borderTopColor: "#67E8F9",
    borderBottomColor: "#F59E0B",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 7,
  },
  orbitBlue: {
    position: "absolute",
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 5,
  },
  orbitAmber: {
    position: "absolute",
    backgroundColor: "#FDBA74",
    shadowColor: "#F97316",
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  body: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(125, 211, 252, 0.8)",
    overflow: "hidden",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.6,
    shadowRadius: 9,
    elevation: 7,
  },
  bodyFace: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  chestPanel: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 16, 30, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.5)",
  },
  chestCore: {
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  head: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(125, 211, 252, 0.98)",
    backgroundColor: "#0B1E33",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 10,
    zIndex: 2,
  },
  headFace: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  antennaStem: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  antennaLight: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#FBBF24",
    borderWidth: 1,
    borderColor: "#FEF3C7",
    shadowColor: "#F59E0B",
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 7,
  },
  sidePanel: {
    position: "absolute",
    top: "38%",
    backgroundColor: "#155E75",
    borderWidth: 1,
    borderColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.75,
    shadowRadius: 5,
    elevation: 5,
  },
  leftPanel: {},
  rightPanel: {},
  visor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: "#020817",
    borderWidth: 1.2,
    borderColor: "rgba(103, 232, 249, 0.76)",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.8,
    shadowRadius: 7,
    elevation: 6,
  },
  eye: {
    backgroundColor: "#67E8F9",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 7,
  },
  mouthLight: {
    backgroundColor: "#FDBA74",
    shadowColor: "#F97316",
    shadowOpacity: 0.95,
    shadowRadius: 7,
    elevation: 5,
  },
  faceStatus: {
    position: "absolute",
    backgroundColor: "#34D399",
    shadowColor: "#34D399",
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 4,
  },
});
