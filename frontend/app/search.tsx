import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<any[]>([]); // Saare products store karne ke liye
  const [filteredResults, setFilteredResults] = useState<any[]>([]); // Filtered products ke liye
  const [loading, setLoading] = useState(true);

  // Screen load hote hi ek baar saare products fetch kar lenge taaki instant search ho sake
  useEffect(() => {
    (async () => {
      try {
        const data = await api.products({}); // Empty query se saare products le aayenge
        setAllProducts(data || []);
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

  const clearSearch = () => {
    setQuery("");
    setFilteredResults([]);
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ProductCard p={item} compact={true} />
  ), []);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={s.root}>
      {/* Search Header Bar */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </Pressable>
        
        <View style={s.inputWrapper}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
          <TextInput
            placeholder="Search for groceries, food, medicines..."
            value={query}
            onChangeText={handleSearchTextChange}
            autoFocus={true}
            style={s.input}
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={6}>
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

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

          ListEmptyComponent={
            query.trim().length > 0 ? (
              // FIX: Jab kuch match nahi hoga tab strictly "No matching products found" dikhega
              <View style={s.empty} testID="no-results-view">
                <MaterialCommunityIcons name="magnify-close" size={56} color={COLORS.textMuted || "#999"} />
                <Text style={s.emptyTitle}>No matching products found</Text>
                <Text style={s.emptySub}>Try checking the spelling or use different keywords</Text>
              </View>
            ) : (
              // Empty search bar landing state
              <View style={s.empty}>
                <MaterialCommunityIcons name="basket-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.initialText}>Type milk, food or groceries to search instantly</Text>
              </View>
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
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    gap: 10,
  },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  input: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  listContent: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 100 },
  empty: { flex: 1, padding: SPACING.xl, alignItems: "center", justifyContent: "center", marginTop: 80, gap: 6 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500", textAlign: "center", paddingHorizontal: 20 },
  initialText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 8 },
});