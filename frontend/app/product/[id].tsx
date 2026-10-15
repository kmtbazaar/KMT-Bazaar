import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, Platform } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";
import CheckoutBar from "@/src/components/CheckoutBar";
import { useWishlist } from "@/src/WishlistContext";
import ProductCard from "@/src/components/ProductCard";

export default function Product() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add, update, cart, itemCount } = useCart();
  const { isWishlisted, toggle: toggleWishlist, ready: wishlistReady } = useWishlist();
  const [p, setP] = useState<any>(null);
  const wished = isWishlisted(p?.id ?? id);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => { 
    (async () => {
      try {
        const data = await api.product(id as string);
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

    (async () => {
      // The unfiltered catalogue endpoint is verified to return the customer
      // product list. Use it as the source of truth rather than relying on
      // category/store filters that can legitimately return an empty array.
      let catalogue: any[] = [];
      try {
        const result = await api.products({});
        catalogue = Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn("Unable to load product catalogue for recommendations", error);
      }

      if (cancelled) return;

      const currentId = String(p.id);
      const candidates = catalogue.filter(
        (item: any) => item?.id && String(item.id) !== currentId
      );

      // Prefer same-store and same-category items, then trending items, then
      // the rest of the live catalogue. De-duplicate while preserving order.
      const sameStoreAndCategory = candidates.filter(
        (item: any) => p.store_id && item.store_id === p.store_id &&
          (!p.category_id || item.category_id === p.category_id)
      );
      const sameCategory = candidates.filter(
        (item: any) => p.category_id && item.category_id === p.category_id
      );
      const trending = candidates.filter((item: any) => item.trending === true);
      const ordered = [
        ...sameStoreAndCategory,
        ...sameCategory,
        ...trending,
        ...candidates,
      ];
      const unique = Array.from(new Map(
        ordered.map((item: any) => [String(item.id), item])
      ).values()).slice(0, 12);

      if (!cancelled) setSuggestions(unique);
    })().catch((error) => {
      console.error("Unable to load product recommendations", error);
      if (!cancelled) setSuggestions([]);
    });

    return () => { cancelled = true; };
  }, [p?.id, p?.category_id, p?.store_id]);

  // FIX 1: Quantity ko hardcoded 1 rakhne ke bajaye Context wale Cart state se read karenge
  const productImages = useMemo(() => Array.from(new Set([...(Array.isArray(p?.images) ? p.images : []), p?.image].filter((url: any) => typeof url === "string" && url.trim()))), [p?.images, p?.image]);

  const shareProduct = async () => {
    if (!p) return;
    const productUrl = Platform.OS === "web"
      ? `${(globalThis as any).location?.origin || "https://kmtbazaar.com"}/product/${encodeURIComponent(String(p.id || id))}`
      : `https://kmtbazaar.com/product/${encodeURIComponent(String(p.id || id))}`;
    const message = `Check out ${p.name} on KMT Bazaar for ₹${p.price}. ${productUrl}`;
    try {
      if (Platform.OS === "web") {
        const nav = (globalThis as any).navigator;
        if (typeof nav?.share === "function") {
          await nav.share({ title: p.name, text: `₹${p.price} on KMT Bazaar`, url: productUrl });
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
    const item = cart?.items?.find((i: any) => i.product_id === p?.id || i.id === p?.id);
    return item?.quantity || 0;
  }, [cart, p?.id]);

  const onAddFirstTime = async () => {
    setAdding(true);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    try { 
      await add(p.id, 1); 
      setToast("Added to cart!"); 
      setTimeout(() => setToast(null), 1500); 
    } finally { 
      setAdding(false); 
    }
  };

  const handleIncrement = async () => {
    try { await Haptics.selectionAsync(); } catch {}
    try {
      if (currentQty === 0) await add(p.id, 1);
      else await update(p.id, currentQty + 1);
    } catch {}
  };

  const handleDecrement = async () => {
    try { await Haptics.selectionAsync(); } catch {}
    try { await update(p.id, Math.max(0, currentQty - 1)); } catch {}
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
  const discount = p.mrp && p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  const checkoutSubtotal = cart?.subtotal || p.price * currentQty;

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
      
      <ScrollView contentContainerStyle={{ paddingBottom: 190 }} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: productImages[selectedImageIndex] || p.image }} style={s.img} contentFit="cover" />
        {productImages.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.galleryRow}>
            {productImages.map((uri: string, index: number) => (
              <Pressable key={uri + "-" + index} onPress={() => setSelectedImageIndex(index)} style={[s.galleryThumb, selectedImageIndex === index && s.galleryThumbActive]} testID={`product-photo-${index + 1}`}>
                <Image source={{ uri }} style={s.galleryImage} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={s.card}>
          <Text style={s.name} testID="product-name">{p.name}</Text>
          <Text style={s.unit}>{p.unit} · In stock</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{p.price}</Text>
            {discount > 0 && <Text style={s.mrp}>₹{p.mrp}</Text>}
            {discount > 0 && <View style={s.discPill}><Text style={s.discText}>{discount}% OFF</Text></View>}
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

        {suggestions.length > 0 && (
          <View style={s.suggestionsSection} testID="product-suggestions">
            <View style={s.suggestionsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.suggestionsTitle}>You may also like</Text>
                <Text style={s.suggestionsSubtitle}>More picks for your basket</Text>
              </View>
              <MaterialCommunityIcons name="lightning-bolt" size={21} color={COLORS.brand} />
            </View>
            <View style={s.suggestionsGrid}>
              {Array.from({ length: 4 }, (_, rowIndex) => (
                <View key={`suggestion-row-${rowIndex}`} style={s.suggestionGridRow}>
                  {suggestions.slice(rowIndex * 3, rowIndex * 3 + 3).map((item: any) => (
                    <View key={item.id} style={s.suggestionGridCell}>
                      <ProductCard p={item} recommendationGrid />
                    </View>
                  ))}
                  {suggestions.length > rowIndex * 3 && suggestions.length <= rowIndex * 3 + 2 ? (
                    <View style={s.suggestionGridCell} />
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {toast && (
        <View style={s.toast} testID="add-toast">
          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      {/* Split bottom control; floating sack is the cart shortcut */}
      <View style={s.bottomBar}>
        <View style={s.actionRow}>
          <View style={s.qtyBox}>
            <Pressable testID="pdp-qty-dec" onPress={handleDecrement} hitSlop={8} disabled={currentQty === 0}>
              <MaterialCommunityIcons name="minus" size={20} color={currentQty === 0 ? COLORS.textMuted : COLORS.text} />
            </Pressable>
            <Text style={s.qtyT}>{currentQty}</Text>
            <Pressable testID="pdp-qty-inc" onPress={handleIncrement} hitSlop={8}>
              <MaterialCommunityIcons name="plus" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <Pressable
            testID={currentQty > 0 ? "pdp-my-bag" : "pdp-add-to-cart"}
            onPress={currentQty > 0 ? handleCheckout : onAddFirstTime}
            style={{ flex: 1 }}
            disabled={adding}
          >
            <LinearGradient colors={currentQty > 0 ? [COLORS.success, "#2e7d32"] : [COLORS.accent, COLORS.accentDark]} style={s.checkoutBtn}>
              {adding ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialCommunityIcons name={currentQty > 0 ? "shopping-bag" : "cart-plus"} color="#fff" size={20} />
                  <Text style={s.checkoutBtnText}>{currentQty > 0 ? "View Cart" : `Add to Cart · ₹${p.price}`}</Text>
                  <MaterialCommunityIcons name="arrow-right" color="#fff" size={18} />
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
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.lg, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  hbtn: { width: 38, height: 38, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  wishIcon: { textShadowColor: "rgba(0,0,0,0.65)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  img: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  galleryRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 },
  galleryThumb: { width: 62, height: 62, borderRadius: RADIUS.sm, overflow: "hidden", borderWidth: 1.5, borderColor: COLORS.border },
  galleryThumbActive: { borderColor: COLORS.brand, borderWidth: 2.5 },
  galleryImage: { width: "100%", height: "100%" },
  card: { padding: SPACING.lg },
  name: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  unit: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  price: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 16, color: COLORS.textMuted, textDecorationLine: "line-through" },
  discPill: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  discText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  sectionTitle: { fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  desc: { color: COLORS.textSecondary, lineHeight: 22 },
  deliveryCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: COLORS.brandLight, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.lg },
  delTitle: { fontWeight: "700", color: COLORS.brandDark },
  delSub: { color: COLORS.brandDark, fontSize: 12, marginTop: 2 },
  toast: { position: "absolute", top: 80, left: 20, right: 20, backgroundColor: COLORS.success, padding: 12, borderRadius: RADIUS.md, flexDirection: "row", alignItems: "center", gap: 10, ...shadow.card, zIndex: 20 },
  toastText: { color: "#fff", fontWeight: "700" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: SPACING.md, paddingBottom: 24, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  qtyBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minWidth: 132, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.pill, gap: 12 },
  suggestionsSection: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  suggestionsHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  suggestionsTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  suggestionsSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  suggestionsGrid: { paddingHorizontal: SPACING.md, gap: 5 },
  suggestionGridRow: { flexDirection: "row", gap: 5, alignItems: "stretch" },
  suggestionGridCell: { flex: 1, minWidth: 0 },
  qtyT: { fontWeight: "800", minWidth: 18, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 8 },
  addBtnText: { color: "#fff", fontWeight: "800" },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 4, ...shadow.soft },
  checkoutBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});