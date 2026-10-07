import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import ProductCard from "@/src/components/ProductCard";
import CheckoutBar from "@/src/components/CheckoutBar";
import { getItemCategoryOptions } from "@/src/itemCategories";
import { COLORS, SPACING } from "@/src/theme";

function itemCategoryIcon(name: string): any {
  const key = name.toLowerCase();
  if (key.includes("t-shirt") || key.includes("shirt")) return "tshirt-crew-outline";
  if (key.includes("jean") || key.includes("trouser")) return "hanger";
  if (key.includes("dress")) return "human-female-dress";
  if (key.includes("footwear") || key.includes("shoe")) return "shoe-sneaker";
  if (key.includes("fruit") || key.includes("vegetable")) return "fruit-cherries";
  if (key.includes("rice") || key.includes("atta") || key.includes("dal")) return "grain";
  if (key.includes("dairy")) return "cow";
  if (key.includes("snack") || key.includes("dessert")) return "food";
  if (key.includes("beverage")) return "cup-outline";
  if (key.includes("mobile")) return "cellphone";
  if (key.includes("laptop")) return "laptop";
  if (key.includes("audio")) return "headphones";
  if (key.includes("tv")) return "television";
  if (key.includes("access")) return "shopping";
  if (key.includes("medicine") || key.includes("prescription")) return "pill";
  if (key.includes("vitamin")) return "pill-multiple";
  if (key.includes("baby")) return "baby-face-outline";
  if (key.includes("personal")) return "face-woman";
  return "tag-outline";
}

export default function StoreProducts() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [store, setStore] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedItemCategory, setSelectedItemCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadStore = async () => {
      if (!id) {
        if (mounted) {
          setProducts([]);
          setStore(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const [storeList, categoryList, productList] = await Promise.all([
          api.stores(),
          api.categories(),
          api.products({ store_id: id }),
        ]);

        const selectedStore = (storeList || []).find(
          (item: any) => String(item.id) === String(id)
        );

        const storeProducts = Array.isArray(productList)
          ? productList.filter(
              (product: any) => String(product.store_id) === String(id)
            )
          : [];

        if (!mounted) return;

        setStore(selectedStore || null);
        setCategories(categoryList || []);
        setProducts(storeProducts);
        setSelectedItemCategory("All");
      } catch (error) {
        console.error("Failed to load store:", error);
        if (mounted) {
          setStore(null);
          setCategories([]);
          setProducts([]);
          setSelectedItemCategory("All");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStore();
    return () => {
      mounted = false;
    };
  }, [id]);

  const itemCategories = useMemo(() => {
    const configured = Array.isArray(store?.item_categories)
      ? store.item_categories.filter((value: any) => String(value).trim())
      : [];

    if (configured.length) return configured;

    return getItemCategoryOptions(store?.category_id || "", categories);
  }, [store?.item_categories, store?.category_id, categories]);

  const filteredProducts = useMemo(() => {
    if (selectedItemCategory === "All") return products;

    return products.filter(
      (product: any) =>
        String(product.item_category || "").toLowerCase() ===
        selectedItemCategory.toLowerCase()
    );
  }, [products, selectedItemCategory]);

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
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </Pressable>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {name || store?.name || "Store Marketplace"}
          </Text>
          <Text style={s.headerSub}>Shop by category</Text>
        </View>
      </View>

      <View style={s.body}>
        <View style={s.categoryRail}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.categoryRailContent}
          >
            <Pressable
              onPress={() => setSelectedItemCategory("All")}
              style={[
                s.categoryItem,
                selectedItemCategory === "All" && s.categoryItemActive,
              ]}
            >
              <View style={[
                s.categoryIcon,
                selectedItemCategory === "All" && s.categoryIconActive,
              ]}>
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={21}
                  color={selectedItemCategory === "All" ? "#fff" : COLORS.textMuted}
                />
              </View>
              <Text
                style={[
                  s.categoryLabel,
                  selectedItemCategory === "All" && s.categoryLabelActive,
                ]}
                numberOfLines={2}
              >
                All
              </Text>
            </Pressable>

            {itemCategories.map((category: string) => {
              const active = selectedItemCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedItemCategory(category)}
                  style={[s.categoryItem, active && s.categoryItemActive]}
                >
                  <View style={[s.categoryIcon, active && s.categoryIconActive]}>
                    <MaterialCommunityIcons
                      name={itemCategoryIcon(category)}
                      size={21}
                      color={active ? "#fff" : COLORS.textMuted}
                    />
                  </View>
                  <Text
                    style={[s.categoryLabel, active && s.categoryLabelActive]}
                    numberOfLines={2}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredProducts}
          keyExtractor={(item, index) =>
            String(item.id ?? item._id ?? index)
          }
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={s.listContent}
          columnWrapperStyle={s.column}
          initialNumToRender={6}
          windowSize={4}
          removeClippedSubviews={true}
          ListHeaderComponent={
            <View style={s.productsHeading}>
              <Text style={s.productsTitle}>
                {selectedItemCategory === "All"
                  ? "All Products"
                  : selectedItemCategory}
              </Text>
              <Text style={s.productsCount}>
                {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={52}
                color={COLORS.textMuted}
              />
              <Text style={s.emptyText}>
                No products in this category yet.
              </Text>
            </View>
          }
        />
      </View>

      <CheckoutBar label="View Cart" route="/cart" bottomOffset={16} />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    gap: 10,
  },

  backBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: "600",
  },

  body: {
    flex: 1,
    flexDirection: "row",
  },

  categoryRail: {
    width: 88,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  categoryRailContent: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    paddingBottom: 110,
  },

  categoryItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 14,
    marginBottom: 4,
  },

  categoryItemActive: {
    backgroundColor: "#FFF7ED",
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  categoryIconActive: {
    backgroundColor: COLORS.accent,
  },

  categoryLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 2,
  },

  categoryLabelActive: {
    color: COLORS.accent,
    fontWeight: "900",
  },

  productsHeading: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  productsTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },

  productsCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 4,
    paddingBottom: 100,
  },

  column: {
    gap: 2,
  },

  empty: {
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
