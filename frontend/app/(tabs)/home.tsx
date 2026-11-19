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
const BANNER_W = Math.max(0, width - 24);
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
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

const RECENT_SEARCHES_KEY = "kmt_recent_searches";
const MAX_RECENT_SEARCHES = 5;

// Premium village hero: a slow day-to-night sky cycle with a lived-in rural hamlet.
const VILLAGE_STARS = Array.from({ length: 22 }, (_, index) => {
  const point = Math.floor(index / 2);
  const isLeftSide = index % 2 === 0;
  return {
    left: `${isLeftSide ? 4 + ((point * 8) % 21) : 76 + ((point * 9) % 19)}%`,
    top: 8 + ((index * 17 + 11) % 58),
    size: index % 6 === 0 ? 2.5 : 1.6,
  };
});

function VillageSmokePuff({ delay, size }: { delay: number; size: number }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 3600 }),
          withTiming(0, { duration: 20 })
        )
      ),
      -1,
      false
    );
  }, [delay]);

  const smokeStyle = useAnimatedStyle(() => ({
    opacity: 0.34 * (1 - drift.value),
    transform: [
      { translateY: -drift.value * 40 },
      { translateX: drift.value * 12 },
      { scale: size * (0.72 + drift.value * 0.8) },
    ],
  }));

  return <Animated.View style={[s.villageSmokePuff, smokeStyle]} />;
}

function VillageSmoke() {
  return (
    <View pointerEvents="none" style={s.villageSmokeTrail} testID="home-village-chimney-smoke">
      <VillageSmokePuff delay={0} size={0.85} />
      <VillageSmokePuff delay={1050} size={1.05} />
      <VillageSmokePuff delay={2100} size={0.92} />
    </View>
  );
}

function VillageCloud({ left, top, scale = 1 }: { left: string; top: number; scale?: number }) {
  return (
    <View pointerEvents="none" style={[s.villageCloud, { left, top, transform: [{ scale }] }]}>
      <View style={[s.villageCloudPuff, { left: 13, top: 17, width: 38, height: 18 }]} />
      <View style={[s.villageCloudPuff, { left: 29, top: 8, width: 34, height: 25 }]} />
      <View style={[s.villageCloudPuff, { left: 49, top: 16, width: 35, height: 17 }]} />
      <View style={[s.villageCloudBase, { left: 22, top: 23, width: 54, height: 12 }]} />
    </View>
  );
}

function VillageTree({ left, scale = 1 }: { left: string; scale?: number }) {
  return (
    <View pointerEvents="none" style={[s.villageTree, { left, transform: [{ scale }] }]}>
      <View style={s.villageTreeTrunk} />
      <View style={[s.villageTreeCrown, s.villageTreeCrownLeft]} />
      <View style={[s.villageTreeCrown, s.villageTreeCrownTop]} />
      <View style={[s.villageTreeCrown, s.villageTreeCrownRight]} />
      <View style={[s.villageTreeCrown, s.villageTreeCrownLower]} />
    </View>
  );
}

function VillageSmallHouse({ left, bottom, scale = 1 }: { left: string; bottom: number; scale?: number }) {
  return (
    <View pointerEvents="none" style={[s.villageSmallHouse, { left, bottom, transform: [{ scale }] }]}>
      <View style={s.villageSmallHouseRoof} />
      <View style={s.villageSmallHouseBody} />
      <View style={s.villageSmallHouseDoor} />
      <View style={s.villageSmallHouseWindow} />
    </View>
  );
}

