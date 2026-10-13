import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/AuthContext";

export type WishlistProduct = {
  id: string;
  [key: string]: any;
};

type WishlistValue = {
  items: WishlistProduct[];
  ready: boolean;
  isWishlisted: (id: string | number | null | undefined) => boolean;
  toggle: (product: any) => void;
  remove: (id: string | number) => void;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const storageKey = `kmt_wishlist_${user?.id || user?.email || "guest"}`;
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (active) setItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active && !authLoading) setReady(true);
      }
    })();
    return () => { active = false; };
  }, [storageKey, authLoading]);

  const persist = useCallback((next: WishlistProduct[]) => {
    setItems(next);
    void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
  }, [storageKey]);

  const isWishlisted = useCallback((id: string | number | null | undefined) => {
    if (id === null || id === undefined) return false;
    return items.some((item) => String(item.id) === String(id));
  }, [items]);

  const toggle = useCallback((product: any) => {
    const id = product?.id ?? product?._id;
    if (!ready || id === null || id === undefined) return;
    const key = String(id);
    const exists = items.some((item) => String(item.id) === key);
    if (exists) {
      persist(items.filter((item) => String(item.id) !== key));
      return;
    }
    persist([...items, { ...product, id: key }]);
  }, [items, persist, ready]);

  const remove = useCallback((id: string | number) => {
    persist(items.filter((item) => String(item.id) !== String(id)));
  }, [items, persist]);

  const value = useMemo(() => ({ items, ready, isWishlisted, toggle, remove }), [items, ready, isWishlisted, toggle, remove]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
