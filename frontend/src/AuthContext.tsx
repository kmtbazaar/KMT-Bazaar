import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, clearAuth, getToken, getUser, setToken, setUser, User } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; phone?: string; password: string; role?: string }) => Promise<User>;
  loginOtp: (phone: string, otp: string, name?: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateAddress: (addressData: any) => Promise<void>; // <-- Naya add kiya hai
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setU] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getToken();
      const cached = await getUser();
      if (t && cached) setU(cached);
      if (t) {
        try { const fresh = await api.me(); setU(fresh); await setUser(fresh); } catch {}
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    await setToken(r.token); await setUser(r.user); setU(r.user); return r.user;
  };
  const register = async (data: any) => {
    const r = await api.register(data);
    await setToken(r.token); await setUser(r.user); setU(r.user); return r.user;
  };
  const loginOtp = async (phone: string, otp: string, name?: string) => {
    const r = await api.otpVerify(phone, otp, name);
    await setToken(r.token); await setUser(r.user); setU(r.user); return r.user;
  };
  const logout = async () => { await clearAuth(); setU(null); };

  // <-- Naya function add kiya hai
  const updateAddress = async (addressData: any) => {
    try {
      console.log("Updating address:", addressData);
      // Agar future mein API lagana ho toh yahan call aayegi
    } catch (error) {
      console.error("Address update failed:", error);
    }
  };

  return (
    // <-- updateAddress ko Provider mein add kiya hai
    <Ctx.Provider value={{ user, loading, login, register, loginOtp, logout, refresh: bootstrap, updateAddress }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
 const c = useContext(Ctx);
 if (!c) return {
  user: null,
  loading: true,
  login: async () => { throw new Error("Auth not ready"); },
  register: async () => { throw new Error("Auth not ready"); },
  loginOtp: async () => { throw new Error("Auth not ready"); },
  logout: async () => {},
  refresh: async () => {},
  updateAddress: async () => {}, // <-- Fallback mein add kiya hai
 } as AuthCtx;
  return c;
};