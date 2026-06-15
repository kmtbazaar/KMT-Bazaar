import { apiFetch } from "./api";

export const adminApi = {
  stats: () => apiFetch<any>("/admin/stats"),
  users: (role?: string) => apiFetch<any[]>(`/admin/users${role ? `?role=${role}` : ""}`),
  toggleUser: (id: string) => apiFetch(`/admin/users/${id}/toggle`, { method: "POST" }),
  orders: (status?: string) => apiFetch<any[]>(`/admin/orders${status ? `?status=${status}` : ""}`),
  updateOrderStatus: (id: string, status: string) =>
    apiFetch(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  createProduct: (data: any) => apiFetch("/admin/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => apiFetch(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiFetch(`/admin/products/${id}`, { method: "DELETE" }),
  createCategory: (data: any) => apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiFetch(`/admin/categories/${id}`, { method: "DELETE" }),
  createBanner: (data: any) => apiFetch("/admin/banners", { method: "POST", body: JSON.stringify(data) }),
  deleteBanner: (id: string) => apiFetch(`/admin/banners/${id}`, { method: "DELETE" }),
  getCommission: () => apiFetch<any>("/admin/commission"),
  setCommission: (percent: number) => apiFetch("/admin/commission", { method: "POST", body: JSON.stringify({ percent }) }),
};

export const vendorApi = {
  stats: () => apiFetch<any>("/vendor/stats"),
  products: () => apiFetch<any[]>("/vendor/products"),
  createProduct: (data: any) => apiFetch("/vendor/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => apiFetch(`/vendor/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiFetch(`/vendor/products/${id}`, { method: "DELETE" }),
  orders: () => apiFetch<any[]>("/vendor/orders"),
  acceptOrder: (id: string) => apiFetch(`/vendor/orders/${id}/accept`, { method: "POST" }),
};

export const deliveryApi = {
  me: () => apiFetch<any>("/delivery/me"),
  toggleOnline: (online: boolean) => apiFetch("/delivery/online", { method: "POST", body: JSON.stringify({ online }) }),
  available: () => apiFetch<any[]>("/delivery/available"),
  claim: (id: string) => apiFetch(`/delivery/orders/${id}/claim`, { method: "POST" }),
  markDelivered: (id: string) => apiFetch(`/delivery/orders/${id}/delivered`, { method: "POST" }),
  my: () => apiFetch<any[]>("/delivery/my"),
  stats: () => apiFetch<any>("/delivery/stats"),
};
