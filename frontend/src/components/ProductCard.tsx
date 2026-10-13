import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useMemo, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
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

const CARD_MARGIN = 6;

export default function ProductCard({
  p,
  compact = false,
  storeGrid = false,
}: {
  p: any;
  compact?: boolean;
  storeGrid?: boolean;
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

  const outOfStock = (p.stock ?? 0) <= 0;

  return (
    <Animated.View
      style={[
        animStyle,
        compact ? s.cardCompact : s.card,
        compact && storeGrid && s.cardStoreGrid,
      ]}
    >
      <View>
        <View style={s.imageArea}>
        <Pressable
          testID={`product-image-${p.id}`}
          onPress={() => router.push(`/product/${p.id}` as any)}
          style={s.imgWrap}
        >
          <Image
            source={{ uri: imageFailed ? IMAGE_FALLBACK_URL : (p.image || IMAGE_FALLBACK_URL) }}
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
          onPress={(e: any) => { e?.stopPropagation?.(); toggleWishlist(p); }}
          hitSlop={6}
          style={s.wishBtn}
        >
          <MaterialCommunityIcons name={wished ? "heart" : "heart-outline"} size={17} color={wished ? "#E11D48" : "#334155"} />
        </Pressable>
        </View>

        <View style={s.body}>
          <Text
            style={s.name}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {p.name}
          </Text>

          <Text
            style={s.unit}
            numberOfLines={1}
          >
            {p.unit || " "}
          </Text>

          <View style={s.priceRow}>
            <View style={s.priceCol}>
              <Text style={s.price}>
                ₹{p.price}
              </Text>

              <Text
                style={[
                  s.mrp,
                  !(discount > 0) && { opacity: 0 },
                ]}
              >
                ₹{p.mrp || p.price}
              </Text>
            </View>

            {qty > 0 ? (
              <View
                style={s.stepper}
                testID={`qty-stepper-${p.id}`}
              >
                <Pressable
                  testID={`qty-dec-${p.id}`}
                  onPress={onDec}
                  hitSlop={8}
                  style={s.stepBtn}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={15}
                    color="#fff"
                  />
                </Pressable>

                <Text style={s.qtyText}>
                  {qty}
                </Text>

                <Pressable
                  testID={`qty-inc-${p.id}`}
                  onPress={onInc}
                  hitSlop={8}
                  style={[
                    s.stepBtn,
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
   * Compact card:
   * Exactly sized for 3 cards per row.
   */
  cardCompact: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    margin: CARD_MARGIN,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start",
  },

  cardStoreGrid: {
    margin: 0,
    alignSelf: "flex-start",
  },

  imageArea: {
    width: "100%",
    position: "relative",
  },

  wishBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 3,
  },

  imgWrap: {
    width: "100%",
    height: 105,
    backgroundColor: COLORS.surfaceSecondary,
    overflow: "hidden",
    position: "relative",
  },

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