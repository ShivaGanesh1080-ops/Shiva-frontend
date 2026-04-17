"use client";
import { useState, useEffect, useRef, use } from "react";
import { API, IMG_BASE } from "@/lib/api";

const THEMES: Record<string, any> = {
  dark: { bg: "#07070f", card: "#111118", text: "#fff", textDim: "#888", border: "#1a1a2e", primary: "#FF6B00", input: "#0a0a0f" },
  light: { bg: "#f3f4f6", card: "#ffffff", text: "#111827", textDim: "#4b5563", border: "#e5e7eb", primary: "#FF6B00", input: "#f9fafb" },
  motion: { bg: "linear-gradient(135deg, #0f172a, #1e1b4b, #000)", card: "rgba(255,255,255,0.05)", text: "#fff", textDim: "#aaa", border: "rgba(255,255,255,0.1)", primary: "#8b5cf6", input: "rgba(0,0,0,0.5)" },
  nature: { bg: "#022c22", card: "#064e3b", text: "#ecfdf5", textDim: "#6ee7b7", border: "#065f46", primary: "#10b981", input: "#022c22" },
  ocean: { bg: "#0f172a", card: "#1e293b", text: "#f8fafc", textDim: "#94a3b8", border: "#334155", primary: "#3b82f6", input: "#0f172a" },
};

const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return alert("No order data to download yet!");
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");
  const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

type MenuItem = { id: number; name: string; description: string; price: number; image_url: string; section: string; is_available: boolean; is_timed: boolean; available_from: string; available_until: string; prep_time: number; variants: any; addons: any[]; };
type Dashboard = { shop_name: string; total_orders: number; paid_orders: number; pending_orders: number; revenue: number; today_orders: number; config?: any; recent_orders?: any[]; };
type Worker = { id: number; worker_name: string; };

