import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { useCart } from "@/src/CartContext";

const RAIL_WIDTH = 88;

export default function Categories() {
  const router = useRouter();
  const navigation = useNavigation(); // Tab bar hide/show control ke liye
  const [cats, setCats] = useState<any[]>([]);
  const [active, setActive] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { itemCount } = useCart();

  // Scroll tracking ke liye ref
  const lastOffsetY = useRef(0);

  const handleScroll = (event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastOffsetY.current;

    // Minimum 10px scroll hone par action execute karein
    if (Math.abs(diff) > 10) {
      if (diff > 0 && currentOffsetY > 50) {
        // Scroll DOWN -> Bottom Tab Layout Ko HIDE Karo
        navigation.setOptions({
          tabBarStyle: { display: "none" },
        });
      } else if (diff < 0) {
        // Scroll UP -> Bottom Tab Layout Ko UNHIDE Karo
        navigation.setOptions({
          tabBarStyle: {
            position: "absolute",
            borderTopColor: COLORS.border,
            backgroundColor: "#FFFFFF",
            height: 65,
            paddingTop: 4,
            paddingBottom: 12,
            display: "flex",
          },
        });
      }
      lastOffsetY.current = currentOffsetY;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const c = await api.categories();
        setCats(c);
        if (c.length) setActive(c[0].id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoadingProducts(true);
    (async () => {
      try {
        const p = await api.products({ category: active });
        if (!cancelled) setProducts(p);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const activeCat = cats.find((c) => c.id === active);
  const bottomPad = itemCount > 0 ? 140 : 24;

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="categories-screen">
      <View style={s.header}>
        <Text style={s.title}>Categories</Text>
        <Pressable
          testID="search-btn"
          onPress={() => router.push("/(tabs)/home" as any)}
          hitSlop={8}
          style={s.searchPill}
        >
          <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
          <Text style={s.searchText}>Search</Text>
        </Pressable>
      </View>

      <View style={s.body}>
        {/* Side rail */}
        <View style={s.railWrap}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
            {cats.map((c) => {
              const isActive = active === c.id;
              return (
                <Pressable
                  key={c.id}
                  testID={`cat-rail-${c.id}`}
                  onPress={() => setActive(c.id)}
                  style={[s.railItem, isActive && s.railItemActive]}
                >
                  {isActive && <View style={s.railBar} />}
                  <View style={[s.railImgWrap, isActive && s.railImgWrapActive]}>
                    <Image source={{ uri: c.image }} style={s.railImg} contentFit="cover" />
                  </View>
                  <Text
                    style={[s.railLabel, isActive && { color: COLORS.brand, fontWeight: "800" }]}
                    numberOfLines={2}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Product grid */}
        <View style={s.gridWrap}>
          {activeCat && (
            <View style={s.gridHeader}>
              <Text style={s.gridTitle} numberOfLines={1}>{activeCat.name}</Text>
              <Text style={s.gridCount}>{products.length} items</Text>
            </View>
          )}
          {loadingProducts ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color={COLORS.brand} />
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(i) => i.id}
              numColumns={2}
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: bottomPad }}
              renderItem={({ item }) => <ProductCard p={item} compact />}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <MaterialCommunityIcons name="package-variant" size={48} color={COLORS.textMuted} />
                  <Text style={s.empty}>No products in this category</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
              // Scroll Event Added
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />
          )}
        </View>
      </View>

      <CheckoutBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  body: { flex: 1, flexDirection: "row" },
  railWrap: {
    width: RAIL_WIDTH,
    backgroundColor: COLORS.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexShrink: 0,
  },
  railItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    width: RAIL_WIDTH,
  },
  railItemActive: { backgroundColor: COLORS.surface },
  railBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: COLORS.brand,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  railImgWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 6,
  },
  railImgWrapActive: { borderColor: COLORS.brand },
  railImg: { width: "100%", height: "100%" },
  railLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  gridWrap: { flex: 1, minWidth: 0 },
  gridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gridTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, flex: 1, marginRight: 8 },
  gridCount: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  empty: { textAlign: "center", color: COLORS.textMuted, fontSize: 13 },
});