function VillageDayNight() {
  const cycleProgress = useSharedValue(0);
  const cloudDrift = useSharedValue(0);
  const windowPulse = useSharedValue(0);

  useEffect(() => {
    cycleProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 28000 }),
        withTiming(0, { duration: 28000 })
      ),
      -1,
      false
    );
    cloudDrift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 22000 }),
        withTiming(0, { duration: 22000 })
      ),
      -1,
      false
    );
    windowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.55, { duration: 1700 })
      ),
      -1,
      false
    );
  }, []);

  const dayStyle = useAnimatedStyle(() => ({ opacity: 1 - cycleProgress.value }));
  const nightStyle = useAnimatedStyle(() => ({ opacity: cycleProgress.value }));
  const sunStyle = useAnimatedStyle(() => ({ opacity: 1 - cycleProgress.value }));
  const moonStyle = useAnimatedStyle(() => ({ opacity: cycleProgress.value }));
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -12 + cloudDrift.value * 24 }],
  }));
  const windowStyle = useAnimatedStyle(() => ({
    opacity: 0.34 + windowPulse.value * 0.48,
  }));

  return (
    <View pointerEvents="none" style={s.nightSky} testID="home-village-day-night-hero">
      <Animated.View style={[s.villageDayLayer, dayStyle]}>
        <LinearGradient
          colors={["#63BCEB", "#A8DCEF", "#F4CFA3", "#D79B68"]}
          locations={[0, 0.42, 0.78, 1]}
          style={s.villageSkyFill}
        />
        <View style={s.villageDayHaze} />
        <Animated.View style={[s.villageSun, sunStyle]}>
          <View style={s.villageSunHalo} />
          <View style={s.villageSunCore} />
        </Animated.View>
        <Animated.View style={[s.villageCloudGroup, cloudStyle]}>
          <VillageCloud left="5%" top={43} scale={0.78} />
          <VillageCloud left="57%" top={24} scale={0.62} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[s.villageNightLayer, nightStyle]}>
        <LinearGradient
          colors={["#07162C", "#142D49", "#33475B", "#765C52"]}
          locations={[0, 0.48, 0.8, 1]}
          style={s.villageSkyFill}
        />
        <View style={s.villageNightHaze} />
        <View style={s.villageStarLayer}>
          {VILLAGE_STARS.map((star, index) => (
            <View
              key={index}
              style={[
                s.villageStar,
                {
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  opacity: index % 4 === 0 ? 0.95 : 0.62,
                },
              ]}
            />
          ))}
        </View>
        <Animated.View style={[s.villageMoon, moonStyle]}>
          <View style={s.villageMoonHalo} />
          <View style={s.villageMoonBody} />
          <View style={s.villageMoonCut} />
        </Animated.View>
      </Animated.View>

      <View style={s.villageFarHorizon} />
      <View style={s.villageHillBack} />
      <View style={s.villageHillFront} />
      <View style={s.villageGround} />
      <View style={s.villageFieldLineOne} />
      <View style={s.villageFieldLineTwo} />

      <VillageSmallHouse left="7%" bottom={15} scale={0.68} />
      <VillageSmallHouse left="78%" bottom={14} scale={0.72} />
      <VillageSmallHouse left="90%" bottom={12} scale={0.48} />
      <VillageTree left="-2%" scale={0.75} />
      <VillageTree left="82%" scale={0.68} />

      <View style={s.villageMainHut} testID="home-village-hut">
        <View style={s.villageHutShadow} />
        <View style={s.villageHutBody}>
          <View style={s.villageHutWallTextureOne} />
          <View style={s.villageHutWallTextureTwo} />
          <View style={s.villageHutDoor} />
          <Animated.View style={[s.villageHutWindowGlow, windowStyle]}>
            <View style={s.villageHutWindowCross} />
          </Animated.View>
        </View>
        <View style={s.villageHutRoof} />
        <View style={s.villageHutRoofRidge} />
        <View style={s.villageHutRoofStrawOne} />
        <View style={s.villageHutRoofStrawTwo} />
        <View style={s.villageHutChimney} />
        <VillageSmoke />
      </View>

      <View style={s.villageFence}>
        {[0, 18, 36, 54, 72].map((left) => (
          <View key={left} style={[s.villageFencePost, { left }]} />
        ))}
        <View style={s.villageFenceRail} />
      </View>
      <View style={s.villageForegroundGrass}>
        {[4, 12, 20, 32, 44, 58, 71, 86, 96].map((left, index) => (
          <View
            key={left}
            style={[
              s.villageGrassBlade,
              { left: `${left}%`, height: 5 + (index % 3) * 3, transform: [{ rotate: index % 2 ? "-18deg" : "18deg" }] },
            ]}
          />
        ))}
      </View>
      <View style={s.villageAtmosphereShade} />
    </View>
  );
}

