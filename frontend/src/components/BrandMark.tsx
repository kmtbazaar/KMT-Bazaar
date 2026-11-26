import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

type BrandLogo = {
  name: string;
  slug: string;
  color: string;
  aliases: string[];
};

const BRAND_LOGOS: BrandLogo[] = [
  { name: "OPPO", slug: "oppo", color: "1F9A50", aliases: ["oppo"] },
  { name: "Samsung", slug: "samsung", color: "1428A0", aliases: ["samsung"] },
  { name: "Apple", slug: "apple", color: "111111", aliases: ["apple", "iphone"] },
  { name: "Vivo", slug: "vivo", color: "415FFF", aliases: ["vivo"] },
  { name: "Xiaomi", slug: "xiaomi", color: "FF6900", aliases: ["xiaomi", "mi"] },
  { name: "Redmi", slug: "redmi", color: "FF6700", aliases: ["redmi"] },
  { name: "POCO", slug: "poco", color: "F5D500", aliases: ["poco"] },
  { name: "realme", slug: "realme", color: "FFC915", aliases: ["realme", "real me"] },
  { name: "OnePlus", slug: "oneplus", color: "F5010C", aliases: ["oneplus", "one plus"] },
  { name: "Motorola", slug: "motorola", color: "5C92FA", aliases: ["motorola", "moto"] },
  { name: "Nokia", slug: "nokia", color: "124191", aliases: ["nokia"] },
  { name: "Nothing", slug: "nothing", color: "000000", aliases: ["nothing"] },
  { name: "Huawei", slug: "huawei", color: "FF0000", aliases: ["huawei"] },
  { name: "Honor", slug: "honor", color: "000000", aliases: ["honor"] },
  { name: "Sony", slug: "sony", color: "000000", aliases: ["sony"] },
  { name: "Lenovo", slug: "lenovo", color: "E2231A", aliases: ["lenovo"] },
  { name: "ASUS", slug: "asus", color: "000000", aliases: ["asus"] },
  { name: "Dell", slug: "dell", color: "007DB8", aliases: ["dell"] },
  { name: "HP", slug: "hp", color: "0096D6", aliases: ["hp", "hewlett packard"] },
  { name: "Google", slug: "google", color: "4285F4", aliases: ["google", "pixel"] },
];

const normalize = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function findBrand(value: unknown): BrandLogo | null {
  const candidate = normalize(value);
  if (!candidate) return null;
  return BRAND_LOGOS.find((brand) =>
    brand.aliases.some((alias) => {
      const token = normalize(alias);
      return candidate === token || candidate.startsWith(token + " ") || candidate.includes(" " + token + " ");
    })
  ) || null;
}

export function isKnownBrand(value: unknown): boolean {
  return Boolean(findBrand(value));
}

export function resolveProductBrand(product: any): BrandLogo | null {
  if (typeof product === "string") return findBrand(product);
  if (!product || typeof product !== "object") return null;

  const attributes = product.attributes && typeof product.attributes === "object"
    ? product.attributes
    : {};
  const brandAttributes = Object.entries(attributes)
    .filter(([key]) => /^(brand|manufacturer)$/i.test(String(key).replace(/[_-]+/g, " ").trim()))
    .map(([, value]) => value);

  const explicitValues = [
    product.brand,
    product.brand_name,
    product.brandName,
    product.manufacturer,
    ...brandAttributes,
    product.item_category,
    product.itemCategory,
  ];
  for (const value of explicitValues) {
    const match = findBrand(value);
    if (match) return match;
  }

  return findBrand(product.name || product.product_name || product.productName || product.title);
}

export default function BrandMark({
  brand,
  product,
  size = 22,
}: {
  brand?: unknown;
  product?: any;
  size?: number;
}) {
  const match = product ? resolveProductBrand(product) : findBrand(brand);
  if (!match) return null;
  const dimension = Math.max(16, size);
  return (
    <View
      style={[styles.badge, { width: dimension + 8, height: dimension + 8 }]}
      testID={"brand-logo-" + match.slug}
      accessible
      accessibilityLabel={match.name + " logo"}
    >
      <Image
        source={{ uri: `https://cdn.simpleicons.org/${match.slug}/${match.color}` }}
        style={{ width: dimension, height: dimension }}
        contentFit="contain"
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
});
