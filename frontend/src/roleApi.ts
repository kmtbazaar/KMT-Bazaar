import { apiFetch } from "./api";

export const adminApi = {
  stores: (status?: string) =>
    apiFetch<any[]>(
      `/admin/stores${status ? `?status=${status}` : ""}`
    ),

  approveStore: (id: string) =>
    apiFetch(`/admin/stores/${id}/approve`, {
      method: "POST",
    }),

  rejectStore: (id: string) =>
    apiFetch(`/admin/stores/${id}/reject`, {
      method: "POST",
    }),

  vendorServices: () =>
    apiFetch<any[]>("/admin/vendor-services"),

  createVendorService: (data: any) =>
    apiFetch("/admin/vendor-services", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateVendorService: (id: string, data: any) =>
    apiFetch(`/admin/vendor-services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteVendorService: (id: string) =>
    apiFetch(`/admin/vendor-services/${id}`, {
      method: "DELETE",
    }),

  serviceBookings: () => apiFetch<any[]>("/admin/service-bookings"),
  updateServiceBooking: (id: string, status: string) => apiFetch<any>(`/admin/service-bookings/${encodeURIComponent(id)}/status`, { method: "POST", body: JSON.stringify({ status }) }),

  stats: () =>
    apiFetch<any>("/admin/stats"),

  roojgarApplications: (status?: string) =>
    apiFetch<any[]>(
      `/admin/roojgar-applications${status ? `?status=${status}` : ""}`
    ),

  updateRoojgarStatus: (id: string, status: string) =>
    apiFetch(`/admin/roojgar-applications/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  users: (role?: string) =>
    apiFetch<any[]>(
      `/admin/users${role ? `?role=${role}` : ""}`
    ),

  toggleUser: (id: string) =>
    apiFetch(`/admin/users/${id}/toggle`, {
      method: "POST",
    }),

  deleteUser: (id: string) =>
    apiFetch(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  orders: (status?: string) =>
    apiFetch<any[]>(
      `/admin/orders${status ? `?status=${status}` : ""}`
    ),
products: () =>
  apiFetch<any[]>("/admin/products"),

  updateOrderStatus: (id: string, status: string) =>
    apiFetch(`/admin/orders/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  createProduct: (data: any) =>
    apiFetch("/admin/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: any) =>
    apiFetch(`/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    apiFetch(`/admin/products/${id}`, {
      method: "DELETE",
    }),

  createCategory: (data: any) =>
    apiFetch("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: any) =>
    apiFetch(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    apiFetch(`/admin/categories/${id}`, {
      method: "DELETE",
    }),

  createBanner: (data: any) =>
    apiFetch("/admin/banners", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateBanner: (id: string, data: any) =>
    apiFetch(`/admin/banners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteBanner: (id: string) =>
    apiFetch(`/admin/banners/${id}`, {
      method: "DELETE",
    }),

  getCommission: () =>
    apiFetch<any>("/admin/commission"),

  setCommission: (percent: number) =>
    apiFetch("/admin/commission", {
      method: "POST",
      body: JSON.stringify({ percent }),
    }),
};

export const vendorApi = {
  stats: () =>
    apiFetch("/vendor/stats"),

  createStore: (data: any) =>
    apiFetch("/vendor/stores", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStore: (id: string, data: any) =>
    apiFetch("/vendor/stores/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  setStoreOnline: (id: string, online: boolean) =>
    apiFetch("/vendor/stores/" + id + "/online", {
      method: "POST",
      body: JSON.stringify({ online }),
    }),

  deleteStore: (id: string) =>
    apiFetch("/vendor/stores/" + id, {
      method: "DELETE",
    }),

  serviceBookings: () => apiFetch<any[]>("/vendor/service-bookings"),
  updateServiceBooking: (id: string, status: string) => apiFetch<any>(`/vendor/service-bookings/${encodeURIComponent(id)}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  services: () =>
    apiFetch<any[]>("/vendor/services"),

  createService: (data: any) =>
    apiFetch("/vendor/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateService: (id: string, data: any) =>
    apiFetch(`/vendor/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteService: (id: string) =>
    apiFetch(`/vendor/services/${id}`, {
      method: "DELETE",
    }),

  products: () =>
    apiFetch<any[]>("/vendor/products"),

  createProduct: (data: any) =>
    apiFetch("/vendor/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: any) =>
    apiFetch("/vendor/products/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    apiFetch("/vendor/products/" + id, {
      method: "DELETE",
    }),

  orders: () =>
    apiFetch<any[]>("/vendor/orders"),

  pendingOrders: () =>
    apiFetch<any[]>("/vendor/pending-orders"),

  acceptOrder: (id: string) =>
    apiFetch("/vendor/orders/" + id + "/accept", {
      method: "POST",
    }),

  rejectOrder: (id: string) =>
    apiFetch("/vendor/orders/" + id + "/reject", {
      method: "POST",
    }),
};

export const deliveryApi = {
  me: () =>
    apiFetch<any>("/delivery/me"),

  toggleOnline: (online: boolean) =>
    apiFetch("/delivery/online", {
      method: "POST",
      body: JSON.stringify({ online }),
    }),

  available: () =>
    apiFetch<any[]>("/delivery/available"),

  claim: (id: string) =>
    apiFetch(`/delivery/orders/${id}/claim`, {
      method: "POST",
    }),

  markDelivered: (id: string) =>
    apiFetch(`/delivery/orders/${id}/delivered`, {
      method: "POST",
    }),

  my: () =>
    apiFetch<any[]>("/delivery/my"),

  updateCustomerLocation: (orderId: string, latitude: number, longitude: number, accuracy?: number) =>
    apiFetch("/orders/" + encodeURIComponent(orderId) + "/customer-location", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude, accuracy }),
    }),

  updateDeliveryLocation: (orderId: string, latitude: number, longitude: number, accuracy?: number) =>
    apiFetch("/delivery/orders/" + encodeURIComponent(orderId) + "/location", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude, accuracy }),
    }),

  stats: () =>
    apiFetch<any>("/delivery/stats"),
};