function NightSky() {
  return (
    <View pointerEvents="none" style={s.nightSky}>
      <VillageDayNight />
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
  const [trending, setTrending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const bannerListRef = useRef<FlatList<any>>(null);
  const bannerScrollOffsetRef = useRef(0);
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
                height: 82,
                paddingTop: 1,
                paddingBottom: 8,
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
            height: 82,
            paddingTop: 1,
            paddingBottom: 8,
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
          height: 82,
          paddingTop: 1,
          paddingBottom: 8,
        },
      });

      return () => {
        homeTabHidden.current = false;
        setHeroCollapsed(false);
        heroCollapseProgress.setValue(0);
        tabBarTranslateY.setValue(0);
        navigation.setOptions({
          tabBarStyle: {
            position: "absolute",
            borderTopColor: THEME.borderSoft,
            backgroundColor: "#FFFFFF",
            height: 82,
            paddingTop: 1,
            paddingBottom: 8,
          },
        });
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

  // Load home sections independently so one slow endpoint cannot hold back the first visible content.
  const load = useCallback(async () => {
    await Promise.all([
      api.banners().then((data) => setBanners(data || [])).catch((error) => {
        console.warn("Home banners unavailable:", error);
        setBanners([]);
      }),
      api.categories().then((data) => setCats(data || [])).catch((error) => {
        console.warn("Shop by Category unavailable:", error);
        setCats([]);
      }),
      api.stores().then((data) => setStores(data || [])).catch((error) => {
        console.warn("Nearby Stores unavailable:", error);
        setStores([]);
      }),
      // Keep the first home paint lightweight; dedicated product pages still use their normal limits.
      api.products({ trending: true, limit: 12 }).then((data) => setTrending(data || [])).catch((error) => {
        console.warn("Trending products unavailable:", error);
        setTrending([]);
      }),
      api.unreadCount().then((data) => setUnread(data?.count || 0)).catch((error) => {
        console.warn("Unread count unavailable:", error);
        setUnread(0);
      }),
    ]);
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
      const targetOffset = bannerIndex * (BANNER_W + 12);
      if (Math.abs(bannerScrollOffsetRef.current - targetOffset) > 2) {
        try {
          bannerListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
        } catch {}
      }
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
      {/* Animated Chhath–Diwali hero: ghat, diyas, fireworks, lanterns and offerings */}
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
      <View style={s.skyClearSpace} pointerEvents="none" testID="home-hero-brand-space">
        <Animated.Text testID="home-hero-brand-neon" style={[s.heroBrandNeon, animatedFlashStyle]}>
          KMT BAZAAR
        </Animated.Text>
      </View>
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
            ref={bannerListRef}
            horizontal
            style={Platform.OS === "web"
              ? ({ width: "100%", flexGrow: 0, overflowX: "auto", overflowY: "hidden" } as any)
              : { width: "100%", flexGrow: 0 }}
            data={banners}
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.xs, gap: 12 }}
            keyExtractor={(it) => String(it.id)}
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
            onScroll={(event) => {
              bannerScrollOffsetRef.current = event.nativeEvent.contentOffset.x;
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              bannerScrollOffsetRef.current = offsetX;
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
  heroHeaderShell: { position: "relative", width: "100%", overflow: "visible" },
  nightSky: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, overflow: "hidden", zIndex: 0, pointerEvents: "none" },
  villageDayLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  villageNightLayer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  villageSkyFill: { ...StyleSheet.absoluteFillObject },
  villageDayHaze: { position: "absolute", left: "12%", right: "12%", bottom: 20, height: 60, borderTopLeftRadius: 140, borderTopRightRadius: 140, backgroundColor: "rgba(255,235,197,0.22)" },
  villageNightHaze: { position: "absolute", left: "18%", right: "18%", bottom: 19, height: 65, borderTopLeftRadius: 130, borderTopRightRadius: 130, backgroundColor: "rgba(255,174,119,0.12)" },
  villageSun: { position: "absolute", top: 24, right: "13%", width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  villageSunHalo: { position: "absolute", width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,247,211,0.22)" },
  villageSunCore: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#FFF3C3", shadowColor: "#FFF1B8", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.86, shadowRadius: 19, elevation: 6 },
  villageCloudGroup: { position: "absolute", top: 0, left: 0, right: 0, height: 105 },
  villageCloud: { position: "absolute", width: 88, height: 40, opacity: 0.74 },
  villageCloudPuff: { position: "absolute", borderRadius: 30, backgroundColor: "rgba(255,255,255,0.78)" },
  villageCloudBase: { position: "absolute", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.72)" },
  villageStarLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 93 },
  villageStar: { position: "absolute", borderRadius: 3, backgroundColor: "#F4F7FF", shadowColor: "#DCEBFF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5, elevation: 2 },
  villageMoon: { position: "absolute", top: 17, right: "14%", width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  villageMoonHalo: { position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(226,238,255,0.11)" },
  villageMoonBody: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#F5F3DE", shadowColor: "#E7F0FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.78, shadowRadius: 14, elevation: 5 },
  villageMoonCut: { position: "absolute", top: 7, left: 29, width: 33, height: 33, borderRadius: 17, backgroundColor: "#142D49" },
  villageFarHorizon: { position: "absolute", left: 0, right: 0, bottom: 27, height: 27, backgroundColor: "rgba(48,94,68,0.26)" },
  villageHillBack: { position: "absolute", left: "-10%", right: "36%", bottom: 17, height: 50, borderTopLeftRadius: 110, borderTopRightRadius: 100, backgroundColor: "rgba(73,119,79,0.52)" },
  villageHillFront: { position: "absolute", left: "44%", right: "-12%", bottom: 14, height: 40, borderTopLeftRadius: 100, borderTopRightRadius: 90, backgroundColor: "rgba(47,102,65,0.62)" },
  villageGround: { position: "absolute", left: 0, right: 0, bottom: 0, height: 30, backgroundColor: "#455C3C", borderTopWidth: 1, borderTopColor: "rgba(229,214,152,0.3)" },
  villageFieldLineOne: { position: "absolute", left: "42%", bottom: 19, width: "58%", height: 1, backgroundColor: "rgba(213,194,124,0.34)", transform: [{ rotate: "-4deg" }] },
  villageFieldLineTwo: { position: "absolute", left: "51%", bottom: 9, width: "48%", height: 1, backgroundColor: "rgba(213,194,124,0.26)", transform: [{ rotate: "4deg" }] },
  villageSmallHouse: { position: "absolute", width: 44, height: 36, zIndex: 4 },
  villageSmallHouseRoof: { position: "absolute", left: 0, bottom: 19, width: 0, height: 0, borderLeftWidth: 22, borderRightWidth: 22, borderBottomWidth: 20, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#795135" },
  villageSmallHouseBody: { position: "absolute", left: 5, right: 5, bottom: 0, height: 20, backgroundColor: "#A97852", borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  villageSmallHouseDoor: { position: "absolute", left: 18, bottom: 0, width: 8, height: 13, backgroundColor: "#493328", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  villageSmallHouseWindow: { position: "absolute", left: 8, bottom: 9, width: 5, height: 5, backgroundColor: "#F7C96F", shadowColor: "#FFE19B", shadowOpacity: 0.85, shadowRadius: 4 },
  villageTree: { position: "absolute", bottom: 10, width: 76, height: 88, zIndex: 5 },
  villageTreeTrunk: { position: "absolute", bottom: 0, left: "44%", width: 9, height: 40, borderRadius: 3, backgroundColor: "#523B2D" },
  villageTreeCrown: { position: "absolute", borderRadius: 50, backgroundColor: "#315B3A", borderWidth: 1, borderColor: "rgba(139,174,95,0.24)" },
  villageTreeCrownLeft: { left: 4, top: 26, width: 43, height: 40 },
  villageTreeCrownTop: { left: 24, top: 4, width: 42, height: 42 },
  villageTreeCrownRight: { right: 0, top: 28, width: 39, height: 38 },
  villageTreeCrownLower: { left: 17, top: 45, width: 48, height: 35 },
  villageMainHut: { position: "absolute", left: "29%", bottom: 5, width: 128, height: 103, zIndex: 9 },
  villageHutShadow: { position: "absolute", left: 4, right: 1, bottom: 0, height: 13, borderRadius: 50, backgroundColor: "rgba(22,32,25,0.32)" },
  villageHutBody: { position: "absolute", left: 10, right: 10, bottom: 6, height: 43, backgroundColor: "#B78356", borderTopWidth: 2, borderTopColor: "#D9AD7B", borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: "hidden" },
  villageHutWallTextureOne: { position: "absolute", left: 4, right: 4, top: 10, height: 1, backgroundColor: "rgba(102,64,41,0.22)" },
  villageHutWallTextureTwo: { position: "absolute", left: 6, right: 7, top: 27, height: 1, backgroundColor: "rgba(102,64,41,0.2)" },
  villageHutDoor: { position: "absolute", left: 47, bottom: 0, width: 22, height: 34, borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: "#503629", borderWidth: 1, borderColor: "#D0A06B" },
  villageHutWindowGlow: { position: "absolute", right: 13, bottom: 19, width: 17, height: 15, borderRadius: 2, backgroundColor: "#FFD16C", borderWidth: 2, borderColor: "#70452E", shadowColor: "#FFCB65", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 9, elevation: 5 },
  villageHutWindowCross: { position: "absolute", left: 6, top: 0, width: 2, height: 11, backgroundColor: "#76502F" },
  villageHutRoof: { position: "absolute", left: 0, bottom: 43, width: 0, height: 0, borderLeftWidth: 64, borderRightWidth: 64, borderBottomWidth: 48, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#75472B" },
  villageHutRoofRidge: { position: "absolute", left: 6, right: 6, bottom: 41, height: 6, borderRadius: 4, backgroundColor: "#9A6339" },
  villageHutRoofStrawOne: { position: "absolute", left: 16, bottom: 60, width: 93, height: 3, borderRadius: 3, backgroundColor: "#B27C42", transform: [{ rotate: "-19deg" }] },
  villageHutRoofStrawTwo: { position: "absolute", left: 17, bottom: 72, width: 92, height: 3, borderRadius: 3, backgroundColor: "#A96F39", transform: [{ rotate: "19deg" }] },
  villageHutChimney: { position: "absolute", left: 84, bottom: 78, width: 9, height: 17, borderTopWidth: 3, borderTopColor: "#AAB1AE", backgroundColor: "#665346", borderTopLeftRadius: 2, borderTopRightRadius: 2, zIndex: 11 },
  villageSmokeTrail: { position: "absolute", left: 83, bottom: 89, width: 42, height: 62, zIndex: 12 },
  villageSmokePuff: { position: "absolute", left: 5, bottom: 0, width: 19, height: 19, borderRadius: 12, backgroundColor: "rgba(232,239,239,0.8)", shadowColor: "#E8F0F2", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.32, shadowRadius: 8, elevation: 1 },
  villageFence: { position: "absolute", left: "15%", bottom: 8, width: 78, height: 17, zIndex: 8 },
  villageFencePost: { position: "absolute", bottom: 0, width: 3, height: 15, borderRadius: 1, backgroundColor: "#836243" },
  villageFenceRail: { position: "absolute", left: 0, right: 0, bottom: 8, height: 3, backgroundColor: "#A07A53", borderRadius: 2 },
  villageForegroundGrass: { position: "absolute", left: 0, right: 0, bottom: 0, height: 24, zIndex: 14 },
  villageGrassBlade: { position: "absolute", bottom: 0, width: 2, borderRadius: 2, backgroundColor: "#A4B76B" },
  villageAtmosphereShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,24,36,0.16)", zIndex: 15 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  locationErrorText: { color: "#FEF3C7", fontSize: 9, fontWeight: "700", marginTop: 2, maxWidth: 260 },
  heroBrandNeon: { color: "#FFFBEA", fontSize: 21, fontWeight: "900", letterSpacing: 3.2, textAlign: "center", includeFontPadding: false, zIndex: 30, elevation: 30, transform: [{ translateY: -26 }], textShadowColor: "#FFB928", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 11 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(22,163,74,0.22)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14, height: 44, borderWidth: 1, borderColor: "rgba(134,239,172,0.72)", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  searchPlaceholderText: { fontSize: 16, color: "#FFFFFF", fontWeight: "500", textShadowColor: "rgba(0,0,0,0.38)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  searchMicBg: { width: 32, height: 32, backgroundColor: THEME.orange, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchMicListening: { transform: [{ scale: 1.08 }], backgroundColor: THEME.orangeBright },

  /* Clean Banner Styling */
  banner: { width: BANNER_W, height: 145, borderRadius: 20, overflow: "hidden", backgroundColor: THEME.white, position: "relative", borderWidth: 1, borderColor: "rgba(255,107,0,0.22)", shadowColor: THEME.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6 },
  bannerImg: { width: "100%", height: "100%" },
  bannerFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg, borderWidth: 2.5, borderColor: THEME.orangeBright, pointerEvents: "none" },
  bannerCarouselShell: { position: "relative", width: "100%", alignSelf: "stretch", minWidth: 0, overflow: "hidden" },
  bannerItemWrap: { width: BANNER_W, flexShrink: 0, position: "relative" },
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