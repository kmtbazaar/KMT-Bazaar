import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "http://10.102.73.13:8000";

export const API = `${BASE}/api`;

const TOKEN_KEY = "kmt_token";
const USER_KEY = "kmt_user";

export type UserRole = "customer" | "vendor" | "delivery" | "admin";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
}

// 🔥 WEB & MOBILE OPTIMIZED STORAGE (localStorage ko sessionStorage kar diya) 🔥
export async function setToken(token: string) {
  if (Platform.OS === 'web') {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function getToken() {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuth() {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } else {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
}

export async function setUser(u: User) {
  const data = JSON.stringify(u);
  if (Platform.OS === 'web') {
    sessionStorage.setItem(USER_KEY, data);
  } else {
    await AsyncStorage.setItem(USER_KEY, data);
  }
}

export async function getUser() {
  try {
    let v;
    if (Platform.OS === 'web') {
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

// 🔥 API FETCH LOGIC 🔥
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const text = await res.text();
  let json: any = null;
  
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  
  if (!res.ok) {
    const msg = (json && (json.detail || json.message)) || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { name: string; email: string; phone?: string; password: string; role?: string }) =>
    apiFetch<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  otpRequest: (phone: string) =>
    apiFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  otpVerify: (phone: string, otp: string, name?: string) =>
    apiFetch<{ token: string; user: User }>("/auth/otp/verify", {
      method: "POST", body: JSON.stringify({ phone, otp, name }),
    }),
  me: () => apiFetch<User>("/auth/me"),
  categories: () => apiFetch<any[]>("/categories"),
  banners: () => apiFetch<any[]>("/banners"),
  stores: () => apiFetch<any[]>("/stores"),
  products: (params: { category?: string; q?: string; trending?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.q) qs.set("q", params.q);
    if (params.trending) qs.set("trending", "true");
    return apiFetch<any[]>(`/products?${qs.toString()}`);
  },
  product: (id: string) => apiFetch<any>(`/products/${id}`),
  cart: () => apiFetch<any>("/cart"),
  cartAdd: (product_id: string, quantity = 1) =>
    apiFetch("/cart/add", { method: "POST", body: JSON.stringify({ product_id, quantity }) }),
  cartUpdate: (product_id: string, quantity: number) =>
    apiFetch("/cart/update", { method: "POST", body: JSON.stringify({ product_id, quantity }) }),
  cartClear: () => apiFetch("/cart/clear", { method: "DELETE" }),
  addresses: () => apiFetch<any[]>("/addresses"),
  createAddress: (data: any) =>
    apiFetch("/addresses", { method: "POST", body: JSON.stringify(data) }),
    
  // 👇 Yahan updateAddress add kar diya hai 👇
  updateAddress: (id: string, data: any) =>
    apiFetch(`/addresses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    
  deleteAddress: (id: string) => apiFetch(`/addresses/${id}`, { method: "DELETE" }),
  checkout: (data: { address_id: string; payment_method: string; notes?: string }) =>
    apiFetch<any>("/orders/checkout", { method: "POST", body: JSON.stringify(data) }),
  orders: () => apiFetch<any[]>("/orders"),
  order: (id: string) => apiFetch<any>(`/orders/${id}`),
  notifications: () => apiFetch<any[]>("/notifications"),
  unreadCount: () => apiFetch<{ count: number }>("/notifications/unread-count"),
  markNotifRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "POST" }),
};