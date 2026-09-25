import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://kmtbazaar.tech";

export const API = `${BASE}/api`;

const TOKEN_KEY = "kmt_token";
const USER_KEY = "kmt_user";

export type UserRole = "customer" | "vendor" | "delivery" | "admin";
export type VendorType = "store" | "service";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
  vendor_type?: VendorType | null;
}

// Storage helpers
export async function setToken(token: string) {
  if (Platform.OS === "web") {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken() {
  if (Platform.OS === "web") {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuth() {
  if (Platform.OS === "web") {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } else {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
}

export async function setUser(u: User) {
  const data = JSON.stringify(u);

  if (Platform.OS === "web") {
    sessionStorage.setItem(USER_KEY, data);
  } else {
    await AsyncStorage.setItem(USER_KEY, data);
  }
}

export async function getUser() {
  try {
    let v;

    if (Platform.OS === "web") {
      v = sessionStorage.getItem(USER_KEY);
    } else {
      v = await AsyncStorage.getItem(USER_KEY);
    }

    if (!v || v === "undefined" || v === "null") {
      return null;
    }

    return JSON.parse(v);
  } catch (e) {
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

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  const url = `${API}${cleanPath}`;

  console.log("API Request:", url);

  const res = await fetch(url, {
    ...options,
    headers,
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

    throw new Error(
      typeof errorMsg === "string"
        ? errorMsg
        : JSON.stringify(errorMsg)
    );
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

export async function uploadImageAsset(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: any;
}): Promise<string> {
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

  const response = await fetch(`${API}/uploads/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
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


export const api = {
  googleLogin: (credential: string) =>
    apiFetch<{ token: string; user: User }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),

  checkIdentifier: (identifier: string) =>
    apiFetch<{ exists: boolean }>("/auth/check-identifier", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    }),

  login: (identifier: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier,
        password,
      }),
    }),

  register: (
    data: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role?: string;
    }
  ) =>
    apiFetch<{ token: string; user: User }>("/auth/register", {
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
    apiFetch<{ token: string; user: User }>("/auth/otp/verify", {
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

  categories: () =>
    apiFetch<any[]>("/categories"),

  banners: () =>
    apiFetch<any[]>("/banners"),

  stores: () =>
    apiFetch<any[]>("/stores"),

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