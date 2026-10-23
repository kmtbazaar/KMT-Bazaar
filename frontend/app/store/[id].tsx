import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text as NativeText,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { useCart } from "@/src/CartContext";
import { useWishlist } from "@/src/WishlistContext";
import CheckoutBar from "@/src/components/CheckoutBar";
import { COLORS, IMAGE_FALLBACK_URL, RADIUS, SPACING } from "@/src/theme";

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

function StoreProductTile({ p }: { p: any }) {
  const router = useRouter();
  const { add, update, cart } = useCart();
  const { isWishlisted, toggle, ready } = useWishlist();
  const [imageIndex, setImageIndex] = useState(0);

  const productName = String(
    p?.name || p?.product_name || p?.productName || p?.title || "Product"
  ).trim();
  const productUnit = String(
    p?.unit || p?.quantity_label || p?.unit_label || p?.unit_name ||
    p?.pack_size || p?.size || p?.weight || p?.volume || ""
  ).trim();

  const imageCandidates = useMemo(() => {
    const raw = [
      p?.image,
      ...(Array.isArray(p?.images) ? p.images : []),
      p?.image_url,
      p?.imageUrl,
      p?.photo_url,
    ];
    const candidates: string[] = [];
    for (const value of raw) {
      const url = typeof value === "string"
        ? value.trim()
        : value && typeof value === "object"
          ? String(value.url || value.uri || value.src || "").trim()
          : "";
      if (!url) continue;
      candidates.push(url);
      // Legacy images can have a .tech hostname. Try the production host as well.
      if (/^https?:\/\/kmtbazaar\.tech\/uploads\//i.test(url)) {
        candidates.push(url.replace(/^https?:\/\/kmtbazaar\.tech/i, "https://kmtbazaar.com"));
      }
    }
    return Array.from(new Set(candidates));
  }, [p?.image, p?.images, p?.image_url, p?.imageUrl, p?.photo_url]);

  const imageKey = imageCandidates.join("|");
  useEffect(() => setImageIndex(0), [p?.id, imageKey]);
  const imageUri = imageCandidates[imageIndex] || IMAGE_FALLBACK_URL;

  const id = String(p?.id ?? p?._id ?? "");
  const cartItem = cart?.items?.find(
    (item: any) => String(item.product_id ?? item.id) === id
  );
  const quantityInCart = Number(cartItem?.quantity || 0);
  const stock = Number(p?.stock ?? p?.available_quantity ?? p?.quantity_in_stock ?? 0);
  const outOfStock = stock <= 0;
  const wished = isWishlisted(id);

  return (
    <View style={s.storeTile}>
      <View style={s.storeTileImageWrap}>
        <Pressable
          style={s.storeTileImagePress}
          onPress={() => router.push(("/product/" + encodeURIComponent(id)) as any)}
          accessibilityRole="button"
          accessibilityLabel={"View " + productName}
        >
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={150}
            onError={() => setImageIndex((current) =>
              current < imageCandidates.length ? current + 1 : current
            )}
          />
        </Pressable>
        <Pressable
          style={s.storeTileWish}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remove from wishlist" : "Add to wishlist"}
          disabled={!ready}
          onPress={() => toggle(p)}
        >
          <MaterialCommunityIcons
            name="heart"
            size={18}
            color={wished ? "#E11D48" : "#FFFFFF"}
          />
        </Pressable>
      </View>

      <View style={s.storeTileBody}>
        <NativeText style={s.storeTileName} numberOfLines={2}>
          {productName}
        </NativeText>
        <NativeText style={s.storeTileUnit} numberOfLines={1}>
          {productUnit || " "}
        </NativeText>

        <View style={s.storeTilePriceRow}>
          <View style={{ flexShrink: 1 }}>
            <NativeText style={s.storeTilePrice}>
              {p?.price != null ? ("₹" + p.price) : "Price unavailable"}
            </NativeText>
            {Number(p?.mrp) > Number(p?.price) && (
              <NativeText style={s.storeTileMrp}>{"₹" + p.mrp}</NativeText>
            )}
          </View>

          {quantityInCart > 0 ? (
            <View style={s.storeTileStepper}>
              <Pressable
                style={s.storeTileStepButton}
                accessibilityRole="button"
                accessibilityLabel={"Remove one " + productName}
                onPress={() => void update(id, Math.max(0, quantityInCart - 1)).catch(() => {})}
              >
                <MaterialCommunityIcons name="minus" size={14} color="#FFFFFF" />
              </Pressable>
              <NativeText style={s.storeTileQuantity}>{quantityInCart}</NativeText>
              <Pressable
                style={s.storeTileStepButton}
                accessibilityRole="button"
                accessibilityLabel={"Add one " + productName}
                disabled={quantityInCart >= stock}
                onPress={() => void update(id, quantityInCart + 1).catch(() => {})}
              >
                <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[s.storeTileAddButton, outOfStock && s.storeTileAddDisabled]}
              accessibilityRole="button"
              accessibilityLabel={"Add " + productName + " to cart"}
              disabled={outOfStock}
              onPress={() => void add(id, 1).catch(() => {})}
            >
              <MaterialCommunityIcons
                name="plus"
                size={14}
                color={outOfStock ? COLORS.textMuted : COLORS.accent}
              />
              <NativeText style={[s.storeTileAddText, outOfStock && { color: COLORS.textMuted }]}>
                {outOfStock ? "OUT OF STOCK" : "ADD"}
              </NativeText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
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
  const [adminItemCategories, setAdminItemCategories] = useState<any[]>([]);
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
          api.stores().catch((error) => {
            console.warn("Store list unavailable; continuing to load store products:", error);
            return [];
          }),
          api.categories().catch((error) => {
            console.warn("Global categories unavailable; continuing to load store products:", error);
            return [];
          }),
          api.products({ store_id: id }).catch((error) => {
            console.error("Store products request failed:", error);
            return [];
          }),
        ]);

        const selectedStore = (storeList || []).find(
          (item: any) => String(item.id) === String(id)
        );

        const storeProducts = Array.isArray(productList)
          ? productList.filter(
              (product: any) => String(product.store_id) === String(id)
            )
          : [];

        const configuredItemCategories = selectedStore
          ? await api.itemCategories(undefined, id).catch((error) => {
              console.warn("Store item categories unavailable; deriving categories from products:", error);
              return [];
            })
          : [];

        if (!mounted) return;

        setStore(selectedStore || null);
        setCategories(categoryList || []);
        setAdminItemCategories(configuredItemCategories || []);
        setProducts(storeProducts);
        setSelectedItemCategory("All");
      } catch (error) {
        console.error("Failed to load store:", error);
        if (mounted) {
          setStore(null);
          setCategories([]);
          setAdminItemCategories([]);
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
    if (adminItemCategories.length) {
      return adminItemCategories;
    }

    const legacyNames = Array.from(
      new Set(
        products
          .map((product: any) => String(product.item_category || "").trim())
          .filter(Boolean)
      )
    );

    return legacyNames.map((name: string) => ({
      id: `legacy-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
    }));
  }, [adminItemCategories, products]);

  const filteredProducts = useMemo(() => {
    if (selectedItemCategory === "All") return products;

    const selected = itemCategories.find(
      (category: any) => String(category.id) === String(selectedItemCategory)
    );
    if (!selected) return products;

    return products.filter((product: any) =>
      String(product.item_category_id || "") === String(selected.id) ||
      String(product.item_category || "").toLowerCase() === String(selected.name || "").toLowerCase()
    );
  }, [products, selectedItemCategory, itemCategories]);

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

            {itemCategories.map((category: any) => {
              const active = String(selectedItemCategory) === String(category.id);
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedItemCategory(category.id)}
                  style={[s.categoryItem, active && s.categoryItemActive]}
                >
                  <View style={[s.categoryIcon, active && s.categoryIconActive]}>
                    <MaterialCommunityIcons
                      name={itemCategoryIcon(category.name)}
                      size={21}
                      color={active ? "#fff" : COLORS.textMuted}
                    />
                  </View>
                  <Text
                    style={[s.categoryLabel, active && s.categoryLabelActive]}
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={s.productList}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.productsHeading}>
            <NativeText style={s.productsTitle}>
              {selectedItemCategory === "All"
                ? "All Products"
                : itemCategories.find(
                    (category: any) => String(category.id) === String(selectedItemCategory)
                  )?.name || selectedItemCategory}
            </NativeText>
            <NativeText style={s.productsCount}>
              {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}
            </NativeText>
          </View>

          {filteredProducts.length > 0 ? (
            <View style={s.productGrid}>
              {filteredProducts.map((item: any) => (
                <View key={String(item.id ?? item._id)} style={s.gridCell}>
                  <StoreProductTile p={item} />
                </View>
              ))}
            </View>
          ) : (
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
          )}
        </ScrollView>
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

  productList: {
    flex: 1,
    minWidth: 0,
  },

  listContent: {
    paddingHorizontal: 2,
    paddingBottom: 100,
    flexGrow: 1,
  },

  productGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
  },

  gridCell: {
    width: "50%",
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 3,
    alignSelf: "stretch",
  },

  storeTile: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 2,
  },
  storeTileImageWrap: {
    width: "100%",
    height: 124,
    position: "relative",
    backgroundColor: COLORS.surfaceSecondary,
    overflow: "hidden",
  },
  storeTileImagePress: {
    width: "100%",
    height: "100%",
  },
  storeTileWish: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.44)",
    alignItems: "center",
    justifyContent: "center",
  },
  storeTileBody: {
    paddingHorizontal: 7,
    paddingTop: 7,
    paddingBottom: 8,
  },
  storeTileName: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    minHeight: 34,
  },
  storeTileUnit: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    minHeight: 15,
  },
  storeTilePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 7,
  },
  storeTilePrice: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  storeTileMrp: {
    color: COLORS.textMuted,
    fontSize: 10,
    textDecorationLine: "line-through",
  },
  storeTileAddButton: {
    height: 29,
    minWidth: 52,
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  storeTileAddDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  storeTileAddText: {
    color: COLORS.accentDark,
    fontSize: 9,
    fontWeight: "900",
  },
  storeTileStepper: {
    height: 29,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  storeTileStepButton: {
    width: 20,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  storeTileQuantity: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 16,
    textAlign: "center",
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
