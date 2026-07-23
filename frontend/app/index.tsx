import { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  Animated,
  PanResponder,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";

import AssistantGif from "../assets/images/assistant.gif";

export default function Index() {
  const [showAssistant, setShowAssistant] = useState(false);

  // Smooth Fade-In & Slide-Up Animation for Screen Load
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Swiping & 3D Rotation Logic
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    })
  ).current;

  // Enhanced Animation Interpolations
  const rotateY = pan.x.interpolate({
    inputRange: [-200, 200],
    outputRange: ["-35deg", "35deg"],
    extrapolate: "clamp",
  });

  const scaleChar = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [0.9, 1, 0.9],
    extrapolate: "clamp",
  });

  useEffect(() => {
    // 2.5 second Splash Timer
    const timer = setTimeout(() => {
      setShowAssistant(true);
      // Run Screen Entrance Animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // --- VIEW 2: INTERACTIVE ASSISTANT SCREEN ---
  if (showAssistant) {
    return (
      <View style={styles.darkBackground}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          
          {/* Top Bar with Skip Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.replace("/(tabs)")} // Direct home route
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header Text */}
            <View style={styles.headerTextContainer}>
              <Text style={styles.badgeText}>KMT BAZAAR ASSISTANT</Text>
              <Text style={styles.title}>गाँव को शहर बनाते हैं</Text>
              <Text style={styles.subtitle}>
                Aapke bazaar ka smart digital saathi! Aapki zaroorat, humara hal.
              </Text>
            </View>

            {/* Interactive Animated GIF Area */}
            <View
              style={styles.characterSwipeArea}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.characterWrapper,
                  {
                    transform: [
                      { translateX: pan.x },
                      { rotateY: rotateY },
                      { scale: scaleChar },
                    ],
                  },
                ]}
              >
                <Image
                  source={AssistantGif}
                  style={styles.imageSize}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>

            {/* Navigation Actions (Login + Sign Up) */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.primaryBtn}
                onPress={() => router.push("/auth/login")}
              >
                <Text style={styles.primaryBtnText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.secondaryBtn}
                onPress={() => router.push("/auth/register")}
              >
                <Text style={styles.secondaryBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // --- VIEW 1: BLACK SPLASH SCREEN ---
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" />
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 220, height: 220, resizeMode: "contain" }}
      />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  darkBackground: {
    flex: 1,
    backgroundColor: "#0F172A", // Dark Premium Slate Blue
  },
  safeArea: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  topBar: {
    width: "100%",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skipText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTextContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  badgeText: {
    color: "#38BDF8", // Cyan Accent
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  characterSwipeArea: {
    flex: 1,
    justify.content: "center",
    alignItems: "center",
    width: "100%",
  },
  characterWrapper: {
    width: 280,
    height: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  imageSize: {
    width: "100%",
    height: "100%",
  },
  actionContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: "#2563EB", // Modern Vibrant Blue
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
