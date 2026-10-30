import { LocalizedText as Text } from "@/src/LocalizedText";
import { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  Animated,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useLanguage } from "../src/LanguageContext";
import ParticleLogoSplash from "../src/components/ParticleLogoSplash";

// --- GIF IMPORTS ---
import AssistantGif from "../assets/images/assistant.gif";
import VoiceGif from "../assets/images/voice.gif"; 

const { width } = Dimensions.get("window");

export default function Index() {
  const [showAssistant, setShowAssistant] = useState(false);
  const { hasSelectedLanguage, selectLanguage, isLanguageReady } = useLanguage();

  // Smooth Fade-In Animation for Screen Load
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLanguageReady) return;
    // Allow the full smooth particle assembly and final logo reveal.
    const timer = setTimeout(() => {
      setShowAssistant(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 5200);

    return () => clearTimeout(timer);
  }, [isLanguageReady]);

  // First-time visitors choose their language before entering the site.
  if (showAssistant && !hasSelectedLanguage) {
    return (
      <View style={styles.blackBackground}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.mainContent, { justifyContent: "center", gap: 22 }]}>
            <View style={styles.blueGradientTile}>
              <Text style={styles.tileTitle}>KMT Bazaar Assistant</Text>
              <Text style={styles.tileSubtitle}>Choose your language / अपनी भाषा चुनें</Text>
            </View>
            <Image source={AssistantGif} style={{ width: width * 0.72, height: 250 }} resizeMode="contain" />
            <View style={{ width: "100%", gap: 14 }}>
              <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtnWrapper} onPress={() => { void selectLanguage("hi"); }}>
                <View style={[styles.primaryGradientBtn, { backgroundColor: "#0D9488" }]}>
                  <Text style={styles.primaryBtnText}>हिन्दी में आगे बढ़ें</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtnWrapper} onPress={() => { void selectLanguage("en"); }}>
                <View style={styles.primaryGradientBtn}>
                  <Text style={styles.primaryBtnText}>Continue in English</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.tileSubtitle}>You can change language later in Profile / प्रोफ़ाइल में बाद में भाषा बदल सकते हैं</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // --- VIEW 2: INTERACTIVE ASSISTANT SCREEN ---
  if (showAssistant) {
    return (
      <View style={styles.blackBackground}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
            
            {/* Header Text Inside Blue Gradient Tile */}
            <View style={styles.blueGradientTile}>
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
                  <Text style={styles.primaryBtnText}>Let&apos;s get started</Text>
                </View>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // --- VIEW 1: PARTICLE-FORMING BRAND SPLASH ---
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" />
      <ParticleLogoSplash />
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
    paddingTop: 15,
    paddingBottom: 25,
  },

  // Blue Gradient Style Tile for Header Text
  blueGradientTile: {
    width: "100%",
    backgroundColor: "#1E3A8A", // Deep Rich Blue
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#3B82F6", // Bright Blue Glowing Border
    alignItems: "center",
    marginTop: 10,
    // Native Elevation & Shadow Effect
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  tileTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  tileSubtitle: {
    fontSize: 13,
    color: "#93C5FD", // Soft Ice Blue Accent
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  
  // Character Layout (Bada Assistant)
  characterContainer: {
    width: "100%",
    height: 340,
    justifyContent: "center",
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

});
