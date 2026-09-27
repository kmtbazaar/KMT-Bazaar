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

          const playDrumDrop = () => {
            const now = ctx.currentTime;

            const makeThump = (time: number, freq: number, volume: number, decay: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, time);
              osc.frequency.exponentialRampToValueAtTime(Math.max(55, freq * 0.42), time + decay);
              gain.gain.setValueAtTime(0.0001, time);
              gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
              gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(time);
              osc.stop(time + decay + 0.015);
            };

            const makeClick = (time: number) => {
              const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.045), ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
              }
              const src = ctx.createBufferSource();
              const filter = ctx.createBiquadFilter();
              const gain = ctx.createGain();
              filter.type = "bandpass";
              filter.frequency.setValueAtTime(1200, time);
              filter.Q.setValueAtTime(0.8, time);
              gain.gain.setValueAtTime(0.11, time);
              gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
              src.buffer = buffer;
              src.connect(filter);
              filter.connect(gain);
              gain.connect(ctx.destination);
              src.start(time);
              src.stop(time + 0.05);
            };

            makeThump(now, 115, 0.34, 0.18);
            makeClick(now + 0.018);
            makeThump(now + 0.085, 82, 0.22, 0.15);
          };

          if (ctx.state === "suspended") {
            ctx.resume().then(playDrumDrop).catch(() => {});
          } else {
            playDrumDrop();
          }
        }
      }
    } catch {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
