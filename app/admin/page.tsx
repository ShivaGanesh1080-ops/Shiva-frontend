"use client";
import { useState, useEffect, useRef } from "react";
import { API } from "@/lib/api";

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.7:8000";
const BASE_FRONTEND = process.env.NEXT_PUBLIC_BASE_URL || "http://192.168.1.7:3000";

type Shop = { id: number; name: string; slug: string; shop_type: string; is_active: boolean; total_orders: number; paid_orders: number; revenue: number; config: any; };
type QRData = { customer_qr: string; owner_qr: string; worker_qr: string; customer_url: string; owner_url: string; worker_url: string; };

const FORM_FIELDS = [
  { label: "Shop Name *", key: "name", placeholder: "e.g. Shiva Canteen", full: true },
  { label: "URL Slug *", key: "slug", placeholder: "e.g. shiva-canteen (no spaces)" },
  { label: "UPI ID", key: "upi_id", placeholder: "e.g. shiva@upi" },
  { label: "Institution Name", key: "institution_name", placeholder: "e.g. ABC College" },
  { label: "Owner Username *", key: "owner_username", placeholder: "Login username" },
  { label: "Owner Password *", key: "owner_password", placeholder: "Login password" },
];

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"shops" | "create" | "settings">("shops");
  const [mounted, setMounted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [qrShop, setQrShop] = useState<Shop | null>(null);
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [updatingCreds, setUpdatingCreds] = useState(false);

  const fieldRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [form, setForm] = useState({
    name: "", slug: "", shop_type: "canteen", category: "restaurant",
    owner_username: "", owner_password: "", upi_id: "",
    institution_name: "", hall_ticket_enabled: false, primary_color: "#FF6B00",
  });

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("master_admin_token");
    if (token) { setLoggedIn(true); loadShops(); }
  }, []);

  async function handleLogin() {
    setLoginError("");
    try {
      const res = await fetch(`${BASE_API}/api/auth/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setLoginError("Invalid master admin credentials"); return; }
      const data = await res.json();
      localStorage.setItem("master_admin_token", data.token);
      setLoggedIn(true);
      loadShops();
    } catch (e: any) { setLoginError("Cannot connect to server."); }
  }

  async function loadShops() {
    setLoading(true);
    try {
      const data = await API.adminListShops();
      setShops(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Failed to load shops"); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.name || !form.slug || !form.owner_username || !form.owner_password) return alert("Fill all required fields");
    setCreating(true);
    try {
      await API.adminCreateShop({ ...form });
      setForm({ name: "", slug: "", shop_type: "canteen", category: "restaurant", owner_username: "", owner_password: "", upi_id: "", institution_name: "", hall_ticket_enabled: false, primary_color: "#FF6B00" });
      await loadShops();
      setTab("shops");
    } catch (e: any) { alert(e.message || "Failed to create shop instance"); }
    finally { setCreating(false); }
  }

  function handleFieldKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = fieldRefs.current[index + 1];
      if (next) next.focus();
      else handleCreate();
    }
  }

  async function handleUpdateCredentials() {
    if (!newAdminUser && !newAdminPass) return alert("Enter a new username or password.");
    setUpdatingCreds(true);
    try {
      const res = await fetch(`${BASE_API}/api/auth/admin/update-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("master_admin_token") || "" },
        body: JSON.stringify({ new_username: newAdminUser || undefined, new_password: newAdminPass || undefined }),
      });
      if (!res.ok) throw new Error("Failed to update master credentials");
      alert("✅ Credentials updated! Please login again.");
      handleLogout();
    } catch (e: any) { alert(e.message || "Failed to update credentials"); }
    finally { setUpdatingCreds(false); setNewAdminUser(""); setNewAdminPass(""); }
  }

  async function handleToggle(shopId: number) { await API.adminToggleShop(shopId); await loadShops(); }
  async function handleDelete(shopId: number) { if (!confirm("Delete this shop permanently?")) return; await API.adminDeleteShop(shopId); await loadShops(); }

  async function loadQR(shop: Shop) {
    try {
      const data = await API.adminGetQRCodes(shop.id);
      // We add 'as any' here to satisfy the TypeScript compiler for the build
      setQrData(data as any); 
      setQrShop(shop);
    } catch (e) {
      alert("Failed to load QR codes");
    }
  }

  function handleLogout() {
    localStorage.removeItem("master_admin_token");
    setLoggedIn(false); setShops([]); setUsername(""); setPassword("");
  }

  if (!mounted) return null;

  if (!loggedIn) return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 48, maxWidth: 420, width: "100%", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 32, margin: "0 auto 20px", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>S</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: "#111827" }}>Master Admin</div>
        </div>
        {loginError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 14, color: "#ef4444", fontSize: 13, marginBottom: 24, textAlign: "center", fontWeight: 600 }}>{loginError}</div>}
        <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Username" style={{ width: "100%", background: "#f9fafb", border: "2px solid #e5e7eb", borderRadius: 14, padding: 16, color: "#111827", fontSize: 16, marginBottom: 16, outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"} onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"} />
        <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} type="password" placeholder="Password" style={{ width: "100%", background: "#f9fafb", border: "2px solid #e5e7eb", borderRadius: 14, padding: 16, color: "#111827", fontSize: 16, marginBottom: 32, outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"} onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"} />
        <button onClick={handleLogin} style={{ width: "100%", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 14, padding: 18, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>Unlock Dashboard</button>
      </div>
    </div>
  );

  const activeCount = shops.filter(s => s.is_active).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", color: "#111827", fontFamily: "'DM Sans',sans-serif" }}>
      {qrShop && qrData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 24 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 32, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #e5e7eb", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: "#111827" }}>Distribution QR Codes</div>
                <div style={{ color: "#7c3aed", fontSize: 13, marginTop: 4, fontWeight: 600 }}>Instance: {qrShop.name}</div>
              </div>
              <button onClick={() => { setQrShop(null); setQrData(null); }} style={{ background: "#f3f4f6", border: "none", color: "#4b5563", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16 }}>
              {[
                { label: "🛒 Customer", path: `/menu/${qrShop.slug}`, color: "#16a34a" },
                { label: "🏪 Owner", path: `/owner/${qrShop.slug}`, color: "#2563eb" },
                { label: "👷 Worker", path: `/worker/${qrShop.slug}`, color: "#d97706" },
              ].map((q, i) => {
                
                const currentDomain = typeof window !== "undefined" ? window.location.origin : BASE_FRONTEND;
                const currentFullUrl = `${currentDomain}${q.path}`;
                const qrDisplayUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentFullUrl)}&bgcolor=ffffff&color=000000&margin=2`;

                return (
                  <div key={i} style={{ background: "#f9fafb", border: `1px solid ${q.color}44`, borderRadius: 16, padding: 20, textAlign: "center" }}>
                    <div style={{ color: q.color, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{q.label}</div>
                    <div style={{ background: "#fff", padding: 8, borderRadius: 12, display: "inline-block", marginBottom: 12, border: "1px solid #e5e7eb" }}>
                      <img src={qrDisplayUrl} style={{ width: 120, height: 120, display: "block" }} />
                    </div>
                    <a href={currentFullUrl} target="_blank" style={{ display: "block", color: "#4b5563", fontSize: 11, textDecoration: "none", wordBreak: "break-all", background: "#e5e7eb", padding: 6, borderRadius: 6, fontWeight: 500 }}>{currentFullUrl}</a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Master Header Component */}
      <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 18, boxShadow: "0 2px 10px rgba(124,58,237,0.2)" }}>S</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.5, color: "#111827" }}>Shiva@12 Administrative OS</div>
            <div style={{ color: "#7c3aed", fontSize: 12, fontWeight: 700 }}>Master Control Unit</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* ✅ FIX IS HERE: Added the missing `: "none"` to the boxShadow condition */}
          <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 24, padding: "6px 16px", fontSize: 13, color: "#111827", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activeCount > 0 ? "#22c55e" : "#9ca3af", boxShadow: activeCount > 0 ? "0 0 8px rgba(34,197,94,0.5)" : "none", display: "inline-block" }} />
            {activeCount} Network Nodes Online
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #d1d5db", borderRadius: 10, padding: "8px 16px", color: "#4b5563", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Logout System</button>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#ffffff", padding: "0 32px" }}>
        {[
          ["shops", "🏪 Registered Shops"], 
          ["create", "➕ Deploy New Shop"], 
          ["settings", "⚙️ Settings"]
        ].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as any)}
            style={{ padding: "16px 24px", background: "transparent", border: "none", borderBottom: tab === t ? "3px solid #7c3aed" : "3px solid transparent", color: tab === t ? "#7c3aed" : "#6b7280", cursor: "pointer", fontWeight: tab === t ? 800 : 600, fontSize: 14, transition: "color 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>

        {tab === "shops" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
              </div>
            ) : shops.length === 0 ? (
              <div style={{ textAlign: "center", padding: "100px 0", color: "#6b7280" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🏪</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>No network shops deployed yet.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 }}>
                {shops.map((shop, i) => (
                  <div key={shop.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px rgba(0,0,0,0.05)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: shop.is_active ? "#22c55e" : "#9ca3af", boxShadow: shop.is_active ? "0 0 8px rgba(34,197,94,0.4)" : "none" }} />
                          <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", fontFamily: "'Syne',sans-serif" }}>{shop.name}</div>
                        </div>
                        <div style={{ color: "#7c3aed", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", background: "#f3e8ff", display: "inline-block", padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>Slug: /{shop.slug}</div>
                      </div>
                      <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: "4px 12px", fontSize: 11, color: "#4b5563", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{shop.shop_type}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "#f9fafb", borderRadius: 14, padding: 16, marginBottom: 24, border: "1px solid #f3f4f6" }}>
                      <div><div style={{ color: "#6b7280", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>TOTAL</div><div style={{ color: "#111827", fontSize: 16, fontWeight: 800 }}>{shop.total_orders}</div></div>
                      <div><div style={{ color: "#6b7280", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>PAID</div><div style={{ color: "#111827", fontSize: 16, fontWeight: 800 }}>{shop.paid_orders}</div></div>
                      <div><div style={{ color: "#6b7280", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>REVENUE</div><div style={{ color: "#16a34a", fontSize: 16, fontWeight: 800 }}>₹{(shop.revenue || 0).toFixed(0)}</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                      <button onClick={() => loadQR(shop)} style={{ flex: 1, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, color: "#111827", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📱 Codes</button>
                      <a href={`${BASE_FRONTEND}/menu/${shop.slug}`} target="_blank" style={{ flex: 1, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, color: "#111827", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>Preview</a>
                      <button onClick={() => handleToggle(shop.id)} style={{ flex: 1, background: shop.is_active ? "#f0fdf4" : "#f9fafb", border: `1px solid ${shop.is_active ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 10, padding: 10, color: shop.is_active ? "#16a34a" : "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                        {shop.is_active ? "Online" : "Offline"}
                      </button>
                      <button onClick={() => handleDelete(shop.id)} style={{ width: 44, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#ef4444", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "create" && (
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 40, maxWidth: 800, margin: "0 auto", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 8, color: "#111827" }}>Deploy New Instance</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>Configure and initialize a new multi-tenant shop node on the network.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {FORM_FIELDS.map((f, i) => (
                <div key={i} style={{ gridColumn: (f as any).full ? "1/-1" : "auto" }}>
                  <div style={{ color: "#7c3aed", fontSize: 12, marginBottom: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</div>
                  <input ref={el => { fieldRefs.current[i] = el; }} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} onKeyDown={e => handleFieldKeyDown(e, i)} placeholder={f.placeholder} type={f.key.includes("password") ? "password" : "text"} style={{ width: "100%", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 12, padding: "14px 16px", color: "#111827", fontSize: 15, outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"} onBlur={e => e.currentTarget.style.borderColor = "#d1d5db"} />
                </div>
              ))}
              <div>
                <div style={{ color: "#7c3aed", fontSize: 12, marginBottom: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Service Type</div>
                <select value={form.shop_type} onChange={e => setForm(p => ({ ...p, shop_type: e.target.value }))} style={{ width: "100%", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 12, padding: "14px 16px", color: "#111827", fontSize: 15, outline: "none", cursor: "pointer", appearance: "none" }}>
                  <option value="canteen">Institutional Canteen</option>
                  <option value="restaurant">Standard Restaurant</option>
                </select>
              </div>
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
                <div>
                  <div style={{ color: "#111827", fontSize: 15, fontWeight: 800 }}>Mandatory ID Verification</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4, fontWeight: 500 }}>Requires a Hall Ticket or Student ID during the checkout process.</div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, hall_ticket_enabled: !p.hall_ticket_enabled }))} style={{ background: form.hall_ticket_enabled ? "#7c3aed" : "#d1d5db", border: "none", borderRadius: 30, width: 50, height: 28, position: "relative", cursor: "pointer", transition: "all 0.3s" }}>
                  <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 4, left: form.hall_ticket_enabled ? 26 : 4, transition: "all 0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
            </div>
            <button onClick={handleCreate} disabled={creating} style={{ marginTop: 32, width: "100%", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 16, padding: 18, color: "#fff", fontWeight: 800, fontSize: 16, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1, boxShadow: "0 10px 20px rgba(124,58,237,0.2)", transition: "transform 0.1s" }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
              {creating ? "Allocating Resources..." : "🚀 Deploy Shop Node"}
            </button>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 40, maxWidth: 600, margin: "0 auto", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 8, color: "#111827" }}>Administrative Security</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>Update the root credentials used for master access. Proceed with caution.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ color: "#7c3aed", fontSize: 12, marginBottom: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>New Admin Identifier</div>
                <input value={newAdminUser} onChange={e => setNewAdminUser(e.target.value)} onKeyDown={e => e.key === "Enter" && document.getElementById("new-admin-pass")?.focus()} placeholder="Maintain existing if blank" style={{ width: "100%", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 12, padding: "14px 16px", color: "#111827", fontSize: 15, outline: "none" }} onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"} onBlur={e => e.currentTarget.style.borderColor = "#d1d5db"} />
              </div>
              <div>
                <div style={{ color: "#7c3aed", fontSize: 12, marginBottom: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>New Secret Access Key</div>
                <input id="new-admin-pass" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdateCredentials()} type="password" placeholder="Maintain existing if blank" style={{ width: "100%", background: "#f9fafb", border: "1px solid #d1d5db", borderRadius: 12, padding: "14px 16px", color: "#111827", fontSize: 15, outline: "none" }} onFocus={e => e.currentTarget.style.borderColor = "#7c3aed"} onBlur={e => e.currentTarget.style.borderColor = "#d1d5db"} />
              </div>
            </div>
            <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: 16, marginTop: 24, display: "flex", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ color: "#6d28d9", fontSize: 13, lineHeight: 1.5 }}>
                <strong>Security Protocol:</strong> Following a credentials update, all active sessions will be terminated. Re-authentication will be required immediately.
              </div>
            </div>
            <button onClick={handleUpdateCredentials} disabled={updatingCreds} style={{ marginTop: 32, width: "100%", background: "linear-gradient(135deg,#7c3aed,#2563eb)", border: "none", borderRadius: 16, padding: 18, color: "#fff", fontWeight: 800, fontSize: 16, cursor: updatingCreds ? "not-allowed" : "pointer", opacity: updatingCreds ? 0.7 : 1 }} onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
              {updatingCreds ? "Syncing Credentials..." : "💾 Update Administrative Access"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}