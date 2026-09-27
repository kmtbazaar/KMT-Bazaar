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
