import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

  const add = async (productId: string, qty = 1) => {
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
