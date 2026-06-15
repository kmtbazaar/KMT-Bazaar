import React from "react";
import { Stack } from "expo-router";
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
