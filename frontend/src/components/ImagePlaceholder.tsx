import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/src/theme";

type PlaceholderType = "product" | "category" | "banner" | "store";

const CONFIG: Record<PlaceholderType, { icon: string; label: string }> = {
  product: { icon: "package-variant-closed", label: "Product" },
  category: { icon: "shape-outline", label: "Category" },
  banner: { icon: "image-outline", label: "Banner" },
  store: { icon: "store-outline", label: "Store" },
};

export default function ImagePlaceholder({
  type,
  style,
}: {
  type: PlaceholderType;
  style?: any;
}) {
  const item = CONFIG[type];
  return (
    <View style={[s.root, style]}>
      <View style={s.iconWrap}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={24}
          color={COLORS.textMuted}
        />
      </View>
      <Text style={s.label}>{item.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "700",
  },
});
