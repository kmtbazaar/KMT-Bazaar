import { LocalizedText as Text } from "@/src/LocalizedText";
import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ProductCard from "@/src/components/ProductCard";
import { useWishlist } from "@/src/WishlistContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function WishlistScreen() {
  const router = useRouter();
  const { items, ready } = useWishlist();

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="wishlist-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <View style={s.heading}>
          <Text style={s.title}>My Wishlist</Text>
          <Text style={s.subtitle}>{items.length} saved {items.length === 1 ? "product" : "products"}</Text>
        </View>
        <MaterialCommunityIcons name="heart" size={24} color="#E11D48" />
      </View>

      {!ready ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="heart-outline" size={42} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>Loading wishlist...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <MaterialCommunityIcons name="heart-outline" size={42} color="#E11D48" />
          </View>
          <Text style={s.emptyTitle}>Your wishlist is empty</Text>
          <Text style={s.emptyText}>Tap the small heart on any product to save it here.</Text>
          <Pressable style={s.shopButton} onPress={() => router.replace("/(tabs)/home" as any)}>
            <Text style={s.shopButtonText}>Explore products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {items.map((product) => (
            <View key={String(product.id)} style={s.product}>
              <ProductCard p={product} compact />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSecondary },
  heading: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  grid: { padding: SPACING.sm, paddingBottom: 100, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  product: { width: "50%", padding: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, textAlign: "center", marginTop: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, maxWidth: 280 },
  shopButton: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: COLORS.brand, borderRadius: RADIUS.pill },
  shopButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
