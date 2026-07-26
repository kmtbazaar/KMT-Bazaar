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
  ImageBackground,
} from "react-native";
import { router } from "expo-router";

// --- GIF IMPORTS ---
import AssistantGif from "../assets/images/assistant.gif";
import VoiceGif from "../assets/images/voice.gif"; 

// Premium Brown Leather Texture URL
const LEATHER_BG_URL = "https://www.transparenttextures.com/patterns/leather.png";

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
      <ImageBackground
        source={{ uri: LEATHER_BG_URL }}
        style={styles.leatherBackground}
        resizeMode="repeat"
      >
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            
            {/* Header Text Inside Gold Accent Leather Tile */}
            <View style={styles.headerTile}>
              <Text style={styles.tileTitle}>KMT Bazaar Assistant</Text>
              <Text style={styles.tileSubtitle}>
              [ Aapka Live Assistant ]
              </Text>
            </View>

            {/* Character Section */}
            <View style={styles.characterContainer}>
              <View style={styles.characterWrapper}>
                <Image
                  source={AssistantGif}
                  style={styles.imageSize}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Voice GIF Container (Below Assistant, Above Buttons) */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.voiceRectContainer}
              onPress={() => console.log("Voice Assistant Activated")}
            >
              <Image
                source={VoiceGif}
                style={styles.voiceRectGif}
                resizeMode="contain"
              />
            </TouchableOpacity>

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
      </ImageBackground>
    );
  }

  // --- VIEW 1: BROWN LEATHER SPLASH SCREEN ---
  return (
    <ImageBackground
      source={{ uri: LEATHER_BG_URL }}
      style={styles.splashContainer}
      resizeMode="repeat"
    >
      <StatusBar barStyle="light-content" />
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={{ width: 220, height: 220, resizeMode: "contain" }}
      />
    </ImageBackground>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  leatherBackground: {
    flex: 1,
    backgroundColor: "#2B1704", // Deep Rich Saddle Brown Base Color
  },
  safeArea: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2B1704",
  },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
  },

  // Premium Header Tile with Faux Stitching Effect
  headerTile: {
    width: "100%",
    backgroundColor: "#1C0D02", 
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D4AF37", // Warm Brass / Metallic Gold Border
    borderStyle: "dashed", // Stitching Line Feel
    alignItems: "center",
    marginTop: 10,
    // Native Elevation & Shadow Effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tileTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F3E5AB", // Warm Cream Color
    textAlign: "center",
  },
  tileSubtitle: {
    fontSize: 13,
    color: "#D4AF37", // Warm Gold Accent
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  
  // Character Layout (Bada Assistant)
  characterContainer: {
    width: "100%",
    height: 340,
    justify.content: "center",
    alignItems: "center",
  },
  characterWrapper: {
    width: width * 0.90,
    height: 330,
    justifyContent: "center",
    alignItems: "center",
  },
  imageSize: {
    width: "100%",
    height: "100%",
  },

  // Voice Container (Gaps Removed)
  voiceRectContainer: {
    width: "100%",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 0,
    marginTop: -10,
  },
  voiceRectGif: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "#8B261D", // Rich Crimson Red Button (Matches Leather Theme)
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4AF37", // Subtle Gold Stitching Line
  },
  primaryBtnText: {
    color: "#FFF8DC",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "rgba(28, 13, 2, 0.6)",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.5)",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#F3E5AB",
    fontSize: 16,
    fontWeight: "600",
  },
});
