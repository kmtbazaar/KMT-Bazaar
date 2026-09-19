import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { COLORS, SPACING } from "@/src/theme";

export default function StoreProducts() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;

  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setLoading(true);

      try {
        // Store ID missing ho to request mat bhejo
        if (!id) {
          console.error("Store ID missing from route");

          if (mounted) {
            setProducts([]);
          }

          return;
        }

        console.log("CUSTOMER SELECTED STORE ID:", id);

        // Backend ko selected store ki ID bhejo
        const data = await api.products({
          store_id: id,
        });

        console.log("PRODUCTS RECEIVED:", data);

        // Safety check: UI mein sirf selected store ke products dikhayein
        const storeProducts = Array.isArray(data)
          ? data.filter(
              (product: any) =>
                String(product.store_id) === String(id)
            )
          : [];

        if (mounted) {
          setProducts(storeProducts);
        }
      } catch (error) {
        console.error("Failed to load store products:", error);

        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [id]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductCard p={item} compact={true} />
    ),
    []
  );

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
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={s.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={COLORS.text}
          />
        </Pressable>

        <Text style={s.headerTitle}>
          {name || "Store Marketplace"}
        </Text>
      </View>

      {/* Selected Store Products Grid */}
      <FlatList
        data={products}
        keyExtractor={(item, index) =>
          String(item.id ?? item._id ?? index)
        }
        renderItem={renderItem}
        numColumns={3}
        contentContainerStyle={s.listContent}
        initialNumToRender={6}
        windowSize={3}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons
              name="store-remove-outline"
              size={56}
              color={COLORS.textMuted}
            />

            <Text style={s.emptyText}>
              No products listed by this vendor yet.
            </Text>
          </View>
        }
      />

      {/* Floating View Cart Bar */}
      <CheckoutBar
        label="View Cart"
        route="/cart"
        bottomOffset={16}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    gap: 12,
  },

  backBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  listContent: {
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 100,
  },

  empty: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: 10,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});