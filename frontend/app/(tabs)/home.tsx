import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, Dimensions, RefreshControl, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { api } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, c, s, t, u] = await Promise.all([
        api.banners(), api.categories(), api.stores(), api.products({ trending: true }), api.unreadCount(),
      ]);
      setBanners(b); setCats(c); setStores(s); setTrending(t); setUnread(u.count || 0);
    } catch (e) { console.log("load err", e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.root} testID="home-screen">
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.headerBg} />
      <SafeAreaView edges={["top"]} style={s.headerWrap}>
        <View style={s.headerRow}>
          <Pressable style={s.locWrap} testID="location-selector">
            <MaterialCommunityIcons name="map-marker" size={18} color="#fff" />
            <View>
              <Text style={s.locLabel}>Deliver to</Text>
              <Text style={s.locValue}>Home · {user?.name?.split(" ")[0] || "Guest"} <MaterialCommunityIcons name="chevron-down" size={14} color="#fff" /></Text>
            </View>
          </Pressable>
          <View style={s.headerActions}>
            <Pressable testID="notifications-bell" onPress={() => router.push("/notifications" as any)} style={s.iconBtn}>
              <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
              {unread > 0 && <View style={s.bellBadge}><Text style={s.bellBadgeText}>{unread}</Text></View>}
            </Pressable>
            <Image source={{ uri: LOGO_URL }} style={s.logoSmall} contentFit="contain" />
          </View>
        </View>

        <Pressable 
          testID="home-search-trigger"
          onPress={() => router.push("/search" as any)}
          style={s.searchWrap}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
          <Text style={s.searchPlaceholderText}>Search for groceries, food, medicines...</Text>
        </Pressable>
      </SafeAreaView>

            <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={COLORS.brand} refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
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
            // 🔥 NAYA: Check agar store available hai ya nahi
            const isAvailable = item.is_online !== false;

            return (
              <Pressable 
                testID={`store-${item.id}`} 
                style={[s.storeCard, !isAvailable && { opacity: 0.55, backgroundColor: "#f9fafb" }]} // Grey effect
                disabled={!isAvailable} // 🔥 Click disable karne ke liye
                onPress={() => router.push({ pathname: `/store/${item.id}`, params: { name: item.name } } as any)}
              >
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: item.image }} style={s.storeImg} contentFit="cover" />
                  
                  {/* 🔥 NOT AVAILABLE ka badge */}
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
        <FlatList
          data={trending}
          scrollEnabled={false}
          numColumns={width > 768 ? 4 : 2}
          key={`trending-grid-${width > 768 ? 'web' : 'mobile'}`}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 12 }}
          columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 12 }}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (<View style={{ width: width > 768 ? "22%" : "46%", marginHorizontal: "1%" }}><ProductCard p={item} /></View>)}
        />
        
        <View style={{ height: 24 }} />
        
        <View style={s.brandStrip}>
          <Image source={{ uri: LOGO_URL }} style={{ width: 60, height: 60 }} contentFit="contain" />
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
  locWrap: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  locLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  locValue: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: 4, right: 4, backgroundColor: COLORS.accent, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  logoSmall: { width: 36, height: 36 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 12, marginTop: SPACING.md, ...shadow.card, height: 46 },
  searchPlaceholderText: { flex: 1, fontSize: 14, color: COLORS.textMuted, marginLeft: 8, fontWeight: "500" },
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

  // 🔥 NAYA: Offline stores ke styling
  offlineOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  offlineText: { color: "#fff", backgroundColor: "#ef4444", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 10, fontWeight: "900" },

  brandStrip: { flexDirection: "row", gap: SPACING.md, alignItems: "center", marginHorizontal: SPACING.lg, marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: "#0A0A0A" },
  brandStripTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  brandStripSub: { color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 12 },
});