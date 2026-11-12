import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { useRouter, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useAuth } from "./AuthContext";

const PENDING_CART_ADD_KEY = "kmt_pending_customer_cart_add";
const PENDING_CART_ADD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CustomerCartLoadResult {
  cart: any | null;
  redirectToCart: boolean;
  showAddError: boolean;
}

interface CartCtx {
  cart: any | null;
  itemCount: number;
  refresh: () => Promise<void>;
  add: (productId: string, qty?: number, variant?: string | null) => Promise<boolean>;
  update: (productId: string, qty: number, variant?: string | null) => Promise<void>;
  clear: () => Promise<void>;
  bumpBadge: () => void;
  badgePulse: number;
}

const Ctx = createContext<CartCtx | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [cart, setCart] = useState<any | null>(null);
  const [badgePulse, setPulse] = useState(0);
  const reqId = useRef(0);
  const guestCartLoginStarted = useRef(false);
  const customerCartLoadRef = useRef<Promise<CustomerCartLoadResult> | null>(null);

  useEffect(() => {
    if (user || segments[0] !== "auth") guestCartLoginStarted.current = false;
  }, [user, segments]);

  const refresh = useCallback(async () => {
    if (!user || user.role !== "customer") { setCart(null); return; }
    const id = ++reqId.current;
    try {
      const c = await api.cart();
      if (id === reqId.current) setCart(c);
    } catch {}
  }, [user]);

  // Share an in-flight cart hydration across effect re-runs, so a pending
  // guest item is never submitted twice during a remount or auth transition.
  useEffect(() => {
    let active = true;

    if (!user || user.role !== "customer") {
      setCart(null);
      return () => { active = false; };
    }

    const loadCustomerCart = async () => {
      let task = customerCartLoadRef.current;
      if (!task) {
        task = (async (): Promise<CustomerCartLoadResult> => {
          const pendingRaw = await AsyncStorage.getItem(PENDING_CART_ADD_KEY);
          if (pendingRaw) {
            let pending: any = null;
            try { pending = JSON.parse(pendingRaw); } catch {}

            const productId = String(pending?.productId || "").trim();
            const quantity = Number(pending?.quantity);
            const createdAt = Number(pending?.createdAt);
            const age = Date.now() - createdAt;
            const isValidPendingAdd =
              Boolean(productId) &&
              Number.isInteger(quantity) &&
              quantity > 0 &&
              createdAt > 0 &&
              age >= 0 &&
              age <= PENDING_CART_ADD_MAX_AGE_MS;

            if (!isValidPendingAdd) {
              await AsyncStorage.removeItem(PENDING_CART_ADD_KEY);
            } else {
              try {
                const customerCart = await api.cartAdd(
                  productId,
                  quantity,
                  pending?.variant ? String(pending.variant) : null
                );
                await AsyncStorage.removeItem(PENDING_CART_ADD_KEY);
                return { cart: customerCart, redirectToCart: true, showAddError: false };
              } catch (error) {
                await AsyncStorage.removeItem(PENDING_CART_ADD_KEY);
                console.warn("[cart] Pending guest item could not be added:", error);
                const currentCart = await api.cart().catch(() => null);
                return { cart: currentCart, redirectToCart: false, showAddError: true };
              }
            }
          }

          const customerCart = await api.cart();
          return { cart: customerCart, redirectToCart: false, showAddError: false };
        })();
        customerCartLoadRef.current = task;
      }

      try {
        const result = await task;
        if (!active) return;
        if (result.cart) setCart(result.cart);
        if (result.redirectToCart) {
          setPulse((current) => current + 1);
          router.replace("/(tabs)/cart" as any);
        } else if (result.showAddError) {
          Alert.alert(
            "Product could not be added",
            "We couldn't confirm that the product was added. Please check your cart before trying again."
          );
        }
      } catch (error) {
        if (active) console.warn("[cart] Could not load customer cart:", error);
      } finally {
        if (customerCartLoadRef.current === task) customerCartLoadRef.current = null;
      }
    };

    void loadCustomerCart();
    return () => { active = false; };
  }, [user, router]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAddFeedback = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = audioCtxRef.current || new AudioCtx();
          audioCtxRef.current = ctx;

          const playFiberDrop = () => {
            const now = ctx.currentTime;

            // Heavy object hitting a hollow fibre/plastic container.
            const thump = ctx.createOscillator();
            const thumpGain = ctx.createGain();
            thump.type = "sine";
            thump.frequency.setValueAtTime(105, now);
            thump.frequency.exponentialRampToValueAtTime(48, now + 0.24);
            thumpGain.gain.setValueAtTime(0.0001, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.42, now + 0.012);
            thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);
            thump.connect(thumpGain);
            thumpGain.connect(ctx.destination);
            thump.start(now);
            thump.stop(now + 0.31);

            // Hollow fibre-body resonance.
            const body = ctx.createOscillator();
            const bodyGain = ctx.createGain();
            body.type = "triangle";
            body.frequency.setValueAtTime(172, now + 0.01);
            body.frequency.exponentialRampToValueAtTime(92, now + 0.22);
            bodyGain.gain.setValueAtTime(0.0001, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.19, now + 0.018);
            bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            body.connect(bodyGain);
            bodyGain.connect(ctx.destination);
            body.start(now + 0.01);
            body.stop(now + 0.27);

            // Short plastic/fibre rattle on impact.
            const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
              const fade = 1 - i / data.length;
              data[i] = (Math.random() * 2 - 1) * fade;
            }

            const rattle = ctx.createBufferSource();
            const filter = ctx.createBiquadFilter();
            const rattleGain = ctx.createGain();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(1450, now + 0.025);
            filter.Q.setValueAtTime(2.2, now + 0.025);
            rattleGain.gain.setValueAtTime(0.075, now + 0.02);
            rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
            rattle.buffer = buffer;
            rattle.connect(filter);
            filter.connect(rattleGain);
            rattleGain.connect(ctx.destination);
            rattle.start(now + 0.02);
            rattle.stop(now + 0.145);

            // Small second bounce against the fibre wall.
            const bounce = ctx.createOscillator();
            const bounceGain = ctx.createGain();
            bounce.type = "sine";
            bounce.frequency.setValueAtTime(76, now + 0.13);
            bounce.frequency.exponentialRampToValueAtTime(52, now + 0.28);
            bounceGain.gain.setValueAtTime(0.0001, now + 0.13);
            bounceGain.gain.exponentialRampToValueAtTime(0.16, now + 0.145);
            bounceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.31);
            bounce.connect(bounceGain);
            bounceGain.connect(ctx.destination);
            bounce.start(now + 0.13);
            bounce.stop(now + 0.32);
          };

          if (ctx.state === "suspended") {
            ctx.resume().then(playFiberDrop).catch(() => {});
          } else {
            playFiberDrop();
          }
        }
      }
    } catch {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const add = async (productId: string, qty = 1, variant?: string | null): Promise<boolean> => {
    if (!user) {
      if (guestCartLoginStarted.current) return false;
      guestCartLoginStarted.current = true;
      try {
        await AsyncStorage.setItem(PENDING_CART_ADD_KEY, JSON.stringify({
          productId: String(productId),
          quantity: qty,
          variant: variant ?? null,
          createdAt: Date.now(),
        }));
        router.push({ pathname: "/auth/login", params: { source: "cart" } } as any);
      } catch (error) {
        guestCartLoginStarted.current = false;
        throw error;
      }
      return false;
    }

    if (user.role !== "customer") {
      throw new Error("Please use a customer account to add products to the cart.");
    }

    playAddFeedback();
    const c = await api.cartAdd(productId, qty, variant);
    setCart(c);
    setPulse((p) => p + 1);
    return true;
  };

  const update = async (productId: string, qty: number, variant?: string | null) => {
    const c = await api.cartUpdate(productId, qty, variant); setCart(c);
  };
  const clear = async () => { await api.cartClear(); setCart({ items: [], item_count: 0, subtotal: 0, total: 0, delivery_fee: 0, tax: 0 }); };
  const bumpBadge = () => setPulse((p) => p + 1);

  return (
    <Ctx.Provider value={{ cart, itemCount: cart?.item_count || 0, refresh, add, update, clear, badgePulse, bumpBadge }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
};