export default function OwnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const rawSlug = use(params).slug;
  const slug = rawSlug.toLowerCase(); 

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  
  const [tab, setTab] = useState<"dashboard" | "orders" | "menu" | "additem" | "qrcodes" | "settings">("dashboard");
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [ownerTheme, setOwnerTheme] = useState("dark");
  const [form, setForm] = useState({ name: "", description: "", price: "", prep_time: "5", section: "General", is_timed: false, available_from: "07:00", available_until: "22:00" });
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  
  const [settingsForm, setSettingsForm] = useState({ upi_id: "", cod_enabled: false, hall_ticket_enabled: false, theme: "dark", rzp_key_id: "", rzp_key_secret: "" });
  
  const [verifyPassword, setVerifyPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "6m">("7d");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", prep_time: "5", is_timed: false, available_from: "07:00", available_until: "22:00" });
  const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
  const [tableName, setTableName] = useState("");
  const [workerName, setWorkerName] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const newItemImageRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<MenuItem | null>(null);

  useEffect(() => { 
    setMounted(true); 
    const t = localStorage.getItem(`owner_token_${slug}`); 
    const savedTheme = localStorage.getItem(`owner_theme_${slug}`);
    
    const savedSettings = localStorage.getItem(`owner_settings_${slug}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettingsForm(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }

    if (savedTheme && THEMES[savedTheme]) setOwnerTheme(savedTheme);
    if (t) { setToken(t); setLoggedIn(true); } 
  }, [slug]);
  
  useEffect(() => { 
    if (loggedIn && token) { 
        loadData(); 
        const interval = setInterval(loadData, 60000); 
        return () => clearInterval(interval); 
    } 
  }, [loggedIn, token, slug]);

  async function loadData() {
    try {
      const [itemsData, dashData, analyticsData, workersData] = await Promise.all([
        API.ownerGetItems(slug, token), 
        API.ownerDashboard(slug, token), 
        API.ownerAnalytics(slug, token).catch(() => null),
        API.ownerGetWorkers(slug, token).catch(() => [])
      ]);
      
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setDashboard(dashData);
      setWorkers(Array.isArray(workersData) ? workersData : []);
      if (analyticsData) setAnalytics(analyticsData);
      
      let parsedConfig: any = {};
      if (dashData?.config) {
        if (typeof dashData.config === "string") {
          try { 
            const safeJson = dashData.config.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false');
            parsedConfig = JSON.parse(safeJson); 
            if (typeof parsedConfig === "string") parsedConfig = JSON.parse(parsedConfig);
          } catch (e) { parsedConfig = {}; }
        } else { parsedConfig = dashData.config; }
      }

      setSettingsForm(current => {
        const newSettings = { 
          upi_id: parsedConfig.upi_id || current.upi_id || "", 
          cod_enabled: parsedConfig.features?.cod ?? parsedConfig.cod_enabled ?? current.cod_enabled ?? false, 
          hall_ticket_enabled: parsedConfig.features?.hall_ticket ?? current.hall_ticket_enabled ?? false, 
          theme: parsedConfig.theme?.mode || parsedConfig.theme || current.theme || "dark",
          rzp_key_id: parsedConfig.rzp_key_id || current.rzp_key_id || "",
          rzp_key_secret: parsedConfig.rzp_key_secret || current.rzp_key_secret || ""
        };
        localStorage.setItem(`owner_settings_${slug}`, JSON.stringify(newSettings));
        return newSettings;
      });
      
      setHasLoadedSettings(true);
    } catch (e) {
      console.error("Data load failed", e);
    }
  }

  async function handleLogin() {
    setLoginError("");
    try {
      const data = await API.ownerLogin(slug, username, password);
      setToken(data.token); setLoggedIn(true); localStorage.setItem(`owner_token_${slug}`, data.token);
      await loadData();
    } catch (e: any) { setLoginError("Invalid Credentials or Shop does not exist"); }
  }

  async function handleCreateWorker() {
    if (!workerName.trim()) return alert("Enter a worker name");
    try {
      await API.ownerCreateWorker(slug, token, workerName);
      alert(`Worker '${workerName}' added!`);
      setWorkerName("");
      await loadData();
    } catch (e) { alert("Failed to add worker."); }
  }

  async function handleDeleteWorker(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await API.ownerDeleteWorker(slug, token, id);
      await loadData();
    } catch (e) { alert("Failed to delete worker."); }
  }

  async function handleClearOrders() {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL order history and revenue data. Are you absolutely sure?")) return;
    try {
      await API.ownerClearOrders(slug, token);
      alert("✅ All order history has been cleared.");
      await loadData();
    } catch (e) { alert("Failed to clear orders."); }
  }

  async function handleAddItem() {
    if (!form.name || !form.price) return alert("Name and price required");
    setSaving(true);
    try {
      const createdItem = await API.ownerCreateItem(slug, token, { ...form, price: parseFloat(form.price), prep_time: parseInt(form.prep_time) || 5, is_available: true, variants: {}, addons: [] });
      if (newItemImage && createdItem && createdItem.id) { await API.ownerUploadImage(slug, token, createdItem.id, newItemImage); }
      setForm({ name: "", description: "", price: "", prep_time: "5", section: "General", is_timed: false, available_from: "07:00", available_until: "22:00" });
      setNewItemImage(null); await loadData(); setTab("menu");
    } catch (e: any) { alert("Error adding item"); } finally { setSaving(false); }
  }

  function openEditModal(item: MenuItem) {
    setEditingItem(item);
    setEditForm({ name: item.name, price: item.price.toString(), prep_time: (item.prep_time || 5).toString(), is_timed: item.is_timed, available_from: item.available_from || "07:00", available_until: item.available_until || "22:00" });
  }

  async function saveEditedItem() {
    if (!editingItem) return;
    setSaving(true);
    try {
      await handleUpdateItem(editingItem, { name: editForm.name, price: parseFloat(editForm.price), prep_time: parseInt(editForm.prep_time) || 5, is_timed: editForm.is_timed, available_from: editForm.available_from, available_until: editForm.available_until });
      setEditingItem(null);
    } catch (e: any) { alert("Failed to update item details."); } finally { setSaving(false); }
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string; const rows = text.split("\n").filter(row => row.trim().length > 0); const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
        let successCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(","); if (cols.length < 2) continue; 
          const name = headers.indexOf("name") !== -1 ? cols[headers.indexOf("name")]?.trim() : ""; const price = headers.indexOf("price") !== -1 ? parseFloat(cols[headers.indexOf("price")]?.trim()) : NaN;
          const prep_time = headers.indexOf("prep_time") !== -1 ? parseInt(cols[headers.indexOf("prep_time")]?.trim()) || 5 : 5;
          if (!name || isNaN(price)) continue;
          await API.ownerCreateItem(slug, token, { name, price, prep_time, section: cols[headers.indexOf("section")]?.trim() || "General", description: cols[headers.indexOf("description")]?.trim() || "", is_available: true, is_timed: false, available_from: "07:00", available_until: "22:00", variants: {}, addons: [] });
          successCount++;
        }
        alert(`✅ Successfully imported ${successCount} items!`); await loadData(); setTab("menu");
      } catch (err) { alert("Error parsing CSV"); } finally { setIsImporting(false); if (csvFileRef.current) csvFileRef.current.value = ""; }
    }; reader.readAsText(file);
  };

  async function handleToggleAvailability(item: MenuItem) {
    const originalStatus = item.is_available;
    const newStatus = !originalStatus;

    setItems(prevItems => prevItems.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i));

    try {
        await API.ownerUpdateItem(slug, token, item.id, { is_available: newStatus });
    } catch (e) {
        alert("Network Error: Failed to update item status. Reverting...");
        setItems(prevItems => prevItems.map(i => i.id === item.id ? { ...i, is_available: originalStatus } : i));
    }
  }

  async function handleUpdateItem(item: MenuItem, changes: Partial<MenuItem>) { 
    await API.ownerUpdateItem(slug, token, item.id, changes); 
    await loadData(); 
  }

  async function handleDeleteItem(id: number) { if (!confirm("Delete this item?")) return; await API.ownerDeleteItem(slug, token, id); await loadData(); }
  function toggleSelectItem(id: number) { setSelectedItems(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedItems.length} selected items permanently?`)) return;
    setSaving(true);
    try {
      for (const id of selectedItems) { await API.ownerDeleteItem(slug, token, id); }
      setSelectedItems([]); await loadData(); alert("✅ Selected items deleted.");
    } catch (e) { alert("Failed to delete some items."); } finally { setSaving(false); }
  }

  async function handleSaveSettings() {
    if (!verifyPassword) return alert("Please enter your password to save changes.");
    setSaving(true);
    try {
      localStorage.setItem(`owner_settings_${slug}`, JSON.stringify(settingsForm));
      await API.ownerUpdateConfig(slug, token, { settings: settingsForm, password: verifyPassword });
      
      if (logoFile) {
        const fd = new FormData(); fd.append("file", logoFile);
        const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.7:8000";
        await fetch(`${BASE_API_URL}/api/menu/owner/${slug}/logo?shop_slug=${slug}`, { method: "POST", headers: { "x-owner-token": token, "Authorization": `Bearer ${token}` }, body: fd });
      }
      alert("✅ Settings saved permanently!");
      setVerifyPassword(""); setLogoFile(null); 
      await loadData();
    } catch (e: any) { alert(e.message || "Failed to update settings. Is your password correct?"); }
    finally { setSaving(false); }
  }

  async function handleImageUpload(item: MenuItem, file: File) { await API.ownerUploadImage(slug, token, item.id, file); await loadData(); }

  if (!mounted) return null;

  const t = THEMES[ownerTheme];

  if (!loggedIn) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: t.text }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 36, maxWidth: 380, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div><div style={{ fontWeight: 800, fontSize: 22 }}>Owner Login</div><div style={{ color: t.textDim, fontSize: 13, marginTop: 4 }}>{slug}</div></div>
        {loginError && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{loginError}</div>}
        {[{ label: "Username", val: username, set: setUsername, type: "text" }, { label: "Password", val: password, set: setPassword, type: "password" }].map((f, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>{f.label}</div>
            <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} onKeyDown={e => e.key === "Enter" && handleLogin()} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", color: t.text, fontSize: 15, outline: "none" }} />
          </div>
        ))}
        <button onClick={handleLogin} style={{ width: "100%", background: t.primary, border: "none", borderRadius: 12, padding: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 8 }}>Login</button>
      </div>
    </div>
  );

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())));
  const sections = Array.from(new Set(filteredItems.map(i => i.section)));

  const chartData = analytics ? analytics[chartRange] : [];
  const maxChartVal = Math.max(...chartData.map((d: any) => d.value), 1);
  const totalRevenueForPeriod = chartData.reduce((sum: number, d: any) => sum + d.value, 0);

  let shopLogo = "";
  if (dashboard?.config) {
    let pConf: any = {};
    if (typeof dashboard.config === "string") {
        try { pConf = JSON.parse(dashboard.config.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false')); if (typeof pConf === "string") pConf = JSON.parse(pConf); } catch(e){}
    } else { pConf = dashboard.config; }
    shopLogo = pConf.logo_url || "";
  }

  // 🔥 GHOST ORDER FIX: Filter out unpaid online orders from the real stats
  const allOrders = dashboard?.recent_orders || [];
  const failedCount = allOrders.filter(o => o.payment_status !== "paid" && o.payment_method !== "cod").length;
  
  // Calculate true frontend numbers by subtracting failed ghost orders
  const displayTotalOrders = Math.max(0, (dashboard?.total_orders || 0) - failedCount);
  const displayPendingOrders = Math.max(0, (dashboard?.pending_orders || 0) - failedCount);

  let displayOrders = allOrders;
  if (activeStatModal === "today") {
      const today = new Date().toISOString().split('T')[0];
      displayOrders = displayOrders.filter(o => o.created_at && o.created_at.startsWith(today) && (o.payment_status === "paid" || o.payment_method === "cod"));
  } else if (activeStatModal === "paid") {
      displayOrders = displayOrders.filter(o => o.payment_status === "paid");
  } else if (activeStatModal === "pending") {
      // ONLY show real paid/cod orders that are waiting
      displayOrders = displayOrders.filter(o => ["pending", "confirmed", "preparing"].includes(o.status) && (o.payment_status === "paid" || o.payment_method === "cod"));
  } else if (activeStatModal === "failed") {
      // ONLY show the abandoned Ghost Orders
      displayOrders = displayOrders.filter(o => o.payment_status !== "paid" && o.payment_method !== "cod");
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}
        .chart-bar { transition: height 0.5s ease-out; background: ${t.primary}; }
        .chart-bar:hover { opacity: 0.8; }
        .optimistic-btn { transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
      
      {activeStatModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 650, maxHeight: "85vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1px solid ${t.border}`, paddingBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, textTransform: "capitalize", color: activeStatModal === "failed" ? "#ef4444" : t.text }}>
                {activeStatModal === "failed" ? "Failed / Abandoned" : activeStatModal} Orders ({displayOrders.length})
              </div>
              <button onClick={() => setActiveStatModal(null)} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
              {displayOrders.length === 0 ? (
                <div style={{ textAlign: "center", color: t.textDim, padding: "40px 0" }}>No orders found for this category.</div>
              ) : (
                displayOrders.map((order, i) => (
                  <div key={i} style={{ background: t.input, border: `1px solid ${activeStatModal === "failed" ? "rgba(239,68,68,0.3)" : t.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ color: activeStatModal === "failed" ? "#ef4444" : t.primary, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{order.token}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: activeStatModal === "failed" ? "#ef4444" : (order.status === "ready" ? "#22c55e" : "#f59e0b"), background: t.bg, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>
                        {activeStatModal === "failed" ? "Payment Failed" : order.status}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", fontSize: 14 }}>
                      <div><span style={{ color: t.textDim, fontSize: 12, display: "block" }}>Customer</span><span style={{ fontWeight: 600 }}>{order.customer_name || "N/A"}</span></div>
                      <div><span style={{ color: t.textDim, fontSize: 12, display: "block" }}>Phone</span><span style={{ fontWeight: 600 }}>{order.customer_phone || "N/A"}</span></div>
                      {order.hall_ticket && <div><span style={{ color: t.textDim, fontSize: 12, display: "block" }}>ID/Ticket</span><span style={{ fontWeight: 600 }}>{order.hall_ticket}</span></div>}
                      <div><span style={{ color: t.textDim, fontSize: 12, display: "block" }}>Amount</span><span style={{ fontWeight: 600, color: activeStatModal === "failed" ? t.textDim : "#22c55e", textDecoration: activeStatModal === "failed" ? "line-through" : "none" }}>₹{order.total_amount.toFixed(0)}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Edit Item</div>
              <button onClick={() => setEditingItem(null)} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Name</div><input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", color: t.text, fontSize: 14, outline: "none" }} /></div>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Price (₹)</div><input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", color: t.text, fontSize: 14, outline: "none" }} /></div>
                <div style={{ flex: 1 }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Prep Time (mins)</div><input type="number" value={editForm.prep_time} onChange={e => setEditForm(p => ({ ...p, prep_time: e.target.value }))} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", color: t.text, fontSize: 14, outline: "none" }} /></div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}><div style={{ color: t.textDim, fontSize: 13 }}>Time-limited availability?</div><button onClick={() => setEditForm(p => ({ ...p, is_timed: !p.is_timed }))} style={{ background: editForm.is_timed ? t.primary : t.border, border: "none", borderRadius: 16, padding: "5px 12px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{editForm.is_timed ? "Yes" : "No (24/7)"}</button></div>
              {editForm.is_timed && (<div style={{ display: "flex", gap: 14 }}><div style={{ flex: 1 }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>From</div><input type="time" value={editForm.available_from} onChange={e => setEditForm(p => ({ ...p, available_from: e.target.value }))} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px", color: t.text, fontSize: 14, outline: "none" }} /></div><div style={{ flex: 1 }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Until</div><input type="time" value={editForm.available_until} onChange={e => setEditForm(p => ({ ...p, available_until: e.target.value }))} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px", color: t.text, fontSize: 14, outline: "none" }} /></div></div>)}
              <button onClick={saveEditedItem} disabled={saving} style={{ marginTop: 16, width: "100%", background: t.primary, border: "none", borderRadius: 12, padding: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={e => { if (e.target.files?.[0] && uploadTarget) handleImageUpload(uploadTarget, e.target.files[0]); }} />
      <input type="file" accept=".csv" ref={csvFileRef} style={{ display: "none" }} onChange={handleCSVImport} />
      <input type="file" accept="image/*" ref={logoRef} style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setLogoFile(e.target.files[0]); }} />

      <div style={{ background: t.card, borderBottom: `1px solid ${t.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{dashboard?.shop_name || slug}</div>
          <div style={{ color: t.textDim, fontSize: 12 }}>Owner Panel</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select value={ownerTheme} onChange={(e) => { setOwnerTheme(e.target.value); localStorage.setItem(`owner_theme_${slug}`, e.target.value); }} style={{ background: t.input, color: t.text, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px", fontSize: 12, cursor: "pointer", outline: "none", display: typeof window !== "undefined" && window.innerWidth < 600 ? "none" : "block" }}>
            <option value="dark">🌙 Dark Theme</option><option value="light">☀️ Light Theme</option><option value="motion">🌀 Motion Theme</option><option value="nature">🌿 Nature Theme</option><option value="ocean">🌊 Ocean Theme</option>
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", position: "relative" }}><div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", animation: "ping 1.5s infinite" }} /></div> Live Sync
          </div>
          <button onClick={() => { setLoggedIn(false); localStorage.removeItem(`owner_token_${slug}`); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 14px", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>Logout</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t.border}`, background: t.bg, paddingRight: 16 }}>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }} className="no-scrollbar">
          {[
            ["dashboard", "📊 Dashboard"], ["orders", "📈 Analytics"], ["menu", "🍽️ Menu Editor"], ["additem", "➕ Add Item"], ["qrcodes", "📱 QRs & Workers"], ["settings", "⚙️ Settings"]
          ].map(([tb, label]) => (
            <button key={tb} onClick={() => setTab(tb as any)} style={{ padding: "14px 20px", background: "transparent", border: "none", borderBottom: tab === tb ? `2px solid ${t.primary}` : "2px solid transparent", color: tab === tb ? t.primary : t.textDim, cursor: "pointer", fontWeight: tab === tb ? 700 : 500, fontSize: 14, whiteSpace: "nowrap", transition: "all 0.2s" }}>{label}</button>
          ))}
        </div>
        <button onClick={() => csvFileRef.current?.click()} disabled={isImporting} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 12px", color: t.text, cursor: isImporting ? "wait" : "pointer", fontSize: 13, flexShrink: 0, marginLeft: 16, display: typeof window !== "undefined" && window.innerWidth < 600 ? "none" : "block" }}>
          {isImporting ? "⏳ Importing..." : "📂 Bulk Import CSV"}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {tab === "dashboard" && dashboard && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16, animation: "fadeUp 0.4s ease" }}>
            {[
              { id: "total", label: "Valid Orders", value: displayTotalOrders, icon: "📋", color: "#3b82f6" },
              { id: "today", label: "Today's Orders", value: dashboard.today_orders || 0, icon: "📅", color: "#8b5cf6" },
              { id: "paid", label: "Paid Orders", value: dashboard.paid_orders || 0, icon: "✅", color: "#22c55e" },
              { id: "pending", label: "Active to Serve", value: displayPendingOrders, icon: "🍳", color: "#f59e0b" },
              { id: "failed", label: "Failed Payments", value: failedCount, icon: "❌", color: "#ef4444" },
              { id: "revenue", label: "Total Revenue", value: `₹${(dashboard.revenue || 0).toFixed(0)}`, icon: "💰", color: t.primary },
              { id: "menu", label: "Menu Items", value: items?.length || 0, icon: "🍴", color: "#ec4899" },
            ].map((stat, i) => (
              <div key={i} onClick={() => { if (stat.id !== "revenue" && stat.id !== "menu") setActiveStatModal(stat.id); }} style={{ background: t.card, border: `1px solid ${stat.color}33`, borderRadius: 16, padding: 20, animation: `fadeUp 0.4s ease ${i * 0.05}s both`, cursor: (stat.id !== "revenue" && stat.id !== "menu") ? "pointer" : "default" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ color: stat.color, fontWeight: 800, fontSize: 32 }}>{stat.value}</div>
                <div style={{ color: t.textDim, fontSize: 12, marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "orders" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>📈 Revenue Analytics</div>
              <div style={{ display: "flex", gap: 8, background: t.card, padding: 4, borderRadius: 12, border: `1px solid ${t.border}` }}>
                {[ { id: "7d", label: "7 Days" }, { id: "30d", label: "30 Days" }, { id: "6m", label: "6 Months" } ].map(r => (
                  <button key={r.id} onClick={() => setChartRange(r.id as any)} style={{ background: chartRange === r.id ? t.primary : "transparent", color: chartRange === r.id ? "#fff" : t.textDim, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{r.label}</button>
                ))}
              </div>
            </div>
            
            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 32, marginBottom: 24 }}>
              <div style={{ color: t.textDim, fontSize: 13, marginBottom: 24, display: "flex", justifyContent: "space-between" }}><span>Revenue over time</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", height: 200, gap: "10%", paddingBottom: 10, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
                {chartData.length > 0 ? chartData.map((d: any, i: number) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                    <div className="chart-bar" style={{ width: "100%", borderRadius: "6px 6px 0 0", height: `${(d.value / maxChartVal) * 100}%`, minHeight: 4 }} />
                    <div style={{ color: t.textDim, fontSize: 11, position: "absolute", bottom: -24 }}>{d.label}</div>
                  </div>
                )) : (<div style={{ width: "100%", textAlign: "center", color: t.textDim, alignSelf: "center" }}>No order data available.</div>)}
              </div>
              <div style={{ marginTop: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 800 }}>₹{totalRevenueForPeriod.toFixed(0)}</div>
                <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 600 }}>Revenue in selected period</div>
              </div>
            </div>

            <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Recent Order History</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => downloadCSV(analytics?.raw_orders || [], `${slug}_orders_export.csv`)} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 16px", color: t.text, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>📥 Download CSV</button>
                  <button onClick={handleClearOrders} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 10, padding: "8px 16px", color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>🗑️ Clear History</button>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr style={{ color: t.textDim, borderBottom: `1px solid ${t.border}` }}><th style={{ padding: "12px 8px" }}>Date</th><th style={{ padding: "12px 8px" }}>Order ID</th><th style={{ padding: "12px 8px" }}>Customer</th><th style={{ padding: "12px 8px" }}>Type</th><th style={{ padding: "12px 8px" }}>Amount</th></tr></thead>
                  <tbody>
                    {(analytics?.raw_orders || []).slice(0, 30).map((o: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.border}`, color: t.textDim }}>
                        <td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>{o.Date}</td><td style={{ padding: "12px 8px", color: t.primary, fontFamily: "'JetBrains Mono', monospace" }}>{o.OrderID}</td><td style={{ padding: "12px 8px", whiteSpace: "nowrap" }}>{o.Customer || "N/A"}</td><td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{o.Type.replace('_', ' ')}</td><td style={{ padding: "12px 8px", color: "#22c55e", fontWeight: 600 }}>₹{o.Total_INR}</td>
                      </tr>
                    ))}
                    {(!analytics?.raw_orders || analytics.raw_orders.length === 0) && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: t.textDim }}>No order history found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Shop Settings & Branding</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", background: t.input, padding: 20, borderRadius: 16, border: `1px solid ${t.border}` }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: t.bg, overflow: "hidden", border: `2px dashed ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {logoFile ? <img src={URL.createObjectURL(logoFile)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : shopLogo ? <img src={`${IMG_BASE}${shopLogo}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{fontSize:24}}>🏪</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Shop Logo</div>
                  <div style={{ color: t.textDim, fontSize: 12, marginTop: 4, marginBottom: 12 }}>Upload a square logo for customer menu.</div>
                  <button onClick={() => logoRef.current?.click()} style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.text, padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Upload Image</button>
                </div>
              </div>
              
              <div><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Bank UPI ID</div><input value={settingsForm.upi_id} onChange={e => setSettingsForm({...settingsForm, upi_id: e.target.value})} placeholder="e.g. shiva@upi" style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, outline: "none" }} /></div>
              
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 20px" }}>
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>Enable Cash on Delivery (COD)</div><div style={{ color: t.textDim, fontSize: 12, marginTop: 4 }}>Allow offline payments.</div></div>
                <button onClick={() => setSettingsForm({...settingsForm, cod_enabled: !settingsForm.cod_enabled})} style={{ background: settingsForm.cod_enabled ? t.primary : t.bg, border: "none", borderRadius: 30, width: 50, height: 28, position: "relative", cursor: "pointer", transition: "all 0.3s" }}>
                  <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 4, left: settingsForm.cod_enabled ? 26 : 4, transition: "all 0.3s" }} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "16px 20px" }}>
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>Require Hall Ticket / ID</div><div style={{ color: t.textDim, fontSize: 12, marginTop: 4 }}>Ask customers for ID at checkout.</div></div>
                <button onClick={() => setSettingsForm({...settingsForm, hall_ticket_enabled: !settingsForm.hall_ticket_enabled})} style={{ background: settingsForm.hall_ticket_enabled ? t.primary : t.bg, border: "none", borderRadius: 30, width: 50, height: 28, position: "relative", cursor: "pointer", transition: "all 0.3s" }}>
                  <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 4, left: settingsForm.hall_ticket_enabled ? 26 : 4, transition: "all 0.3s" }} />
                </button>
              </div>

              <div>
                <div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Default Customer Menu Theme</div>
                <select value={settingsForm.theme} onChange={e => setSettingsForm({...settingsForm, theme: e.target.value})} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, outline: "none", cursor: "pointer" }}>
                  <option value="dark">🌙 Dark Theme (Sleek & Modern)</option>
                  <option value="light">☀️ Light Theme (Clean & Bright)</option>
                  <option value="motion">🌀 Motion Theme (Animated & Dynamic)</option>
                  <option value="nature">🌿 Nature Theme (Earthy Green)</option>
                  <option value="ocean">🌊 Ocean Theme (Deep Blue)</option>
                </select>
              </div>

              <div style={{ marginTop: 12, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Razorpay Gateway (Online Payments)</div>
                <div style={{ color: t.textDim, fontSize: 13, marginBottom: 16 }}>Enter your personal Razorpay API keys. The money from every order will go 100% directly to your bank account.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Key ID</div>
                    <input value={settingsForm.rzp_key_id} onChange={e => setSettingsForm({...settingsForm, rzp_key_id: e.target.value})} placeholder="rzp_live_..." style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, outline: "none" }} />
                  </div>
                  <div>
                    <div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Key Secret</div>
                    <input type="password" value={settingsForm.rzp_key_secret} onChange={e => setSettingsForm({...settingsForm, rzp_key_secret: e.target.value})} placeholder="Your Secret Key" style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, outline: "none" }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
                <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 6, fontWeight: 700 }}>VERIFY PASSWORD TO SAVE PERMANENTLY</div>
                <input type="password" value={verifyPassword} onChange={e => setVerifyPassword(e.target.value)} placeholder="Enter your owner password" style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", color: t.text, fontSize: 14, outline: "none", marginBottom: 16 }} />
                <button onClick={handleSaveSettings} disabled={saving} style={{ width: "100%", background: t.primary, border: "none", borderRadius: 12, padding: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving Settings..." : "💾 Save Settings"}</button>
              </div>
            </div>
          </div>
        )}

        {tab === "qrcodes" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>QR Codes & Worker Management</div>
            
            <div style={{ background: t.card, padding: 24, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>Add a Kitchen Worker (AI Distribution)</div>
              <div style={{ color: t.textDim, fontSize: 13, marginBottom: 16 }}>Create a worker profile so the AI can automatically assign them incoming orders.</div>
              <div style={{ display: "flex", gap: 12 }}>
                <input value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="e.g. Chef John" style={{ flex: 1, background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", color: t.text, fontSize: 14, outline: "none" }} />
                <button onClick={handleCreateWorker} style={{ background: t.primary, border: "none", borderRadius: 10, padding: "0 24px", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Add Worker</button>
              </div>

              {workers.length > 0 && (
                <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
                  <div style={{ color: t.textDim, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>ACTIVE WORKERS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                    {workers.map(worker => {
                      const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                      const workerUrl = `${baseUrl}/worker/${slug}?worker=${encodeURIComponent(worker.worker_name)}`;
                      return (
                        <div key={worker.id} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", justify-content: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 16 }}>👨‍🍳</span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{worker.worker_name}</span>
                            </div>
                            <button onClick={() => handleDeleteWorker(worker.id, worker.worker_name)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>🗑️</button>
                          </div>
                          <button onClick={() => window.open(workerUrl, "_blank")} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 6, padding: "6px", color: t.primary, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            Open Worker Screen ↗
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                { title: "Customer Menu", path: `/menu/${slug}`, color: "#10b981" },
                { title: "Owner Dashboard", path: `/owner/${slug}`, color: "#3b82f6" }, 
                { title: "Worker Screen", path: `/worker/${slug}`, color: "#f59e0b" },
              ].map((qr, i) => {
                const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                const fullUrl = `${baseUrl}${qr.path}`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fullUrl)}&bgcolor=ffffff&color=000000&margin=2`;
                return (
                  <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ color: qr.color, fontWeight: 700, fontSize: 16, marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>{qr.title}</div>
                    <div style={{ background: "#fff", padding: 12, borderRadius: 16, marginBottom: 16 }}><img src={qrImageUrl} alt={`${qr.title} QR`} style={{ width: 160, height: 160, display: "block" }} /></div>
                    <div style={{ color: t.textDim, fontSize: 12, textAlign: "center", wordBreak: "break-all", background: t.input, padding: "8px 12px", borderRadius: 8, width: "100%" }}>{fullUrl}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, background: t.card, padding: 24, borderRadius: 16, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>Generate Table-Specific QR Code</div>
              <div style={{ color: t.textDim, fontSize: 13, marginBottom: 16 }}>Create a QR code that automatically assigns orders to a specific table. <br/><i>(Note: Table QR codes are just URLs. If you want to remove a table, simply discard the printed code!)</i></div>
              <div style={{ display: "flex", gap: 12 }}>
                <input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="e.g. Table 5" style={{ flex: 1, background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", color: t.text, fontSize: 14, outline: "none" }} />
                <button onClick={() => {
                  if(!tableName) return alert("Enter a table name first");
                  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                  const url = `${baseUrl}/menu/${slug}?table=${encodeURIComponent(tableName)}`;
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=2`, "_blank");
                }} style={{ background: "#10b981", border: "none", borderRadius: 10, padding: "0 24px", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Generate</button>
              </div>
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
              <input type="text" placeholder="🔍 Search items by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, background: t.input, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", color: t.text, fontSize: 15, outline: "none" }} />
              {selectedItems.length > 0 && (<button onClick={handleBulkDelete} disabled={saving} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 700, cursor: "pointer", height: 50 }}>{saving ? "Removing..." : `🗑️ Delete (${selectedItems.length})`}</button>)}
            </div>
            
            <div style={{ display: "flex", justify-content: "space-between", alignItems: "center", marginBottom: 16, background: t.card, padding: "12px 16px", borderRadius: 12, border: `1px solid ${t.border}` }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={selectedItems.length === filteredItems.length && filteredItems.length > 0} onChange={() => { if (selectedItems.length === filteredItems.length) setSelectedItems([]); else setSelectedItems(filteredItems.map(i => i.id)); }} style={{ width: 18, height: 18, accentColor: t.primary, cursor: "pointer" }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Select All Items</span>
              </label>
            </div>

            {filteredItems.length === 0 && (<div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}><div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div><div>{searchQuery ? "No items found." : "No items yet."}</div></div>)}
            {sections.map(sec => (
              <div key={sec} style={{ marginBottom: 24 }}>
                <div style={{ color: t.primary, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{sec}</div>
                {filteredItems.filter(i => i.section === sec).map((item, idx) => (
                  <div key={item.id} style={{ background: selectedItems.includes(item.id) ? t.bg : t.card, border: `1px solid ${selectedItems.includes(item.id) ? "#ef4444" : t.border}`, borderRadius: 14, padding: 14, marginBottom: 8, display: "flex", gap: 12, alignItems: "center", animation: `fadeUp 0.3s ease ${idx * 0.05}s both`, transition: "all 0.2s" }}>
                    <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleSelectItem(item.id)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#ef4444" }} />
                    <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: t.input, cursor: "pointer" }} onClick={() => { setUploadTarget(item); fileRef.current?.click(); }}>
                      {item.image_url ? <img src={`${IMG_BASE}${item.image_url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justify-content: "center", fontSize: 22 }}>📷</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div><div style={{ color: t.primary, fontWeight: 700, fontSize: 13 }}>₹{item.price}</div>{item.is_timed && <div style={{ color: t.textDim, fontSize: 11 }}>⏰ {item.available_from}–{item.available_until}</div>}</div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => openEditModal(item)} style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 10px", color: t.text, cursor: "pointer", fontSize: 12 }}>✏️ Edit</button>
                      
                      <button 
                        onClick={() => handleToggleAvailability(item)} 
                        className="optimistic-btn"
                        style={{ 
                            background: item.is_available ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", 
                            border: `1px solid ${item.is_available ? "#22c55e" : "#ef4444"}`, 
                            borderRadius: 8, 
                            padding: "5px 10px", 
                            color: item.is_available ? "#22c55e" : "#ef4444", 
                            cursor: "pointer", 
                            fontSize: 11, 
                            fontWeight: 600 
                        }}
                      >
                        {item.is_available ? "Available" : "Hidden"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === "additem" && (
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 24 }}>Add Menu Item</div>
            <div style={{ marginBottom: 20 }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>Item Image (Optional)</div><input type="file" accept="image/*" ref={newItemImageRef} style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setNewItemImage(e.target.files[0]); }} /><div onClick={() => newItemImageRef.current?.click()} style={{ height: 100, border: `2px dashed ${t.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: t.input, overflow: "hidden", position: "relative" }}>{newItemImage ? <img src={URL.createObjectURL(newItemImage)} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ color: t.textDim, fontSize: 14 }}>📷 Click to attach image</div>}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { label: "Item Name *", key: "name", placeholder: "e.g. Masala Dosa", type: "text", full: true },
                { label: "Price (₹) *", key: "price", placeholder: "e.g. 40", type: "number" },
                { label: "Prep Time (mins)", key: "prep_time", placeholder: "e.g. 5", type: "number" },
                { label: "Section", key: "section", placeholder: "e.g. Tiffins", type: "text" },
                { label: "Description", key: "description", placeholder: "Short description", type: "text", full: true },
              ].map((f, i) => (
                <div key={i} style={{ gridColumn: f.full ? "1/-1" : "auto" }}><div style={{ color: t.textDim, fontSize: 12, marginBottom: 6 }}>{f.label}</div><input id={`input-${f.key}`} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} type={f.type} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 10, padding: "11px 14px", color: t.text, fontSize: 14, outline: "none" }} /></div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}><div style={{ color: t.textDim, fontSize: 13 }}>Time-limited availability?</div><button onClick={() => setForm(p => ({ ...p, is_timed: !p.is_timed }))} style={{ background: form.is_timed ? t.primary : t.bg, border: "none", borderRadius: 20, padding: "5px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{form.is_timed ? "Yes" : "No (24/7)"}</button></div>
            
            <button 
              onClick={handleAddItem} 
              disabled={saving} 
              style={{ 
                marginTop: 24, 
                width: "100%", 
                background: saving ? t.border : t.primary, 
                border: "none", 
                borderRadius: 12, 
                padding: 14, 
                color: saving ? t.textDim : "#fff", 
                fontWeight: 700, 
                fontSize: 15, 
                cursor: saving ? "not-allowed" : "pointer", 
                opacity: saving ? 0.6 : 1,
                transition: "all 0.3s ease"
              }}>
              {saving ? "🤖 Cooking up AI Image..." : "Add to Menu"}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}