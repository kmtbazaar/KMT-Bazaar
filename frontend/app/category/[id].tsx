import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar"; // Import CheckoutBar
import { COLORS, SPACING } from "@/src/theme";

export default function CategoryProducts() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await api.products({ category: id });
        if (isMounted) setProducts(data || []);
      } catch (e) {
        console.error("Failed to load category products:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [id]);

  // Performance Optimization: Render function ko memoize kiya taaki list lagging na kare
  const renderItem = useCallback(({ item }: { item: any }) => (
    <ProductCard p={item} compact={true} />
  ), []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Top Title Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{name || "Products"}</Text>
      </View>

      {/* Lightweight Grid List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={s.listContent}
        
        // Pure Performance Parameters (No memory/rendering bugs)
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews={true}

        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No products available in this category.</Text>
          </View>
        }
      />

      {/* FIX: Blinkit Style Floating View Cart Bar */}
      {/* bottomOffset={16} fits perfectly over list layout screens */}
      <CheckoutBar label="View Cart" route="/cart" bottomOffset={16} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  header: { padding: SPACING.md, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  listContent: { paddingHorizontal: 4, paddingTop: 6, paddingBottom: 100 }, // Extra padding bottom so items don't hide behind the bar
  empty: { flex: 1, padding: SPACING.xl, alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600", textAlign: "center" }
});