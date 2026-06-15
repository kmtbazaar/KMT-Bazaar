import React from "react";
import { Stack } from "expo-router";
export default function VendorLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
