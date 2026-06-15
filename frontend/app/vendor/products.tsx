import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function VendorProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);

  const load = useCallback(async () => { try { setProducts(await vendorApi.products()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-products-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>My Products ({products.length})</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={s.empty}>No products yet</Text>}
        renderItem={({ item }) => (
          <View style={s.card} testID={`vp-${item.id}`}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              <Text style={s.meta}>{item.unit} · Stock: {item.stock}</Text>
              <View style={s.priceRow}>
                <Text style={s.price}>₹{item.price}</Text>
                {item.mrp > item.price && <Text style={s.mrp}>₹{item.mrp}</Text>}
                {item.trending && <View style={s.trendPill}><Text style={s.trendText}>TRENDING</Text></View>}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { flexDirection: "row", gap: 10, padding: 10, backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  img: { width: 70, height: 70, borderRadius: 8 },
  name: { fontWeight: "700", color: COLORS.text },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  price: { fontWeight: "800", color: COLORS.text, fontSize: 15 },
  mrp: { color: COLORS.textMuted, textDecorationLine: "line-through", fontSize: 12 },
  trendPill: { backgroundColor: COLORS.accent + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendText: { color: COLORS.accent, fontSize: 9, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
});
