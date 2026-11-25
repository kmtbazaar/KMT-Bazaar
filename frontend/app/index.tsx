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
import { Link, router } from "expo-router";
import { Head } from "expo-router/head";
import { useLanguage } from "../src/LanguageContext";
import ParticleLogoSplash from "../src/components/ParticleLogoSplash";
import RobotAvatar from "../src/components/RobotAvatar";
import VoiceGif from "../assets/images/voice.gif";

const { width } = Dimensions.get("window");

export default function Index() {
  const [showAssistant, setShowAssistant] = useState(false);
  const { hasSelectedLanguage, selectLanguage, isLanguageReady } = useLanguage();
  const assistantSize = Math.min(width * 0.68, 252);

  // Smooth Fade-In Animation for Screen Load
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const welcomeAudioFailedRef = useRef(false);
  const [greetingPlaying, setGreetingPlaying] = useState(false);
  const [greetingNeedsTap, setGreetingNeedsTap] = useState(false);

  const speakFallbackGreeting = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    const browserWindow = window as any;
    const synthesis = browserWindow.speechSynthesis;
    const Utterance = browserWindow.SpeechSynthesisUtterance ||
      (globalThis as any).SpeechSynthesisUtterance;
    if (!synthesis || !Utterance) return false;

    synthesis.cancel();
    const utterance = new Utterance("के एम टी बाज़ार में आपका स्वागत है।");
    utterance.lang = "hi-IN";
    utterance.rate = 0.96;
    utterance.pitch = 1.2;
    utterance.onstart = () => {
      setGreetingPlaying(true);
      setGreetingNeedsTap(false);
    };
    utterance.onend = () => setGreetingPlaying(false);
    utterance.onerror = () => setGreetingPlaying(false);
    synthesis.speak(utterance);
    return true;
  };

  const playWelcomeGreeting = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const audio = welcomeAudioRef.current;
    if (!audio || welcomeAudioFailedRef.current) {
      if (!speakFallbackGreeting()) setGreetingNeedsTap(true);
      return;
    }
    if (!audio.paused && !audio.ended) return;
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => setGreetingNeedsTap(true));
    } catch {
      setGreetingNeedsTap(true);
    }
  };

  useEffect(() => {
    if (!showAssistant || Platform.OS !== "web" || typeof document === "undefined") return;
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.src = "/api/assistant/welcome-audio?v=2";
    audio.onplay = () => {
      setGreetingPlaying(true);
      setGreetingNeedsTap(false);
    };
    audio.onended = () => setGreetingPlaying(false);
    audio.onerror = () => {
      welcomeAudioFailedRef.current = true;
      setGreetingPlaying(false);
      setGreetingNeedsTap(true);
    };
    welcomeAudioRef.current = audio;
    audio.load();

    // Attempt autoplay; browsers that block sound show a tap-to-play prompt.
    void audio.play().catch(() => setGreetingNeedsTap(true));

    return () => {
      audio.pause();
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      if (welcomeAudioRef.current === audio) welcomeAudioRef.current = null;
      (window as any).speechSynthesis?.cancel?.();
    };
  }, [showAssistant]);

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
    }, 6000);

    return () => clearTimeout(timer);
  }, [isLanguageReady]);

  // First-time visitors choose their language before entering the site.
  if (showAssistant && !hasSelectedLanguage) {
    return (
      <View style={styles.blackBackground}>
        <HomeSearchMetadata />
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.mainContent, { justifyContent: "center", gap: 22 }]}>
            <View style={styles.blueGradientTile}>
              <Text style={styles.tileTitle}>KMT Bazaar Assistant</Text>
              <Text style={styles.tileSubtitle}>Choose your language / अपनी भाषा चुनें</Text>
            </View>
            <TouchableOpacity activeOpacity={0.92} onPress={playWelcomeGreeting} accessibilityRole="button" accessibilityLabel="Play KMT Bazaar welcome greeting">
              <RobotAvatar size={Math.min(width * 0.72, 248)} talking={greetingPlaying} />
            </TouchableOpacity>
            {greetingNeedsTap && <Text style={styles.greetingPrompt}>स्वागत सुनने के लिए assistant पर टैप करें</Text>}
            <View style={{ width: "100%", gap: 14 }}>
              <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtnWrapper} onPress={() => { playWelcomeGreeting(); void selectLanguage("hi"); }}>
                <View style={[styles.primaryGradientBtn, { backgroundColor: "#0D9488" }]}>
                  <Text style={styles.primaryBtnText}>हिन्दी में आगे बढ़ें</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtnWrapper} onPress={() => { playWelcomeGreeting(); void selectLanguage("en"); }}>
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
        <HomeSearchMetadata />
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
            <View style={styles.characterContainer} pointerEvents="box-none">
              <View style={styles.characterWrapper} pointerEvents="box-none">
                <TouchableOpacity
                  style={{ width: assistantSize, height: assistantSize, alignItems: "center", justifyContent: "center" }}
                  activeOpacity={0.92}
                  onPress={playWelcomeGreeting}
                  accessibilityRole="button"
                  accessibilityLabel="Replay KMT Bazaar welcome greeting"
                >
                  <RobotAvatar
                    size={assistantSize}
                    talking={greetingPlaying}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Voice GIF Container (Below Assistant, Above Buttons) */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.voiceRectContainer}
              onPress={playWelcomeGreeting}
            >
              <Image
                source={VoiceGif}
                style={[styles.voiceRectGif, { opacity: greetingPlaying ? 1 : 0.52 }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {greetingNeedsTap && <Text style={styles.greetingPrompt}>स्वागत की आवाज़ सुनने के लिए यहाँ टैप करें</Text>}

            {/* Navigation Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryBtnWrapper}
                onPress={() => router.replace("/(tabs)/home")}
              >
                <View style={styles.primaryGradientBtn}>
                  <Text style={styles.primaryBtnText}>Let&apos;s get started</Text>
                </View>
              </TouchableOpacity>
            </View>
            <SearchEntryLinks />

          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // --- VIEW 1: PARTICLE-FORMING BRAND SPLASH ---
  return (
    <View style={styles.splashContainer}>
      <HomeSearchMetadata />
      <StatusBar barStyle="light-content" />
      <ParticleLogoSplash />
      <SearchEntryLinks overlay />
    </View>
  );
}

function HomeSearchMetadata() {
  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://kmtbazaar.com/#website",
    "url": "https://kmtbazaar.com/",
    "name": "KMT Bazaar",
    "alternateName": "KMTBazaar",
  });
  return (
    <Head>
      <title>KMT Bazaar | Shop Online &amp; Book Local Services</title>
      <meta name="description" content="Shop products from local stores, explore home and travel services, and book wedding photography and events with KMT Bazaar." />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href="https://kmtbazaar.com/" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="KMT Bazaar" />
      <meta property="og:url" content="https://kmtbazaar.com/" />
      <meta property="og:title" content="KMT Bazaar | Shop Online &amp; Book Local Services" />
      <meta property="og:description" content="Shop products from local stores, explore home and travel services, and book wedding photography and events with KMT Bazaar." />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="KMT Bazaar | Shop Online &amp; Book Local Services" />
      <meta name="twitter:description" content="Shop products, explore local services and book wedding experiences with KMT Bazaar." />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteSchema }} />
    </Head>
  );
}

function SearchEntryLinks({ overlay = false }: { overlay?: boolean }) {
  return (
    <View style={overlay ? styles.searchEntryOverlay : styles.searchEntryWrap} testID="kmt-search-entry-links">
      <Text style={styles.searchEntryCopy}>Shop products and book local services with KMT Bazaar.</Text>
      <View style={styles.searchEntryRow}>
        <Link href="/(tabs)/categories" asChild>
          <TouchableOpacity style={[styles.searchEntryButton, styles.searchEntryShop]} accessibilityRole="link">
            <Text style={styles.searchEntryButtonText}>Shop Now</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/book-now" asChild>
          <TouchableOpacity style={[styles.searchEntryButton, styles.searchEntryBook]} accessibilityRole="link">
            <Text style={styles.searchEntryButtonText}>Book Now</Text>
          </TouchableOpacity>
        </Link>
      </View>
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
  searchEntryOverlay: { position: "absolute", left: 18, right: 18, bottom: 28, zIndex: 10, alignItems: "center", gap: 10 },
  searchEntryWrap: { width: "100%", alignItems: "center", gap: 10, paddingTop: 4 },
  searchEntryCopy: { color: "#B8D6F3", fontSize: 11, fontWeight: "700", textAlign: "center" },
  searchEntryRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, width: "100%" },
  searchEntryButton: { minWidth: 132, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  searchEntryShop: { backgroundColor: "#E97817", borderColor: "#F6B35E" },
  searchEntryBook: { backgroundColor: "#17428C", borderColor: "#5593DF" },
  searchEntryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.3 },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
    gap: 14,
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
  
  greetingPrompt: {
    color: "#93C5FD",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },

  // Character Layout (Bada Assistant)
  characterContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  characterWrapper: {
    width: "100%",
    height: "100%",
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
