import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform, ActivityIndicator, Animated as RNAnimated, TextInput, BackHandler } from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay,
  withRepeat, 
  withSequence, 
  withTiming 
} from "react-native-reanimated";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { IMAGE_FALLBACK_URL, RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { BrandingFooter } from "@/src/components/AnimatedBrandLogo";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;
const HERO_BACKDROP_HEIGHT = 182; // Extend animated sky to the banner line without moving page content
const HERO_COLLAPSE_SCROLL_THRESHOLD = 120; // Collapse when banner CTA reaches the top; keep categories clear

// Custom Theme Palette: Clean Pure White, Sky Blue Header & Vibrant Orange
const THEME = {
  whiteBg: "#FFF9F0",        // Soft warm-white page background
  skyHeader: "#0284C7",      // Deep Sky Blue Header
  skyHeaderDark: "#0369A1",  // Deep Header Accent
  orange: "#FF6B00",         // Vibrant Orange
  orangeBright: "#FF8800",   // Bright Orange Highlight
  orangeGlow: "#F97316",     // Border Glow Orange
  black: "#0F172A",          // Dark Slate Text for Clear Reading
  blackMuted: "#64748B",     // Muted Slate Text
  white: "#FFFFFF",          // Pure White
  borderSoft: "#E2E8F0",     // Soft Divider Border
};

// Search bar placeholder texts for animation
const SEARCH_PLACEHOLDERS = [
  "Search 'groceries'...",
  "Search 'fresh food'...",
  "Search 'medicines'...",
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

const RECENT_SEARCHES_KEY = "kmt_recent_searches";
const MAX_RECENT_SEARCHES = 5;

const SKY_STARS = Array.from({ length: 26 }, (_, index) => ({
  left: `${(index * 37 + 11) % 96}%`,
  top: 7 + ((index * 19 + 13) % 68),
  size: index % 5 === 0 ? 2 : 1.4,
}));


const FESTIVAL_BULBS = Array.from({ length: 9 }, (_, index) => ({
  left: String(index * 12) + "%",
  top: index % 2 === 0 ? 7 : 12,
  color: ["#FFE08A", "#FDBA74", "#FCA5A5", "#FDE68A", "#93C5FD"][index % 5],
}));

const FESTIVAL_LANTERNS = [
  { left: "13%", bottom: 22, delay: 0, duration: 6200, size: 0.82 },
  { left: "79%", bottom: 18, delay: 1400, duration: 7100, size: 0.96 },
  { left: "56%", bottom: 12, delay: 2800, duration: 7600, size: 0.68 },
];

const FESTIVAL_FIREWORKS = [
  { left: "19%", top: 82, delay: 300, size: 0.78 },
  { left: "77%", top: 73, delay: 1700, size: 0.92 },
];

function FestivalLantern({
  left,
  bottom,
  delay,
  duration,
  size,
}: {
  left: string;
  bottom: number;
  delay: number;
  duration: number;
  size: number;
}) {
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    floatProgress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration }),
          withTiming(0, { duration: Math.round(duration * 0.9) })
        ),
        -1,
        false
      )
    );
  }, [delay, duration]);

  const floatStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + floatProgress.value * 0.7,
    transform: [
      { translateY: -floatProgress.value * 82 },
      { translateX: Math.sin(floatProgress.value * Math.PI * 2) * 7 },
      { scale: size },
    ],
  }));

  return (
    <Animated.View style={[s.festivalLantern, { left, bottom }, floatStyle]}>
      <View style={s.festivalLanternGlow} />
      <View style={s.festivalLanternString} />
      <View style={s.festivalLanternCap} />
      <LinearGradient
        colors={["#FFF0B8", "#F59E0B", "#C2410C"]}
        locations={[0, 0.48, 1]}
        style={s.festivalLanternBody}
      >
        <View style={s.festivalLanternRib} />
        <View style={s.festivalLanternFlame} />
      </LinearGradient>
      <View style={s.festivalLanternBase} />
    </Animated.View>
  );
}

function FestivalFirework({
  left,
  top,
  delay,
  size,
}: {
  left: string;
  top: number;
  delay: number;
  size: number;
}) {
  const burstProgress = useSharedValue(0.12);

  useEffect(() => {
    burstProgress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 480 }),
          withTiming(0.04, { duration: 1500 })
        ),
        -1,
        false
      )
    );
  }, [delay]);

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstProgress.value,
    transform: [{ scale: size * (0.5 + burstProgress.value * 0.62) }],
  }));

  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  const sparks = [
    { left: 17, top: 0 },
    { left: 34, top: 15 },
    { left: 17, top: 33 },
    { left: 0, top: 15 },
    { left: 5, top: 4 },
    { left: 31, top: 5 },
    { left: 5, top: 29 },
    { left: 30, top: 29 },
  ];

  return (
    <Animated.View style={[s.festivalFirework, { left, top }, burstStyle]}>
      {rays.map((angle) => (
        <View
          key={angle}
          style={[
            s.festivalFireworkRay,
            { transform: [{ rotate: String(angle) + "deg" }] },
          ]}
        />
      ))}
      {sparks.map((spark, index) => (
        <View
          key={index}
          style={[
            s.festivalFireworkSpark,
            { left: spark.left, top: spark.top },
            index % 3 === 0 && s.festivalFireworkSparkWarm,
          ]}
        />
      ))}
      <View style={s.festivalFireworkCore} />
    </Animated.View>
  );
}

