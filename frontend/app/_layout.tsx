import React, { useEffect, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/src/AuthContext";
import { CartProvider } from "@/src/CartContext";
import { LanguageProvider } from "@/src/LanguageContext";
import { WishlistProvider } from "@/src/WishlistContext";

 
function GlobalPullToRefresh({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    let startY: number | null = null;
    let startX = 0;
    let pullDistance = 0;
    let pullAllowed = false;
    let reloadTimer: number | undefined;

    const canPullFromTop = (target: EventTarget | null) => {
      let node = target instanceof Element ? target : null;

      // Every scrollable ancestor must be at its top edge. This prevents a
      // pull inside an inner list from refreshing while an outer page is scrolled.
      while (node && node !== document.body && node !== document.documentElement) {
        const element = node as HTMLElement;
        const style = window.getComputedStyle(element);
        const isVerticalScroller =
          ["auto", "scroll", "overlay"].includes(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 2;

        if (isVerticalScroller && element.scrollTop > 1) return false;
        node = element.parentElement;
      }

      return (
        window.scrollY <= 1 &&
        document.documentElement.scrollTop <= 1 &&
        (!document.body || document.body.scrollTop <= 1)
      );
    };

    const resetGesture = () => {
      startY = null;
      startX = 0;
      pullDistance = 0;
      pullAllowed = false;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      pullDistance = 0;
      pullAllowed = canPullFromTop(event.target);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullAllowed || startY === null || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;

      if (deltaY <= 0 || Math.abs(deltaX) > deltaY * 1.2) {
        resetGesture();
        return;
      }

      pullDistance = deltaY;
      // Once the gesture is clearly a downward pull, stop the browser's
      // competing overscroll gesture so the refresh threshold is reliable.
      if (deltaY > 14 && event.cancelable) event.preventDefault();
    };

    const onTouchEnd = () => {
      const shouldRefresh =
        pullAllowed &&
        !refreshingRef.current &&
        pullDistance >= 96 &&
        startY !== null;

      resetGesture();
      if (!shouldRefresh) return;

      refreshingRef.current = true;
      setRefreshing(true);
      reloadTimer = window.setTimeout(() => window.location.reload(), 180);
    };

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    document.addEventListener("touchend", onTouchEnd, true);
    document.addEventListener("touchcancel", resetGesture, true);

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("touchcancel", resetGesture, true);
      if (reloadTimer !== undefined) window.clearTimeout(reloadTimer);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {refreshing ? (
        <View pointerEvents="none" style={{
          position: "absolute",
          top: 12,
          alignSelf: "center",
          zIndex: 9999,
          elevation: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderRadius: 22,
          backgroundColor: "#FFFFFF",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.16,
          shadowRadius: 6,
        }}>
          <ActivityIndicator size="small" color="#7E22CE" />
        </View>
      ) : null}
    </View>
  );
}
function vendorHomeRoute(user: any) {
  if (user?.role !== "vendor") return `/${user?.role || "auth/login"}`;
  return user?.vendor_type === "service" ? "/service-vendor" : "/vendor";
}

function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const first = segments[0] || "";
    const second = segments[1] || "";
    const isAuthRoute = first === "auth";
    const isPublicRoute =
      first === "assistant" ||
      first === "" ||
      first === "RoojgarForm" ||
      first === "holiday" ||
      first === "car-rental" ||
      first === "daily-services" ||
      first === "daily-service-booking" ||
      first === "book-now" ||
      (first === "service" && ["premium_decorator", "photography"].includes(second));

    // Guests can browse customer-facing pages and view an empty cart.
    // Account, order, address, and checkout routes remain protected.
    const isGuestBrowsingRoute =
      isPublicRoute ||
      (first === "(tabs)" && ["home", "categories", "cart"].includes(second)) ||
      ["category", "home-category", "store", "product", "search"].includes(first);

    if (!user) {
      if (!isAuthRoute && !isGuestBrowsingRoute) router.replace("/auth/login");
      return;
    }

    if (isAuthRoute) {
      router.replace((user.role === "customer" ? "/(tabs)/home" : vendorHomeRoute(user)) as any);
      return;
    }

    if (isPublicRoute) {
      return;
    }

    const customerShared =
      first === "checkout" ||
      first === "car-trip-builder" ||
      first === "service-booking-cart" ||
      first === "service-checkout" ||
      first === "service-payment" ||
      first === "service-booking-confirmed" ||
      first === "service" ||
      first === "service-bookings" ||
      first === "cart" ||
      first === "orders" ||
      first === "addresses" ||
      first === "notifications" ||
      first === "profile" ||
      first === "home-category" ||
      first === "category" ||
      first === "store" ||
      first === "product" ||
      first === "search" ||
      first === "RoojgarForm";

    const serviceVendorRoute =
      first === "service-vendor";

    const storeVendorRoute =
      first === "vendor" &&
      !["holiday-dashboard", "car-rental-dashboard"].includes(second);

    const allowed =
      user.role === "admin"
        ? first === "admin"
        : user.role === "vendor"
          ? (user.vendor_type === "service" ? serviceVendorRoute : storeVendorRoute)
          : user.role === "delivery"
            ? first === "delivery"
            : first === "(tabs)" || customerShared;

    if (!allowed) {
      router.replace((user.role === "customer" ? "/(tabs)/home" : vendorHomeRoute(user)) as any);
    }
  }, [loading, user, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent={false} backgroundColor="#0284C7" />
        <LanguageProvider>
          <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <GlobalPullToRefresh>
                <RoleRouteGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="assistant"
                      options={{
                        presentation: "transparentModal",
                        animation: Platform.OS === "web" ? "none" : "fade",
                        contentStyle: { backgroundColor: "transparent" },
                      }}
                    />
                  </Stack>
                </RoleRouteGuard>
              </GlobalPullToRefresh>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}