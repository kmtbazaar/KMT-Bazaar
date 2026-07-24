import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { 
  FadeInUp, 
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
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

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

  // Animated Search Bar Placeholder Index
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Notification Pulse Animation Scale
  const bellScale = useSharedValue(1);

  const load = useCallback(async () => {
    try {
      const [b, c, s, t, u] = await Promise.all([
        api.banners(), api.categories(), api.stores(), api.products({ trending: true }), api.unreadCount(),
      ]);
      setBanners(b); setCats(c); setStores(s); setTrending(t); setUnread(u.count || 0);
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

  // Notification Bell Pulse Animation Effect
  useEffect(() => {
    if (unread > 0) {
      bellScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 300 }),
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

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Clear unread badge on click & navigate
  const handleNotificationPress = () => {
    setUnread(0);
    router.push("/notifications" as any);
  };

  return (
    <View style={[s.root, Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as any) : {}]} testID="home-screen">
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.headerBg} />
      <SafeAreaView edges={["top"]} style={s.headerWrap}>
        <View style={s.headerRow}>
          {/* 1. Address Selector (Route: /adresses) */}
          <Pressable 
            style={s.locWrap} 
            testID="location-selector"
            onPress={() => router.push("/adresses" as any)}
          >
            <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.locLabel}>Deliver to</Text>
              <Text style={s.locValue} numberOfLines={1}>
                {user?.address || selectedAddress}{" "}
                <MaterialCommunityIcons name="chevron-down" size={16} color="#fff" />
              </Text>
            </View>
          </Pressable>

          {/* Animated Notification Bell on Top Right (Logo Position) */}
          <View style={s.headerActions}>
            <Animated.View style={animatedBellStyle}>
              <Pressable testID="notifications-bell" onPress={handleNotificationPress} style={s.iconBtn}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
                {unread > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unread}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>

        {/* Animated Placeholder Search Bar */}
        <Pressable 
          testID="home-search-trigger"
          onPress={() => router.push("/search" as any)}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
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
        </Pressable>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl tintColor={COLORS.brand} refreshing={refreshing} onRefresh={onRefresh} />
          )
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        style={Platform.OS === 'web' ? ({ height: '100%', overflowY: 'auto', touchAction: 'pan-y' } as any) : {}}
      >

        {/* Banner Carousel */}
        <FlatList
          horizontal
          style={Platform.OS === 'web' ? { overflowX: 'auto' } : {}}
          data={banners}
          showsHorizontalScrollIndicator={false}
          snapToInterval={BANNER_W + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, gap: 12 }}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(index * 80)}>
              <Pressable testID={`banner-${item.id}`} onPress={() => router.push(`/category/${item.category_id}` as any)} style={s.banner}>
                <Image source={{ uri: item.image }} style={s.bannerImg} contentFit="cover" />
                <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.1)"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <View style={s.bannerText}>
                  <Text style={s.bannerSubtitle}>{item.subtitle}</Text>
                  <Text style={s.bannerTitle}>{item.title}</Text>
                  <View style={[s.bannerCta, { backgroundColor: item.color }]}>
                    <Text style={s.bannerCtaText}>{item.cta} →</Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />

        {/* Categories */}
        <SectionTitle title="Shop by Category" />
        <View style={s.catsGrid}>
          {cats.map((c) => (
            <Pressable
              key={c.id}
              testID={`category-${c.id}`}
              onPress={() => router.push({ pathname: `/category/${c.id}`, params: { name: c.name } } as any)}
              style={s.catItem}
            >
              <View style={[s.catCircle, { backgroundColor: c.color + "22" }]}>
                <Image source={{ uri: c.image }} style={s.catImg} contentFit="cover" />
              </View>
              <Text style={s.catName}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Nearby Stores */}
        <SectionTitle title="Nearby Stores" />
        <FlatList
          horizontal
          data={stores}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => {
            const isAvailable = item.is_online !== false;

            return (
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
                      <Text style={s.offlineText}>NOT AVAILABLE</Text>
                    </View>
                  )}
                </View>

                <View style={{ padding: 6 }}>
                  <Text style={[s.storeName, !isAvailable && { color: COLORS.textMuted }]} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    
                    {isAvailable ? (
                      <View style={s.ratePill}>
                        <MaterialCommunityIcons name="star" size={10} color="#fff" />
                        <Text style={s.rateText}>{item.rating}</Text>
                      </View>
                    ) : (
                      <View style={[s.ratePill, { backgroundColor: COLORS.textMuted }]}>
                        <MaterialCommunityIcons name="store-off-outline" size={10} color="#fff" />
                        <Text style={s.rateText}>Closed</Text>
                      </View>
                    )}

                    <Text style={s.storeMin}>{item.delivery_min} min</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />

        {/* Trending */}
        <SectionTitle title="Trending Products" subtitle="Best sellers this week" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, justifyContent: "space-between" }}>
          {trending.map((item) => (
            <View key={item.id} style={{ width: width > 768 ? "23%" : "48%", marginBottom: 12 }}>
              <ProductCard p={item} />
            </View>
          ))}
        </View>
        
        <View style={{ height: 24 }} />
        
        <View style={s.brandStrip}>
          <View style={{ flex: 1 }}>
            <Text style={s.brandStripTitle}>KMT Bazaar Promise</Text>
            <Text style={s.brandStripSub}>Fast delivery · Trusted shops · Easy returns</Text>
          </View>
        </View>
      </ScrollView>
      <CheckoutBar />
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHead}>
      <View>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  headerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  locWrap: { flexDirection: "row", gap: 6, alignItems: "center", flex: 1, marginRight: 12 },
  locLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  locValue: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 4, right: 4, backgroundColor: COLORS.accent, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 12, marginTop: SPACING.md, ...shadow.card, height: 46 },
  searchPlaceholderText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "500" },
  banner: { width: BANNER_W, height: 160, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: COLORS.surfaceTertiary },
  bannerImg: { width: "100%", height: "100%" },
  bannerText: { position: "absolute", left: 16, top: 20, right: 100 },
  bannerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  bannerCta: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, alignSelf: "flex-start" },
  bannerCtaText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  catsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.md },
  catItem: { width: "20%", alignItems: "center", marginBottom: SPACING.md },
  catCircle: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", ...shadow.soft },
  catImg: { width: "100%", height: "100%" },
  catName: { fontSize: 11, fontWeight: "700", color: COLORS.text, marginTop: 6, textAlign: "center" },
  
  storeCard: { width: 170, backgroundColor: "#fff", borderRadius: RADIUS.md, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  storeImg: { width: "100%", height: 80 },
  storeName: { fontWeight: "700", color: COLORS.text },
  ratePill: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  rateText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  storeMin: { fontSize: 11, color: COLORS.textSecondary },

  offlineOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  offlineText: { color: "#fff", backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 10, fontWeight: "900" },

  brandStrip: { flexDirection: "row", gap: SPACING.md, alignItems: "center", marginHorizontal: SPACING.lg, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: "#0A0A0A" },
  brandStripTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  brandStripSub: { color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 12 },
});
