import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { api, clearAuth, clearLegacyToken, getToken, getUser, setToken, setUser, User, GoogleLoginResult } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  requestEmailLoginOtp: (email: string, password: string) => Promise<any>;
  verifyEmailLoginOtp: (email: string, otp: string) => Promise<User>;
  register: (data: { name: string; email: string; phone?: string; password: string; role?: string; vendor_type?: "store" | "service"; service_type?: "holiday" | "car_rental" | "daily_service" }) => Promise<User>;
  requestEmailSignupOtp: (data: any) => Promise<any>;
  verifyEmailSignupOtp: (email: string, otp: string) => Promise<User>;
  loginOtp: (phone: string, otp: string, name?: string) => Promise<User>;
  googleLogin: (credential: string) => Promise<GoogleLoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateAddress: (addressData: any) => Promise<void>; // <-- Naya add kiya hai
}

function isAuthFailure(error: any): boolean {
  const status = Number(error?.status);
  return status === 401 || status === 403 || /HTTP (401|403)\b/.test(String(error?.message || ""));
}

async function clearRejectedSession() {
  if (Platform.OS === "web") {
    try {
      // Revoke the server-side opaque session as well as clearing browser state.
      await api.logoutSession();
    } catch (error) {
      console.warn("[auth] Could not revoke the rejected server session", error);
    }
  }
  await clearAuth();
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setU] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await getUser();
      if (cached) setU(cached);

      if (Platform.OS === "web") {
        // The server cookie, not cached profile data, is the source of truth.
        // Older deployments stored JWTs in web storage; exchange one for a
        // fresh HttpOnly cookie, then remove the JS-readable legacy token.
        const legacyToken = await getToken();
        if (legacyToken) {
          try {
            const fresh = await api.migrateSession();
            await clearLegacyToken();
            await setUser(fresh);
            setU(fresh);
            return;
          } catch (error: any) {
            if (isAuthFailure(error)) {
              // An expired legacy bearer must not mask a still-valid cookie.
              await clearLegacyToken();
              try {
                const fresh = await api.me();
                await setUser(fresh);
                setU(fresh);
                return;
              } catch (cookieError: any) {
                if (isAuthFailure(cookieError)) {
                  await clearRejectedSession();
                  setU(null);
                } else {
                  console.warn("[auth] Session check temporarily failed; cached profile retained", cookieError);
                }
                return;
              }
            }
            console.warn("[auth] Legacy-session migration temporarily failed; retrying on next load", error);
            return;
          }
        }

        try {
          const fresh = await api.me();
          await setUser(fresh);
          setU(fresh);
        } catch (error: any) {
          if (isAuthFailure(error)) {
            await clearRejectedSession();
            setU(null);
          } else {
            // Network/5xx errors must not erase a valid server cookie.
            console.warn("[auth] Session check temporarily failed; cached profile retained", error);
          }
        }
        return;
      }

      // Native clients continue using the existing AsyncStorage + Bearer flow.
      const token = await getToken();
      if (!token) {
        setU(null);
        return;
      }
      try {
        const fresh = await api.me();
        await setUser(fresh);
        setU(fresh);
      } catch (error: any) {
        if (isAuthFailure(error)) {
          await clearAuth();
          setU(null);
        } else {
          console.warn("[auth] Session check temporarily failed; cached profile retained", error);
        }
      }
    } catch (error) {
      console.warn("[auth] Could not restore saved session", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const register = async (data: any) => {
    const r = await api.register(data);
    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r.user;
  };

  const requestEmailLoginOtp = async (email: string, password: string) => {
    return api.requestEmailLoginOtp(email, password);
  };

  const verifyEmailLoginOtp = async (email: string, otp: string) => {
    const r = await api.verifyEmailLoginOtp(email, otp);
    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r.user;
  };

  const requestEmailSignupOtp = async (data: any) => {
    return api.requestEmailSignupOtp(data);
  };

  const verifyEmailSignupOtp = async (email: string, otp: string) => {
    const r = await api.verifyEmailSignupOtp(email, otp);
    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const loginOtp = async (phone: string, otp: string, name?: string) => {
    const r = await api.otpVerify(phone, otp, name);
    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const googleLogin = async (credential: string): Promise<GoogleLoginResult> => {
    const r = await api.googleLogin(credential);
    if (r.signup_required) return r;

    await setToken(r.token);
    await setUser(r.user);
    setU(r.user);
    setLoading(false);
    return r;
  };
  const logout = async () => {
    if (Platform.OS === "web") {
      try {
        await api.logoutSession();
      } catch (error) {
        // Still clear local UI state; the server cookie expires naturally if offline.
        console.warn("[auth] Server logout could not be confirmed", error);
      }
    }
    await clearAuth();
    setU(null);
  };

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
    <Ctx.Provider value={{ user, loading, login, requestEmailLoginOtp, verifyEmailLoginOtp, register, requestEmailSignupOtp, verifyEmailSignupOtp, loginOtp, googleLogin, logout, refresh: bootstrap, updateAddress }}>
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
  requestEmailLoginOtp: async () => { throw new Error("Auth not ready"); },
  verifyEmailLoginOtp: async () => { throw new Error("Auth not ready"); },
  requestEmailSignupOtp: async () => { throw new Error("Auth not ready"); },
  verifyEmailSignupOtp: async () => { throw new Error("Auth not ready"); },
  loginOtp: async () => { throw new Error("Auth not ready"); },
  googleLogin: async () => { throw new Error("Auth not ready"); },
  logout: async () => {},
  refresh: async () => {},
  updateAddress: async () => {}, // <-- Fallback mein add kiya hai
 } as AuthCtx;
  return c;
};