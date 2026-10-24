import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import CheckoutBar from "@/src/components/CheckoutBar";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import { CategoryProductTile } from "../(tabs)/categories";

const RAIL_WIDTH = 88;

function itemCategoryIcon(name: string): any {
  const key = String(name || "").toLowerCase();
  if (key.includes("t-shirt") || key.includes("shirt")) return "tshirt-crew-outline";
  if (key.includes("jean") || key.includes("trouser")) return "hanger";
  if (key.includes("dress")) return "human-female-dress";
  if (key.includes("footwear") || key.includes("shoe")) return "shoe-sneaker";
  if (key.includes("fruit") || key.includes("vegetable")) return "fruit-cherries";
  if (key.includes("rice") || key.includes("atta") || key.includes("dal")) return "grain";
  if (key.includes("dairy")) return "cow";
  if (key.includes("snack") || key.includes("dessert")) return "food";
  if (key.includes("beverage") || key.includes("drink")) return "cup-outline";
  if (key.includes("mobile") || key.includes("phone")) return "cellphone";
  if (key.includes("laptop") || key.includes("computer")) return "laptop";
  if (key.includes("audio") || key.includes("headphone")) return "headphones";
  if (key.includes("tv") || key.includes("television")) return "television";
  if (key.includes("access")) return "shopping";
  if (key.includes("medicine") || key.includes("prescription")) return "pill";
  if (key.includes("vitamin")) return "pill-multiple";
  if (key.includes("baby")) return "baby-face-outline";
  if (key.includes("personal")) return "face-woman";
  return "tag-outline";
}

function categoryKey(category: any): string {
  return String(category?.id ?? category?._id ?? category?.name ?? "");
}

