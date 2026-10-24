import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useState, useRef } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Animated, Text as NativeText } from "react-native";
import { Image } from "expo-image";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, IMAGE_FALLBACK_URL, RADIUS, SPACING } from "@/src/theme";
import ImagePlaceholder from "@/src/components/ImagePlaceholder";
import CheckoutBar from "@/src/components/CheckoutBar";
import { useCart } from "@/src/CartContext";
import { useWishlist } from "@/src/WishlistContext";

const RAIL_WIDTH = 88;


function CategoryProductTile({ p }: { p: any }) {
  const router = useRouter();
  const { add, update, cart } = useCart();
  const { isWishlisted, toggle: toggleWishlist, ready: wishlistReady } = useWishlist();
  const [imageIndex, setImageIndex] = useState(0);

  const firstProductText = (...values: any[]) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value);
    }
    return "";
  };

  const productName =
    firstProductText(p?.name, p?.product_name, p?.productName, p?.title) || "Product";
  const productUnit = firstProductText(
    p?.unit,
    p?.quantity_label,
    p?.unit_label,
    p?.unit_name,
    p?.pack_size,
    p?.size,
    p?.weight,
    p?.volume,
    p?.quantity
  );

  const imageCandidates = React.useMemo(() => {
    const rawValues = [
      p?.image,
      ...(Array.isArray(p?.images) ? p.images : []),
      p?.image_url,
      p?.imageUrl,
      p?.photo_url,
    ];
    const candidates: string[] = [];
    for (const value of rawValues) {
      let url =
        typeof value === "string"
          ? value.trim()
          : value && typeof value === "object"
            ? String(value.url || value.uri || value.src || "").trim()
            : "";
      if (!url) continue;

      if (url.startsWith("/")) {
        url = "https://kmtbazaar.com" + url;
      } else if (/^uploads\//i.test(url)) {
        url = "https://kmtbazaar.com/" + url;
      }

      candidates.push(url);
      // Older records may reference .tech, which is retained as a backup host.
      if (/^https?:\/\/kmtbazaar\.tech\/uploads\//i.test(url)) {
        candidates.push(url.replace(/^https?:\/\/kmtbazaar\.tech/i, "https://kmtbazaar.com"));
      }
    }
    return Array.from(new Set(candidates));
  }, [p?.image, p?.images, p?.image_url, p?.imageUrl, p?.photo_url]);

  const imageCandidatesKey = imageCandidates.join("|");
  useEffect(() => {
    setImageIndex(0);
  }, [p?.id, imageCandidatesKey]);
  const imageUri = imageCandidates[imageIndex] || IMAGE_FALLBACK_URL;

  const productId = String(p?.id ?? p?._id ?? "");
  const cartItem = cart?.items?.find(
    (item: any) => String(item.product_id ?? item.id) === productId
  );
  const quantityInCart = Number(cartItem?.quantity || 0);
  const stock = Number(p?.stock ?? p?.available_quantity ?? p?.quantity_in_stock ?? 0);
  const outOfStock = stock <= 0;
  const wished = isWishlisted(productId);

  return (
    <View style={s.categoryProductTile}>
      <View style={s.categoryProductImageWrap}>
        <Pressable
          style={s.categoryProductImagePress}
          onPress={() => router.push(("/product/" + encodeURIComponent(productId)) as any)}
          accessibilityRole="button"
          accessibilityLabel={"View " + productName}
        >
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={150}
            onError={() =>
              setImageIndex((current) =>
                current < imageCandidates.length ? current + 1 : current
              )
            }
          />
        </Pressable>
        <Pressable
          style={s.categoryProductWish}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remove from wishlist" : "Add to wishlist"}
          disabled={!wishlistReady}
          onPress={() => toggleWishlist(p)}
        >
          <MaterialCommunityIcons
            name="heart"
            size={18}
            color={wished ? "#E11D48" : "#FFFFFF"}
          />
        </Pressable>
      </View>

      <View style={s.categoryProductBody}>
        <NativeText style={s.categoryProductName} numberOfLines={2}>
          {productName}
        </NativeText>
        <NativeText style={s.categoryProductUnit} numberOfLines={1}>
          {productUnit || " "}
        </NativeText>
        <View style={s.categoryProductPriceRow}>
          <View style={{ flexShrink: 1 }}>
            <NativeText style={s.categoryProductPrice}>
              {p?.price != null ? "₹" + p.price : "Price unavailable"}
            </NativeText>
            {Number(p?.mrp) > Number(p?.price) && (
              <NativeText style={s.categoryProductMrp}>{"₹" + p.mrp}</NativeText>
            )}
          </View>

          {quantityInCart > 0 ? (
            <View style={s.categoryProductStepper}>
              <Pressable
                style={s.categoryProductStepButton}
                accessibilityRole="button"
                accessibilityLabel={"Remove one " + productName}
                onPress={() =>
                  void update(productId, Math.max(0, quantityInCart - 1)).catch(() => {})
                }
              >
                <MaterialCommunityIcons name="minus" size={14} color="#FFFFFF" />
              </Pressable>
              <NativeText style={s.categoryProductQuantity}>{quantityInCart}</NativeText>
              <Pressable
                style={s.categoryProductStepButton}
                accessibilityRole="button"
                accessibilityLabel={"Add one " + productName}
                disabled={quantityInCart >= stock}
                onPress={() => void update(productId, quantityInCart + 1).catch(() => {})}
              >
                <MaterialCommunityIcons name="plus" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                s.categoryProductAddButton,
                outOfStock && s.categoryProductAddDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={"Add " + productName + " to cart"}
              disabled={outOfStock}
              onPress={() => void add(productId, 1).catch(() => {})}
            >
              <MaterialCommunityIcons
                name="plus"
                size={14}
                color={outOfStock ? COLORS.textMuted : COLORS.accent}
              />
              <NativeText
                style={[
                  s.categoryProductAddText,
                  outOfStock && { color: COLORS.textMuted },
                ]}
              >
                {outOfStock ? "OUT OF STOCK" : "ADD"}
              </NativeText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function Categories() {
  const router = useRouter();
  const navigation = useNavigation();
  const { categoryId } = useLocalSearchParams<{ categoryId?: string | string[] }>();
  const requestedCategoryId = Array.isArray(categoryId) ? categoryId[0] : categoryId;
  // Home Shop by Category opens this screen with its parent category ID.
  const homeCategoryMode = Boolean(requestedCategoryId);
  const [cats, setCats] = useState<any[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<string>("");
  const [shopItemCategories, setShopItemCategories] = useState<any[]>([]);
  const [selectedItemCategory, setSelectedItemCategory] = useState<string>("All");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { itemCount } = useCart();

  // Animated Value for Slide Up / Slide Down Animation (0 = Visible, 100 = Hidden Below Screen)
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);
  const isHidden = useRef(false);

  const handleScroll = (event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastOffsetY.current;

    // Minimum 10px scroll sensitivity
    if (Math.abs(diff) > 10) {
      if (diff > 0 && currentOffsetY > 50 && !isHidden.current) {
        // Scroll DOWN -> Smooth Slide Down (Hide Tab Bar)
        isHidden.current = true;
        Animated.timing(translateYAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            navigation.setOptions({
              tabBarStyle: {
                position: "absolute",
                borderTopColor: COLORS.border,
                backgroundColor: "#FFFFFF",
                height: 65,
                paddingTop: 4,
                paddingBottom: 12,
                transform: [{ translateY: 100 }],
              },
            });
          }
        });
      } else if (diff < 0 && isHidden.current) {
        // Scroll UP -> Smooth Slide Up (Show Tab Bar)
        isHidden.current = false;
        navigation.setOptions({
          tabBarStyle: {
            position: "absolute",
            borderTopColor: COLORS.border,
            backgroundColor: "#FFFFFF",
            height: 65,
            paddingTop: 4,
            paddingBottom: 12,
            transform: [{ translateY: translateYAnim }],
          },
        });
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
      lastOffsetY.current = currentOffsetY;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const requestedId = Array.isArray(categoryId) ? categoryId[0] : categoryId;

    const loadCategories = async () => {
      try {
        const result = await api.categories();
        if (cancelled) return;

        const availableCategories = Array.isArray(result) ? result : [];
        setCats(availableCategories);

        const requestedCategory = requestedId
          ? availableCategories.find(
              (category) => String(category.id) === String(requestedId)
            )
          : null;

        if (requestedCategory) {
          setActive(String(requestedCategory.id));
        } else if (availableCategories.length) {
          let availableProductCategories = new Set<string>();
          if (!requestedId) {
            try {
              const allProducts = await api.products();
              if (cancelled) return;
              availableProductCategories = new Set(
                (Array.isArray(allProducts) ? allProducts : [])
                  .map((product: any) => String(product.category_id || ""))
                  .filter(Boolean)
              );
            } catch (error) {
              console.warn("Catalog products unavailable while selecting a default category:", error);
            }
          }
          const firstCategoryWithProducts = availableCategories.find(
            (category) => availableProductCategories.has(String(category.id))
          );
          setActive(String((firstCategoryWithProducts || availableCategories[0]).id));
        } else if (requestedId) {
          // The page was opened from Home; still try fetching that category's products.
          setActive(String(requestedId));
        }
      } catch (error) {
        console.warn("Category list unavailable; loading selected category by ID:", error);
        if (!cancelled && requestedId) setActive(String(requestedId));
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoadingProducts(true);
    (async () => {
      try {
        const p = await api.products({ category: active });
        if (!cancelled) setProducts(p);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!homeCategoryMode || !active) {
      setShopItemCategories([]);
      setSelectedItemCategory("All");
      return;
    }

    let cancelled = false;
    setSelectedItemCategory("All");

    (async () => {
      try {
        const result = await api.itemCategories(active);
        if (!cancelled) {
          setShopItemCategories(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.warn("Shop item categories unavailable; deriving from this category's products:", error);
        if (!cancelled) setShopItemCategories([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, homeCategoryMode]);

  const itemCategoryChoices = React.useMemo(() => {
    if (shopItemCategories.length) return shopItemCategories;

    const byId = new Map<string, any>();
    for (const product of products) {
      const name = String(product?.item_category || "").trim();
      if (!name) continue;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const id = String(product?.item_category_id || ("legacy-" + slug));
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name,
          icon: String(product?.item_category_icon || "tag-outline"),
        });
      }
    }
    return Array.from(byId.values());
  }, [shopItemCategories, products]);

  const visibleProducts = React.useMemo(() => {
    if (!homeCategoryMode || selectedItemCategory === "All") return products;
    const selected = itemCategoryChoices.find(
      (category: any) => String(category.id) === String(selectedItemCategory)
    );
    if (!selected) return products;

    const selectedId = String(selected.id);
    const selectedName = String(selected.name || "").trim().toLowerCase();
    return products.filter((product: any) => {
      const productItemId = String(product?.item_category_id || "");
      const productItemName = String(product?.item_category || "").trim().toLowerCase();
      return (productItemId && productItemId === selectedId) ||
        (productItemName && productItemName === selectedName);
    });
  }, [products, homeCategoryMode, selectedItemCategory, itemCategoryChoices]);

  const activeCat = cats.find((c) => String(c.id) === String(active));
  const bottomPad = itemCount > 0 ? 140 : 24;

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="categories-screen">
      <View style={s.header}>
        <Text style={s.title}>{homeCategoryMode && activeCat ? activeCat.name : "Categories"}</Text>
        <Pressable
          testID="search-btn"
          onPress={() => router.push("/(tabs)/home" as any)}
          hitSlop={8}
          style={s.searchPill}
        >
          <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
          <Text style={s.searchText}>Search</Text>
        </Pressable>
      </View>

      <View style={s.body}>
        {/* Side rail */}
        <View style={s.railWrap}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
            {homeCategoryMode ? (
              <>
                <Pressable
                  testID="item-cat-rail-all"
                  onPress={() => setSelectedItemCategory("All")}
                  style={[s.railItem, selectedItemCategory === "All" && s.railItemActive]}
                >
                  {selectedItemCategory === "All" && <View style={s.railBar} />}
                  <View style={[
                    s.railImgWrap,
                    { alignItems: "center", justifyContent: "center", backgroundColor: selectedItemCategory === "All" ? COLORS.accent : COLORS.surfaceSecondary },
                    selectedItemCategory === "All" && s.railImgWrapActive,
                  ]}>
                    <MaterialCommunityIcons
                      name="view-grid-outline"
                      size={22}
                      color={selectedItemCategory === "All" ? "#FFFFFF" : COLORS.textMuted}
                    />
                  </View>
                  <Text style={[s.railLabel, selectedItemCategory === "All" && { color: COLORS.brand, fontWeight: "800" }]} numberOfLines={2}>
                    All
                  </Text>
                </Pressable>

                {itemCategoryChoices.map((itemCategory: any) => {
                  const itemId = String(itemCategory.id);
                  const isActive = selectedItemCategory === itemId;
                  const iconName = String(itemCategory.icon || "tag-outline") as any;
                  return (
                    <Pressable
                      key={itemId}
                      testID={`item-cat-rail-${itemId}`}
                      onPress={() => setSelectedItemCategory(itemId)}
                      style={[s.railItem, isActive && s.railItemActive]}
                    >
                      {isActive && <View style={s.railBar} />}
                      <View style={[
                        s.railImgWrap,
                        { alignItems: "center", justifyContent: "center", backgroundColor: isActive ? COLORS.accent : COLORS.surfaceSecondary },
                        isActive && s.railImgWrapActive,
                      ]}>
                        <MaterialCommunityIcons
                          name={iconName}
                          size={22}
                          color={isActive ? "#FFFFFF" : COLORS.textMuted}
                        />
                      </View>
                      <Text
                        style={[s.railLabel, isActive && { color: COLORS.brand, fontWeight: "800" }]}
                        numberOfLines={2}
                      >
                        {itemCategory.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            ) : (
              cats.map((c) => {
                const isActive = String(active) === String(c.id);
                const hasImage = Boolean(c.image) && !brokenImages[String(c.id)];
                return (
                  <Pressable
                    key={c.id}
                    testID={`cat-rail-${c.id}`}
                    onPress={() => setActive(String(c.id))}
                    style={[s.railItem, isActive && s.railItemActive]}
                  >
                    {isActive && <View style={s.railBar} />}
                    <View style={[s.railImgWrap, isActive && s.railImgWrapActive]}>
                      {hasImage ? (
                        <Image
                          source={{ uri: c.image }}
                          style={s.railImg}
                          contentFit="cover"
                          onError={() => setBrokenImages(prev => ({ ...prev, [String(c.id)]: true }))}
                        />
                      ) : (
                        <ImagePlaceholder type="category" style={s.railImg} />
                      )}
                    </View>
                    <Text
                      style={[s.railLabel, isActive && { color: COLORS.brand, fontWeight: "800" }]}
                      numberOfLines={2}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Product grid */}
        <View style={s.gridWrap}>
          {activeCat && (
            <View style={s.gridHeader}>
              <Text style={s.gridTitle} numberOfLines={1}>{activeCat.name}</Text>
              <Text style={s.gridCount}>{visibleProducts.length} items</Text>
            </View>
          )}
          {loadingProducts ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator color={COLORS.brand} />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1, minWidth: 0 }}
              contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: bottomPad, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {visibleProducts.length > 0 ? (
                <View style={s.productGrid}>
                  {visibleProducts.map((item) => (
                    <View key={String(item.id ?? item._id)} style={s.productCell}>
                      <CategoryProductTile p={item} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={s.emptyWrap}>
                  <MaterialCommunityIcons name="package-variant" size={48} color={COLORS.textMuted} />
                  <Text style={s.empty}>No products in this category</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      <CheckoutBar />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  body: { flex: 1, flexDirection: "row" },
  railWrap: {
    width: RAIL_WIDTH,
    backgroundColor: COLORS.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    flexShrink: 0,
  },
  railItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    width: RAIL_WIDTH,
  },
  railItemActive: { backgroundColor: COLORS.surface },
  railBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: COLORS.brand,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  railImgWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 6,
  },
  railImgWrapActive: { borderColor: COLORS.brand },
  railImg: { width: "100%", height: "100%" },
  railLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
    paddingHorizontal: 2,
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
  categoryProductTile: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  categoryProductImageWrap: {
    width: "100%",
    height: 120,
    position: "relative",
    backgroundColor: COLORS.surfaceSecondary,
    overflow: "hidden",
  },
  categoryProductImagePress: { width: "100%", height: "100%" },
  categoryProductWish: {
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
  categoryProductBody: { paddingHorizontal: 7, paddingTop: 7, paddingBottom: 8 },
  categoryProductName: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    minHeight: 34,
  },
  categoryProductUnit: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    minHeight: 15,
  },
  categoryProductPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 7,
  },
  categoryProductPrice: { color: COLORS.text, fontSize: 14, fontWeight: "900" },
  categoryProductMrp: {
    color: COLORS.textMuted,
    fontSize: 10,
    textDecorationLine: "line-through",
  },
  categoryProductAddButton: {
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
  categoryProductAddDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  categoryProductAddText: { color: COLORS.accentDark, fontSize: 9, fontWeight: "900" },
  categoryProductStepper: {
    height: 29,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  categoryProductStepButton: {
    width: 20,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryProductQuantity: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 16,
    textAlign: "center",
  },

  gridWrap: { flex: 1, minWidth: 0 },
  gridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gridTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, flex: 1, marginRight: 8 },
  gridCount: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  empty: { textAlign: "center", color: COLORS.textMuted, fontSize: 13 },
});