function FestivalSugarcane({ left, bottom }: { left: string; bottom: number }) {
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600 }),
        withTiming(0, { duration: 2600 })
      ),
      -1,
      true
    );
  }, []);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-1.5 + sway.value * 3}deg` }],
  }));

  const stalkOffsets = [5, 17, 29];
  const nodePositions = ["18%", "36%", "54%", "72%"];

  return (
    <Animated.View
      pointerEvents="none"
      testID="home-festival-sugarcane"
      style={[s.festivalSugarcaneCluster, { left, bottom }, swayStyle]}
    >
      {stalkOffsets.map((offset, index) => (
        <View
          key={offset}
          style={[
            s.festivalSugarcaneStalk,
            {
              left: offset,
              height: index === 1 ? 84 : index === 0 ? 75 : 79,
              transform: [{ rotate: index === 0 ? "-5deg" : index === 2 ? "6deg" : "1deg" }],
            },
          ]}
        >
          {nodePositions.map((top) => (
            <View key={top} style={[s.festivalSugarcaneNode, { top }]} />
          ))}
        </View>
      ))}
      <View style={[s.festivalSugarcaneLeaf, { left: -2, top: 18, transform: [{ rotate: "-34deg" }] }]} />
      <View style={[s.festivalSugarcaneLeaf, { left: 15, top: 9, transform: [{ rotate: "34deg" }] }]} />
      <View style={[s.festivalSugarcaneLeaf, { left: 4, top: 38, transform: [{ rotate: "-25deg" }] }]} />
      <View style={[s.festivalSugarcaneLeaf, { left: 18, top: 32, transform: [{ rotate: "28deg" }] }]} />
    </Animated.View>
  );
}

function FestivalChhathSoop() {
  return (
    <View pointerEvents="none" testID="home-chhath-soop" style={s.festivalChhathSoop}>
      <View style={s.festivalSoopBody}>
        {[8, 17, 26, 35, 44].map((left) => (
          <View key={left} style={[s.festivalSoopWeave, { left }]} />
        ))}
      </View>
      <View style={s.festivalSoopRim} />
      <View style={[s.festivalPaanLeaf, { left: 15, top: -13, transform: [{ rotate: "-34deg" }] }]}>
        <View style={s.festivalPaanVein} />
      </View>
      <View style={[s.festivalPaanLeaf, { left: 30, top: -12, transform: [{ rotate: "31deg" }] }]}>
        <View style={s.festivalPaanVein} />
      </View>
      <View style={s.festivalSoopFruitOrange} />
      <View style={s.festivalSoopFruitBanana} />
      <View style={s.festivalSoopCoconut} />
    </View>
  );
}

function FestivalDecor() {
  const lightPulse = useSharedValue(0);
  const waterDrift = useSharedValue(0);

  useEffect(() => {
    lightPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100 }),
        withTiming(0, { duration: 1300 })
      ),
      -1,
      false
    );
    waterDrift.value = withRepeat(
      withTiming(1, { duration: 4200 }),
      -1,
      false
    );
  }, []);

  const lightsStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + lightPulse.value * 0.28,
  }));
  const waterShimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + Math.sin(waterDrift.value * Math.PI * 2) * 0.10,
    transform: [{ translateX: -18 + waterDrift.value * 36 }],
  }));

  return (
    <View pointerEvents="none" style={s.festivalDecor} testID="home-festival-hero">
      <LinearGradient
        colors={["#080F27", "#1B1D43", "#59304C", "#C06A4E"]}
        locations={[0, 0.42, 0.76, 1]}
        style={s.festivalBackdrop}
      />
      <View style={s.festivalHorizonGlow} />
      <View style={s.festivalStarLayer}>
        {SKY_STARS.slice(0, 18).map((star, index) => (
          <View
            key={index}
            style={[
              s.festivalStar,
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: index % 4 === 0 ? 0.95 : 0.55,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[s.festivalLightString, lightsStyle]}>
        <View style={s.festivalLightWire} />
        {FESTIVAL_BULBS.map((bulb, index) => (
          <View
            key={index}
            style={[
              s.festivalBulb,
              {
                left: bulb.left,
                top: bulb.top,
                backgroundColor: bulb.color,
                shadowColor: bulb.color,
              },
            ]}
          />
        ))}
      </Animated.View>

      {FESTIVAL_LANTERNS.map((lantern, index) => (
        <FestivalLantern key={index} {...lantern} />
      ))}

      {FESTIVAL_FIREWORKS.map((firework, index) => (
        <FestivalFirework key={index} {...firework} />
      ))}

      <View style={s.festivalGhatStepOne} />
      <View style={s.festivalGhatStepTwo} />
      <View style={s.festivalGhatStepThree} />

      <LinearGradient
        colors={["rgba(19,75,101,0.04)", "rgba(8,39,63,0.60)"]}
        style={s.festivalWater}
      >
        <Animated.View style={[s.festivalWaterShimmer, waterShimmerStyle]} />
        {["15%", "39%", "66%", "87%"].map((left, index) => (
          <View key={left} style={[s.festivalDiya, { left }]}>
            <View style={[s.festivalDiyaFlame, index % 2 === 0 && s.festivalDiyaFlameBright]} />
            <View style={s.festivalDiyaBowl} />
          </View>
        ))}
      </LinearGradient>

      <FestivalSugarcane left="61%" bottom={15} />
      <FestivalSugarcane left="75%" bottom={12} />
      <FestivalChhathSoop />
    </View>
  );
}


function NightSky() {
  return (
    <View pointerEvents="none" style={s.nightSky}>
      <FestivalDecor />
    </View>
  );
}


export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const [banners, setBanners] = useState<any[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [vendorServices, setVendorServices] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const bannerListRef = useRef<FlatList<any>>(null);
  const voiceRecognitionRef = useRef<any>(null);

  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [homeSearchFocusInput, setHomeSearchFocusInput] = useState(true);
  const [homeSearchProducts, setHomeSearchProducts] = useState<any[]>([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState(false);
  const [homeSearchError, setHomeSearchError] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const homeSearchFetchStarted = useRef(false);
  const homeSearchHistoryEntry = useRef(false);

  useEffect(() => {
    if (!homeSearchOpen) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const currentState = window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};
      window.history.pushState(
        { ...currentState, kmtHomeSearchOverlay: true },
        "",
        window.location.href
      );
      homeSearchHistoryEntry.current = true;

      const handleBrowserBack = () => {
        homeSearchHistoryEntry.current = false;
        try { voiceRecognitionRef.current?.stop?.(); } catch {}
        voiceRecognitionRef.current = null;
        setVoiceListening(false);
        setHomeSearchOpen(false);
        setHomeSearchQuery("");
      };
      window.addEventListener("popstate", handleBrowserBack);
      return () => window.removeEventListener("popstate", handleBrowserBack);
    }

    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      voiceRecognitionRef.current = null;
      setVoiceListening(false);
      setHomeSearchOpen(false);
      setHomeSearchQuery("");
      return true;
    });
    return () => backSubscription.remove();
  }, [homeSearchOpen]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .filter((item): item is string => typeof item === "string")
              .slice(0, MAX_RECENT_SEARCHES)
          );
        }
      } catch (error) {
        console.warn("Failed to load recent searches:", error);
      }
    })();
  }, []);

  const tabBarTranslateY = useRef(new RNAnimated.Value(0)).current;
  const lastHomeOffsetY = useRef(0);
  const homeTabHidden = useRef(false);
  const heroCollapseProgress = useRef(new RNAnimated.Value(0)).current;

  const handleHomeTabBarScroll = useCallback((event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastHomeOffsetY.current;

    if (Math.abs(diff) > 10) {
      // Let the banner scroll away first; then smoothly slide the hero up to free screen space.
      if (diff > 0 && currentOffsetY > HERO_COLLAPSE_SCROLL_THRESHOLD && !heroCollapsed) {
        setHeroCollapsed(true);
        RNAnimated.timing(heroCollapseProgress, {
          toValue: 1,
          duration: 320,
          useNativeDriver: false,
        }).start();
      } else if (diff < 0 && heroCollapsed && currentOffsetY <= HERO_COLLAPSE_SCROLL_THRESHOLD) {
        // On a downward swipe, smoothly restore the hero and search spacing.
        setHeroCollapsed(false);
        RNAnimated.timing(heroCollapseProgress, {
          toValue: 0,
          duration: 360,
          useNativeDriver: false,
        }).start();
      }

      if (diff > 0 && currentOffsetY > 50 && !homeTabHidden.current) {
        homeTabHidden.current = true;
        RNAnimated.timing(tabBarTranslateY, {
          toValue: 100,
          duration: 250,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            navigation.setOptions({
              tabBarStyle: {
                position: "absolute",
                borderTopColor: THEME.borderSoft,
                backgroundColor: "#FFFFFF",
                height: 65,
                paddingTop: 4,
                paddingBottom: 12,
                transform: [{ translateY: 100 }],
              },
            });
          }
        });
      } else if (diff < 0 && homeTabHidden.current) {
        homeTabHidden.current = false;
        navigation.setOptions({
          tabBarStyle: {
            position: "absolute",
            borderTopColor: THEME.borderSoft,
            backgroundColor: "#FFFFFF",
            height: 65,
            paddingTop: 4,
            paddingBottom: 12,
            transform: [{ translateY: tabBarTranslateY }],
          },
        });
        RNAnimated.timing(tabBarTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }

      lastHomeOffsetY.current = currentOffsetY;
    }
  }, [navigation, tabBarTranslateY, heroCollapsed, heroCollapseProgress]);

  useFocusEffect(
    useCallback(() => {
      lastHomeOffsetY.current = 0;
      homeTabHidden.current = false;
      setHeroCollapsed(false);
      heroCollapseProgress.setValue(0);
      tabBarTranslateY.setValue(0);
      navigation.setOptions({
        tabBarStyle: {
          position: "absolute",
          borderTopColor: THEME.borderSoft,
          backgroundColor: "#FFFFFF",
          height: 65,
          paddingTop: 4,
          paddingBottom: 12,
        },
      });

      return () => {
        homeTabHidden.current = false;
        setHeroCollapsed(false);
        heroCollapseProgress.setValue(0);
        tabBarTranslateY.setValue(0);
      };
    }, [navigation, tabBarTranslateY, heroCollapseProgress])
  );

  // Customer delivery location state
  const [selectedAddress, setSelectedAddress] = useState("Set your delivery location");
  const [locationReady, setLocationReady] = useState(false);
  const [initialLocationLoading, setInitialLocationLoading] = useState(false);
  const [initialLocationError, setInitialLocationError] = useState("");

  // Existing customers use their saved/default address. New customers must set location first.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const syncDeliveryLocation = async () => {
        try {
          const stored = await AsyncStorage.getItem("selected_address");

          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.has_location !== false && parsed?.id) {
              const label = parsed.label || "Home";
              const place = parsed.line1 || parsed.city || "Saved address";
              if (mounted) {
                setSelectedAddress(`${label} · ${place}`);
                setLocationReady(true);
              }
              return;
            }
          }

          const list = await api.addresses();

          if (list?.length) {
            const valid = list.find((a: any) => a.has_location && a.is_default) ||
              list.find((a: any) => a.has_location) ||
              list.find((a: any) => a.is_default);

            if (valid?.has_location) {
              const label = valid.label || "Home";
              const place = valid.line1 || valid.city || "Saved address";
              if (mounted) {
                setSelectedAddress(`${label} · ${place}`);
                setLocationReady(true);
                await AsyncStorage.setItem("selected_address", JSON.stringify(valid));
              }
              return;
            }
          }

          if (mounted) {
            setLocationReady(false);
            setSelectedAddress("Set your delivery location");
          }
        } catch (error) {
          console.log("Delivery location sync failed:", error);
          if (mounted) setLocationReady(false);
        }
      };

      syncDeliveryLocation();
      return () => { mounted = false; };
    }, [user])
  );

  // Let customers open the map first; GPS is optional and can be requested on the map screen.
  const captureInitialLocation = useCallback(() => {
    router.push({ pathname: "/addresses", params: { mode: "initial" } } as any);
  }, [router]);

  const handleHomeLocationPress = useCallback(() => {
    router.push("/addresses" as any);
  }, [router]);

  // Public catalog data can load before a delivery location is selected.
  const load = useCallback(async () => {

    try {
      const [b, c, s, vs, t, u] = await Promise.all([
        api.banners().catch((error) => {
          console.warn("Home banners unavailable:", error);
          return [];
        }),
        api.categories().catch((error) => {
          console.warn("Shop by Category unavailable:", error);
          return [];
        }),
        api.stores().catch((error) => {
          console.warn("Nearby Stores unavailable:", error);
          return [];
        }),
        api.vendorServices().catch((error) => {
          console.warn("Vendor services unavailable:", error);
          return [];
        }),
        api.products({ trending: true }).catch((error) => {
          console.warn("Trending products unavailable:", error);
          return [];
        }),
        api.unreadCount().catch((error) => {
          // A notification/session issue must not block public catalog data.
          console.warn("Unread count unavailable:", error);
          return null;
        }),
      ]);
      setBanners(b || []);
      setCats(c || []);
      setStores(s || []);
      setVendorServices(vs || []);
      setTrending(t || []);
      setUnread(u?.count || 0);
    } catch (e) {
      console.log("load err", e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Animated Search Bar Placeholder Index
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Shared Values for Flashing Border Animations ONLY
  const bellScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (banners.length > 1) {
      try {
        bannerListRef.current?.scrollToOffset({ offset: bannerIndex * (BANNER_W + 12), animated: true });
      } catch {}
    }
  }, [bannerIndex, banners.length]);

  // Automatic banner carousel
  useEffect(() => {
    if (banners.length < 2) {
      setBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Search placeholder animation timer
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Continuous Dynamic Gradient Border Flash Animation Effect ONLY
  useEffect(() => {
    flashOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Notification Bell Pulse Animation Effect
  useEffect(() => {
    if (unread > 0) {
      bellScale.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1, // Infinite loop when unread > 0
        true
      );
    } else {
      bellScale.value = withTiming(1, { duration: 200 });
    }
  }, [unread]);

  const animatedBellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bellScale.value }]
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value
  }));

  const loadHomeSearchProducts = useCallback(async () => {
    if (homeSearchFetchStarted.current) return;
    homeSearchFetchStarted.current = true;
    setHomeSearchLoading(true);
    setHomeSearchError("");

    try {
      const data = await api.products({ limit: 500 });
      const response = data as any;
      const products = Array.isArray(response)
        ? response
        : Array.isArray(response?.products)
          ? response.products
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.products)
              ? response.data.products
              : Array.isArray(response?.items)
                ? response.items
                : [];
      const normalizedProducts = products
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => ({
          ...item,
          id: item.id ?? item.product_id ?? item._id,
        }))
        .filter((item: any) => item.id != null && String(item.id).trim() !== "");
      setHomeSearchProducts(normalizedProducts);
    } catch (error) {
      console.warn("Home search products unavailable:", error);
      setHomeSearchError("Products could not be loaded. Please try again.");
      homeSearchFetchStarted.current = false;
    } finally {
      setHomeSearchLoading(false);
    }
  }, []);

  const openHomeSearch = () => {
    setHomeSearchFocusInput(true);
    setHomeSearchQuery("");
    setHomeSearchOpen(true);
    void loadHomeSearchProducts();
  };

  const closeHomeSearch = () => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
    voiceRecognitionRef.current = null;
    setVoiceListening(false);
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      homeSearchHistoryEntry.current &&
      (window.history.state as any)?.kmtHomeSearchOverlay
    ) {
      window.history.back();
      return;
    }
    homeSearchHistoryEntry.current = false;
    setHomeSearchOpen(false);
    setHomeSearchQuery("");
  };

  const retryHomeSearch = () => {
    homeSearchFetchStarted.current = false;
    void loadHomeSearchProducts();
  };

  const saveHomeRecentSearch = useCallback(async (value: string) => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) return;

    const updated = [
      clean,
      ...recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to save recent search:", error);
    }
  }, [recentSearches]);

  const deleteHomeRecentSearch = useCallback(async (value: string) => {
    const updated = recentSearches.filter((item) => item !== value);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to delete recent search:", error);
    }
  }, [recentSearches]);

  const handleHomeSearchSubmit = () => {
    if (homeSearchQuery.trim()) {
      void saveHomeRecentSearch(homeSearchQuery);
    }
  };

  const homeSearchResults = useMemo(() => {
    const keyword = homeSearchQuery.trim().normalize("NFKC").toLowerCase();
    if (!keyword) return homeSearchProducts;

    return homeSearchProducts.filter((item: any) => {
      const searchableText = [
        item?.name,
        item?.product_name,
        item?.productName,
        item?.title,
        item?.description,
        item?.unit,
        item?.category,
        item?.item_category,
        item?.brand,
        item?.sku,
      ]
        .filter((value) => typeof value === "string" && value.trim())
        .join(" ")
        .normalize("NFKC")
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [homeSearchProducts, homeSearchQuery]);

  const homeSearchRows = useMemo(() => {
    const rows: any[][] = [];
    for (let index = 0; index < homeSearchResults.length; index += 2) {
      rows.push(homeSearchResults.slice(index, index + 2));
    }
    return rows;
  }, [homeSearchResults]);

  const heroExpandedHeight = HERO_BACKDROP_HEIGHT;
  const heroAnimatedHeight = heroCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [heroExpandedHeight, 0],
  });
  const heroAnimatedTranslateY = heroCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const heroAnimatedOpacity = heroCollapseProgress.interpolate({
    inputRange: [0, 0.86, 1],
    outputRange: [1, 1, 0],
  });

  const startVoiceSearch = useCallback(() => {
    if (voiceListening) {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
      return;
    }

    setHomeSearchFocusInput(false);
    setHomeSearchQuery("");
    setHomeSearchOpen(true);
    void loadHomeSearchProducts();

    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      window.alert("Voice search is not supported in this browser. Please use Chrome with microphone permission enabled.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      voiceRecognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-IN";

      recognition.onstart = () => setVoiceListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
        if (transcript) {
          setHomeSearchQuery(transcript);
          void saveHomeRecentSearch(transcript);
        }
      };
      recognition.onerror = () => {
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
      };
      recognition.onend = () => {
        setVoiceListening(false);
        voiceRecognitionRef.current = null;
      };
      recognition.start();
    } catch {
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
    }
  }, [loadHomeSearchProducts, saveHomeRecentSearch, voiceListening]);

  const handleHomeOverlayVoicePress = (event: any) => {
    event?.stopPropagation?.();
    startVoiceSearch();
  };

  useEffect(() => () => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Clear unread badge on click & navigate
  const handleNotificationPress = () => {
    setUnread(0);
    router.push("/notifications" as any);
  };

  return (
    <View style={[s.root, Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as any) : {}]} testID="home-screen">
      {/* Dynamic time-of-day hero: day, sunset and night */}
      <RNAnimated.View
        pointerEvents={heroCollapsed ? "none" : "auto"}
        style={[
          s.heroHeaderShell,
          {
            height: heroAnimatedHeight,
            opacity: heroAnimatedOpacity,
            transform: [{ translateY: heroAnimatedTranslateY }],
          },
        ]}
      >
      <NightSky />
      <View style={s.headerBg} />

      <SafeAreaView edges={["top"]} style={s.headerWrap}>
        <View style={s.headerRow}>
          {/* 1. Address Selector (Route: /addresses) */}
          <Pressable 
            style={s.locWrap} 
            testID="location-selector"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleHomeLocationPress}
          >
            <View style={s.locIconBg}>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={THEME.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.locLabel}>Deliver to</Text>
              <Text style={s.locValue} numberOfLines={1}>
                {selectedAddress}{" "}
                <MaterialCommunityIcons name="chevron-down" size={16} color={THEME.white} />
              </Text>
            </View>
          </Pressable>

          <Animated.View
            pointerEvents="none"
            testID="home-location-neon-glow"
            style={[s.headerNeonGlow, animatedFlashStyle]}
          >
            <View style={s.headerNeonCore} />
          </Animated.View>

          {/* Animated Notification Bell on Top Right */}
          <View style={s.headerActions}>
            <Animated.View style={animatedBellStyle}>
              <Pressable testID="notifications-bell" onPress={handleNotificationPress} style={s.iconBtn}>
                <MaterialCommunityIcons name="bell-ring-outline" size={22} color={THEME.white} />
                {unread > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>

      </SafeAreaView>
      <View style={s.skyClearSpace} />
      </RNAnimated.View>

      {/* The search bar stays usable while the hero shell slides away after the banner scrolls off. */}
      <SafeAreaView
        edges={heroCollapsed ? ["top"] : []}
        style={[s.searchBarSafeArea, heroCollapsed && s.searchBarSafeAreaCollapsed, { backgroundColor: "transparent" }]}
      >
        <View style={[s.searchBarOuter, heroCollapsed && s.searchBarOuterCollapsed]}>
        {/* Search Bar */}
        <Pressable
          testID="home-search-trigger"
          onPress={openHomeSearch}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={THEME.white} />
          <View style={{ flex: 1, marginLeft: 8, height: 22, overflow: "hidden", justifyContent: "center" }}>
            <Animated.View
              key={placeholderIdx}
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(400)}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Text style={s.searchPlaceholderText}>
                {SEARCH_PLACEHOLDERS[placeholderIdx]}
              </Text>
            </Animated.View>
          </View>
          <Pressable
            testID="home-voice-search"
            onPress={(event: any) => {
              event?.stopPropagation?.();
              startVoiceSearch();
            }}
            hitSlop={8}
            style={[s.searchMicBg, voiceListening && s.searchMicListening]}
          >
            <MaterialCommunityIcons
              name={voiceListening ? "microphone" : "microphone-outline"}
              size={18}
              color={THEME.white}
            />
          </Pressable>
        </Pressable>
        </View>
      </SafeAreaView>


      <ScrollView
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl tintColor={THEME.orange} refreshing={refreshing} onRefresh={onRefresh} />
            )
          }
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          onScroll={handleHomeTabBarScroll}
          scrollEventThrottle={16}
          style={Platform.OS === 'web' ? ({ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y' } as any) : { flex: 1 }}
        >
          {!locationReady && (
            <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md }}>
              <View style={[s.locationGateCard, { width: "100%", maxWidth: 600, padding: SPACING.md, alignSelf: "center" }]}>
                <View style={[s.locationGateIcon, { width: 54, height: 54, borderRadius: 27, marginBottom: 8 }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={26} color={THEME.orange} />
                </View>
                <Text style={[s.locationGateTitle, { fontSize: 18 }]}>Set your delivery location</Text>
                <Text style={[s.locationGateText, { fontSize: 12, lineHeight: 18 }]}>
                  Browse products and stores now. Choose a delivery location to continue with the delivery flow.
                </Text>
                <Pressable
                  onPress={captureInitialLocation}
                  disabled={initialLocationLoading}
                  style={[s.locationGateButton, { marginTop: 12, paddingVertical: 11 }, initialLocationLoading && { opacity: 0.7 }]}
                >
                  {initialLocationLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="map-marker-radius" size={19} color="#fff" />
                  )}
                  <Text style={s.locationGateButtonText}>
                    {initialLocationLoading ? "DETECTING LOCATION..." : "CHOOSE LOCATION ON MAP"}
                  </Text>
                </Pressable>
                {!!initialLocationError && (
                  <Text style={s.locationGateError}>{initialLocationError}</Text>
                )}
                <Text style={s.locationGatePrivacy}>
                  Your exact delivery GPS is used for delivery and is not shown to other customers.
                </Text>
              </View>
            </View>
          )}


        {/* Smooth banner carousel; dots are overlaid inside the banner bottom edge */}
        <View style={s.bannerCarouselShell}>
          <FlatList
            horizontal
            style={Platform.OS === 'web' ? { overflowX: 'auto' } : {}}
            data={banners}
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            decelerationRate={0.98}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xs, gap: 12 }}
            keyExtractor={(it) => String(it.id)}
            ref={(ref) => {
              if (banners.length > 1 && ref && typeof (ref as any).scrollToIndex === "function") {
                try { (ref as any).scrollToIndex({ index: bannerIndex, animated: true, viewPosition: 0 }); } catch {}
              }
            }}
            renderItem={({ item }) => (
              <View style={s.bannerItemWrap}>
                <View testID={`banner-${item.id}`} style={s.banner}>
                  <Image
                  source={{ uri: brokenImages[`banner:${String(item.id)}`] ? IMAGE_FALLBACK_URL : (item.image || IMAGE_FALLBACK_URL) }}
                  style={s.bannerImg}
                  contentFit="cover"
                  onError={() => setBrokenImages(prev => ({ ...prev, [`banner:${String(item.id)}`]: true }))}
                />

                <Animated.View style={[s.bannerFlashBorder, animatedFlashStyle]} />

                <View style={s.bannerText}>
                  {item.subtitle ? <Text style={s.bannerSubtitle}>{item.subtitle}</Text> : null}
                  {item.title ? <Text style={s.bannerTitle}>{item.title}</Text> : null}
                  <View style={s.bannerCta}>
                    <Text style={s.bannerCtaText}>{item.cta || "Explore Now"} →</Text>
                  </View>
                </View>
                </View>
                {banners.length > 1 && (
                  <View pointerEvents="none" style={s.bannerRopeConnector}>
                    <View style={s.bannerRopeLine} />
                    <View style={s.bannerRopeKnot} />
                  </View>
                )}
              </View>
            )}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.round(offsetX / (BANNER_W + 12));
              if (nextIndex >= 0 && nextIndex < banners.length) setBannerIndex(nextIndex);
            }}
          />

          {banners.length > 1 && (
            <View pointerEvents="none" style={s.bannerDotsOverlay}>
              {banners.map((item, index) => (
                <BannerDot key={String(item.id)} active={index === bannerIndex} />
              ))}
            </View>
          )}
        </View>

        {/* Categories Section with Flashing Border Tiles */}
        <SectionTitle title="Shop by Category" subtitle="Clear & easy ordering" />
        <View style={s.catsGrid}>
          {cats.map((c) => (
            <View key={c.id} style={s.catItemWrap}>
              <Pressable
                testID={`category-${c.id}`}
                onPress={() => router.push({ pathname: "/home-category/[id]", params: { id: String(c.id), name: String(c.name || "") } } as any)}
                style={s.catItem}
              >
                <View style={s.catCircleWrap}>
                  <Animated.View style={[s.catFlashBorder, animatedFlashStyle]} />
                  <View style={s.catCircle}>
                    <Image
                      source={{ uri: brokenImages[`cat:${String(c.id)}`] ? IMAGE_FALLBACK_URL : (c.image || IMAGE_FALLBACK_URL) }}
                      style={s.catImg}
                      contentFit="cover"
                      onError={() => setBrokenImages(prev => ({ ...prev, [`cat:${String(c.id)}`]: true }))}
                    />
                  </View>
                </View>
                <Text style={s.catName} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Nearby Stores List — directly below Shop by Category */}
        <View style={s.nearbySectionLift}>
          <SectionTitle title="Nearby Stores" subtitle="Fast delivery hubs" />
        </View>
        <FlatList
          horizontal
          data={stores}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 10, paddingTop: 2, paddingBottom: 8 }}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => {
            const isAvailable = item.is_online !== false;

            return (
              <Pressable 
                testID={`store-${item.id}`} 
                style={[s.storeCardSmall, !isAvailable && { opacity: 0.55 }]}
                disabled={!isAvailable}
                onPress={() => router.push({ pathname: `/store/${item.id}`, params: { name: item.name } } as any)}
              >
                {/* Animated Flashing Gradient Border */}
                <Animated.View style={[s.storeFlashBorder, animatedFlashStyle]} />
                
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: brokenImages[`store:${String(item.id)}`] ? IMAGE_FALLBACK_URL : (item.image || IMAGE_FALLBACK_URL) }}
                    style={s.storeImgSmall}
                    contentFit="cover"
                    onError={() => setBrokenImages(prev => ({ ...prev, [`store:${String(item.id)}`]: true }))}
                  />
                  
                  {!isAvailable && (
                    <View style={s.offlineOverlay}>
                      <Text style={s.offlineText}>CLOSED</Text>
                    </View>
                  )}
                </View>

                <View style={{ padding: 6 }}>
                  <Text style={[s.storeNameSmall, !isAvailable && { color: THEME.blackMuted }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                    
                    {isAvailable ? (
                      <View style={s.ratePillSmall}>
                        <MaterialCommunityIcons name="star" size={9} color={THEME.white} />
                        <Text style={s.rateTextSmall}>{item.rating || "4.5"}</Text>
                      </View>
                    ) : (
                      <View style={[s.ratePillSmall, { backgroundColor: THEME.blackMuted }]}>
                        <MaterialCommunityIcons name="store-off-outline" size={9} color={THEME.white} />
                        <Text style={s.rateTextSmall}>Off</Text>
                      </View>
                    )}

                    <Text style={s.storeMinSmall}>{item.delivery_min || 15}m</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />

        {/* Service Marketplace Section */}
        <SectionTitle title="Services" subtitle="Book local services" />
        <FlatList
          horizontal
          data={[
            { id: "holiday", title: "Holiday", sub: "Holiday packages", icon: "airplane-takeoff", path: "/holiday" },
            { id: "car_rental", title: "Car Rental", sub: "Cars & trips", icon: "car", path: "/car-rental" },
            { id: "daily_service", title: "Daily Services", sub: "Repair & local work", icon: "tools", path: "/daily-services" },
          ]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 10, paddingVertical: 4 }}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: 165, height: 132, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", padding: 12 }}
              onPress={() => router.push(item.path as any)}
            >
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={THEME.skyHeader} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: THEME.black, marginTop: 10 }} numberOfLines={1}>{item.title}</Text>
              <Text style={{ fontSize: 11, color: THEME.blackMuted, marginTop: 3 }} numberOfLines={1}>{item.sub}</Text>
            </Pressable>
          )}
        />

        {/* Trending Products Section */}
        <SectionTitle title="Trending Products" subtitle="Best sellers this week" />
        <View style={s.trendingGrid}>
          {trending.map((item) => (
            <View key={item.id} style={s.productTileCard}>
              <Animated.View style={[s.productFlashBorder, animatedFlashStyle]} />
              <ProductCard p={item} />
            </View>
          ))}
        </View>
        
        <View style={{ height: 20 }} />
        
        {/* Sky & Orange Promise Strip */}
        <View style={s.brandStrip}>
          <LinearGradient 
            colors={[THEME.skyHeader, THEME.skyHeaderDark]} 
            style={s.brandStripGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={s.brandIconCircle}>
              <MaterialCommunityIcons name="shield-check" size={22} color={THEME.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandStripTitle}>KMT Bazaar Promise</Text>
              <Text style={s.brandStripSub}>Fast delivery · Trusted shops · Easy returns</Text>
            </View>
          </LinearGradient>
        </View>
        <BrandingFooter caption="Trusted Shopping · Fast Delivery" />
      </ScrollView>

      {/* Floating Checkout Bar */}
      <CheckoutBar />

      {homeSearchOpen && (
        <View style={s.homeSearchOverlay} testID="home-search-overlay">
          <BlurView
            intensity={42}
            tint="dark"
            pointerEvents="none"
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={s.homeSearchScrim} />

          <SafeAreaView edges={["top", "bottom"]} style={s.homeSearchOverlayContent}>
            <View style={s.homeSearchHeaderRow}>
              <View style={s.homeSearchInputWrap}>
                <MaterialCommunityIcons name="magnify" size={21} color={THEME.skyHeader} />
                <TextInput
                  testID="home-search-input"
                  value={homeSearchQuery}
                  onChangeText={setHomeSearchQuery}
                  placeholder="Search products..."
                  placeholderTextColor="#64748B"
                  autoFocus={homeSearchFocusInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  style={s.homeSearchInput}
                  onSubmitEditing={handleHomeSearchSubmit}
                />
                {homeSearchQuery.length > 0 && (
                  <Pressable
                    testID="home-search-clear"
                    onPress={() => setHomeSearchQuery("")}
                    hitSlop={8}
                    style={s.homeSearchClear}
                  >
                    <MaterialCommunityIcons name="close-circle" size={19} color="#64748B" />
                  </Pressable>
                )}
                <Pressable
                  testID="home-search-mic"
                  accessibilityRole="button"
                  accessibilityLabel={voiceListening ? "Stop voice search" : "Start voice search"}
                  onPress={handleHomeOverlayVoicePress}
                  hitSlop={8}
                  style={s.homeSearchMic}
                >
                  <MaterialCommunityIcons
                    name={voiceListening ? "microphone" : "microphone-outline"}
                    size={19}
                    color={voiceListening ? THEME.orange : THEME.skyHeader}
                  />
                </Pressable>
              </View>
              <Pressable
                testID="home-search-back"
                accessibilityRole="button"
                accessibilityLabel="Back to home"
                onPress={closeHomeSearch}
                hitSlop={8}
                style={s.homeSearchClose}
              >
                <MaterialCommunityIcons name="arrow-left" size={23} color={THEME.black} />
              </Pressable>
            </View>

            <View style={s.homeSearchSummaryRow}>
              <Text style={s.homeSearchSummary}>
                {homeSearchQuery.trim()
                  ? homeSearchResults.length + " products found"
                  : homeSearchProducts.length + " products available"}
              </Text>
            </View>

            {homeSearchLoading ? (
              <View style={s.homeSearchState}>
                <ActivityIndicator size="large" color={THEME.orange} />
                <Text style={s.homeSearchStateText}>Loading products...</Text>
              </View>
            ) : homeSearchError ? (
              <View style={s.homeSearchState}>
                <Text style={s.homeSearchStateText}>{homeSearchError}</Text>
                <Pressable onPress={retryHomeSearch} style={s.homeSearchRetry}>
                  <Text style={s.homeSearchRetryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                testID="home-search-product-list"
                style={s.homeSearchResultsScroll}
                contentContainerStyle={s.homeSearchResultsGrid}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {homeSearchQuery.trim().length === 0 && recentSearches.length > 0 && (
                  <View style={s.homeSearchRecentSection} testID="home-search-recent-history">
                    <View style={s.homeSearchRecentHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MaterialCommunityIcons name="history" size={17} color={THEME.skyHeader} />
                        <Text style={s.homeSearchRecentTitle}>Recent searches</Text>
                      </View>
                      <Text style={s.homeSearchRecentCount}>{recentSearches.length}/5</Text>
                    </View>
                    <View style={s.homeSearchRecentChips}>
                      {recentSearches.map((item) => (
                        <View key={item} style={s.homeSearchRecentChip}>
                          <Pressable
                            onPress={() => setHomeSearchQuery(item)}
                            hitSlop={6}
                            style={s.homeSearchRecentChipMain}
                          >
                            <MaterialCommunityIcons name="history" size={14} color={THEME.skyHeader} />
                            <Text style={s.homeSearchRecentChipText} numberOfLines={1}>{item}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void deleteHomeRecentSearch(item)}
                            hitSlop={6}
                            style={s.homeSearchRecentChipDelete}
                          >
                            <MaterialCommunityIcons name="close" size={13} color="#64748B" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {homeSearchRows.length > 0 ? (
                  homeSearchRows.map((row, rowIndex) => (
                    <View key={"home-search-row-" + rowIndex} style={s.homeSearchProductRow}>
                      {row.map((item: any) => (
                        <View key={String(item.id)} style={s.homeSearchProductCell}>
                          <ProductCard p={item} compact />
                        </View>
                      ))}
                      {row.length === 1 && <View style={s.homeSearchProductCell} pointerEvents="none" />}
                    </View>
                  ))
                ) : (
                  <View style={s.homeSearchState}>
                    <MaterialCommunityIcons name="magnify-close" size={42} color={THEME.white} />
                    <Text style={s.homeSearchStateText}>
                      {homeSearchQuery.trim()
                        ? "No matching products found. Try another product name."
                        : homeSearchProducts.length === 0
                          ? "No products are currently available."
                          : "No products match this search."}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

function BannerDot({ active }: { active: boolean }) {
  const progress = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0.35, { duration: 320 });
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scaleX: progress.value }],
  }));

  return <Animated.View style={[s.bannerDot, animatedStyle]} />;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={s.sectionIndicator} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  serviceCardSmall: { width: width > 768 ? 240 : Math.max(150, (width - (SPACING.lg * 2) - 10) / 2), height: 150, backgroundColor: THEME.white, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: THEME.borderSoft },
  serviceImgSmall: { width: "100%", height: 105 },
  servicePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  serviceNameSmall: { fontWeight: "800", color: THEME.black, fontSize: 12 },
  serviceVendorSmall: { fontSize: 10, color: THEME.blackMuted, fontWeight: "600", marginTop: 3 },
  locationGate: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 40, backgroundColor: THEME.whiteBg },
  locationGateCard: { width: "100%", maxWidth: 460, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: THEME.borderSoft },
  locationGateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1E8", marginBottom: 14 },
  locationGateTitle: { fontSize: 22, fontWeight: "900", color: THEME.black, textAlign: "center" },
  locationGateText: { marginTop: 8, color: THEME.blackMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  locationGateButton: { marginTop: 20, width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: THEME.orange, paddingVertical: 14, borderRadius: 14 },
  locationGateButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  locationGateError: { marginTop: 10, color: "#B91C1C", fontSize: 11, lineHeight: 16, textAlign: "center" },
  locationGatePrivacy: { marginTop: 12, color: THEME.blackMuted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  root: { flex: 1, backgroundColor: THEME.whiteBg },
  /* Realistic 3D-style sky layers stay behind the existing header/search only */
  heroHeaderShell: { position: "relative", width: "100%", overflow: "visible" },
  nightSky: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, overflow: "hidden", zIndex: 0, pointerEvents: "none" },
  nightGradientLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  nightGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  festivalDecor: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, overflow: "hidden" },
  festivalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  festivalHorizonGlow: { position: "absolute", left: "17%", right: "17%", top: 84, height: 58, borderRadius: 70, backgroundColor: "rgba(251,146,60,0.17)", shadowColor: "#FB923C", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.42, shadowRadius: 24, elevation: 3 },
  festivalStarLayer: { position: "absolute", left: 0, right: 0, top: 0, height: 92 },
  festivalStar: { position: "absolute", borderRadius: 2, backgroundColor: "#FFF8E8", shadowColor: "#FFF8E8", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 2 },
  festivalLightString: { position: "absolute", left: "6%", right: "6%", top: 57, height: 24, zIndex: 8 },
  festivalLightWire: { position: "absolute", left: 0, right: 0, top: 5, height: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,211,128,0.76)", borderBottomLeftRadius: 90, borderBottomRightRadius: 90 },
  festivalBulb: { position: "absolute", width: 5, height: 5, borderRadius: 3, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.72)", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 7, elevation: 5 },
  festivalLantern: { position: "absolute", width: 28, height: 44, alignItems: "center", zIndex: 10 },
  festivalLanternGlow: { position: "absolute", top: 7, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,181,64,0.18)", shadowColor: "#FBBF24", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 12, elevation: 5 },
  festivalLanternString: { position: "absolute", top: -7, width: 1, height: 8, backgroundColor: "#FDE68A" },
  festivalLanternCap: { width: 15, height: 3, borderRadius: 2, backgroundColor: "#FDE68A" },
  festivalLanternBody: { width: 18, height: 27, borderRadius: 5, borderWidth: 1, borderColor: "#FFF1C1", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  festivalLanternRib: { position: "absolute", left: 3, right: 3, top: 1, bottom: 1, borderLeftWidth: 0.8, borderRightWidth: 0.8, borderColor: "rgba(255,244,201,0.65)" },
  festivalLanternFlame: { width: 4, height: 8, borderRadius: 4, backgroundColor: "#FFF9D5", shadowColor: "#FFF2A6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 5, elevation: 4 },
  festivalLanternBase: { width: 8, height: 2, borderRadius: 2, backgroundColor: "#FDE68A" },
  festivalFirework: { position: "absolute", width: 38, height: 38, zIndex: 9 },
  festivalFireworkRay: { position: "absolute", left: 18, top: 12, width: 2, height: 14, borderRadius: 2, backgroundColor: "#FFE6A3", shadowColor: "#FDBA74", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5, elevation: 3 },
  festivalFireworkSpark: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: "#FFF6D6", shadowColor: "#FDE68A", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3 },
  festivalFireworkSparkWarm: { backgroundColor: "#FB923C", shadowColor: "#FB923C" },
  festivalFireworkCore: { position: "absolute", left: 16, top: 16, width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFFFFF", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 5, elevation: 4 },
  festivalSugarcaneCluster: { position: "absolute", width: 46, height: 90, zIndex: 14, overflow: "visible" },
  festivalSugarcaneStalk: { position: "absolute", bottom: 0, width: 6, borderRadius: 4, backgroundColor: "#397C3A", borderWidth: 1, borderColor: "#A7CF72", shadowColor: "#A3D66B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.42, shadowRadius: 3, elevation: 2 },
  festivalSugarcaneNode: { position: "absolute", left: -0.5, right: -0.5, height: 1.5, backgroundColor: "rgba(231,245,174,0.92)", borderRadius: 2 },
  festivalSugarcaneLeaf: { position: "absolute", width: 29, height: 6, borderRadius: 10, backgroundColor: "#397A35", borderWidth: 0.6, borderColor: "#9FC66D" },
  festivalChhathSoop: { position: "absolute", left: "43%", bottom: 14, width: 64, height: 40, zIndex: 16, alignItems: "center" },
  festivalSoopBody: { position: "absolute", bottom: 0, width: 58, height: 23, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, borderWidth: 1.2, borderTopWidth: 0, borderColor: "#E7B875", backgroundColor: "rgba(157,99,45,0.94)", overflow: "hidden" },
  festivalSoopRim: { position: "absolute", top: 13, width: 64, height: 8, borderRadius: 8, borderWidth: 1.2, borderColor: "#F3D29A", backgroundColor: "#C88B4B" },
  festivalSoopWeave: { position: "absolute", top: 3, bottom: 2, width: 1.3, backgroundColor: "rgba(255,220,158,0.62)" },
  festivalPaanLeaf: { position: "absolute", width: 19, height: 27, borderTopLeftRadius: 19, borderTopRightRadius: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 19, backgroundColor: "#238443", borderWidth: 0.8, borderColor: "#9ED27C", zIndex: 3 },
  festivalPaanVein: { position: "absolute", left: 8, top: 3, bottom: 3, width: 1, backgroundColor: "rgba(204,245,166,0.92)", borderRadius: 1 },
  festivalSoopFruitOrange: { position: "absolute", top: 7, left: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#FDE68A", zIndex: 2 },
  festivalSoopFruitBanana: { position: "absolute", top: 5, left: 39, width: 15, height: 6, borderRadius: 8, backgroundColor: "#FDE68A", borderBottomWidth: 1.5, borderBottomColor: "#D69A35", transform: [{ rotate: "-22deg" }], zIndex: 2 },
  festivalSoopCoconut: { position: "absolute", top: 3, left: 25, width: 9, height: 9, borderRadius: 5, backgroundColor: "#8B5A35", borderWidth: 1, borderColor: "#D6A16A", zIndex: 2 },
  festivalGhatStepOne: { position: "absolute", right: "5%", bottom: 9, width: 72, height: 5, borderRadius: 2, backgroundColor: "rgba(151,91,50,0.9)", borderTopWidth: 1, borderTopColor: "rgba(255,218,157,0.86)", zIndex: 11 },
  festivalGhatStepTwo: { position: "absolute", right: "8%", bottom: 14, width: 58, height: 5, borderRadius: 2, backgroundColor: "rgba(175,112,62,0.88)", borderTopWidth: 1, borderTopColor: "rgba(255,221,163,0.84)", zIndex: 11 },
  festivalGhatStepThree: { position: "absolute", right: "11%", bottom: 19, width: 44, height: 5, borderRadius: 2, backgroundColor: "rgba(194,135,78,0.9)", borderTopWidth: 1, borderTopColor: "rgba(255,227,177,0.82)", zIndex: 11 },
  festivalWater: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, zIndex: 13, overflow: "hidden", borderTopWidth: 1, borderTopColor: "rgba(253,205,124,0.22)" },
  festivalWaterShimmer: { position: "absolute", left: "22%", top: 5, width: "35%", height: 1.5, borderRadius: 2, backgroundColor: "rgba(255,217,144,0.82)" },
  festivalDiya: { position: "absolute", bottom: 3, width: 12, height: 12, alignItems: "center", justifyContent: "flex-end" },
  festivalDiyaFlame: { position: "absolute", top: 0, width: 4, height: 7, borderRadius: 4, backgroundColor: "#FDBA74", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5, elevation: 4 },
  festivalDiyaFlameBright: { backgroundColor: "#FFF4C2", shadowColor: "#FFF4C2" },
  festivalDiyaBowl: { width: 11, height: 4, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: "#D97706", borderTopWidth: 1, borderTopColor: "#FDE68A" },
  horizonGlow: { position: "absolute", left: "12%", right: "12%", bottom: 4, height: 68, borderTopLeftRadius: 170, borderTopRightRadius: 170, backgroundColor: "rgba(255,190,130,0.10)" },
  horizonSilhouette: { position: "absolute", left: 0, right: 0, bottom: 0, height: 18, backgroundColor: "rgba(13,28,38,0.58)" },
  house: { position: "absolute", bottom: 1, height: 22, zIndex: 3 },
  houseLeft: { left: "8%", width: 34, height: 20 },
  houseCenter: { left: "25%", width: 66, height: 34 },
  houseMainRoof: { left: 1, bottom: 13, borderLeftWidth: 32, borderRightWidth: 32, borderBottomWidth: 18 },
  houseMainBody: { left: 5, right: 5, bottom: 0, height: 18 },
  houseMainWindow: { bottom: 5, width: 6, height: 7 },
  houseRight: { right: "28%", width: 40, height: 19 },
  houseFarRight: { right: "5%", width: 30, height: 17 },
  houseRoof: { position: "absolute", left: 0, bottom: 10, width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 17, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent" },
  houseBody: { position: "absolute", left: 4, right: 4, bottom: 0, height: 12, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  houseWindow: { position: "absolute", bottom: 3, width: 4, height: 5, borderRadius: 1 },
  smokeColumn: { position: "absolute", left: "20%", bottom: 20, width: 94, height: 118 },
  smokePuff: { position: "absolute", borderRadius: 50, backgroundColor: "rgba(206,218,226,0.50)", shadowColor: "#CBD5E1", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.34, shadowRadius: 14, elevation: 1 },
  smokeStack: { position: "absolute", bottom: 20, left: "32.5%", width: 8, height: 14, backgroundColor: "#263442", borderTopWidth: 2, borderTopColor: "#526170" },
  heroTree: { position: "absolute", bottom: 0, width: 62, height: 82, zIndex: 2, transformOrigin: "bottom" } as any,
  heroTreeLeft: { left: "1%" },
  heroTreeRight: { right: "2%", width: 58, height: 72 },
  heroTreeTrunk: { position: "absolute", bottom: 0, left: "44%", width: 8, height: 34, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  heroTreeCanopy: { position: "absolute", borderRadius: 50 },
  heroTreeCanopyLeft: { left: 2, top: 25, width: 39, height: 36 },
  heroTreeCanopyTop: { left: 16, top: 2, width: 37, height: 39 },
  heroTreeCanopyRight: { right: 0, top: 25, width: 36, height: 33 },
  heroTreeCanopyLower: { left: 9, top: 39, width: 45, height: 31 },
  starLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 92 },
  star: { position: "absolute", backgroundColor: "#FFFFFF", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 5, elevation: 3 },
  sunGlow: { position: "absolute", top: 10, right: "12%", width: 90, height: 90, alignItems: "center", justifyContent: "center" },
  sunHaloOuter: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.14)" },
  sunHalo: { position: "absolute", width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,248,220,0.25)" },
  sunCore: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFF7CC", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 6 },
  sunsetGlow: { position: "absolute", left: "28%", right: "28%", bottom: 0, height: 78, alignItems: "center", justifyContent: "flex-end" },
  sunsetHalo: { width: "100%", height: 78, borderTopLeftRadius: 140, borderTopRightRadius: 140, backgroundColor: "rgba(255,190,120,0.16)" },
  moon: { position: "absolute", top: 12, right: "15%", width: 78, height: 78, alignItems: "center", justifyContent: "center" },
  moonHalo: { position: "absolute", width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(226,232,240,0.10)" },
  moonBody: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#F8FAFC", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 18, elevation: 5, overflow: "hidden" },
  moonCut: { position: "absolute", top: -3, left: 13, width: 40, height: 40, borderRadius: 20, backgroundColor: "#0B1120" },
  airplane: { position: "absolute", top: 0, left: -20, width: 46, height: 24, alignItems: "center", justifyContent: "center" },
  airplaneTrail: { position: "absolute", width: 26, height: 2, left: -23, top: 13, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  cloud: { position: "absolute", width: 164, height: 70, opacity: 0.58 },
  cloudOne: { top: 60, left: -42 },
  cloudTwo: { top: 92, right: -62 },
  cloudPuff: { position: "absolute", borderRadius: 40, shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  cloudShade: { position: "absolute", left: 4, right: 4, bottom: 2, height: 28, borderRadius: 20, opacity: 0.34 },
  cloudHighlightOne: { position: "absolute", left: 42, top: 8, width: 38, height: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.22)" },
  cloudHighlightTwo: { position: "absolute", left: 38, top: 7, width: 32, height: 9, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" },
  cloudBase: { position: "absolute", left: 2, right: 2, bottom: 4, height: 24, borderRadius: 18, backgroundColor: "rgba(100,116,139,0.12)" },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "transparent", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 7 },
  skyClearSpace: { height: Platform.OS === "web" ? 90 : 56 },
  skyClearSpaceCollapsed: { height: 0 },
  searchBarSafeArea: { backgroundColor: "transparent", zIndex: 20, elevation: 0 },
  searchBarSafeAreaCollapsed: { borderBottomWidth: 1, borderBottomColor: "rgba(226,232,240,0.9)" },
  searchBarOuter: { paddingHorizontal: SPACING.lg, marginTop: 0 },
  searchBarOuterCollapsed: { marginTop: 0, paddingBottom: 8 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  locationErrorText: { color: "#FEF3C7", fontSize: 9, fontWeight: "700", marginTop: 2, maxWidth: 260 },
  headerNeonGlow: { width: 25, height: 4, marginRight: 10, borderRadius: 99, backgroundColor: "#FFF2A6", shadowColor: "#FFC928", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 11, elevation: 7, alignItems: "center", justifyContent: "center" },
  headerNeonCore: { width: 9, height: 2, borderRadius: 99, backgroundColor: "#FFFFFF", shadowColor: "#FFF7C2", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 4 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(22,163,74,0.22)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14, height: 44, borderWidth: 1, borderColor: "rgba(134,239,172,0.72)", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  searchPlaceholderText: { fontSize: 14, color: "#FFD54A", fontWeight: "700", textShadowColor: "rgba(0,0,0,0.38)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  searchMicBg: { width: 32, height: 32, backgroundColor: THEME.orange, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchMicListening: { transform: [{ scale: 1.08 }], backgroundColor: THEME.orangeBright },

  /* Clean Banner Styling */
  banner: { width: BANNER_W, height: 145, borderRadius: 20, overflow: "hidden", backgroundColor: THEME.white, position: "relative", borderWidth: 1, borderColor: "rgba(255,107,0,0.22)", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6 },
  bannerImg: { width: "100%", height: "100%" },
  bannerFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg, borderWidth: 2.5, borderColor: THEME.orangeBright, pointerEvents: "none" },
  bannerCarouselShell: { position: "relative" },
  bannerItemWrap: { width: BANNER_W, position: "relative" },
  bannerRopeConnector: { position: "absolute", right: -1, top: "50%", width: 10, height: 52, transform: [{ translateY: -26 }], alignItems: "center", justifyContent: "center", zIndex: 5 },
  bannerRopeLine: { width: 3, height: 44, borderRadius: 3, backgroundColor: "#8B6B45", opacity: 0.95 },
  bannerRopeKnot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#6B4F32", top: 2 },

  bannerDotsOverlay: { position: "absolute", left: 0, right: 0, bottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  bannerDot: { width: 18, height: 5, borderRadius: 3, backgroundColor: THEME.orange },
  bannerText: { position: "absolute", left: 14, bottom: 12, right: 16, alignItems: "flex-start" },
  bannerSubtitle: { color: THEME.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bannerTitle: { color: THEME.white, fontSize: 18, fontWeight: "900", marginTop: 4, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 },
  bannerCta: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, alignSelf: "flex-start", backgroundColor: THEME.orange },
  bannerCtaText: { color: THEME.white, fontWeight: "800", fontSize: 12 },
  
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm },
  sectionIndicator: { width: 4, height: 16, backgroundColor: THEME.orange, borderRadius: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: THEME.black },
  sectionSub: { fontSize: 12, color: THEME.blackMuted, marginTop: 2, marginLeft: 12 },
  nearbySectionLift: { marginTop: -8 },
  
  catsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.sm },
  catItemWrap: { width: "20%", alignItems: "center", marginBottom: SPACING.md },
  catItem: { alignItems: "center" },
  catCircleWrap: { position: "relative", width: 60, height: 60 },
  catFlashBorder: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 32, borderWidth: 2, borderColor: THEME.orange, zIndex: 1, pointerEvents: "none" },
  catCircle: { width: 60, height: 60, borderRadius: 30, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: THEME.white, ...shadow.soft, borderWidth: 1, borderColor: THEME.borderSoft },
  catImg: { width: "100%", height: "100%" },
  catName: { fontSize: 11, fontWeight: "700", color: THEME.black, marginTop: 6, textAlign: "center" },
  
  /* Compact Store Tile Styling */
  storeCardSmall: { width: Math.min((width - SPACING.lg * 2 - 10) / 2, 190), height: 112, backgroundColor: "rgba(255,255,255,0.98)", borderRadius: 16, overflow: "hidden", position: "relative", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 5, borderWidth: 1, borderColor: "rgba(255,107,0,0.15)" },
  storeFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.orangeGlow, pointerEvents: "none", zIndex: 2 },
  storeImgSmall: { width: "100%", height: 64 },
  storeNameSmall: { fontWeight: "800", color: THEME.black, fontSize: 12 },
  ratePillSmall: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.orange, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, gap: 2 },
  rateTextSmall: { color: THEME.white, fontSize: 10, fontWeight: "800" },
  storeMinSmall: { fontSize: 10, color: THEME.blackMuted, fontWeight: "700" },

  offlineOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", justifyContent: "center", alignItems: "center" },
  offlineText: { color: THEME.white, backgroundColor: "#E11D48", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 9, fontWeight: "900" },

  trendingGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, justifyContent: "space-between" },
  productTileCard: { width: width > 768 ? "23%" : "48%", marginBottom: 12, position: "relative" },
  productFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.orange, pointerEvents: "none", zIndex: 2 },

  brandStrip: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: "hidden", ...shadow.card },
  brandStripGradient: { flexDirection: "row", gap: SPACING.md, alignItems: "center", padding: SPACING.md },
  brandIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center" },
  brandStripTitle: { color: THEME.white, fontWeight: "900", fontSize: 14 },
  brandStripSub: { color: "#E0F2FE", marginTop: 2, fontSize: 12, fontWeight: "600" },

  homeSearchOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 100, backgroundColor: "rgba(2,6,23,0.16)" },
  homeSearchScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.16)" },
  homeSearchOverlayContent: { flex: 1, paddingHorizontal: SPACING.lg },
  homeSearchHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: 10 },
  homeSearchInputWrap: { flex: 1, minWidth: 0, height: 50, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.97)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  homeSearchInput: { flex: 1, minWidth: 0, height: 46, padding: 0, fontSize: 15, color: THEME.black, backgroundColor: "transparent", ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  homeSearchClear: { width: 28, height: 34, alignItems: "center", justifyContent: "center" },
  homeSearchMic: { width: 30, height: 34, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: "#E2E8F0" },
  homeSearchClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.97)" },
  homeSearchSummaryRow: { paddingBottom: 9 },
  homeSearchSummary: { color: THEME.white, fontSize: 13, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  homeSearchResultsScroll: { flex: 1, minHeight: 0, width: "100%" },
  homeSearchResultsGrid: { flexGrow: 1, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 120 },
  homeSearchProductRow: { width: "100%", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  homeSearchProductCell: { width: "48.5%", minWidth: 0, flexGrow: 0, flexShrink: 0 },
  homeSearchRecentSection: { marginHorizontal: 4, marginBottom: 12, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  homeSearchRecentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  homeSearchRecentTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  homeSearchRecentCount: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  homeSearchRecentChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  homeSearchRecentChip: { maxWidth: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 99, borderWidth: 1, borderColor: "#E2E8F0", paddingLeft: 10, minHeight: 34 },
  homeSearchRecentChipMain: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingRight: 7, maxWidth: 190 },
  homeSearchRecentChipText: { flexShrink: 1, color: "#334155", fontSize: 12, fontWeight: "700" },
  homeSearchRecentChipDelete: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 3, backgroundColor: "#FFFFFF" },
  homeSearchState: { flex: 1, minHeight: 180, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 10 },
  homeSearchStateText: { color: THEME.white, fontSize: 14, fontWeight: "700", lineHeight: 20, textAlign: "center", textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  homeSearchRetry: { marginTop: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: THEME.orange },
  homeSearchRetryText: { color: THEME.white, fontSize: 12, fontWeight: "900" },
});