import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { COLORS, SPACING } from "@/src/theme";

export default function StoreProducts() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // API pass store_id to get only this specific vendor's products
        const data = await api.products({ store_id: id } as any);
        setProducts(data || []);
      } catch (e) {
        console.error("Failed to load store products:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
    <View style={s.root}>
      {/* Header Bar */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={s.headerTitle}>{name || "Store Marketplace"}</Text>
      </View>

      {/* Store Items Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={s.listContent}
        initialNumToRender={6}
        windowSize={3}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="store-remove-outline" size={56} color={COLORS.textMuted} />
            <Text style={s.emptyText}>No products listed by this vendor yet.</Text>
          </View>
        }
      />

      {/* Floating View Cart bar */}
      <CheckoutBar label="View Cart" route="/cart" bottomOffset={16} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", gap: 12 },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  listContent: { paddingHorizontal: 4, paddingTop: 10, paddingBottom: 100 },
  empty: { flex: 1, padding: SPACING.xl, alignItems: "center", justifyContent: "center", marginTop: 60, gap: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "600", textAlign: "center" }
});