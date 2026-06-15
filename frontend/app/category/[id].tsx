import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, SPACING } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [cat, setCat] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [p, all] = await Promise.all([api.products({ category: id as string }), api.categories()]);
      setProducts(p);
      setCat(all.find((c: any) => c.id === id));
    })();
  }, [id]);

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="category-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} /></Pressable>
        <Text style={s.title}>{cat?.name || "Category"}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={products}
        keyExtractor={(it) => it.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
        renderItem={({ item }) => <ProductCard p={item} compact />}
        ListEmptyComponent={<Text style={s.empty}>No products in this category</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted },
});
