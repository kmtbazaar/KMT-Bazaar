import { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";

import AssistantGif from "../assets/images/assistant.gif";

const { width } = Dimensions.get("window");

export default function Index() {
  const [showAssistant, setShowAssistant] = useState(false);

  // Smooth Fade-In Animation for Screen Load
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Continuous Floating Animations for Elements (Cart, Delivery, Gifts)
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;
  const floatAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating loop animations
    const createFloatingAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -12,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createFloatingAnimation(floatAnim1, 1800).start();
    createFloatingAnimation(floatAnim2, 2200).start();
    createFloatingAnimation(floatAnim3, 2000).start();

    // 2.5 second Splash Timer
    const timer = setTimeout(() => {
      setShowAssistant(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // --- VIEW 2: INTERACTIVE ASSISTANT SCREEN ---
  if (showAssistant) {
    return (
      <View style={styles.lightBackground}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            
            {/* Header Text */}
            <View style={styles.headerTextContainer}>
              <Text style={styles.badgeText}>KMT BAZAAR ASSISTANT</Text>
              <Text style={styles.title}>गाँव को शहर बनाते हैं</Text>
              <Text style={styles.subtitle}>
                Aapke bazaar ka smart digital saathi! Aapki zaroorat, humara hal.
              </Text>
            </View>

            {/* Character & Floating Elements Section */}
            <View style={styles.characterContainer}>
              
              {/* Floating Gift Icon (Top Left) */}
              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.floatTopLeft,
                  { transform: [{ translateY: floatAnim1 }] },
                ]}
              >
                <Text style={styles.iconText}>🎁</Text>
                <Text style={styles.iconLabel}>Offers</Text>
              </Animated.View>

              {/* Floating Delivery Boy Icon (Top Right) */}
              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.floatTopRight,
                  { transform: [{ translateY: floatAnim2 }] },
                ]}
              >
                <Text style={styles.iconText}>🚚</Text>
                <Text style={styles.iconLabel}>Fast Express</Text>
              </Animated.View>

              {/* Floating Cart Icon (Bottom Left) */}
              <Animated.View
                style={[
                  styles.floatingBadge,
                  styles.floatBottomLeft,
                  { transform: [{ translateY: floatAnim3 }] },
                ]}
              >
                <Text style={styles.iconText}>🛒</Text>
                <Text style={styles.iconLabel}>Easy Cart</Text>
              </Animated.View>

              {/* Still Assistant GIF Image */}
              <View style={styles.characterWrapper}>
                <Image
                  source={AssistantGif}
                  style={styles.imageSize}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Navigation Actions (Gradient Style Buttons) */}
            <View style={styles.actionContainer}>
              
              {/* Primary Gradient Style Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryBtnWrapper}
                onPress={() => router.push("/auth/login")}
              >
                <View style={styles.primaryGradientBtn}>
                  <Text style={styles.primaryBtnText}>Login</Text>
                </View>
              </TouchableOpacity>

              {/* Secondary Button */}
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
  lightBackground: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Matching Image Soft Light Background
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
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
  },
  headerTextContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  badgeText: {
    color: "#E63946", // Modern Red Accent
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 15,
  },
  
  // Character & Floating Icons Layout
  characterContainer: {
    position: "relative",
    width: "100%",
    height: 360,
    justifyContent: "center",
    alignItems: "center",
  },
  characterWrapper: {
    width: width * 0.75,
    height: 330,
    justifyContent: "center",
    alignItems: "center",
  },
  imageSize: {
    width: "100%",
    height: "100%",
  },

  // Floating Badges Styling
  floatingBadge: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  floatTopLeft: {
    top: 20,
    left: 10,
  },
  floatTopRight: {
    top: 30,
    right: 10,
  },
  floatBottomLeft: {
    bottom: 25,
    left: 15,
  },
  iconText: {
    fontSize: 18,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },

  // Buttons Styling
  actionContainer: {
    width: "100%",
    gap: 12,
  },
  primaryBtnWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryGradientBtn: {
    backgroundColor: "#E63946", // Vibrant Red Theme Gradient feel
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "600",
  },
});
