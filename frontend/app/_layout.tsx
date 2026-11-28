import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, PanResponder, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/src/AuthContext";
import { CartProvider } from "@/src/CartContext";
import { LanguageProvider } from "@/src/LanguageContext";
import { WishlistProvider } from "@/src/WishlistContext";

 
function GlobalPullToRefresh({ children }: { children: React.ReactNode }) {
  const [refreshing, setRefreshing] = useState(false);
  const startCanRefreshRef = useRef(false);

  const isAtTopOfScrollArea = (target: any) => {
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    let node = target;
    while (node && node !== document.body && node.nodeType === 1) {
      const element = node as HTMLElement;
      const overflowY = window.getComputedStyle(element).overflowY;
      const isVerticalScroller = (overflowY === "auto" || overflowY === "scroll") &&
        element.scrollHeight > element.clientHeight + 2;
      if (isVerticalScroller) return element.scrollTop <= 1;
      node = element.parentElement;
    }
    return true;
  };

  const onTouchStart = (event: any) => {
    if (Platform.OS !== "web" || refreshing) {
      startCanRefreshRef.current = false;
      return;
    }
    // Allow the pull to start anywhere inside the page's scroll area, but
    // only when that scroll area is already at its top edge.
    startCanRefreshRef.current = isAtTopOfScrollArea(event?.target);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (_event, gesture) =>
      Platform.OS === "web" &&
      !refreshing &&
      startCanRefreshRef.current &&
      gesture.dy > 72 &&
      gesture.dy > Math.abs(gesture.dx) * 1.25,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_event, gesture) => {
      const shouldRefresh = Platform.OS === "web" &&
        startCanRefreshRef.current &&
        gesture.dy >= 92 &&
        gesture.dy > Math.abs(gesture.dx) * 1.25;
      startCanRefreshRef.current = false;
      if (!shouldRefresh || typeof window === "undefined") return;
      setRefreshing(true);
      window.setTimeout(() => window.location.reload(), 100);
    },
    onPanResponderTerminate: () => {
      startCanRefreshRef.current = false;
    },
  }), [refreshing]);

  return (
    <View style={{ flex: 1 }} onTouchStart={onTouchStart} {...panResponder.panHandlers}>
      {children}
      {refreshing ? (
        <View pointerEvents="none" style={{
          position: "absolute",
          top: 12,
          alignSelf: "center",
          zIndex: 9999,
          elevation: 20,
          padding: 9,
          borderRadius: 22,
          backgroundColor: "#FFFFFF",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.16,
          shadowRadius: 6,
        }}>
          <ActivityIndicator size="small" color="#0284C7" />
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