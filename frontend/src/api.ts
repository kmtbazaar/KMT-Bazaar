import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
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

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
export async function setUser(u: User) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
}
export async function getUser(): Promise<User | null> {
  const v = await AsyncStorage.getItem(USER_KEY);
  return v ? JSON.parse(v) : null;
}

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
