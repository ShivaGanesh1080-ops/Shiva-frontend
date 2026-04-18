const BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.7:8000";

// Helper to safely get the master token from localStorage for Admin actions
const getMasterToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("master_admin_token") || "";
  }
  return "";
};

// Bulletproof JSON Fetcher to handle empty responses and backend errors safely
const fetchJSON = async (url: string, options: RequestInit = {}) => {
  try {
    // 🔥 FORCE NO-CACHE HERE so Next.js never shows stale data
    const res = await fetch(url, { ...options, cache: "no-store" });
    const text = await res.text(); // Read as text first to prevent JSON parse crashes
    
    let data = {};
    if (text) {
      try { data = JSON.parse(text); } catch (e) { console.error("Failed to parse JSON", text); }
    }

    if (!res.ok) {
      console.error(`API Error at ${url}:`, data);
      throw new Error((data as any).detail ? (typeof (data as any).detail === 'string' ? (data as any).detail : JSON.stringify((data as any).detail)) : `Error ${res.status}`);
    }
    return data;
  } catch (err: any) {
    console.error("Fetch failed:", err);
    throw err;
  }
};

export const API = {
  ownerGetWorkers: (slug: string, token: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/workers?shop_slug=${slug}`, {
      headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` },
    }),

  ownerDeleteWorker: (slug: string, token: string, workerId: number) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/workers/${workerId}?shop_slug=${slug}`, {
      method: "DELETE", headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` },
    }),

  ownerClearOrders: (slug: string, token: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/orders?shop_slug=${slug}`, {
      method: "DELETE", headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` },
    }),
    
  // ── Public Menu ─────────────────────────────────────────────────────────────
  getMenu: (slug: string) => fetchJSON(`${BASE}/api/menu/public/${slug}`),

  // ── Orders ──────────────────────────────────────────────────────────────────
  placeOrder: (data: object) => fetchJSON(`${BASE}/api/orders/place`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }),

  verifyPayment: (data: object) => fetchJSON(`${BASE}/api/orders/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  }),

  trackOrder: (token: string) => fetchJSON(`${BASE}/api/orders/track/${token}`),

  // ── Worker ──────────────────────────────────────────────────────────────────
  getWorkerOrders: (slug: string) => fetchJSON(`${BASE}/api/orders/worker/${slug}`),
  completeOrder: (token: string) => fetchJSON(`${BASE}/api/orders/worker/complete/${token}`, { method: "POST" }),

  // ── Owner Auth ───────────────────────────────────────────────────────────────
  ownerLogin: (slug: string, username: string, password: string) =>
    fetchJSON(`${BASE}/api/auth/owner/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_slug: slug, username, password }),
    }),

  // ── Owner Menu Management ────────────────────────────────────────────────────
  ownerGetItems: (slug: string, token: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/items?shop_slug=${slug}`, { 
      headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` } 
    }),

  ownerCreateItem: (slug: string, token: string, data: object) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/items?shop_slug=${slug}`, {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-owner-token": token, "Authorization": `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  ownerUpdateItem: (slug: string, token: string, itemId: number, data: object) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/items/${itemId}?shop_slug=${slug}`, {
      method: "PATCH", 
      headers: { "Content-Type": "application/json", "x-owner-token": token, "Authorization": `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  ownerDeleteItem: (slug: string, token: string, itemId: number) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/items/${itemId}?shop_slug=${slug}`, {
      method: "DELETE", headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` },
    }),

  ownerDashboard: (slug: string, token: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/dashboard?shop_slug=${slug}`, { 
      headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` } 
    }),

  ownerAnalytics: (slug: string, token: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/analytics?shop_slug=${slug}`, { 
      headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` } 
    }),

  ownerUpdateConfig: (slug: string, token: string, data: object) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/config?shop_slug=${slug}`, { 
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-owner-token": token, "Authorization": `Bearer ${token}` },
      body: JSON.stringify(data)
    }),
    
  // Add this under your other owner routes in lib/api.ts
  ownerCreateWorker: (slug: string, token: string, workerName: string) =>
    fetchJSON(`${BASE}/api/menu/owner/${slug}/workers?shop_slug=${slug}`, {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-owner-token": token, "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ worker_name: workerName }),
    }),

  ownerUploadImage: (slug: string, token: string, itemId: number, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return fetchJSON(`${BASE}/api/menu/owner/${slug}/items/${itemId}/image?shop_slug=${slug}`, {
      method: "POST", headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` }, body: fd,
    });
  },

  // ── Master Admin ─────────────────────────────────────────────────────────────
  adminLogin: (username: string, password: string) =>
    fetchJSON(`${BASE}/api/auth/admin/login`, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),

  adminListShops: () => 
    fetchJSON(`${BASE}/api/admin/shops`, { 
      headers: { "x-admin-token": getMasterToken() } 
    }),

  adminCreateShop: (data: object) => 
    fetchJSON(`${BASE}/api/admin/shops`, {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-admin-token": getMasterToken() },
      body: JSON.stringify(data),
    }),

  adminGetQRCodes: (shopId: number) =>
    fetchJSON(`${BASE}/api/admin/shops/${shopId}/qr-codes`, { 
      headers: { "x-admin-token": getMasterToken() } 
    }),

  adminToggleShop: (shopId: number) =>
    fetchJSON(`${BASE}/api/admin/shops/${shopId}/toggle`, { 
      method: "PATCH", 
      headers: { "x-admin-token": getMasterToken() } 
    }),

  adminDeleteShop: (shopId: number) =>
    fetchJSON(`${BASE}/api/admin/shops/${shopId}`, { 
      method: "DELETE", 
      headers: { "x-admin-token": getMasterToken() } 
    }),

  adminCreateWorker: (shopId: number, workerName: string) =>
    fetchJSON(`${BASE}/api/admin/workers`, {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-admin-token": getMasterToken() },
      body: JSON.stringify({ shop_id: shopId, worker_name: workerName }),
    }),
};

export const WS_BASE = BASE.replace("http", "ws");
export const IMG_BASE = "";