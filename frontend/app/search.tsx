import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";

const RECENT_SEARCHES_KEY = "kmt_recent_searches";
const MAX_RECENT_SEARCHES = 5;
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]); // Saare products store karne ke liye
  const [filteredResults, setFilteredResults] = useState<any[]>([]); // Filtered products ke liye
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const voiceQuery = typeof params.q === "string" ? params.q.trim() : "";
    if (voiceQuery) {
      setQuery(voiceQuery);
    }
  }, [params.q]);

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
      } catch (e) {
        console.error("Failed to load recent searches:", e);
      }
    })();
  }, []);

  // Screen load hote hi ek baar saare products fetch kar lenge taaki instant search ho sake
  useEffect(() => {
    (async () => {
      try {
        const data = await api.products({}); // Empty query se saare products le aayenge
        const products = data || [];
        setAllProducts(products);
        const voiceQuery = typeof params.q === "string" ? params.q.trim() : "";
        if (voiceQuery) {
          const keyword = voiceQuery.toLowerCase();
          setFilteredResults(products.filter((item: any) =>
            (item.name && item.name.toLowerCase().includes(keyword)) ||
            (item.description && item.description.toLowerCase().includes(keyword))
          ));
        }
      } catch (e) {
        console.error("Failed to load products for search:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // FIX: Frontend Smart Search Engine (Name aur Description match karega)
  const handleSearchTextChange = (text: string) => {
    setQuery(text);
    
    if (text.trim().length === 0) {
      setFilteredResults([]);
      return;
    }

    const searchKeyword = text.toLowerCase().trim();
    
    // Har ek product ka naam aur details filter karega
    const matched = allProducts.filter((item: any) => {
      const nameMatch = item.name ? item.name.toLowerCase().includes(searchKeyword) : false;
      const descMatch = item.description ? item.description.toLowerCase().includes(searchKeyword) : false;
      return nameMatch || descMatch;
    });

    setFilteredResults(matched);
  };

  const saveRecentSearch = useCallback(async (value: string) => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) return;

    const updated = [
      clean,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== clean.toLowerCase()
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search:", e);
    }
  }, [recentSearches]);

  const deleteRecentSearch = useCallback(async (value: string) => {
    const updated = recentSearches.filter((item) => item !== value);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete recent search:", e);
    }
  }, [recentSearches]);

  const clearSearch = () => {
    setQuery("");
    setFilteredResults([]);
  };

  const selectRecentSearch = (value: string) => {
    setQuery(value);
    const searchKeyword = value.toLowerCase().trim();
    setFilteredResults(
      allProducts.filter((item: any) => {
        const nameMatch = item.name
          ? item.name.toLowerCase().includes(searchKeyword)
          : false;
        const descMatch = item.description
          ? item.description.toLowerCase().includes(searchKeyword)
          : false;
        return nameMatch || descMatch;
      })
    );
  };

  const handleSubmitSearch = () => {
    if (query.trim()) saveRecentSearch(query);
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ProductCard p={item} compact={true} />
  ), []);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={s.root}>
      {/* Premium Search Header */}
      <LinearGradient
        colors={["#E0F2FE", "#F8FAFC", "#FFF7ED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <Animated.View entering={FadeIn.duration(260)} style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
          </Pressable>

          <View style={s.inputWrapper}>
            <View style={s.searchIconBubble}>
              <MaterialCommunityIcons name="magnify" size={18} color={COLORS.sky} />
            </View>

            <TextInput
              placeholder="Search for groceries, food, medicines..."
              value={query}
              onChangeText={handleSearchTextChange}
              autoFocus={true}
              style={s.input}
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              selectionColor="#FF6B00"
              onSubmitEditing={handleSubmitSearch}
            />

            {query.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={8} style={s.clearBtn}>
                <MaterialCommunityIcons name="close" size={16} color={COLORS.textSecondary} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Results Listing Area */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={s.listContent}
          initialNumToRender={6}
          windowSize={3}

          ListHeaderComponent={
            query.trim().length === 0 && recentSearches.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(300)} style={s.recentSection}>
                <View style={s.recentHeader}>
                  <View style={s.recentTitleRow}>
                    <View style={s.recentIconBubble}>
                      <MaterialCommunityIcons name="history" size={16} color={COLORS.brand} />
                    </View>
                    <View>
                      <Text style={s.recentTitle}>Recent searches</Text>
                      <Text style={s.recentSubtitle}>Jump back into your searches</Text>
                    </View>
                  </View>
                  <Text style={s.recentCount}>{recentSearches.length}/5</Text>
                </View>

                <View style={s.recentChips}>
                  {recentSearches.map((item) => (
                    <Animated.View key={item} entering={FadeInUp.duration(240)} style={s.recentChip}>
                      <Pressable style={s.recentChipMain} onPress={() => selectRecentSearch(item)}>
                        <MaterialCommunityIcons name="history" size={14} color={COLORS.sky} />
                        <Text style={s.recentChipText} numberOfLines={1}>{item}</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteRecentSearch(item)} hitSlop={6} style={s.recentChipDelete}>
                        <MaterialCommunityIcons name="close" size={13} color={COLORS.textMuted} />
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            ) : (
              query.trim().length > 0 ? (
                <View style={s.resultsHeader}>
                  <View>
                    <Text style={s.resultsTitle}>Search results</Text>
                    <Text style={s.resultsSubtitle}>
                      {filteredResults.length} product{filteredResults.length === 1 ? "" : "s"} found
                    </Text>
                  </View>
                  <View style={s.resultsPill}>
                    <MaterialCommunityIcons name="package-variant-closed" size={15} color={COLORS.sky} />
                    <Text style={s.resultsPillText}>{filteredResults.length}</Text>
                  </View>
                </View>
              ) : null
            )
          }

          ListEmptyComponent={
            query.trim().length > 0 ? (
              <Animated.View entering={FadeInUp.duration(320)} style={s.empty} testID="no-results-view">
                <View style={s.emptyIconLarge}>
                  <MaterialCommunityIcons name="magnify-close" size={44} color={COLORS.sky} />
                </View>
                <Text style={s.emptyTitle}>No matching products found</Text>
                <Text style={s.emptySub}>Try checking the spelling or use different keywords</Text>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(320)} style={s.empty}>
                <View style={s.emptyIconLarge}>
                  <MaterialCommunityIcons name="basket-outline" size={40} color={COLORS.brand} />
                </View>
                <Text style={s.initialTitle}>What are you looking for?</Text>
                <Text style={s.initialText}>Type milk, food or groceries to search instantly</Text>
              </Animated.View>
            )
          }
        />
      )}

      {/* Persistent view cart footer layout */}
      <CheckoutBar label="View Cart" route="/cart" bottomOffset={16} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F9FC" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F9FC",
  },

  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(203,216,241,0.65)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
  },

  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    height: 52,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(2,132,199,0.20)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
  },

  searchIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
    backgroundColor: "transparent",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },

  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  listContent: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 110,
  },

  resultsHeader: {
    marginHorizontal: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7EEF7",
  },

  resultsTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  resultsSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },

  resultsPill: {
    minWidth: 42,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E0F2FE",
  },

  resultsPillText: {
    color: COLORS.sky,
    fontSize: 12,
    fontWeight: "900",
  },

  recentSection: {
    marginHorizontal: 4,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EEF7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  recentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },

  recentIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },

  recentTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  recentSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  recentCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "800",
  },

  recentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  recentChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingLeft: 10,
    minHeight: 34,
  },

  recentChipMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingRight: 7,
    maxWidth: 190,
  },

  recentChipText: {
    flexShrink: 1,
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },

  recentChipDelete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
    backgroundColor: "#FFFFFF",
  },

  empty: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 70,
  },

  emptyIconLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  emptySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 6,
    lineHeight: 19,
  },

  initialTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 3,
  },

  initialText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 12,
    lineHeight: 19,
  },
});