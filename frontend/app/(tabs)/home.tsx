import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform, ActivityIndicator, Animated as RNAnimated, TextInput, BackHandler, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useNavigation } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

// Lightweight Karmatar landmark day/night hero.
// Karmatar scene uses lightweight local vector-style layers.
// Day/night fade transitions run on Reanimated UI-thread values.
const KARMATAR_STARS=Array.from({length:14},(_,i)=>({left:(5+(i*19)%90)+"%",top:9+(i*13)%48}));
function KarmatarHeroScene(){
 const cycle=useSharedValue(0),drift=useSharedValue(0);
 useEffect(()=>{cycle.value=withRepeat(withSequence(withTiming(1,{duration:52000}),withTiming(0,{duration:52000})),-1,false);drift.value=withRepeat(withTiming(1,{duration:30000}),-1,true);},[]);
 const day=useAnimatedStyle(()=>({opacity:1-cycle.value})),night=useAnimatedStyle(()=>({opacity:cycle.value}));
 const sun=useAnimatedStyle(()=>({opacity:1-cycle.value,transform:[{translateX:cycle.value*46}]})),moon=useAnimatedStyle(()=>({opacity:cycle.value}));
 const brandGlow=useAnimatedStyle(()=>({opacity:.76+Math.sin(drift.value*Math.PI*2)*.24,transform:[{scale:1+Math.sin(drift.value*Math.PI*2)*.025}]}));
 const neon=useAnimatedStyle(()=>({opacity:.72+cycle.value*.28}));
 const gate=useAnimatedStyle(()=>({transform:[{rotate:(-7+drift.value*4)+"deg"}]})),signal=useAnimatedStyle(()=>({opacity:.35+Math.abs(Math.sin(drift.value*Math.PI*4))*.65}));
 const scooter=useAnimatedStyle(()=>({transform:[{translateX:-5+drift.value*28}]}));
 return <View pointerEvents="none" style={s.nightSky} testID="home-karmatar-hero">
 <Animated.View style={[s.karmatarDaySky,day]}><LinearGradient colors={["#54B5E2","#B4DCE7","#F0C49B"]} style={StyleSheet.absoluteFillObject}/><Animated.View style={[s.karmatarSun,sun]}/><View style={s.karmatarCloudTrack}><View style={[s.karmatarCloud,{left:"12%",top:68}]}/><View style={[s.karmatarCloud,{left:"72%",top:42}]}/></View></Animated.View>
 <Animated.View style={[s.karmatarNightSky,night]}><LinearGradient colors={["#08172C","#203C59","#755E5A"]} style={StyleSheet.absoluteFillObject}/>{KARMATAR_STARS.map((v,i)=><View key={i} style={[s.karmatarStar,{left:v.left,top:v.top}]}/>)}<Animated.View style={[s.karmatarMoon,moon]}/></Animated.View>
 <View pointerEvents="none" style={s.karmatarSceneLift}>
 <View style={s.karmatarGroundBack}/>
 <View style={s.karmatarSchool} testID="home-karmatar-rgrg-school"><View style={s.karmatarSchoolRoof}/><View style={s.karmatarSchoolSign}><Text style={s.karmatarSchoolSignText}>RGRG +2 HIGH SCHOOL · KARMATAR</Text></View><View style={s.karmatarSchoolWindows}>{[0,1,2].map(i=><View key={i} style={s.karmatarSchoolWindow}/>)}</View><View style={s.karmatarSchoolDoor}/></View>
 <View style={s.karmatarStation} testID="home-karmatar-vidyasagar-station"><View style={s.karmatarStationRoof}/><View style={s.karmatarStationArch}><View style={s.karmatarStationOpening}/><View style={s.karmatarStationSign}><Text style={s.karmatarStationSignText}>VIDYASAGAR</Text><Text style={s.karmatarStationSignSub}>RAILWAY STATION</Text></View></View></View>
 <Animated.Text testID="home-karmatar-kmt-neon" style={[s.karmatarBrandNeon,brandGlow]}>KMT BAZAAR</Animated.Text>
 <View style={s.karmatarRoom} testID="home-karmatar-home-delivery-room"><View style={s.karmatarRoomRoof}/><View style={s.karmatarGrassWall}><Animated.View style={[s.karmatarNeon,neon]}><Text style={s.karmatarNeonText}>HOME DELIVERY</Text></Animated.View></View><View style={s.karmatarRoomDoor}/><View style={s.karmatarRoomWindow}/></View>
 <View style={s.karmatarRoad} testID="home-karmatar-road"><View style={s.karmatarRoadLine}/><View style={s.karmatarRails}><View style={s.karmatarRail}/><View style={[s.karmatarRail,{right:5}]}/>{[0,1,2,3,4].map(i=><View key={i} style={[s.karmatarSleeper,{top:i*6}]}/>)}</View><Animated.View style={[s.karmatarScooter,scooter]}><View style={s.karmatarScooterBody}/><View style={s.karmatarScooterWheelA}/><View style={s.karmatarScooterWheelB}/></Animated.View></View>
 <View style={s.karmatarGate} testID="home-karmatar-railway-crossing"><Animated.View style={[s.karmatarSignal,signal]}><View style={s.karmatarSignalLight}/></Animated.View><Animated.View style={[s.karmatarGateArm,gate]}>{[0,1,2,3,4,5].map(i=><View key={i} style={[s.karmatarGateStripe,{left:i*12,backgroundColor:i%2?"#D63A36":"#FFF"}]}/>)}</Animated.View></View>
 </View>
 </View>;
}
function NightSky(){return <KarmatarHeroScene/>;}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobileTabBar = Platform.OS !== "web" || viewportWidth <= 1024;
  const homeTabBarStyle = useMemo(() => ({
    position: "absolute" as const,
    bottom: isMobileTabBar && Platform.OS === "web" ? -28 : -18,
    borderTopColor: THEME.borderSoft,
    backgroundColor: Platform.OS === "ios" ? "transparent" : "#FFFFFF",
    height: isMobileTabBar ? 92 + insets.bottom : 82,
    paddingTop: 0,
    paddingBottom: isMobileTabBar ? insets.bottom + 8 : 0,
  }), [insets.bottom, isMobileTabBar]);
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
                ...homeTabBarStyle,
                transform: [{ translateY: 100 }],
              },
            });
          }
        });
      } else if (diff < 0 && homeTabHidden.current) {
        homeTabHidden.current = false;
        navigation.setOptions({
          tabBarStyle: {
            ...homeTabBarStyle,
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
  }, [navigation, tabBarTranslateY, heroCollapsed, heroCollapseProgress, homeTabBarStyle]);

  useFocusEffect(
    useCallback(() => {
      lastHomeOffsetY.current = 0;
      homeTabHidden.current = false;
      setHeroCollapsed(false);
      heroCollapseProgress.setValue(0);
      tabBarTranslateY.setValue(0);
      navigation.setOptions({
        tabBarStyle: homeTabBarStyle,
      });

      return () => {
        homeTabHidden.current = false;
        setHeroCollapsed(false);
        heroCollapseProgress.setValue(0);
        tabBarTranslateY.setValue(0);
        navigation.setOptions({
          tabBarStyle: homeTabBarStyle,
        });
      };
    }, [navigation, tabBarTranslateY, heroCollapseProgress, homeTabBarStyle])
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
      {/* New cinematic day/night hero: moving sun, moonrise, layered countryside and chimney smoke */}
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
      <View style={s.skyClearSpace} pointerEvents="none" testID="home-hero-brand-space" />
      </RNAnimated.View>

      {/* The search bar stays usable while the hero shell slides away after the banner scrolls off. */}
      <RNAnimated.View style={[s.searchBarAnchor, { top: heroAnimatedHeight }]}>
      <SafeAreaView
        edges={[]}
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
      </RNAnimated.View>

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
            { id: "premium_decorator", title: "Premium Decorator", sub: "Wedding & event decor", icon: "party-popper", path: "/service/premium_decorator" },
            { id: "photography", title: "Photography", sub: "Event & professional shoots", icon: "camera-outline", path: "/service/photography" },
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
  nightSky:{position:"absolute",top:0,left:0,right:0,height:HERO_BACKDROP_HEIGHT,overflow:"hidden",zIndex:0,pointerEvents:"none"},
  karmatarSceneLift:{position:"absolute",top:0,left:0,right:0,bottom:0,transform:[{translateY:-76}]},
  karmatarDaySky:{...StyleSheet.absoluteFillObject,overflow:"hidden"},
  karmatarNightSky:{...StyleSheet.absoluteFillObject,overflow:"hidden"},
  karmatarSun:{position:"absolute",left:"9%",top:54,width:29,height:29,borderRadius:15,backgroundColor:"#FFF0BD",shadowColor:"#FFE6A2",shadowOpacity:.9,shadowRadius:12,elevation:5},karmatarMoon:{position:"absolute",right:"9%",top:55,width:27,height:27,borderRadius:14,backgroundColor:"#F4F1D9",shadowColor:"#EAF2FF",shadowOpacity:.8,shadowRadius:10,elevation:4},
  karmatarCloudTrack:{position:"absolute",left:0,right:0,top:0,height:120},karmatarCloud:{position:"absolute",width:65,height:17,borderRadius:18,backgroundColor:"rgba(255,255,255,.7)"},karmatarStar:{position:"absolute",width:2,height:2,borderRadius:2,backgroundColor:"#FFF7DA",opacity:.75},karmatarGroundBack:{position:"absolute",left:0,right:0,bottom:24,height:30,backgroundColor:"#547B55",borderTopLeftRadius:60,borderTopRightRadius:60},
  karmatarSchool:{position:"absolute",left:"2%",top:126,width:"29%",height:47,backgroundColor:"#E9E9D8",borderWidth:1,borderColor:"#A6B99C",zIndex:5},karmatarSchoolRoof:{position:"absolute",top:0,left:-2,right:-2,height:7,backgroundColor:"#477755",borderTopWidth:2,borderColor:"#D7E2D0"},karmatarSchoolSign:{position:"absolute",top:10,left:2,right:2,height:10,backgroundColor:"#D6E6D2",alignItems:"center",justifyContent:"center"},karmatarSchoolSignText:{fontSize:5,color:"#20553A",fontWeight:"900"},karmatarSchoolWindows:{position:"absolute",top:25,left:5,right:5,flexDirection:"row",justifyContent:"space-between"},karmatarSchoolWindow:{width:12,height:10,backgroundColor:"#648A98",borderWidth:1,borderColor:"#F0F0DC"},karmatarSchoolDoor:{position:"absolute",bottom:0,left:"44%",width:13,height:18,backgroundColor:"#6B624F"},
  karmatarStation:{position:"absolute",left:"34%",top:105,width:"34%",height:60,zIndex:6,alignItems:"center"},karmatarStationRoof:{position:"absolute",top:0,left:0,right:0,height:8,backgroundColor:"#455B6C",borderTopWidth:2,borderColor:"#D5DAD1"},karmatarStationArch:{position:"absolute",top:9,width:"66%",height:51,borderTopLeftRadius:35,borderTopRightRadius:35,borderWidth:4,borderBottomWidth:0,borderColor:"#E5E4D7",backgroundColor:"#8D9F9C",alignItems:"center",overflow:"hidden"},karmatarStationOpening:{position:"absolute",left:7,right:7,top:12,bottom:0,borderTopLeftRadius:23,borderTopRightRadius:23,backgroundColor:"#465D69"},karmatarStationSign:{position:"absolute",top:2,left:0,right:0,alignItems:"center",zIndex:2},karmatarStationSignText:{fontSize:6,color:"#8E302A",fontWeight:"900"},karmatarStationSignSub:{fontSize:4.5,color:"#8E302A",fontWeight:"900"},
  karmatarBrandNeon:{position:"absolute",right:"1.5%",top:84,width:"27%",textAlign:"center",fontSize:14,fontWeight:"900",letterSpacing:1.25,color:"#FFFBEA",textShadowColor:"#FFB928",textShadowOffset:{width:0,height:1},textShadowRadius:9,zIndex:16,elevation:8},
  karmatarRoom:{position:"absolute",right:"1.5%",top:110,width:"27%",height:62,backgroundColor:"#B6BBA4",borderWidth:1,borderColor:"#D6D8C7",zIndex:12},karmatarRoomRoof:{position:"absolute",top:0,left:-3,right:-3,height:8,backgroundColor:"#394C40",borderTopWidth:2,borderColor:"#C2CEB7"},karmatarGrassWall:{position:"absolute",top:11,left:4,right:4,height:32,backgroundColor:"#185638",borderWidth:1,borderColor:"#6A9A60",alignItems:"center",justifyContent:"center"},karmatarNeon:{paddingHorizontal:4,paddingVertical:4,backgroundColor:"rgba(0,30,13,.55)",borderWidth:1,borderColor:"#9CFF9B",borderRadius:3,shadowColor:"#47FF70",shadowOpacity:1,shadowRadius:8,elevation:5},karmatarNeonText:{fontSize:8,fontWeight:"900",letterSpacing:.3,color:"#D9FFD0",textShadowColor:"#39FF65",textShadowRadius:7},karmatarRoomDoor:{position:"absolute",left:7,bottom:0,width:14,height:17,backgroundColor:"#574638"},karmatarRoomWindow:{position:"absolute",right:8,bottom:7,width:13,height:12,backgroundColor:"#A6D3DC",borderWidth:1,borderColor:"#EDF1E4"},
  karmatarRoad:{position:"absolute",left:0,right:0,bottom:0,height:27,backgroundColor:"#29343A",borderTopWidth:2,borderColor:"#B4A98F",zIndex:17,overflow:"hidden"},karmatarRoadLine:{position:"absolute",top:14,left:"5%",right:"5%",height:1,borderStyle:"dashed",borderWidth:1,borderColor:"#E9DFB8"},karmatarRails:{position:"absolute",left:"57%",top:-2,width:34,height:32,transform:[{rotate:"14deg"}]},karmatarRail:{position:"absolute",top:0,bottom:0,left:5,width:3,backgroundColor:"#B9C3C3",borderColor:"#EDF0E6",borderWidth:1},karmatarSleeper:{position:"absolute",left:0,right:0,height:3,backgroundColor:"#795D45"},karmatarScooter:{position:"absolute",left:"10%",bottom:4,width:34,height:17,zIndex:3},karmatarScooterBody:{position:"absolute",left:5,right:3,bottom:5,height:8,borderRadius:5,backgroundColor:"#E8A333",borderWidth:1,borderColor:"#FFE2A0"},karmatarScooterWheelA:{position:"absolute",left:1,bottom:0,width:7,height:7,borderRadius:4,backgroundColor:"#17232A",borderWidth:1,borderColor:"#AAB6B4"},karmatarScooterWheelB:{position:"absolute",right:0,bottom:0,width:7,height:7,borderRadius:4,backgroundColor:"#17232A",borderWidth:1,borderColor:"#AAB6B4"},
  karmatarGate:{position:"absolute",left:"53%",top:121,width:"39%",height:35,zIndex:20},karmatarSignal:{position:"absolute",left:0,top:0,width:10,height:16,backgroundColor:"#26343A",borderWidth:1,borderColor:"#E3E4D7",alignItems:"center",justifyContent:"center"},karmatarSignalLight:{width:5,height:5,borderRadius:3,backgroundColor:"#FA3535",shadowColor:"#FF2525",shadowOpacity:1,shadowRadius:5},karmatarGateArm:{position:"absolute",left:8,top:5,width:76,height:5,backgroundColor:"#FFF",borderWidth:1,borderColor:"#AAA",transform:[{rotate:"-5deg"}],overflow:"hidden"},karmatarGateStripe:{position:"absolute",top:0,bottom:0,width:7},
  root: { flex: 1, backgroundColor: THEME.whiteBg },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: HERO_BACKDROP_HEIGHT, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "transparent", shadowColor: "#FFFFFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 7 },
  skyClearSpace: { height: Platform.OS === "web" ? 90 : 56, alignItems: "center", justifyContent: "center", zIndex: 30, elevation: 30 },
  skyClearSpaceCollapsed: { height: 0 },
  searchBarAnchor: { position: "absolute", left: 0, right: 0, zIndex: 25, elevation: 25, transform: [{ translateY: -44 }] },
  searchBarSafeArea: { backgroundColor: "transparent", zIndex: 25, elevation: 25 },
  searchBarSafeAreaCollapsed: { borderBottomWidth: 1, borderBottomColor: "rgba(226,232,240,0.9)" },
  searchBarOuter: { paddingHorizontal: SPACING.md, marginTop: 0 },
  searchBarOuterCollapsed: { marginTop: 0, paddingBottom: 8 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
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
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  locationErrorText: { color: "#FEF3C7", fontSize: 9, fontWeight: "700", marginTop: 2, maxWidth: 260 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(22,163,74,0.22)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 0, height: 44, borderWidth: 1, borderColor: "rgba(134,239,172,0.72)", shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
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