export default function HomeCategoryBrowser() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const routeName = Array.isArray(params.name) ? params.name[0] : params.name;
  const router = useRouter();
  const { itemCount } = useCart();

  const [parentCategory, setParentCategory] = useState<any | null>(null);
  const [configuredItemCategories, setConfiguredItemCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedItemCategory, setSelectedItemCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setParentCategory(null);
        setConfiguredItemCategories([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [categoryList, productList, itemCategoryList] = await Promise.all([
          api.categories().catch((error) => {
            console.warn("Home category lookup unavailable:", error);
            return [];
          }),
          api.products({ category: String(id) }).catch((error) => {
            console.warn("Home category products unavailable:", error);
            return [];
          }),
          api.itemCategories(String(id)).catch((error) => {
            console.warn("Configured item categories unavailable; using product categories:", error);
            return [];
          }),
        ]);

        if (!mounted) return;

        const availableCategories = Array.isArray(categoryList) ? categoryList : [];
        setParentCategory(
          availableCategories.find((category: any) => String(category.id) === String(id)) || null
        );
        setProducts(Array.isArray(productList) ? productList : []);
        setConfiguredItemCategories(Array.isArray(itemCategoryList) ? itemCategoryList : []);
        setSelectedItemCategory("All");
      } catch (error) {
        console.warn("Unable to load Home category browser:", error);
        if (mounted) {
          setParentCategory(null);
          setProducts([]);
          setConfiguredItemCategories([]);
          setSelectedItemCategory("All");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const itemCategories = useMemo(() => {
    if (configuredItemCategories.length) return configuredItemCategories;

    const byId = new Map<string, any>();
    for (const product of products) {
      const name = String(product?.item_category || "").trim();
      if (!name) continue;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const key = String(product?.item_category_id || "legacy-" + slug);
      if (!byId.has(key)) {
        byId.set(key, {
          id: key,
          name,
          icon: String(product?.item_category_icon || "tag-outline"),
        });
      }
    }
    return Array.from(byId.values());
  }, [configuredItemCategories, products]);

  const filteredProducts = useMemo(() => {
    if (selectedItemCategory === "All") return products;

    const selected = itemCategories.find(
      (category: any) => categoryKey(category) === selectedItemCategory
    );
    if (!selected) return products;

    const selectedId = String(selected.id ?? selected._id ?? "");
    const selectedName = String(selected.name || "").trim().toLowerCase();
    return products.filter((product: any) => {
      const productItemId = String(product?.item_category_id || "");
      const productItemName = String(product?.item_category || "").trim().toLowerCase();
      return (selectedId && productItemId === selectedId) ||
        (selectedName && productItemName === selectedName);
    });
  }, [products, selectedItemCategory, itemCategories]);

  const parentName = String(parentCategory?.name || routeName || "Shop by Category");
  const selectedName =
    selectedItemCategory === "All"
      ? "All Products"
      : itemCategories.find((category: any) => categoryKey(category) === selectedItemCategory)?.name || "Products";
  const bottomPad = itemCount > 0 ? 155 : 40;

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="home-category-screen">
      <View style={s.header}>
        <Pressable
          style={s.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/home" as any);
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <View style={s.headerText}>
          <NativeText style={s.headerTitle} numberOfLines={1}>{parentName}</NativeText>
          <NativeText style={s.headerSubtitle}>Shop by item category</NativeText>
        </View>
        <Pressable
          style={s.searchButton}
          onPress={() => router.push("/search" as any)}
          accessibilityRole="button"
          accessibilityLabel="Search products"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="magnify" size={21} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={s.body}>
        <View style={s.categoryRail}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.categoryRailContent, { paddingBottom: bottomPad }]}
          >
            <Pressable
              testID="item-cat-rail-all"
              accessibilityRole="button"
              onPress={() => setSelectedItemCategory("All")}
              style={[s.categoryItem, selectedItemCategory === "All" && s.categoryItemActive]}
            >
              <View style={[s.categoryIcon, selectedItemCategory === "All" && s.categoryIconActive]}>
                <MaterialCommunityIcons
                  name="view-grid-outline"
                  size={21}
                  color={selectedItemCategory === "All" ? "#fff" : COLORS.textMuted}
                />
              </View>
              <NativeText
                style={[s.categoryLabel, selectedItemCategory === "All" && s.categoryLabelActive]}
                numberOfLines={2}
              >
                All
              </NativeText>
            </Pressable>

            {itemCategories.map((category: any) => {
              const key = categoryKey(category);
              const active = selectedItemCategory === key;
              const iconName = category.icon || itemCategoryIcon(category.name);
              return (
                <Pressable
                  key={key}
                  testID={"item-cat-rail-" + key}
                  accessibilityRole="button"
                  onPress={() => setSelectedItemCategory(key)}
                  style={[s.categoryItem, active && s.categoryItemActive]}
                >
                  <View style={[s.categoryIcon, active && s.categoryIconActive]}>
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={21}
                      color={active ? "#fff" : COLORS.textMuted}
                    />
                  </View>
                  <NativeText
                    style={[s.categoryLabel, active && s.categoryLabelActive]}
                    numberOfLines={2}
                  >
                    {category.name}
                  </NativeText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={s.productsPanel}>
          <View style={s.productsHeading}>
            <NativeText style={s.productsTitle} numberOfLines={1}>{selectedName}</NativeText>
            <NativeText style={s.productsCount}>
              {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}
            </NativeText>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={COLORS.brand} />
            </View>
          ) : (
            <ScrollView
              style={s.productScroll}
              contentContainerStyle={[s.productScrollContent, { paddingBottom: bottomPad }]}
              showsVerticalScrollIndicator={false}
            >
              {filteredProducts.length > 0 ? (
                <View style={s.productGrid}>
                  {filteredProducts.map((product: any) => (
                    <View key={String(product.id ?? product._id)} style={s.productCell}>
                      <CategoryProductTile p={product} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.empty}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={48}
                    color={COLORS.textMuted}
                  />
                  <NativeText style={s.emptyTitle}>
                    {itemCategories.length && selectedItemCategory === "All"
                      ? "No products available in this category yet."
                      : "No products in this item category yet."}
                  </NativeText>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      <CheckoutBar label="View Cart" route="/cart" bottomOffset={16} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
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
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  searchButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSecondary,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  categoryRail: {
    width: RAIL_WIDTH,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  categoryRailContent: {
    paddingVertical: 8,
    paddingHorizontal: 6,
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
    fontSize: 10.5,
    lineHeight: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  categoryLabelActive: {
    color: COLORS.text,
    fontWeight: "800",
  },
  productsPanel: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
  },
  productsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productsTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  productsCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  productScroll: {
    flex: 1,
    minWidth: 0,
  },
  productScrollContent: {
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  productGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },
  productCell: {
    width: "50%",
    minWidth: 0,
    paddingHorizontal: 4,
    paddingBottom: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 56,
    gap: 10,
  },
  emptyTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
