import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/src/AuthContext";
import { CartProvider } from "@/src/CartContext";

function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const first = segments[0] || "";
    const isAuthRoute = first === "auth";
    const isPublicRoute = first === "assistant" || first === "";

    if (!user) {
      if (!isAuthRoute && !isPublicRoute) router.replace("/auth/login");
      return;
    }

    if (isAuthRoute) {
      router.replace(user.role === "customer" ? "/(tabs)/home" : (`/${user.role}` as any));
      return;
    }

    if (isPublicRoute) {
      return;
    }

    const customerShared =
      first === "checkout" ||
      first === "orders" ||
      first === "addresses" ||
      first === "notifications" ||
      first === "profile";

    const allowed =
      user.role === "admin"
        ? first === "admin"
        : user.role === "vendor"
          ? first === "vendor"
          : user.role === "delivery"
            ? first === "delivery"
            : first === "(tabs)" || customerShared;

    if (!allowed) {
      router.replace(user.role === "customer" ? "/(tabs)/home" : (`/${user.role}` as any));
    }
  }, [loading, user, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <RoleRouteGuard>
              <Stack screenOptions={{ headerShown: false }} />
            </RoleRouteGuard>
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}