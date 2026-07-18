import React from "react";
import { View, StyleSheet } from "react-native";
import { useResponsive } from "@/src/hooks/useResponsive";

export default function Page({
  children,
}: {
  children: React.ReactNode;
}) {
  const { containerWidth } = useResponsive();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { maxWidth: containerWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    flex: 1,
  },
  container: {
    width: "100%",
  },
});