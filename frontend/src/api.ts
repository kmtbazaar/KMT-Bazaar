import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://kmtbazaar.com";

export const API = `${BASE}/api`;

const TOKEN_KEY = "kmt_token";
const USER_KEY = "kmt_user";

export const WEB_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const WEB_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const WEB_LAST_ACTIVITY_KEY = "kmt_web_last_activity";
const WEB_SESSION_EXPIRED_KEY = "kmt_web_session_expired";

export function getWebSessionLastActivity(): number | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(WEB_LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function recordWebSessionActivity(at = Date.now()): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEB_LAST_ACTIVITY_KEY, String(at));
  } catch {}
}

export function isWebSessionIdleExpired(at = Date.now()): boolean {
  const lastActivity = getWebSessionLastActivity();
  return lastActivity !== null && at - lastActivity >= WEB_SESSION_TIMEOUT_MS;
}

export function hasWebSessionExpiredNotice(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WEB_SESSION_EXPIRED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWebSessionExpired(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WEB_LAST_ACTIVITY_KEY);
    window.localStorage.setItem(WEB_SESSION_EXPIRED_KEY, "1");
  } catch {}
}

export function clearWebSessionMarkers(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WEB_LAST_ACTIVITY_KEY);
    window.localStorage.removeItem(WEB_SESSION_EXPIRED_KEY);
  } catch {}
}

export function clearWebSessionExpiredNotice(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WEB_SESSION_EXPIRED_KEY);
  } catch {}
}

export type UserRole = "customer" | "vendor" | "delivery" | "admin";
export type VendorType = "store" | "service";
export type ServiceType = "holiday" | "car_rental" | "daily_service";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
  vendor_type?: VendorType | null;
  service_type?: ServiceType | null;
}

