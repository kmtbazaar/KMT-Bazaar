import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  FadeInUp, 
  FadeInDown,
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring
} from "react-native-reanimated";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

// Custom Vibrant Sky Blue & Orange Theme Palette
const SKY_COLORS = {
  primary: "#0284C7",        // Rich Sky Blue
  primaryLight: "#38BDF8",   // Light Sky Blue
  primarySoft: "#E0F2FE",    // Very Soft Sky Tint
  primaryGlow: "#7DD3FC",    // Border Glow Sky
  accent: "#F97316",         // Premium Vibrant Orange
  accentLight: "#FFEDD5",   // Soft Orange Tint
  background: "#F0F9FF",     // Subtle Sky Tinted White
  cardBg: "#FFFFFF",         // Pure White
  textDark: "#0F172A",       // Dark Slate Text
  textMuted: "#64748B",      // Muted Slate Text
  borderGlow: "#38BDF8"      // Flash Border Color
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

  // Shared Values for Animated Flash & Pulse Effects
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

  // Continuous Border Flash Glow Animation Effect
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
      {/* Dynamic Sky Gradient Header */}
      <LinearGradient colors={[SKY_COLORS.primary, SKY_COLORS.primaryLight]} style={s.headerBg} />
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
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={SKY_COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.locLabel}>Deliver to</Text>
              <Text style={s.locValue} numberOfLines={1}>
                {selectedAddress}{" "}
                <MaterialCommunityIcons name="chevron-down" size={16} color="#fff" />
              </Text>
            </View>
          </Pressable>

          {/* Animated Notification Bell on Top Right */}
          <View style={s.headerActions}>
            <Animated.View style={animatedBellStyle}>
              <Pressable testID="notifications-bell" onPress={handleNotificationPress} style={s.iconBtn}>
                <MaterialCommunityIcons name="bell-ring-outline" size={22} color="#fff" />
                {unread > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>

        {/* Animated Sky Placeholder Search Bar */}
        <Pressable 
          testID="home-search-trigger"
          onPress={() => router.push("/search" as any)}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={SKY_COLORS.primary} />
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
            <MaterialCommunityIcons name="tune-variant" size={16} color={SKY_COLORS.primary} />
          </View>
        </Pressable>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl tintColor={SKY_COLORS.primary} refreshing={refreshing} onRefresh={onRefresh} />
          )
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        style={Platform.OS === 'web' ? ({ height: '100%', overflowY: 'auto', touchAction: 'pan-y' } as any) : {}}
      >

        {/* Animated Sky Banner Carousel with Border Flash */}
        <FlatList
          horizontal
          style={Platform.OS === 'web' ? { overflowX: 'auto' } : {}}
          data={banners}
          showsHorizontalScrollIndicator={false}
          snapToInterval={BANNER_W + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: 12 }}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 100).duration(600).springify()}>
              <Pressable testID={`banner-${item.id}`} onPress={() => router.push(`/category/${item.category_id}` as any)} style={s.banner}>
                <Image source={{ uri: item.image }} style={s.bannerImg} contentFit="cover" />
                <LinearGradient 
                  colors={["rgba(2, 132, 199, 0.85)", "rgba(15, 23, 42, 0.25)"]} 
                  style={StyleSheet.absoluteFill} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                />
                
                {/* Dynamic Flashing Border Layer */}
                <Animated.View style={[s.bannerFlashBorder, animatedFlashStyle]} />

                <View style={s.bannerText}>
                  <Text style={s.bannerSubtitle}>{item.subtitle}</Text>
                  <Text style={s.bannerTitle}>{item.title}</Text>
                  <View style={s.bannerCta}>
                    <Text style={s.bannerCtaText}>{item.cta || "Explore Now"} →</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />

        {/* Categories Section with Glowing Animated Tiles */}
        <SectionTitle title="Shop by Category" subtitle="Explore top items" />
        <View style={s.catsGrid}>
          {cats.map((c, index) => (
            <Animated.View 
              key={c.id} 
              entering={FadeInDown.delay(index * 60).duration(500).springify()}
              style={s.catItemWrap}
            >
              <Pressable
                testID={`category-${c.id}`}
                onPress={() => router.push({ pathname: `/category/${c.id}`, params: { name: c.name } } as any)}
                style={s.catItem}
              >
                <Animated.View style={[s.catCircle, animatedFlashStyle]}>
                  <Image source={{ uri: c.image }} style={s.catImg} contentFit="cover" />
                </Animated.View>
                <Text style={s.catName} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Nearby Stores Animated List */}
        <SectionTitle title="Nearby Stores" subtitle="Fast delivery from local hub" />
        <FlatList
          horizontal
          data={stores}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingVertical: 4 }}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item, index }) => {
            const isAvailable = item.is_online !== false;

            return (
              <Animated.View entering={FadeInUp.delay(index * 90).duration(500)}>
                <Pressable 
                  testID={`store-${item.id}`} 
                  style={[s.storeCard, !isAvailable && { opacity: 0.55, backgroundColor: "#f9fafb" }]}
                  disabled={!isAvailable}
                  onPress={() => router.push({ pathname: `/store/${item.id}`, params: { name: item.name } } as any)}
                >
                  <View style={{ position: "relative" }}>
                    <Image source={{ uri: item.image }} style={s.storeImg} contentFit="cover" />
                    
                    {!isAvailable && (
                      <View style={s.offlineOverlay}>
                        <Text style={s.offlineText}>CLOSED</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ padding: 8 }}>
                    <Text style={[s.storeName, !isAvailable && { color: SKY_COLORS.textMuted }]} numberOfLines={1}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      
                      {isAvailable ? (
                        <View style={s.ratePill}>
                          <MaterialCommunityIcons name="star" size={10} color="#fff" />
                          <Text style={s.rateText}>{item.rating || "4.5"}</Text>
                        </View>
                      ) : (
                        <View style={[s.ratePill, { backgroundColor: SKY_COLORS.textMuted }]}>
                          <MaterialCommunityIcons name="store-off-outline" size={10} color="#fff" />
                          <Text style={s.rateText}>Closed</Text>
                        </View>
                      )}

                      <Text style={s.storeMin}>{item.delivery_min || 15} min</Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />

        {/* Trending Animated Tile Grid */}
        <SectionTitle title="Trending Products" subtitle="Best sellers this week" />
        <View style={s.trendingGrid}>
          {trending.map((item, index) => (
            <Animated.View 
              key={item.id} 
              entering={FadeInUp.delay(index * 70).duration(500)}
              style={s.productTileCard}
            >
              <Animated.View style={[s.productFlashBorder, animatedFlashStyle]} />
              <ProductCard p={item} />
            </Animated.View>
          ))}
        </View>
        
        <View style={{ height: 24 }} />
        
        {/* Sky & Orange Theme Promise Strip */}
        <Animated.View entering={FadeIn.delay(300)} style={s.brandStrip}>
          <LinearGradient 
            colors={[SKY_COLORS.primary, SKY_COLORS.primaryLight]} 
            style={s.brandStripGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={s.brandIconCircle}>
              <MaterialCommunityIcons name="shield-check" size={24} color={SKY_COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandStripTitle}>KMT Bazaar Promise</Text>
              <Text style={s.brandStripSub}>Fast delivery · Trusted shops · Easy returns</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* Floating Checkout Bar */}
      <CheckoutBar />
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={s.sectionIndicator} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: SKY_COLORS.background },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 220, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 8, alignItems: "center", flex: 1, marginRight: 12, zIndex: 99, elevation: 5 },
  locIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  locLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },
  locValue: { color: "#fff", fontSize: 14, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  bellBadge: { position: "absolute", top: 2, right: 2, backgroundColor: SKY_COLORS.accent, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: SKY_COLORS.cardBg, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 10, marginTop: SPACING.md, ...shadow.card, height: 48, borderWidth: 1.5, borderColor: SKY_COLORS.primaryGlow },
  searchPlaceholderText: { fontSize: 14, color: SKY_COLORS.textMuted, fontWeight: "600" },
  searchMicBg: { backgroundColor: SKY_COLORS.primarySoft, padding: 6, borderRadius: 12 },

  banner: { width: BANNER_W, height: 165, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: SKY_COLORS.cardBg, position: "relative" },
  bannerImg: { width: "100%", height: "100%" },
  bannerFlashBorder: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: SKY_COLORS.accent, pointerEvents: "none" },
  bannerText: { position: "absolute", left: 18, top: 22, right: 90 },
  bannerSubtitle: { color: SKY_COLORS.accentLight, fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4, textShadowColor: "rgba(0,0,0,0.3)", textShadowRadius: 4 },
  bannerCta: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, alignSelf: "flex-start", backgroundColor: SKY_COLORS.accent },
  bannerCtaText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionIndicator: { width: 4, height: 16, backgroundColor: SKY_COLORS.accent, borderRadius: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: SKY_COLORS.textDark },
  sectionSub: { fontSize: 12, color: SKY_COLORS.textMuted, marginTop: 2, marginLeft: 10 },
  
  catsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.sm },
  catItemWrap: { width: "20%", alignItems: "center", marginBottom: SPACING.md },
  catItem: { alignItems: "center" },
  catCircle: { width: 62, height: 62, borderRadius: 31, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: SKY_COLORS.accent, backgroundColor: SKY_COLORS.cardBg, ...shadow.soft },
  catImg: { width: "100%", height: "100%" },
  catName: { fontSize: 11, fontWeight: "700", color: SKY_COLORS.textDark, marginTop: 6, textAlign: "center" },
  
  storeCard: { width: 170, backgroundColor: SKY_COLORS.cardBg, borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1.5, borderColor: SKY_COLORS.primaryGlow, ...shadow.soft },
  storeImg: { width: "100%", height: 85 },
  storeName: { fontWeight: "800", color: SKY_COLORS.textDark, fontSize: 13 },
  ratePill: { flexDirection: "row", alignItems: "center", backgroundColor: SKY_COLORS.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
  rateText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  storeMin: { fontSize: 11, color: SKY_COLORS.primary, fontWeight: "700" },

  offlineOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center" },
  offlineText: { color: "#fff", backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 10, fontWeight: "900" },

  trendingGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, justifyContent: "space-between" },
  productTileCard: { width: width > 768 ? "23%" : "48%", marginBottom: 14, position: "relative" },
  productFlashBorder: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: SKY_COLORS.primaryGlow, zIndex: 1, pointerEvents: "none" },

  brandStrip: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg, borderRadius: RADIUS.md, overflow: "hidden", ...shadow.card },
  brandStripGradient: { flexDirection: "row", gap: SPACING.md, alignItems: "center", padding: SPACING.md },
  brandIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  brandStripTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  brandStripSub: { color: SKY_COLORS.primarySoft, marginTop: 2, fontSize: 12, fontWeight: "600" },
});
