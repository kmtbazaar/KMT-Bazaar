import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import {
  api,
  clearAuth,
  clearLegacyToken,
  clearWebSessionExpiredNotice,
  clearWebSessionLogoutFlag,
  clearWebSessionMarkers,
  getToken,
  getUser,
  getWebSessionLastActivity,
  hasWebSessionExpiredNotice,
  hasWebSessionExplicitlyLoggedOut,
  isWebSessionIdleExpired,
  markWebSessionExpired,
  markWebSessionLoggedOut,
  recordWebSessionActivity,
  WEB_SESSION_ACTIVITY_SYNC_DELAY_MS,
  WEB_SESSION_REFRESH_INTERVAL_MS,
  WEB_SESSION_TIMEOUT_MS,
  setToken,
  setUser,
  User,
  GoogleLoginResult,
} from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
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

// Browser startup can hit a short network/TLS/proxy hiccup before the API is
// reachable. Retry only network/5xx failures; do not retry real auth denials.
async function retryTransientSessionRequest<T>(request: () => Promise<T>): Promise<T> {
  const delaysMs = [500, 1200];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error: any) {
      const status = Number(error?.status);
      const transient = !Number.isFinite(status) || status === 0 || status >= 500;
      if (!transient || attempt >= delaysMs.length) throw error;
      console.warn(
        `[auth] Temporary session request failure; retrying (${attempt + 1}/${delaysMs.length})`,
        error
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryInProgress = useRef(false);

  const markSessionActive = useCallback(() => {
    if (Platform.OS === "web") {
      recordWebSessionActivity();
      clearWebSessionExpiredNotice();
      clearWebSessionLogoutFlag();
      setSessionExpired(false);
    }
    expiryInProgress.current = false;
  }, []);

  const expireWebSession = useCallback(async () => {
    if (Platform.OS !== "web" || expiryInProgress.current) return;
    expiryInProgress.current = true;
    markWebSessionExpired();
    setSessionExpired(true);
    try {
      // Revoke the server-side session as well as expiring it in this browser.
      await api.logoutSession();
    } catch (error) {
      console.warn("[auth] Could not revoke the expired web session", error);
    }
    await clearAuth();
    setU(null);
    setLoading(false);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        setSessionExpired(hasWebSessionExpiredNotice());
        if (hasWebSessionExplicitlyLoggedOut()) {
          setSessionExpired(false);
          await clearRejectedSession();
          setU(null);
          return;
        }
        if (hasWebSessionExpiredNotice()) {
          await clearRejectedSession();
          setU(null);
          return;
        }
        if (isWebSessionIdleExpired()) {
          await expireWebSession();
          return;
        }
      }

      const cached = await getUser();
      if (cached) setU(cached);

      if (Platform.OS === "web") {
        // The server cookie, not cached profile data, is the source of truth.
        // Older deployments stored JWTs in web storage; exchange one for a
        // fresh HttpOnly cookie, then remove the JS-readable legacy token.
        const legacyToken = await getToken();
        if (legacyToken) {
          try {
            const fresh = await retryTransientSessionRequest(() => api.migrateSession());
            await clearLegacyToken();
            await setUser(fresh);
            markSessionActive();
            setU(fresh);
            return;
          } catch (error: any) {
            if (isAuthFailure(error)) {
              // An expired legacy bearer must not mask a still-valid cookie.
              await clearLegacyToken();
              try {
                const fresh = await retryTransientSessionRequest(() => api.me());
                await setUser(fresh);
                markSessionActive();
                setU(fresh);
                return;
              } catch (cookieError: any) {
                if (isAuthFailure(cookieError)) {
                  const shouldNotify = Number(cookieError?.status) === 401 && getWebSessionLastActivity() !== null;
                  await clearRejectedSession();
                  if (shouldNotify) {
                    markWebSessionExpired();
                    setSessionExpired(true);
                  } else {
                    clearWebSessionMarkers();
                    setSessionExpired(false);
                  }
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
          const fresh = await retryTransientSessionRequest(() => api.me());
          await setUser(fresh);
          markSessionActive();
          setU(fresh);
        } catch (error: any) {
          if (isAuthFailure(error)) {
            const shouldNotify = Number(error?.status) === 401 && getWebSessionLastActivity() !== null;
            await clearRejectedSession();
            if (shouldNotify) {
              markWebSessionExpired();
              setSessionExpired(true);
            } else {
              clearWebSessionMarkers();
              setSessionExpired(false);
            }
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
  }, [expireWebSession, markSessionActive]);

  useEffect(() => {
    void bootstrap();

    if (Platform.OS !== "web") return;

    // Browser session restore/BFCache can resume a page with stale React auth
    // state without a normal remount. Re-check the server cookie on restoration.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void bootstrap();
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [bootstrap]);

  // Browser idle timeout: activity extends the server cookie and the local timer.
  useEffect(() => {
    if (Platform.OS !== "web" || loading || !user) return;

    let disposed = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let activitySyncTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshInFlight = false;
    let syncAgainAfterRefresh = false;
    let sessionRejected = false;
    let lastServerRefreshAt = Date.now();
    let lastStoredActivityAt = getWebSessionLastActivity() ?? 0;
    let lastObservedActivityAt = getWebSessionLastActivity() ?? Date.now();
    let lastHighFrequencyActivityAt = 0;

    const effectiveLastActivity = () =>
      Math.max(getWebSessionLastActivity() ?? 0, lastObservedActivityAt);

    const scheduleIdleCheck = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const lastActivity = effectiveLastActivity();
      const remaining = WEB_SESSION_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) {
        void expireWebSession();
        return;
      }
      idleTimer = setTimeout(() => {
        if (disposed) return;
        const currentActivity = effectiveLastActivity();
        if (Date.now() - currentActivity >= WEB_SESSION_TIMEOUT_MS) {
          void expireWebSession();
        } else {
          scheduleIdleCheck();
        }
      }, remaining + 25);
    };

    const syncActivityWithServer = () => {
      activitySyncTimer = undefined;
      if (disposed) return;
      if (refreshInFlight) {
        syncAgainAfterRefresh = true;
        return;
      }

      const activityAtRequest = effectiveLastActivity();
      if (Date.now() - activityAtRequest >= WEB_SESSION_TIMEOUT_MS) {
        void expireWebSession();
        return;
      }

      refreshInFlight = true;
      void retryTransientSessionRequest(() => api.refreshWebSession())
        .then(() => {
          lastServerRefreshAt = Date.now();
        })
        .catch((error: any) => {
          // Ignore a late refresh response after this provider has unmounted/logged out.
          if (disposed) return;
          if (Number(error?.status) === 401) {
            sessionRejected = true;
            syncAgainAfterRefresh = false;
            void expireWebSession();
          } else if (Number(error?.status) === 403) {
            sessionRejected = true;
            syncAgainAfterRefresh = false;
            void clearRejectedSession().then(() => {
              clearWebSessionMarkers();
              setSessionExpired(false);
              setU(null);
            });
          } else {
            console.warn("[auth] Could not refresh the active web session", error);
          }
        })
        .finally(() => {
          refreshInFlight = false;
          if (!sessionRejected && syncAgainAfterRefresh && !disposed) {
            syncAgainAfterRefresh = false;
            scheduleActivitySync();
          }
        });
    };

    const scheduleActivitySync = () => {
      if (activitySyncTimer) clearTimeout(activitySyncTimer);
      activitySyncTimer = setTimeout(syncActivityWithServer, WEB_SESSION_ACTIVITY_SYNC_DELAY_MS);
    };

    const handleActivity = () => {
      if (disposed) return;
      const now = Date.now();
      const previousActivity = effectiveLastActivity();
      if (now - previousActivity >= WEB_SESSION_TIMEOUT_MS) {
        void expireWebSession();
        return;
      }

      lastObservedActivityAt = now;
      if (now - lastStoredActivityAt >= 1000) {
        recordWebSessionActivity(now);
        lastStoredActivityAt = now;
      }
      scheduleIdleCheck();

      // Debounce ordinary interactions, but refresh periodically during long continuous use.
      if (now - lastServerRefreshAt >= WEB_SESSION_REFRESH_INTERVAL_MS) {
        if (activitySyncTimer) {
          clearTimeout(activitySyncTimer);
          activitySyncTimer = undefined;
        }
        syncActivityWithServer();
      } else {
        scheduleActivitySync();
      }
    };

    const handleHighFrequencyActivity = () => {
      const now = Date.now();
      if (now - lastHighFrequencyActivityAt < 1000) return;
      lastHighFrequencyActivityAt = now;
      handleActivity();
    };

    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        handleActivity();
      }
    };

    if (isWebSessionIdleExpired()) {
      void expireWebSession();
    } else {
      scheduleIdleCheck();
    }

    window.addEventListener("pointerdown", handleActivity, { passive: true });
    window.addEventListener("pointermove", handleHighFrequencyActivity, { passive: true });
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("touchmove", handleHighFrequencyActivity, { passive: true });
    window.addEventListener("scroll", handleHighFrequencyActivity, true);
    window.addEventListener("wheel", handleHighFrequencyActivity, { passive: true });
    window.addEventListener("pageshow", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (idleTimer) clearTimeout(idleTimer);
      if (activitySyncTimer) clearTimeout(activitySyncTimer);
      window.removeEventListener("pointerdown", handleActivity);
      window.removeEventListener("pointermove", handleHighFrequencyActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("touchmove", handleHighFrequencyActivity);
      window.removeEventListener("scroll", handleHighFrequencyActivity, true);
      window.removeEventListener("wheel", handleHighFrequencyActivity);
      window.removeEventListener("pageshow", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, loading, expireWebSession]);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    await setToken(r.token);
    await setUser(r.user);
    markSessionActive();
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const register = async (data: any) => {
    const r = await api.register(data);
    await setToken(r.token);
    await setUser(r.user);
    markSessionActive();
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
    markSessionActive();
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
    markSessionActive();
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const loginOtp = async (phone: string, otp: string, name?: string) => {
    const r = await api.otpVerify(phone, otp, name);
    await setToken(r.token);
    await setUser(r.user);
    markSessionActive();
    setU(r.user);
    setLoading(false);
    return r.user;
  };
  const googleLogin = async (credential: string): Promise<GoogleLoginResult> => {
    const r = await api.googleLogin(credential);
    if (r.signup_required) return r;

    await setToken(r.token);
    await setUser(r.user);
    markSessionActive();
    setU(r.user);
    setLoading(false);
    return r;
  };
  const logout = async () => {
    if (Platform.OS === "web") {
      // Prevent an in-flight idle timer from showing an expiry notice during explicit logout.
      expiryInProgress.current = true;
      try {
        await api.logoutSession();
      } catch (error) {
        // Still clear local UI state; the server cookie expires naturally if offline.
        console.warn("[auth] Server logout could not be confirmed", error);
      }
    }
    await clearAuth();
    if (Platform.OS === "web") {
      markWebSessionLoggedOut();
      setSessionExpired(false);
    }
    expiryInProgress.current = false;
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
    <Ctx.Provider value={{ user, loading, sessionExpired, login, requestEmailLoginOtp, verifyEmailLoginOtp, register, requestEmailSignupOtp, verifyEmailSignupOtp, loginOtp, googleLogin, logout, refresh: bootstrap, updateAddress }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
 const c = useContext(Ctx);
 if (!c) return {
  user: null,
  loading: true,
  sessionExpired: false,
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