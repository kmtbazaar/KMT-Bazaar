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

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAddFeedback = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = audioCtxRef.current || new AudioCtx();
          audioCtxRef.current = ctx;
          const play = () => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(560, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.07);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.24, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
          };
          if (ctx.state === "suspended") {
            ctx.resume().then(play).catch(() => {});
          } else {
            play();
          }
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
