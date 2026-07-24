import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from "react-native-reanimated";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

// Custom Theme Palette: Sky Blue, Orange, Pure White & Dark Accents
const THEME = {
  skyBg: "#E0F2FE",          // Light Refreshing Sky Blue Background
  skyBgSoft: "#F0F9FF",      // Soft Sky Tint Surface
  skyHeader: "#0284C7",      // Deep Sky Blue Header
  skyHeaderDark: "#0369A1",  // Deep Header Accent
  orange: "#FF6B00",         // Vibrant Orange
  orangeBright: "#FF8800",   // Bright Orange Highlight
  orangeGlow: "#F97316",     // Border Glow Orange
  black: "#0F172A",          // Dark Slate Text for Clear Reading
  blackMuted: "#475569",     // Muted Slate Text
  white: "#FFFFFF",          // Crisp Pure White
};

// Search bar placeholder texts for animation
const SEARCH_PLACEHOLDERS = [
  "Search 'groceries'...",
  "Search 'fresh food'...",
  "Search 'medicines'...",
  "Search 'electronics'...",
  "Search 'daily essentials'..."
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic Address Fallback State
  const [selectedAddress, setSelectedAddress] = useState<string>("Home · Karmatar");

  // Sync selected address automatically whenever user returns to Home Screen
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadActiveAddress = async () => {
        try {
          // 1. Check local storage selection
          const activeAddr = await AsyncStorage.getItem("selected_address");
          if (activeAddr) {
            const parsed = JSON.parse(activeAddr);
            const labelStr = parsed.label || "Home";
            const locationStr = parsed.line1 || parsed.city || "Karmatar";
            if (isMounted) setSelectedAddress(`${labelStr} · ${locationStr}`);
            return;
          }

          // 2. Fallback to API user addresses if no local selection
          const addrList = await api.addresses();
          if (addrList && addrList.length > 0) {
            const def = addrList.find((a: any) => a.is_default) || addrList[0];
            const labelStr = def.label || "Home";
            const locationStr = def.line1 || def.city || "Karmatar";
            if (isMounted) setSelectedAddress(`${labelStr} · ${locationStr}`);
            await AsyncStorage.setItem("selected_address", JSON.stringify(def));
            return;
          }

          // 3. Fallback to User Context
          if (user?.address && isMounted) {
            setSelectedAddress(user.address);
          }
        } catch (err) {
          console.log("Error reading active address:", err);
        }
      };
      loadActiveAddress();
      return () => { isMounted = false; };
    }, [user])
  );

  // Animated Search Bar Placeholder Index
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Shared Values for Flashing Border Animations ONLY
  const bellScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0.3);

  const load = useCallback(async () => {
    try {
      const [b, c, s, t, u] = await Promise.all([
        api.banners(), api.categories(), api.stores(), api.products({ trending: true }), api.unreadCount(),
      ]);
      setBanners(b || []); setCats(c || []); setStores(s || []); setTrending(t || []); setUnread(u?.count || 0);
    } catch (e) { console.log("load err", e); }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Clear unread badge on click & navigate
  const handleNotificationPress = () => {
    setUnread(0);
    router.push("/notifications" as any);
  };

  return (
    <View style={[s.root, Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as any) : {}]} testID="home-screen">
      {/* Sky Blue Dynamic Header Gradient */}
      <LinearGradient colors={[THEME.skyHeader, THEME.skyHeaderDark]} style={s.headerBg} />
      
      <SafeAreaView edges={["top"]} style={s.headerWrap}>
        <View style={s.headerRow}>
          {/* 1. Address Selector (Route: /addresses) */}
          <Pressable 
            style={s.locWrap} 
            testID="location-selector"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.push("/addresses" as any)}
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

        {/* Search Bar */}
        <Pressable 
          testID="home-search-trigger"
          onPress={() => router.push("/search" as any)}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={THEME.skyHeader} />
          <Animated.View 
            key={placeholderIdx} 
            entering={FadeIn.duration(400)} 
            exiting={FadeOut.duration(400)}
            style={{ flex: 1, marginLeft: 8 }}
          >
            <Text style={s.searchPlaceholderText}>
              {SEARCH_PLACEHOLDERS[placeholderIdx]}
            </Text>
          </Animated.View>
          <View style={s.searchMicBg}>
            <MaterialCommunityIcons name="tune-variant" size={16} color={THEME.white} />
          </View>
        </Pressable>
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
        style={Platform.OS === 'web' ? ({ height: '100%', overflowY: 'auto', touchAction: 'pan-y' } as any) : {}}
      >

        {/* Banner Carousel with Gradient Flashing Border Only */}
        <FlatList
          horizontal
          style={Platform.OS === 'web' ? { overflowX: 'auto' } : {}}
          data={banners}
          showsHorizontalScrollIndicator={false}
          snapToInterval={BANNER_W + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 }}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <Pressable testID={`banner-${item.id}`} onPress={() => router.push(`/category/${item.category_id}` as any)} style={s.banner}>
              <Image source={{ uri: item.image }} style={s.bannerImg} contentFit="cover" />
              <LinearGradient 
                colors={["rgba(2, 132, 199, 0.85)", "rgba(15, 23, 42, 0.3)"]} 
                style={StyleSheet.absoluteFill} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
              />
              
              {/* Animated Gradient Border Flash */}
              <Animated.View style={[s.bannerFlashBorder, animatedFlashStyle]} />

              <View style={s.bannerText}>
                <Text style={s.bannerSubtitle}>{item.subtitle}</Text>
                <Text style={s.bannerTitle}>{item.title}</Text>
                <View style={s.bannerCta}>
                  <Text style={s.bannerCtaText}>{item.cta || "Explore Now"} →</Text>
                </View>
              </View>
            </Pressable>
          )}
        />

        {/* Categories Section with Flashing Border Tiles */}
        <SectionTitle title="Shop by Category" subtitle="Clear & easy ordering" />
        <View style={s.catsGrid}>
          {cats.map((c) => (
            <View key={c.id} style={s.catItemWrap}>
              <Pressable
                testID={`category-${c.id}`}
                onPress={() => router.push({ pathname: `/category/${c.id}`, params: { name: c.name } } as any)}
                style={s.catItem}
              >
                <View style={s.catCircleWrap}>
                  <Animated.View style={[s.catFlashBorder, animatedFlashStyle]} />
                  <View style={s.catCircle}>
                    <Image source={{ uri: c.image }} style={s.catImg} contentFit="cover" />
                  </View>
                </View>
                <Text style={s.catName} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Nearby Stores List (Chote Tiles with Flashing Gradient Border) */}
        <SectionTitle title="Nearby Stores" subtitle="Fast delivery hubs" />
        <FlatList
          horizontal
          data={stores}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 10, paddingVertical: 4 }}
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
                  <Image source={{ uri: item.image }} style={s.storeImgSmall} contentFit="cover" />
                  
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
      </ScrollView>

      {/* Floating Checkout Bar */}
      <CheckoutBar />
    </View>
  );
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
  root: { flex: 1, backgroundColor: THEME.skyBg },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 210, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 34, height: 34, borderRadius: 17, backgroundColor: THEME.white, alignItems: "center", justifyContent: "center", ...shadow.soft },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: THEME.white, fontSize: 14, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: THEME.orange, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: THEME.white },
  bellBadgeText: { color: THEME.white, fontSize: 9, fontWeight: "900" },
  
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: THEME.white, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 10, marginTop: SPACING.md, ...shadow.card, height: 48, borderWidth: 1.5, borderColor: THEME.orange },
  searchPlaceholderText: { fontSize: 14, color: THEME.blackMuted, fontWeight: "600" },
  searchMicBg: { backgroundColor: THEME.orange, padding: 6, borderRadius: 12 },

  banner: { width: BANNER_W, height: 160, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: THEME.white, position: "relative", ...shadow.soft },
  bannerImg: { width: "100%", height: "100%" },
  bannerFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg, borderWidth: 2.5, borderColor: THEME.orangeBright, pointerEvents: "none" },
  bannerText: { position: "absolute", left: 18, top: 20, right: 90 },
  bannerSubtitle: { color: "#FFEDD5", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  bannerTitle: { color: THEME.white, fontSize: 22, fontWeight: "900", marginTop: 4 },
  bannerCta: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.pill, alignSelf: "flex-start", backgroundColor: THEME.orange },
  bannerCtaText: { color: THEME.white, fontWeight: "800", fontSize: 13 },
  
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionIndicator: { width: 4, height: 16, backgroundColor: THEME.orange, borderRadius: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: THEME.black },
  sectionSub: { fontSize: 12, color: THEME.blackMuted, marginTop: 2, marginLeft: 12 },
  
  catsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.sm },
  catItemWrap: { width: "20%", alignItems: "center", marginBottom: SPACING.md },
  catItem: { alignItems: "center" },
  catCircleWrap: { position: "relative", width: 60, height: 60 },
  catFlashBorder: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 32, borderWidth: 2, borderColor: THEME.orange, zIndex: 1, pointerEvents: "none" },
  catCircle: { width: 60, height: 60, borderRadius: 30, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: THEME.white, ...shadow.soft },
  catImg: { width: "100%", height: "100%" },
  catName: { fontSize: 11, fontWeight: "700", color: THEME.black, marginTop: 6, textAlign: "center" },
  
  /* Compact Store Tile Styling */
  storeCardSmall: { width: 135, backgroundColor: THEME.white, borderRadius: RADIUS.md, overflow: "hidden", position: "relative", ...shadow.soft },
  storeFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.orangeGlow, pointerEvents: "none", zIndex: 2 },
  storeImgSmall: { width: "100%", height: 65 },
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
});
