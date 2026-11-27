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
import BrandMark, { isKnownBrand } from "@/src/components/BrandMark";

const RAIL_WIDTH = 88;

function itemCategoryIcon(name: string): any {
  const key = String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const has = (...terms: string[]) => terms.some((term) => key.includes(term));

  // Apparel and fashion.
  if (has("t shirt", "tshirt", "shirt", "topwear", "top wear", "polo", "blouse")) return "tshirt-crew-outline";
  if (has("jean", "denim", "trouser", "pant", "legging", "bottomwear", "bottom wear")) return "hanger";
  if (has("saree", "sari", "kurti", "dress", "gown", "ethnic wear")) return "human-female-dress";
  if (has("footwear", "shoe", "sneaker", "sandal", "slipper")) return "shoe-sneaker";
  if (has("watch", "smartwatch")) return "watch";
  if (has("bag", "luggage", "backpack", "wallet", "purse")) return "bag-personal-outline";
  if (has("jewellery", "jewelry", "necklace", "earring", "ring")) return "diamond-stone";
  if (has("eyewear", "glasses", "sunglasses")) return "sunglasses";
  if (has("fashion", "clothing", "apparel", "garment", "wear")) return "hanger";

  // Grocery and food.
  if (has("fruit", "fruits")) return "fruit-cherries";
  if (has("vegetable", "vegetables", "veggie")) return "carrot";
  if (has("rice", "atta", "dal", "grain", "flour", "pulses", "cereal")) return "grain";
  if (has("dairy", "milk", "cheese", "butter", "curd", "yogurt")) return "cow";
  if (has("snack", "chips", "biscuit", "cookie", "chocolate", "sweet", "dessert")) return "food";
  if (has("beverage", "drink", "juice", "tea", "coffee", "water")) return "cup-outline";
  if (has("grocery", "groceries", "supermarket", "general store", "daily needs", "household")) return "basket-outline";

  // Electronics and accessories.
  if (has("mobile", "phone", "smartphone", "tablet")) return "cellphone";
  if (has("laptop", "computer", "desktop")) return "laptop";
  if (has("audio", "headphone", "earphone", "speaker", "sound")) return "headphones";
  if (has("tv", "television")) return "television";
  if (has("accessor")) return "shopping-outline";

  // Health, beauty and baby care.
  if (has("medicine", "pharmacy", "prescription", "medical", "health")) return "pill";
  if (has("vitamin", "supplement")) return "pill-multiple";
  if (has("baby", "infant", "newborn")) return "baby-face-outline";
  if (has("personal care", "beauty", "cosmetic", "makeup", "skincare", "skin care", "grooming")) return "face-woman";
  if (has("perfume", "fragrance")) return "spray-bottle";

  // Home, kitchen, books, toys and other stores.
  if (has("furniture", "sofa", "chair", "table")) return "sofa";
  if (has("home decor", "decor", "decoration")) return "home-variant-outline";
  if (has("kitchen", "cookware", "utensil", "dinnerware")) return "silverware-fork-knife";
  if (has("appliance", "refrigerator", "washing machine", "microwave")) return "microwave";
  if (has("book", "books", "novel")) return "book-open-page-variant";
  if (has("stationery", "school supplies", "pen", "pencil")) return "pencil-ruler";
  if (has("toy", "toys", "game")) return "teddy-bear";
  if (has("sport", "fitness", "gym", "exercise")) return "dumbbell";
  if (has("car", "automotive", "vehicle", "bike", "automobile")) return "car";
  if (has("pet", "pets", "animal")) return "paw";
  if (has("plant", "flower", "garden")) return "flower";
  if (has("hardware", "tool", "tools")) return "hammer-wrench";
  if (has("home", "household")) return "home-outline";

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
        const [categoryList, productList, itemCategoryList, storeList] = await Promise.all([
          api.categories().catch((error) => {
            console.warn("Home category lookup unavailable:", error);
            return [];
          }),
          api.products({ category: String(id) }).catch((error) => {
            console.warn("Home category products unavailable:", error);
            return [];
          }),
          api.itemCategories(String(id)).catch((error) => {
            console.warn("Global item categories unavailable; loading store categories:", error);
            return [];
          }),
          api.stores().catch((error) => {
            console.warn("Approved stores unavailable while loading store item categories:", error);
            return [];
          }),
        ]);

        const categoryStoreIds = Array.from(new Set(
          (Array.isArray(storeList) ? storeList : [])
            .filter((store: any) => String(store.category_id || "") === String(id))
            .map((store: any) => String(store.id || store._id || ""))
            .filter(Boolean)
        ));
        const storeItemCategoryLists = await Promise.all(
          categoryStoreIds.map((storeId) =>
            api.itemCategories(undefined, storeId).catch((error) => {
              console.warn("Store item categories unavailable for store " + storeId + ":", error);
              return [];
            })
          )
        );

        if (!mounted) return;

        const availableCategories = Array.isArray(categoryList) ? categoryList : [];
        setParentCategory(
          availableCategories.find((category: any) => String(category.id) === String(id)) || null
        );
        setProducts(Array.isArray(productList) ? productList : []);
        setConfiguredItemCategories([
          ...(Array.isArray(itemCategoryList) ? itemCategoryList : []),
          ...storeItemCategoryLists.flatMap((list: any) => Array.isArray(list) ? list : []),
        ]);
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
    const byName = new Map<string, any>();
    const addCategory = (category: any) => {
      const name = String(category?.name || "").trim();
      if (!name) return;
      const nameKey = name.toLowerCase();
      const categoryId = String(category?.id || category?._id || "");
      const existing = byName.get(nameKey);
      if (!existing) {
        const slug = nameKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const matchedIcon = itemCategoryIcon(name);
        byName.set(nameKey, {
          ...category,
          id: categoryId || "legacy-" + slug,
          name,
          categoryIds: categoryId ? [categoryId] : [],
          icon: matchedIcon !== "tag-outline"
            ? matchedIcon
            : String(category?.icon || "tag-outline"),
        });
        return;
      }
      if (categoryId && !existing.categoryIds.includes(categoryId)) {
        existing.categoryIds.push(categoryId);
      }
      if ((!existing.icon || existing.icon === "tag-outline") && category?.icon) {
        existing.icon = category.icon;
      }
    };

    for (const category of configuredItemCategories) addCategory(category);
    // Keep product-derived legacy categories too, even when some configured categories exist.
    for (const product of products) {
      const name = String(product?.item_category || "").trim();
      if (!name) continue;
      addCategory({
        id: String(product?.item_category_id || ""),
        name,
        icon: String(product?.item_category_icon || "tag-outline"),
      });
    }
    return Array.from(byName.values());
  }, [configuredItemCategories, products]);

  const filteredProducts = useMemo(() => {
    if (selectedItemCategory === "All") return products;

    const selected = itemCategories.find(
      (category: any) => categoryKey(category) === selectedItemCategory
    );
    if (!selected) return products;

    const selectedIds = new Set([
      String(selected.id ?? selected._id ?? ""),
      ...(Array.isArray(selected.categoryIds) ? selected.categoryIds.map((value: any) => String(value)) : []),
    ].filter(Boolean));
    const selectedName = String(selected.name || "").trim().toLowerCase();
    return products.filter((product: any) => {
      const productItemId = String(product?.item_category_id || "");
      const productItemName = String(product?.item_category || "").trim().toLowerCase();
      return selectedIds.has(productItemId) ||
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
              const matchedIcon = itemCategoryIcon(category.name);
              const iconName = matchedIcon !== "tag-outline"
                ? matchedIcon
                : category.icon || matchedIcon;
              return (
                <Pressable
                  key={key}
                  testID={"item-cat-rail-" + key}
                  accessibilityRole="button"
                  onPress={() => setSelectedItemCategory(key)}
                  style={[s.categoryItem, active && s.categoryItemActive]}
                >
                  <View style={[s.categoryIcon, active && s.categoryIconActive]}>
                    {isKnownBrand(category.name) ? (
                      <BrandMark brand={category.name} size={22} />
                    ) : (
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={21}
                        color={active ? "#fff" : COLORS.textMuted}
                      />
                    )}
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
