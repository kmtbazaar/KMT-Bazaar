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

// --- GIF IMPORTS (Sirf Assistant aur Voice GIF) ---
import AssistantGif from "../assets/images/assistant.gif";
import VoiceGif from "../assets/images/voice.gif"; 

const { width } = Dimensions.get("window");

export default function Index() {
  const [showAssistant, setShowAssistant] = useState(false);

  // Smooth Fade-In Animation for Screen Load
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
      <View style={styles.blackBackground}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            
            {/* Header Text Area */}
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>गाँव को शहर बनाते हैं</Text>
              <Text style={styles.subtitle}>
                Aapke bazaar ka smart digital saathi! Aapki zaroorat, humara hal.
              </Text>
            </View>

            {/* Character & Voice GIF Container */}
            <View style={styles.characterContainer}>
              <View style={styles.characterWrapper}>
                
                {/* Main Still Assistant Character */}
                <Image
                  source={AssistantGif}
                  style={styles.imageSize}
                  resizeMode="contain"
                />

                {/* Single Voice GIF Button (Right Side) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.voiceButtonRight}
                  onPress={() => console.log("Voice Assistant Activated")}
                >
                  <Image
                    source={VoiceGif}
                    style={styles.voiceGifSize}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

              </View>
            </View>

            {/* Navigation Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryBtnWrapper}
                onPress={() => router.replace("/auth/login")}
              >
                <View style={styles.primaryGradientBtn}>
                  <Text style={styles.primaryBtnText}>Login</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.secondaryBtn}
                onPress={() => router.replace("/auth/register")}
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
  blackBackground: {
    flex: 1,
    backgroundColor: "#000000",
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
    paddingTop: 20,
    paddingBottom: 25,
  },
  headerTextContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FAF9F6", // Warm White
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#E8E6E3", // Warm Off-White
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 15,
  },
  
  // Character Layout
  characterContainer: {
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
    position: "relative",
  },
  imageSize: {
    width: "100%",
    height: "100%",
  },

  // Voice GIF Button Style (Positioned at Right Side)
  voiceButtonRight: {
    position: "absolute",
    right: -10,
    top: "35%",
    backgroundColor: "rgba(28, 28, 30, 0.85)",
    padding: 8,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 8,
    shadowColor: "#E63946",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 20,
  },
  voiceGifSize: {
    width: 42,
    height: 42,
  },

  // Buttons Styling
  actionContainer: {
    width: "100%",
    gap: 12,
  },
  primaryBtnWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
  },
  primaryGradientBtn: {
    backgroundColor: "#E63946",
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
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(250, 249, 246, 0.3)",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#FAF9F6",
    fontSize: 16,
    fontWeight: "600",
  },
});
