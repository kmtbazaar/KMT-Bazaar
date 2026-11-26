import React from "react";
import { Text, View, StyleSheet } from "react-native";

type ProductUnitBadgeProps = {
  label?: string | null;
  compact?: boolean;
  testID?: string;
};

export default function ProductUnitBadge({
  label,
  compact = false,
  testID = "product-unit-badge",
}: ProductUnitBadgeProps) {
  const value = String(label ?? "").trim();
  if (!value) return null;

  return (
    <View style={[s.badge, compact && s.compactBadge]} testID={testID}>
      <Text style={[s.text, compact && s.compactText]} numberOfLines={2} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    maxWidth: "100%",
    alignSelf: "flex-start",
    justifyContent: "center",
    backgroundColor: "#FEF08A",
    borderColor: "#FACC15",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  text: {
    color: "#713F12",
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "900",
    flexShrink: 1,
  },
  compactText: {
    fontSize: 9,
    lineHeight: 11,
  },
});
