import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useMemo, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { COLORS, IMAGE_FALLBACK_URL, RADIUS } from "@/src/theme";
import { useCart } from "@/src/CartContext";
import { useRouter } from "expo-router";
import ImagePlaceholder from "@/src/components/ImagePlaceholder";
import { useWishlist } from "@/src/WishlistContext";

const SCREEN_W = Dimensions.get("window").width;

export default function ProductCard({
  p,
  compact = false,
  storeGrid = false,
  wishlistGrid = false,
  recommendationGrid = false,
}: {
  p: any;
  compact?: boolean;
  storeGrid?: boolean;
  wishlistGrid?: boolean;
  recommendationGrid?: boolean;
}) {
  const router = useRouter();
  const { add, update, cart } = useCart();
  const { isWishlisted, toggle: toggleWishlist, ready: wishlistReady } = useWishlist();
  const wished = isWishlisted(p.id);
  const [imageFailed, setImageFailed] = useState(false);
  const scale = useSharedValue(1);

  const qty = useMemo(() => {
    const item = cart?.items?.find(
      (i: any) => i.product_id === p.id || i.id === p.id
    );

    return item?.quantity || 0;
  }, [cart, p.id]);

  const bump = () => {
    scale.value = withSequence(
      withSpring(0.94, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
  };

  const onAdd = async (e: any) => {
    e?.stopPropagation?.();

    try {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );
    } catch {}

    bump();

    try {
      await add(p.id, 1);
    } catch {}
  };

  const onInc = async (e: any) => {
    e?.stopPropagation?.();

    try {
      await Haptics.selectionAsync();
    } catch {}

    bump();

    try {
      await update(p.id, qty + 1);
    } catch {}
  };

  const onDec = async (e: any) => {
    e?.stopPropagation?.();

    try {
      await Haptics.selectionAsync();
    } catch {}

    bump();

    try {
      await update(p.id, Math.max(0, qty - 1));
    } catch {}
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const discount =
    p.mrp && p.mrp > p.price
      ? Math.round(((p.mrp - p.price) / p.mrp) * 100)
      : 0;

  // Normalize customer-facing product fields returned by current and legacy catalog records.
  const productName = String(p?.name ?? p?.product_name ?? p?.productName ?? p?.title ?? "").trim();
  const productUnit = String(p?.unit ?? p?.quantity ?? p?.size ?? p?.pack_size ?? "").trim();
  const productImage = useMemo(() => {
    const candidates = [
      p?.image,
      ...(Array.isArray(p?.images) ? p.images : []),
      p?.image_url,
      p?.imageUrl,
      p?.photo_url,
    ];
    const image = candidates.find(
      (value: any) => typeof value === "string" && value.trim().length > 0
    );
    return image ? image.trim() : IMAGE_FALLBACK_URL;
  }, [p?.image, p?.images, p?.image_url, p?.imageUrl, p?.photo_url]);

  const stockValue = p?.stock ?? p?.available_quantity ?? p?.quantity_in_stock ?? 0;
  const outOfStock = Number(stockValue) <= 0;

  const onToggleWishlist = (e: any) => {
    e?.stopPropagation?.();
    try {
      if (Platform.OS === "web") {
        const nav = (globalThis as any).navigator;
        if (typeof nav?.vibrate === "function") nav.vibrate([25, 25, 25]);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {}
    toggleWishlist(p);
  };

  return (
    <Animated.View
      style={[
        animStyle,
        recommendationGrid ? s.cardRecommendation : wishlistGrid ? s.cardWishlist : compact ? s.cardCompact : s.card,
        compact && storeGrid && s.cardStoreGrid,
      ]}
    >
      <View>
        <View style={s.imageArea}>
        <Pressable
          testID={`product-image-${p.id}`}
          onPress={() => router.push(`/product/${p.id}` as any)}
          style={[s.imgWrap, wishlistGrid && s.wishlistImgWrap, recommendationGrid && s.recommendationImgWrap]}
        >
          <Image
            source={{ uri: imageFailed ? IMAGE_FALLBACK_URL : productImage }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
            onError={() => setImageFailed(true)}
          />

          {discount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {discount}% OFF
              </Text>
            </View>
          )}

          {outOfStock && (
            <View style={s.oosOverlay}>
              <Text style={s.oosText}>
                OUT OF STOCK
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          testID={`wishlist-toggle-${p.id}`}
          accessibilityRole="button"
          accessibilityLabel={wished ? "Remove from wishlist" : "Add to wishlist"}
          disabled={!wishlistReady}
          onPress={onToggleWishlist}
          hitSlop={6}
          style={({ pressed }: any) => [s.wishBtn, pressed && s.wishBtnPressed]}
        >
          <MaterialCommunityIcons name="heart" size={17} color={wished ? "#E11D48" : "#FFFFFF"} style={s.wishIcon} />
        </Pressable>
        </View>

        <View style={[s.body, recommendationGrid && s.recommendationBody]}>
          <Text
            style={[s.name, wishlistGrid && s.wishlistName, recommendationGrid && s.recommendationName]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {productName || "Product"}
          </Text>

          <Text
            style={[s.unit, wishlistGrid && s.wishlistUnit, recommendationGrid && s.recommendationUnit]}
            numberOfLines={1}
          >
            {productUnit || " "}
          </Text>

          <View style={[s.priceRow, wishlistGrid && s.wishlistPriceRow, recommendationGrid && s.recommendationPriceRow]}>
            <View style={[s.priceCol, wishlistGrid && s.wishlistPriceCol, recommendationGrid && s.recommendationPriceCol]}>
              <Text style={[s.price, wishlistGrid && s.wishlistPrice, recommendationGrid && s.recommendationPrice]}>
                ₹{p.price}
              </Text>

              <Text
                style={[
                  s.mrp,
                  wishlistGrid && s.wishlistMrp,
                  recommendationGrid && s.recommendationMrp,
                  !(discount > 0) && { opacity: 0 },
                ]}
              >
                ₹{p.mrp || p.price}
              </Text>
            </View>

            {qty > 0 ? (
              <View
                style={[s.stepper, wishlistGrid && s.wishlistStepper, recommendationGrid && s.recommendationStepper]}
                testID={`qty-stepper-${p.id}`}
              >
                <Pressable
                  testID={`qty-dec-${p.id}`}
                  onPress={onDec}
                  hitSlop={8}
                  style={[s.stepBtn, wishlistGrid && s.wishlistStepBtn, recommendationGrid && s.recommendationStepBtn]}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={15}
                    color="#fff"
                  />
                </Pressable>

                <Text style={[s.qtyText, wishlistGrid && s.wishlistQtyText, recommendationGrid && s.recommendationQtyText]}>
                  {qty}
                </Text>

                <Pressable
                  testID={`qty-inc-${p.id}`}
                  onPress={onInc}
                  hitSlop={8}
                  style={[
                    s.stepBtn,
                    wishlistGrid && s.wishlistStepBtn,
                    recommendationGrid && s.recommendationStepBtn,
                    qty >= (p.stock ?? 99) && {
                      opacity: 0.4,
                    },
                  ]}
                  disabled={
                    qty >= (p.stock ?? 99)
                  }
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={15}
                    color="#fff"
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID={`add-to-cart-${p.id}`}
                onPress={onAdd}
                style={[
                  s.addBtn,
                  wishlistGrid && s.wishlistAddBtn,
                  recommendationGrid && s.recommendationAddBtn,
                  outOfStock && s.addBtnDisabled,
                ]}
                hitSlop={8}
                disabled={outOfStock}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={15}
                  color={
                    outOfStock
                      ? COLORS.textMuted
                      : COLORS.accent
                  }
                />

                <Text
                  style={[
                    s.addText,
                    wishlistGrid && s.wishlistAddText,
                    recommendationGrid && s.recommendationAddText,
                    outOfStock && {
                      color: COLORS.textMuted,
                    },
                  ]}
                >
                  ADD
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 2,
    alignSelf: "flex-start",
  },

  /*
   * Compact cards always fill their fixed-width grid cell.
   * The parent owns column width and spacing, so incomplete rows never stretch.
   */
  cardCompact: {
    width: "100%",
    flex: 0,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    margin: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "stretch",
  },

  cardRecommendation: {
    width: "100%",
    height: 150,
    flex: 0,
    minWidth: 0,
    margin: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "stretch",
  },

  cardStoreGrid: {
    width: "100%",
    flex: 0,
    margin: 0,
    alignSelf: "stretch",
  },

  cardWishlist: {
    width: "100%",
    flex: 0,
    minWidth: 0,
    height: 164,
    margin: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "stretch",
  },

  imageArea: {
    width: "100%",
    position: "relative",
  },

  wishBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 29,
    height: 29,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  wishBtnPressed: { transform: [{ scale: 0.88 }] },
  wishIcon: {
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  imgWrap: {
    width: "100%",
    height: 105,
    backgroundColor: COLORS.surfaceSecondary,
    overflow: "hidden",
    position: "relative",
  },

  wishlistImgWrap: { height: 75 },
  recommendationImgWrap: { height: 68 },
  recommendationBody: { paddingHorizontal: 4, paddingTop: 3, paddingBottom: 2 },
  recommendationName: { fontSize: 11, height: 28, lineHeight: 13 },
  recommendationUnit: { fontSize: 8, height: 9, marginTop: 1 },
  recommendationPrice: { fontSize: 11 },
  recommendationMrp: { fontSize: 8, minHeight: 10 },
  recommendationPriceRow: { marginTop: 3, alignItems: "center" },
  recommendationPriceCol: { flexShrink: 1, minWidth: 0 },
  recommendationAddBtn: { height: 22, paddingHorizontal: 2, paddingVertical: 1, gap: 0 },
  recommendationAddText: { fontSize: 8.5 },
  recommendationStepper: { height: 22, paddingHorizontal: 0, flexShrink: 0 },
  recommendationStepBtn: { width: 14, height: 20 },
  recommendationQtyText: { fontSize: 9, minWidth: 10 },

  wishlistName: { fontSize: 11, height: 28, lineHeight: 13 },
  wishlistUnit: { fontSize: 8, height: 9, marginTop: 1 },
  wishlistPrice: { fontSize: 11.5 },
  wishlistMrp: { fontSize: 8, minHeight: 10 },
  wishlistPriceRow: { marginTop: 3, alignItems: "center" },
  wishlistPriceCol: { flexShrink: 1, minWidth: 0 },
  wishlistAddBtn: { height: 24, paddingHorizontal: 2, paddingVertical: 1, gap: 0 },
  wishlistAddText: { fontSize: 8.5 },
  wishlistStepper: { height: 24, paddingHorizontal: 0, flexShrink: 0 },
  wishlistStepBtn: { width: 15, height: 22 },
  wishlistQtyText: { fontSize: 10, minWidth: 12 },

  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: COLORS.success,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },

  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
  },

  oosOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },

  oosText: {
    color: COLORS.error,
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  body: {
    paddingHorizontal: 5,
    paddingTop: 5,
    paddingBottom: 2,
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    height: 38,
    lineHeight: 18,
  },

  unit: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    height: 11,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 5,
    width: "100%",
  },

  priceCol: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 0,
    flexShrink: 1,
  },

  price: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  mrp: {
    fontSize: 10,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    minHeight: 13,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentLight,
    gap: 2,
    height: 30,
  },

  addBtnDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },

  addText: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 10.5,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 2,
    height: 30,
  },

  stepBtn: {
    width: 21,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    minWidth: 15,
    textAlign: "center",
  },
});