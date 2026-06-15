import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import ProductCard from "@/src/components/ProductCard";

export default function Categories() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [active, setActive] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const c = await api.categories(); setCats(c);
      if (c.length) setActive(c[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const p = await api.products({ category: active });
      setProducts(p);
    })();
  }, [active]);

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="categories-screen">
      <Text style={s.title}>Categories</Text>
      <View style={s.body}>
        {/* Side rail */}
        <ScrollView style={s.rail} showsVerticalScrollIndicator={false}>
          {cats.map((c) => (
            <Pressable
              key={c.id}
              testID={`cat-rail-${c.id}`}
              onPress={() => setActive(c.id)}
              style={[s.railItem, active === c.id && s.railItemActive]}
            >
              {active === c.id && <View style={s.railBar} />}
              <Image source={{ uri: c.image }} style={s.railImg} contentFit="cover" />
              <Text style={[s.railLabel, active === c.id && { color: COLORS.brand, fontWeight: "800" }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {/* Product grid */}
        <View style={{ flex: 1 }}>
          <FlatList
            data={products}
            keyExtractor={(i) => i.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 4 }}
            renderItem={({ item }) => <ProductCard p={item} compact />}
            ListEmptyComponent={<Text style={s.empty}>No products</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  body: { flex: 1, flexDirection: "row" },
  rail: { width: 92, backgroundColor: COLORS.surfaceSecondary },
  railItem: { paddingVertical: SPACING.md, alignItems: "center", borderBottomWidth: 1, borderColor: COLORS.border },
  railItemActive: { backgroundColor: COLORS.surface },
  railBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: COLORS.brand, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  railImg: { width: 46, height: 46, borderRadius: 23, marginBottom: 6 },
  railLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600", textAlign: "center" },
  empty: { textAlign: "center", marginTop: 60, color: COLORS.textMuted },
});