// Browser sessions use an HttpOnly server cookie. Browser token storage is read
// only to migrate sessions created by older app versions; new web logins never
// persist bearer tokens in localStorage or sessionStorage.
function readWebStoredValue(key: string): string | null {
  try {
    const persistent = window.localStorage.getItem(key);
    if (persistent !== null) return persistent;
  } catch {}
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeWebStoredValue(key: string): void {
  try { window.localStorage.removeItem(key); } catch {}
  try { window.sessionStorage.removeItem(key); } catch {}
}

export async function clearLegacyToken() {
  if (Platform.OS === "web") {
    removeWebStoredValue(TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function setToken(token: string | null | undefined) {
  if (Platform.OS === "web") {
    // Web auth is supplied by the HttpOnly cookie, never by a JS-readable token.
    removeWebStoredValue(TOKEN_KEY);
    return;
  }
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getToken() {
  if (Platform.OS === "web") {
    return readWebStoredValue(TOKEN_KEY);
  }
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuth() {
  if (Platform.OS === "web") {
    removeWebStoredValue(TOKEN_KEY);
    removeWebStoredValue(USER_KEY);
  } else {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
}

export async function setUser(u: User) {
  const data = JSON.stringify(u);
  if (Platform.OS === "web") {
    try {
      // This is only a display cache, not proof that the user is authenticated.
      window.sessionStorage.setItem(USER_KEY, data);
    } catch {}
  } else {
    await AsyncStorage.setItem(USER_KEY, data);
  }
}

export async function getUser() {
  try {
    const v = Platform.OS === "web"
      ? readWebStoredValue(USER_KEY)
      : await AsyncStorage.getItem(USER_KEY);

    if (!v || v === "undefined" || v === "null") return null;
    return JSON.parse(v);
  } catch {
    return null;
  }
}

// Robust API Fetch Handler
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // In browsers the legacy JWT is sent only for its one-time migration.
  // Normal web requests rely exclusively on the HttpOnly cookie.
  if (token && (Platform.OS !== "web" || path.endsWith("/auth/session/migrate"))) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (Platform.OS === "web") {
    headers["X-KMT-Auth-Mode"] = "cookie";
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const url = `${API}${cleanPath}`;

  console.log("API Request:", url);

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: Platform.OS === "web" ? "include" : "same-origin",
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;

    try {
      const errText = await res.text();
      const errJson = errText ? JSON.parse(errText) : null;

      errorMsg =
        (errJson && (errJson.detail || errJson.message)) ||
        errorMsg;
    } catch {}

    const error = new Error(
      typeof errorMsg === "string"
        ? errorMsg
        : JSON.stringify(errorMsg)
    ) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();

  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  return json as T;
}

export async function uploadImageAsset(
  asset: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    file?: any;
  },
  purpose?: "product" | "general"
): Promise<string> {
  const token = await getToken();
  const formData = new FormData();

  if (Platform.OS === "web") {
    let webFile = asset.file;

    if (!webFile) {
      const blob = await (await fetch(asset.uri)).blob();
      const name = asset.fileName || `image-${Date.now()}.jpg`;
      webFile = new File([blob], name, {
        type: asset.mimeType || blob.type || "image/jpeg",
      });
    }

    formData.append("file", webFile);
  } else {
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    } as any);
  }

  const uploadHeaders: Record<string, string> =
    token && Platform.OS !== "web"
      ? { Authorization: `Bearer ${token}` }
      : {};

  if (Platform.OS === "web") {
    uploadHeaders["X-KMT-Auth-Mode"] = "cookie";
  }
  if (purpose === "product") {
    uploadHeaders["X-KMT-Image-Purpose"] = "product";
  }

  const response = await fetch(`${API}/uploads/image`, {
    method: "POST",
    headers: uploadHeaders,
    body: formData,
    credentials: Platform.OS === "web" ? "include" : "same-origin",
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || `Image upload failed (HTTP ${response.status})`
    );
  }

  if (!data?.url) {
    throw new Error("Image upload succeeded but no URL was returned.");
  }

  return data.url;
}


export type GoogleLoginResult =
  | { signup_required: true; email: string; name: string }
  | { signup_required: false; token: string | null; user: User };

export const api = {
  googleLogin: (credential: string) =>
    apiFetch<GoogleLoginResult>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),

  checkIdentifier: (identifier: string) =>
    apiFetch<{ exists: boolean }>("/auth/check-identifier", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),

  login: (identifier: string, password: string) =>
    apiFetch<{ token: string | null; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier,
        password,
      }),
    }),

  requestEmailLoginOtp: (email: string, password: string) =>
    apiFetch<{ sent: boolean; email: string; expires_in_minutes: number }>("/auth/email-login/request", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyEmailLoginOtp: (email: string, otp: string) =>
    apiFetch<{ token: string | null; user: User }>("/auth/email-login/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  requestEmailSignupOtp: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
    vendor_type?: VendorType;
    service_type?: ServiceType;
  }) =>
    apiFetch<{ sent: boolean; email: string; expires_in_minutes: number }>("/auth/email-signup/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmailSignupOtp: (email: string, otp: string) =>
    apiFetch<{ token: string | null; user: User }>("/auth/email-signup/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  register: (
    data: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role?: string;
      vendor_type?: VendorType;
      service_type?: ServiceType;
    }
  ) =>
    apiFetch<{ token: string | null; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  otpRequest: (phone: string) =>
    apiFetch("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  otpVerify: (
    phone: string,
    otp: string,
    name?: string
  ) =>
    apiFetch<{ token: string | null; user: User }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        phone,
        otp,
        name,
      }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{
      success: boolean;
      message: string;
      debug_otp?: string;
      expires_in_minutes?: number;
    }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyResetOtp: (
    email: string,
    otp: string
  ) =>
    apiFetch<{
      success: boolean;
      message: string;
    }>("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
      }),
    }),

  resetPassword: (
    email: string,
    otp: string,
    new_password: string
  ) =>
    apiFetch<{
      success: boolean;
      message: string;
    }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
        new_password,
      }),
    }),

  me: () => apiFetch<User>("/auth/me"),

  // Extend the browser session only while the user is actively using the site.
  refreshWebSession: () =>
    apiFetch<{ ok: boolean; expires_in_seconds: number }>("/auth/session/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  // Convert a pre-cookie browser JWT into a fresh HttpOnly cookie once.
  migrateSession: () => apiFetch<User>("/auth/session/migrate", {
    method: "POST",
  }),

  logoutSession: () => apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
  }),

  categories: () =>
    apiFetch<any[]>("/categories"),

  itemCategories: (categoryId?: string, storeId?: string) =>
    apiFetch<any[]>(
      storeId
        ? `/item-categories?store_id=${encodeURIComponent(storeId)}`
        : categoryId
          ? `/item-categories?category_id=${encodeURIComponent(categoryId)}`
          : "/item-categories"
    ),

  banners: () =>
    apiFetch<any[]>("/banners"),

  stores: () =>
    apiFetch<any[]>("/stores"),

  serviceTypes: () => apiFetch<any[]>("/service-types"),
  holidayBanner: () => apiFetch<any>("/holiday/banner"),
  serviceCatalog: (type: string) => apiFetch<any[]>(`/services/catalog/${encodeURIComponent(type)}`),
  serviceDetail: (type: string, id: string) => apiFetch<any>(`/services/catalog/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
  serviceBookings: () => apiFetch<any[]>("/service-bookings"),
  serviceCart: () => apiFetch<any>("/service-cart"),
  serviceCartAdd: (data: any) => apiFetch<any>("/service-cart/add", { method: "POST", body: JSON.stringify(data) }),
  serviceCartClear: () => apiFetch("/service-cart/clear", { method: "DELETE" }),
  serviceCartCheckout: () => apiFetch<any>("/service-cart/checkout", { method: "POST" }),
  serviceCartCustomer: (data: any) => apiFetch<any>("/service-cart/customer", { method: "POST", body: JSON.stringify(data) }),
  serviceCartPay: (data: any) => apiFetch<any>("/service-cart/pay", { method: "POST", body: JSON.stringify(data) }),

  serviceBooking: (id: string) => apiFetch<any>(`/service-bookings/${encodeURIComponent(id)}`),
  createServiceBooking: (data: any) => apiFetch<any>("/service-bookings", { method: "POST", body: JSON.stringify(data) }),
  updateServiceBooking: (id: string, status: string) => apiFetch<any>(`/service-bookings/${encodeURIComponent(id)}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  vendorServices: () =>
    apiFetch<any[]>("/vendor-services"),

  vendorService: (id: string) =>
    apiFetch<any>(`/vendor-services/${encodeURIComponent(id)}`),

  products: (
  params: {
    category?: string;
    q?: string;
    trending?: boolean;
    store_id?: string;
    item_category?: string;
    item_category_id?: string;
  } = {}
) => {
  const qs = new URLSearchParams();

  if (params.category) {
    qs.set("category", params.category);
  }

  if (params.q) {
    qs.set("q", params.q);
  }

  if (params.trending) {
    qs.set("trending", "true");
  }

  if (params.store_id) {
    qs.set("store_id", params.store_id);
  }

  if (params.item_category) {
    qs.set("item_category", params.item_category);
  }

  if (params.item_category_id) {
    qs.set("item_category_id", params.item_category_id);
  }

  const query = qs.toString();

  return apiFetch<any[]>(
    query ? `/products?${query}` : "/products"
  );
},
  product: (id: string) =>
    apiFetch<any>(`/products/${id}`),

  cart: () =>
    apiFetch<any>("/cart"),

  cartAdd: (
    product_id: string,
    quantity = 1
  ) =>
    apiFetch("/cart/add", {
      method: "POST",
      body: JSON.stringify({
        product_id,
        quantity,
      }),
    }),

  cartUpdate: (
    product_id: string,
    quantity: number
  ) =>
    apiFetch("/cart/update", {
      method: "POST",
      body: JSON.stringify({
        product_id,
        quantity,
      }),
    }),

  cartClear: () =>
    apiFetch("/cart/clear", {
      method: "DELETE",
    }),

  reverseGeocode: (latitude: number, longitude: number) =>
    apiFetch<any>(`/geo/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`),

  addresses: () =>
    apiFetch<any[]>("/addresses"),

  createAddress: (data: any) =>
    apiFetch("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAddress: (
    id: string,
    data: any
  ) =>
    apiFetch(
      `/addresses/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  deleteAddress: (id: string) =>
    apiFetch(
      `/addresses/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    ),

  checkout: (
    data: {
      address_id: string;
      payment_method: string;
      notes?: string;
    }
  ) =>
    apiFetch<any>("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  orders: () =>
    apiFetch<any[]>("/orders"),

  order: (id: string) =>
    apiFetch<any>(`/orders/${id}`),

  updateCustomerLocation: (
    orderId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ) =>
    apiFetch("/orders/" + encodeURIComponent(orderId) + "/customer-location", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude, accuracy }),
    }),

  notifications: () =>
    apiFetch<any[]>("/notifications"),

  unreadCount: () =>
    apiFetch<{ count: number }>(
      "/notifications/unread-count"
    ),

  markNotifRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, {
      method: "POST",
    }),
};