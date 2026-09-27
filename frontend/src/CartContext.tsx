import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { api } from "./api";
import { useAuth } from "./AuthContext";

interface CartCtx {
  cart: any | null;
  itemCount: number;
  refresh: () => Promise<void>;
  add: (productId: string, qty?: number) => Promise<void>;
  update: (productId: string, qty: number) => Promise<void>;
  clear: () => Promise<void>;
  bumpBadge: () => void;
  badgePulse: number;
}

const Ctx = createContext<CartCtx | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<any | null>(null);
  const [badgePulse, setPulse] = useState(0);
  const reqId = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) { setCart(null); return; }
    const id = ++reqId.current;
    try {
      const c = await api.cart();
      if (id === reqId.current) setCart(c);
    } catch {}
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const playAddFeedback = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(720, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.09);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          window.setTimeout(() => { try { ctx.close(); } catch {} }, 220);
        }
      }
    } catch {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const add = async (productId: string, qty = 1) => {
    playAddFeedback();
    const c = await api.cartAdd(productId, qty); setCart(c); setPulse((p) => p + 1);
  };
  const update = async (productId: string, qty: number) => {
    const c = await api.cartUpdate(productId, qty); setCart(c);
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
