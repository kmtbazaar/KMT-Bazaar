import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, Platform } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API, api } from "@/src/api";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import CheckoutBar from "@/src/components/CheckoutBar";
import { useWishlist } from "@/src/WishlistContext";

export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add, update, cart, itemCount } = useCart();
  const { isWishlisted, toggle: toggleWishlist, ready: wishlistReady } = useWishlist();
  const [p, setP] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const selectedVariant = Array.isArray(p?.variants)
    ? p.variants.find((variant: any) => String(variant.id) === String(selectedVariantId)) || p.variants[0] || null
    : null;
  const selectedUnit = String(selectedVariant?.unit || p?.unit || "Standard");
  const selectedPrice = Number(selectedVariant?.price ?? p?.price ?? 0);
  const selectedMrp = Number(selectedVariant?.mrp ?? p?.mrp ?? selectedPrice);
  const availableStock = Math.max(0, Number(selectedVariant?.stock ?? p?.stock ?? p?.available_quantity ?? p?.quantity_in_stock ?? 0));
  const outOfStock = !!p && (p?.is_available === false || availableStock <= 0);
  const wished = isWishlisted(p?.id ?? id);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const productCarouselRef = useRef<ScrollView | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  useEffect(() => { 
    setSelectedImageIndex(0);
    productCarouselRef.current?.scrollTo({ x: 0, animated: false });
    (async () => {
      try {
        const data = await api.product(id as string);
        setSelectedVariantId(Array.isArray(data?.variants) && data.variants.length ? String(data.variants[0].id) : null);
        setP(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })(); 
  }, [id]);

  useEffect(() => {
    if (!p?.id) return;
    let cancelled = false;
    setSuggestionsLoading(true);

    const normalizeProductList = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.products)) return value.products;
      if (Array.isArray(value?.items)) return value.items;
      if (Array.isArray(value?.data)) return value.data;
      return [];
    };

    (async () => {
      let catalogue: any[] = [];

      // Read the public catalogue directly first. This avoids a failure in
      // the shared authenticated API wrapper hiding the entire section.
      try {
        const catalogueUrl = Platform.OS === "web" ? "/api/products" : `${API}/products`;
        const response = await fetch(catalogueUrl, {
          headers: { "Cache-Control": "no-cache" },
        });
        if (response.ok) {
          catalogue = normalizeProductList(await response.json());
        } else {
          console.warn("Recommendation catalogue returned HTTP", response.status);
        }
      } catch (error) {
        console.warn("Direct recommendation catalogue request failed", error);
      }

      // Fallback through the shared API client if the direct request fails.
      if (catalogue.length === 0) {
        try {
          catalogue = normalizeProductList(await api.products({}));
        } catch (error) {
          console.warn("API-client recommendation fallback failed", error);
        }
      }

      if (cancelled) return;

      const currentId = String(p.id);
      const candidates = catalogue.filter(
        (item: any) => item?.id && String(item.id) !== currentId
      );

      // Show related products first, followed by trending and other products.
      const sameStoreAndCategory = candidates.filter(
        (item: any) => p.store_id && item.store_id === p.store_id &&
          (!p.category_id || item.category_id === p.category_id)
      );
      const sameCategory = candidates.filter(
        (item: any) => p.category_id && item.category_id === p.category_id
      );
      const trending = candidates.filter((item: any) => item.trending === true);
      const ordered = [...sameStoreAndCategory, ...sameCategory, ...trending, ...candidates];
      const unique = Array.from(new Map(
        ordered.map((item: any) => [String(item.id), item])
      ).values()).slice(0, 12);

      setSuggestions(unique);
      setSuggestionsLoading(false);
      console.info("Product recommendations loaded:", unique.length);
    })().catch((error) => {
      console.error("Unable to load product recommendations", error);
      if (!cancelled) {
        setSuggestions([]);
        setSuggestionsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [p?.id, p?.category_id, p?.store_id]);

  // FIX 1: Quantity ko hardcoded 1 rakhne ke bajaye Context wale Cart state se read karenge
  const productImages = useMemo(() => Array.from(new Set([...(Array.isArray(p?.images) ? p.images : []), p?.image].filter((url: any) => typeof url === "string" && url.trim()))), [p?.images, p?.image]);

  useEffect(() => {
    if (productImages.length < 2 || carouselWidth <= 0) return;
    const timer = setInterval(() => {
      const nextIndex = (selectedImageIndex + 1) % productImages.length;
      productCarouselRef.current?.scrollTo({ x: nextIndex * carouselWidth, animated: true });
      setSelectedImageIndex(nextIndex);
    }, 4200);
    return () => clearInterval(timer);
  }, [carouselWidth, productImages, selectedImageIndex]);

  const shareProduct = async () => {
    if (!p) return;
    const productUrl = Platform.OS === "web"
      ? `${(globalThis as any).location?.origin || "https://kmtbazaar.com"}/product/${encodeURIComponent(String(p.id || id))}`
      : `https://kmtbazaar.com/product/${encodeURIComponent(String(p.id || id))}`;
    const message = `Check out ${p.name} on KMT Bazaar for ₹${selectedPrice}. ${productUrl}`;
    try {
      if (Platform.OS === "web") {
        const nav = (globalThis as any).navigator;
        if (typeof nav?.share === "function") {
          await nav.share({ title: p.name, text: `₹${selectedPrice} on KMT Bazaar`, url: productUrl });
          return;
        }
        if (typeof nav?.clipboard?.writeText === "function") {
          await nav.clipboard.writeText(message);
          setToast("Product link copied!");
          setTimeout(() => setToast(null), 2200);
          return;
        }
      }
      await Share.share({ title: p.name, message, url: productUrl });
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.message?.toLowerCase?.().includes("cancel")) return;
      try {
        const nav = (globalThis as any).navigator;
        if (typeof nav?.clipboard?.writeText === "function") {
          await nav.clipboard.writeText(message);
          setToast("Product link copied!");
          setTimeout(() => setToast(null), 2200);
          return;
        }
      } catch {}
      setToast("Unable to share right now.");
      setTimeout(() => setToast(null), 2200);
    }
  };

  const currentQty = useMemo(() => {
    const defaultVariantId = Array.isArray(p?.variants) ? p.variants[0]?.id : null;
    const item = cart?.items?.find((i: any) =>
      (i.product_id === p?.id || i.id === p?.id) &&
      (String(i.variant || "") === String(selectedVariant?.id || "") ||
        (!i.variant && selectedVariant?.id && String(selectedVariant.id) === String(defaultVariantId)))
    );
    return item?.quantity || 0;
  }, [cart, p?.id, selectedVariant?.id, p?.variants]);

  const onAddFirstTime = async () => {
    if (outOfStock) return;
    setAdding(true);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    try { 
      await add(p.id, 1, selectedVariant?.id); 
      setToast("Added to cart!"); 
      setTimeout(() => setToast(null), 1500); 
    } finally { 
      setAdding(false); 
    }
  };

  const handleIncrement = async () => {
    if (outOfStock || currentQty >= availableStock) return;
    try { await Haptics.selectionAsync(); } catch {}
    try {
      if (currentQty === 0) await add(p.id, 1, selectedVariant?.id);
      else await update(p.id, currentQty + 1, selectedVariant?.id);
    } catch {}
  };

  const handleDecrement = async () => {
    try { await Haptics.selectionAsync(); } catch {}
    try { await update(p.id, Math.max(0, currentQty - 1), selectedVariant?.id); } catch {}
  };

  const onToggleWishlist = () => {
    try {
      if (Platform.OS === "web") {
        const nav = (globalThis as any).navigator;
        if (typeof nav?.vibrate === "function") nav.vibrate([25, 25, 25]);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {}
    if (p) toggleWishlist(p);
  };

  const handleCheckout = () => {
    router.push("/cart" as any);
  };

  if (loading || !p) return <View style={s.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  const variantOptions = Array.isArray(p.variants) && p.variants.length
    ? p.variants
    : [{ id: null, unit: selectedUnit, price: p.price, mrp: p.mrp, stock: p.stock }];
  const discount = selectedMrp > selectedPrice && selectedMrp > 0
    ? Math.round(((selectedMrp - selectedPrice) / selectedMrp) * 100)
    : 0;
  const checkoutSubtotal = cart?.subtotal || selectedPrice * currentQty;

  return (
    <View style={s.root} testID="product-screen">
      <SafeAreaView edges={["top"]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.hbtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <View style={s.headerActions}>
          <Pressable style={s.hbtn} hitSlop={8} onPress={onToggleWishlist} disabled={!wishlistReady || !p} accessibilityRole="button" accessibilityLabel={wished ? "Remove from wishlist" : "Add to wishlist"} testID="product-detail-wishlist">
            <MaterialCommunityIcons name="heart" size={20} color={wished ? "#E11D48" : "#FFFFFF"} style={s.wishIcon} />
          </Pressable>
          <Pressable style={s.hbtn} hitSlop={8} onPress={() => { void shareProduct(); }} accessibilityRole="button" accessibilityLabel="Share product" testID="share-product">
            <MaterialCommunityIcons name="share-variant" size={20} color={COLORS.text} />
          </Pressable>
        </View>
      </SafeAreaView>
      
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: 190 }} showsVerticalScrollIndicator={false}>
        <View
          style={s.imageCarousel}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setCarouselWidth((current) => current === nextWidth ? current : nextWidth);
          }}
        >
          <ScrollView
            ref={productCarouselRef}
            horizontal
            pagingEnabled
            snapToInterval={carouselWidth || undefined}
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              if (carouselWidth > 0) {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                setSelectedImageIndex(Math.max(0, Math.min(productImages.length - 1, nextIndex)));
              }
            }}
          >
            {productImages.map((uri: string, index: number) => (
              <View
                key={uri + "-" + index}
                style={[s.carouselSlide, carouselWidth > 0 ? { width: carouselWidth } : null]}
              >
                <Image source={{ uri }} style={s.img} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
        </View>
        {productImages.length > 1 ? (
          <View style={s.carouselIndicators} testID="product-image-indicators">
            {productImages.map((uri: string, index: number) => (
              <Pressable
                key={uri + "-indicator-" + index}
                accessibilityRole="button"
                accessibilityLabel={`Show product photo ${index + 1}`}
                onPress={() => {
                  setSelectedImageIndex(index);
                  productCarouselRef.current?.scrollTo({ x: index * carouselWidth, animated: true });
                }}
                style={[s.carouselDot, selectedImageIndex === index && s.carouselDotActive]}
                testID={`product-photo-dot-${index + 1}`}
              />
            ))}
            <Text style={s.carouselCount}>{selectedImageIndex + 1} / {productImages.length}</Text>
          </View>
        ) : null}
        <View style={s.card}>
          <Text style={s.name} testID="product-name">{p.name}</Text>
          <Text style={[s.unit, outOfStock && s.outOfStockText]}>
            {selectedUnit ? `${selectedUnit} · ` : ""}{outOfStock ? "OUT OF STOCK" : `${availableStock} in stock`}
          </Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{selectedPrice}</Text>
            {selectedMrp > selectedPrice && <Text style={s.mrp}>₹{selectedMrp}</Text>}
            {discount > 0 && <View style={s.discPill}><Text style={s.discText}>{discount}% OFF</Text></View>}
          </View>

          <View style={s.variantSelector} testID="product-size-pack-selector">
            <View style={s.variantSelectorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.variantSelectorTitle}>Choose size / pack</Text>
                <Text style={s.variantSelectorSubtitle}>Choose your pack — price and live stock update instantly</Text>
              </View>
              <MaterialCommunityIcons name="package-variant" size={23} color={COLORS.accent} />
            </View>
            <View style={s.variantChoices}>
              {variantOptions.map((variant: any, index: number) => {
                const variantId = variant.id ? String(variant.id) : null;
                const active = String(variantId || "") === String(selectedVariant?.id || "");
                const variantPrice = Number(variant.price ?? p.price ?? 0);
                const variantMrp = Number(variant.mrp ?? variantPrice);
                const variantStock = Math.max(0, Number(variant.stock ?? 0));
                const unavailable = p?.is_available === false || variantStock <= 0;
                return (
                  <Pressable
                    key={variantId || `legacy-${variant.unit || "standard"}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${variant.unit || "standard"} for ₹${variantPrice}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedVariantId(variantId)}
                    style={[s.variantChoice, active && s.variantChoiceActive, unavailable && s.variantChoiceUnavailable]}
                    testID={`product-size-pack-option-${index + 1}`}
                  >
                    <View style={s.variantChoiceTop}>
                      <Text style={[s.variantChoiceUnit, active && s.variantChoiceUnitActive]}>{variant.unit || "Standard"}</Text>
                      {active ? <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.accent} /> : null}
                    </View>
                    <View style={s.variantChoicePriceRow}>
                      <Text style={[s.variantChoicePrice, active && s.variantChoicePriceActive]}>₹{variantPrice}</Text>
                      {variantMrp > variantPrice ? <Text style={s.variantChoiceMrp}>₹{variantMrp}</Text> : null}
                    </View>
                    <Text style={[s.variantChoiceStock, unavailable && s.variantChoiceStockUnavailable]}>
                      {variantStock > 0 ? `${variantStock} available` : "Sold out"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>About this product</Text>
          <Text style={s.desc}>{p.description}</Text>
          <View style={s.deliveryCard}>
            <MaterialCommunityIcons name="moped-electric" size={24} color={COLORS.brand} />
            <View style={{ flex: 1 }}>
              <Text style={s.delTitle}>Free delivery on orders above ₹199</Text>
              <Text style={s.delSub}>Estimated delivery: 30-45 mins</Text>
            </View>
          </View>
        </View>

        <View style={s.suggestionsSection} testID="product-suggestions">
          <View style={s.suggestionsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.suggestionsTitle}>You may also like</Text>
              <Text style={s.suggestionsSubtitle}>More picks for your basket</Text>
            </View>
            <MaterialCommunityIcons name="lightning-bolt" size={21} color={COLORS.brand} />
          </View>

          {suggestionsLoading ? (
            <Text style={s.suggestionsStatus}>Loading recommendations...</Text>
          ) : suggestions.length === 0 ? (
            <Text style={s.suggestionsStatus}>Products are temporarily unavailable. Please try again shortly.</Text>
          ) : (
            <View style={s.suggestionsGrid}>
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <View key={`suggestion-row-${rowIndex}`} style={s.suggestionGridRow}>
                  {suggestions.slice(rowIndex * 3, rowIndex * 3 + 3).map((item: any) => (
                    <View key={item.id} style={s.suggestionGridCell}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${item.name}`}
                        onPress={() => router.push(`/product/${item.id}` as any)}
                        style={s.suggestionCard}
                      >
                        <View style={s.suggestionImageWrap}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={s.suggestionImage} contentFit="cover" />
                          ) : (
                            <View style={s.suggestionImageFallback}>
                              <MaterialCommunityIcons name="image-outline" size={22} color={COLORS.textMuted} />
                            </View>
                          )}
                        </View>
                        <View style={s.suggestionCardBody}>
                          <Text style={s.suggestionCardName} numberOfLines={2}>{item.name}</Text>
                          <View style={s.suggestionCardMeta}>
                            <Text style={s.suggestionCardPrice} numberOfLines={1}>₹{item.price}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${item.name} to cart`}
                              hitSlop={4}
                              disabled={(item.stock ?? 0) <= 0}
                              onPress={(event: any) => {
                                event?.stopPropagation?.();
                                void add(item.id, 1).catch((error: any) => console.warn("Unable to add recommendation to cart", error));
                              }}
                              style={[s.suggestionAddButton, (item.stock ?? 0) <= 0 && s.suggestionAddButtonDisabled]}
                            >
                              <Text style={s.suggestionAddButtonText}>{(item.stock ?? 0) <= 0 ? "OUT" : "ADD +"}</Text>
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  ))}
                  {suggestions.length > rowIndex * 3 && suggestions.length <= rowIndex * 3 + 2 ? (
                    <View style={s.suggestionGridCell} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {toast && (
        <View style={s.toast} testID="add-toast">
          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      {/* Split bottom control; floating sack is the cart shortcut */}
      <View style={[s.bottomBar, Platform.OS === "web" ? ({ position: "fixed" } as any) : null]}>
        <View style={s.actionRow}>
          <View style={s.qtyBox}>
            <Pressable testID="pdp-qty-dec" onPress={handleDecrement} hitSlop={8} disabled={currentQty === 0}>
              <MaterialCommunityIcons name="minus" size={20} color={currentQty === 0 ? COLORS.textMuted : COLORS.text} />
            </Pressable>
            <Text style={s.qtyT}>{currentQty}</Text>
            <Pressable
              testID="pdp-qty-inc"
              onPress={handleIncrement}
              hitSlop={8}
              disabled={outOfStock || currentQty >= availableStock}
            >
              <MaterialCommunityIcons name="plus" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <Pressable
            testID={currentQty > 0 ? "pdp-my-bag" : "pdp-add-to-cart"}
            onPress={currentQty > 0 ? handleCheckout : onAddFirstTime}
            style={{ flex: 1 }}
            disabled={adding || outOfStock}
          >
            <LinearGradient colors={outOfStock ? [COLORS.border, COLORS.border] : currentQty > 0 ? [COLORS.success, "#2e7d32"] : [COLORS.accent, COLORS.accentDark]} style={s.checkoutBtn}>
              {adding ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialCommunityIcons name={outOfStock ? "close-circle" : currentQty > 0 ? "shopping-bag" : "cart-plus"} color="#fff" size={20} />
                  <Text style={s.checkoutBtnText}>{outOfStock ? "Out of Stock" : currentQty > 0 ? "View Cart" : `Add to Cart · ₹${selectedPrice}`}</Text>
                  {!outOfStock && <MaterialCommunityIcons name="arrow-right" color="#fff" size={18} />}
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
      <CheckoutBar bottomOffset={108} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, position: "relative", backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.lg, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  hbtn: { width: 38, height: 38, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  wishIcon: { textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  imageCarousel: { width: "100%", overflow: "hidden", backgroundColor: COLORS.surfaceSecondary },
  carouselSlide: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  img: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  carouselIndicators: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: SPACING.sm },
  carouselDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.border, marginHorizontal: 2 },
  carouselDotActive: { width: 18, backgroundColor: COLORS.brand },
  carouselCount: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700", marginLeft: 8 },
  card: { padding: SPACING.lg },
  name: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  unit: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  outOfStockText: { color: COLORS.error, fontWeight: "900", fontSize: 16, letterSpacing: 0.4, marginTop: 6 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  price: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 16, color: COLORS.textMuted, textDecorationLine: "line-through" },
  discPill: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  discText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  variantSelector: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: 18, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", gap: 12 },
  variantSelectorHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  variantSelectorTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  variantSelectorSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  variantChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variantChoice: { minWidth: 98, maxWidth: "48%", flexGrow: 1, flexShrink: 0, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 13, borderWidth: 1.3, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", gap: 5 },
  variantChoiceActive: { borderColor: COLORS.accent, backgroundColor: "#FFEDD5", ...shadow.soft },
  variantChoiceUnavailable: { borderColor: "#FECACA", backgroundColor: "#FFF7F7" },
  variantChoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  variantChoiceUnit: { color: COLORS.text, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  variantChoiceUnitActive: { color: COLORS.accentDark },
  variantChoicePriceRow: { flexDirection: "row", alignItems: "baseline", gap: 5, flexWrap: "wrap" },
  variantChoicePrice: { color: COLORS.text, fontSize: 16, fontWeight: "900" },
  variantChoicePriceActive: { color: COLORS.accentDark },
  variantChoiceMrp: { color: COLORS.textMuted, fontSize: 11, textDecorationLine: "line-through" },
  variantChoiceStock: { color: COLORS.success, fontSize: 10, fontWeight: "700" },
  variantChoiceStockUnavailable: { color: COLORS.error },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  sectionTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  desc: { color: COLORS.textSecondary, lineHeight: 22 },
  deliveryCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: COLORS.brandLight, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.lg },
  delTitle: { fontWeight: "700", color: COLORS.brandDark },
  delSub: { color: COLORS.brandDark, fontSize: 12, marginTop: 2 },
  toast: { position: "absolute", top: 80, left: 20, right: 20, backgroundColor: COLORS.success, padding: 12, borderRadius: RADIUS.md, flexDirection: "row", alignItems: "center", gap: 10, ...shadow.card, zIndex: 20 },
  toastText: { color: "#fff", fontWeight: "700" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 15, elevation: 14, padding: SPACING.md, paddingBottom: 24, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  qtyBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minWidth: 132, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.pill, gap: 12 },
  suggestionsSection: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  suggestionsHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  suggestionsTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  suggestionsSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  suggestionsStatus: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, color: COLORS.textMuted, fontSize: 12 },
  suggestionsGrid: { paddingHorizontal: SPACING.md, gap: 5 },
  suggestionGridRow: { flexDirection: "row", gap: 5, alignItems: "stretch" },
  suggestionGridCell: { flex: 1, minWidth: 0 },
  suggestionCard: { width: "100%", height: 150, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  suggestionImageWrap: { width: "100%", height: 68, backgroundColor: COLORS.surfaceSecondary, overflow: "hidden" },
  suggestionImage: { width: "100%", height: "100%" },
  suggestionImageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  suggestionCardBody: { paddingHorizontal: 4, paddingTop: 3, paddingBottom: 2, flex: 1 },
  suggestionCardName: { color: COLORS.text, fontSize: 11, lineHeight: 13, height: 28, fontWeight: "600" },
  suggestionCardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 2, marginTop: 3 },
  suggestionCardPrice: { color: COLORS.text, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  suggestionAddButton: { minWidth: 35, paddingHorizontal: 4, height: 22, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent, backgroundColor: COLORS.accentLight, alignItems: "center", justifyContent: "center" },
  suggestionAddButtonDisabled: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  suggestionAddButtonText: { color: COLORS.accent, fontSize: 8, fontWeight: "800" },
  qtyT: { fontWeight: "800", minWidth: 18, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 8 },
  addBtnText: { color: "#fff", fontWeight: "800" },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 4, ...shadow.soft },
  checkoutBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});