import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { loadAdminSettings } from "@/src/adminSettings";

export default function AdminLayout() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const settings = await loadAdminSettings();
      if (!active) return;
      const isNight = settings.themeMode === "night";
      setNight(isNight);
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.documentElement.classList.toggle("kmt-admin-night", isNight);
      }
    };
    sync();
    return () => {
      active = false;
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.documentElement.classList.remove("kmt-admin-night");
      }
    };
  }, []);

  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
