"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { API, IMG_BASE } from "@/lib/api";
import Receipt from "@/components/Receipt";

export const dynamic = "force-dynamic";

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.7:8000";

const THEMES: Record<string, any> = {
  dark: { bg: "#07070f", card: "#111118", text: "#fff", textDim: "#888", border: "#1a1a2e", input: "#0a0a0f", isMotion: false },
  light: { bg: "#f3f4f6", card: "#ffffff", text: "#111827", textDim: "#4b5563", border: "#e5e7eb", input: "#f9fafb", isMotion: false },
  motion: { bg: "linear-gradient(135deg, #0f172a, #1e1b4b, #000)", card: "rgba(255,255,255,0.05)", text: "#fff", textDim: "#aaa", border: "rgba(255,255,255,0.1)", input: "rgba(0,0,0,0.5)", isMotion: true },
  nature: { bg: "#022c22", card: "#064e3b", text: "#ecfdf5", textDim: "#6ee7b7", border: "#065f46", input: "#022c22", isMotion: false },
  ocean: { bg: "#0f172a", card: "#1e293b", text: "#f8fafc", textDim: "#94a3b8", border: "#334155", input: "#0f172a", isMotion: false },
};

type ShopConfig = { theme?: string | { mode?: string; primary?: string; bg?: string; text?: string; accent?: string }; logo_url?: string; features?: Record<string, boolean>; upi_id?: string; institution_name?: string; };
type Shop = { id: number; name: string; slug: string; shop_type: string; config: ShopConfig | string; };
type MenuItem = { id: number; name: string; description: string; price: number; image_url: string; section: string; variants: Record<string, string[]>; addons: { name: string; price: number }[]; is_timed: boolean; available_from: string; available_until: string; };
type CartItem = MenuItem & { qty: number; selected_variants: Record<string, string>; selected_addons: { name: string; price: number }[]; };

type Step = "type" | "menu" | "checkout" | "payment" | "receipt" | "track";

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [sections, setSections] = useState<Record<string, MenuItem[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("type");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [hallTicket, setHallTicket] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [trackToken, setTrackToken] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localTheme, setLocalTheme] = useState<string>("light");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => { setMounted(true); router.refresh(); loadMenu(); }, [slug, router]);

  useEffect(() => {
    if (!receipt || receipt.status === "completed") return;
    const interval = setInterval(async () => {
      const updated = await API.trackOrder(receipt.token);
      setReceipt(updated);
    }, 3000);
    return () => clearInterval(interval);
  }, [receipt]);

  async function loadMenu() {
    try {
      const data = await API.getMenu(slug);
      setShop(data.shop);
      setSections(data.sections || {});
      setActiveSection(Object.keys(data.sections || {})[0] || "");
      
      let parsedConfig: any = {};
      if (data.shop?.config) {
        if (typeof data.shop.config === "string") {
          try { parsedConfig = JSON.parse(data.shop.config.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false')); } catch (e) {}
        } else { parsedConfig = data.shop.config; }
      }
      const defaultTheme = parsedConfig.theme?.mode || parsedConfig.theme || "light";
      setLocalTheme(defaultTheme);
    } catch { } finally { setLoading(false); }
  }

  let parsedConfig: any = {};
  if (shop?.config) {
    if (typeof shop.config === "string") {
      try { parsedConfig = JSON.parse(shop.config.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false')); } catch (e) { parsedConfig = {}; }
    } else { parsedConfig = shop.config; }
  }

  const codEnabled = parsedConfig.features?.cod === true || parsedConfig.cod_enabled === true;
  const hallTicketEnabled = parsedConfig.features?.hall_ticket === true;
  const color = parsedConfig.theme?.primary || "#FF6B00";

  const t = THEMES[localTheme] || THEMES.light;

  const allItems = Object.values(sections).flat();
  const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSections: Record<string, MenuItem[]> = {};
  filteredItems.forEach(item => { if (!filteredSections[item.section]) filteredSections[item.section] = []; filteredSections[item.section].push(item); });
  const sectionKeys = Object.keys(filteredSections);

  function addToCart(item: MenuItem) {
    setCart(prev => { const existing = prev.find(c => c.id === item.id); if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c); return [...prev, { ...item, qty: 1, selected_variants: {}, selected_addons: [] }]; });
  }
  function removeFromCart(id: number) { setCart(prev => { const existing = prev.find(c => c.id === id); if (existing && existing.qty > 1) return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c); return prev.filter(c => c.id !== id); }); }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const validatePhone = (phone: string) => /^\d{10}$/.test(phone);
  const validateHallTicket = (ht: string) => /^[a-zA-Z0-9]+$/.test(ht);

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setValidatingPromo(true);
    setPromoError("");
    
    try {
      const res = await fetch(`${BASE_API}/api/orders/validate-promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_slug: slug,
          code: promoInput,
          cart_total: cartTotal
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");
      
      setAppliedPromo(data);
      setPromoInput("");
    } catch (err: any) {
      setPromoError(err.message);
      setAppliedPromo(null);
    } finally {
      setValidatingPromo(false);
    }
  }

  async function handlePlaceOrder() {
    if (!customerName.trim()) return alert("Please enter your full name.");
    if (!validatePhone(customerPhone)) return alert("Please enter a valid 10-digit mobile number.");
    if (hallTicketEnabled) { if (!hallTicket) return alert("Please enter your ID/Hall Ticket number."); if (!validateHallTicket(hallTicket)) return alert("Hall ticket must contain only letters and numbers."); }
    
    if (orderType === "dine_in" && shop?.shop_type === "restaurant" && !deliveryLocation.trim()) {
        return alert("Please enter your Table or Room number.");
    }
    
    setPlacing(true);
    try {
      const finalPaymentMethod = codEnabled ? paymentMethod : "online";
      const data = await API.placeOrder({ 
        shop_slug: slug, 
        customer_name: customerName, 
        customer_phone: customerPhone, 
        hall_ticket: hallTicket, 
        order_type: orderType, 
        payment_method: finalPaymentMethod, 
        delivery_location: orderType === "takeaway" ? "Takeaway" : (shop?.shop_type === "restaurant" ? deliveryLocation : "Canteen Dine-In"),
        promo_code: appliedPromo ? appliedPromo.code : undefined,
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, section: c.section, selected_variants: c.selected_variants, selected_addons: c.selected_addons, })) 
      });
      
      if (finalPaymentMethod === "cod") { const tracked = await API.trackOrder(data.token); setReceipt(tracked); setStep("receipt"); } else { setOrderData(data); setStep("payment"); }
    } catch (e: any) { alert(e.message || "Failed to place order"); } finally { setPlacing(false); }
  }

  function handleRazorpay() {
    if (!orderData) return;
    
    if (!(window as any).Razorpay) {
        return alert("Razorpay failed to load. Please check your internet connection and try again.");
    }

    const options = {
      key: orderData.key_id, amount: orderData.amount, currency: "INR", name: shop?.name, description: "Order Payment", order_id: orderData.razorpay_order_id,
      handler: async (response: any) => {
        await API.verifyPayment({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, order_token: orderData.token, });
        const tracked = await API.trackOrder(orderData.token); setReceipt(tracked); setStep("receipt");
      },
      // 🔥 NEW: Detect if customer cancels/closes the Razorpay window
      modal: {
        ondismiss: function () {
          alert("Payment cancelled. You can try again or switch to Cash on Delivery.");
          setStep("checkout"); // Returns them to the checkout screen seamlessly!
        }
      },
      prefill: { name: customerName, contact: customerPhone }, theme: { color },
    };
    const rzp = new (window as any).Razorpay(options); rzp.open();
  }

  async function handleTrackToken() {
    if (!trackToken) return;
    try { const data = await API.trackOrder(trackToken.trim().toUpperCase()); setReceipt(data); setStep("receipt"); } catch { alert("Order not found. Check your token."); }
  }

  if (!mounted || loading) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #222", borderTopColor: color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  if (!shop) return <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", color: t.textDim }}>Shop not found</div>;

  if (step === "type") return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <div style={{ position: "absolute", top: 24, right: 24, zIndex: 50 }}>
        <select value={localTheme} onChange={(e) => setLocalTheme(e.target.value)} style={{ background: t.input, color: t.text, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer", outline: "none" }}>
          <option value="light">☀️ Light Theme</option><option value="dark">🌙 Dark Theme</option><option value="motion">🌀 Motion Theme</option><option value="nature">🌿 Nature</option><option value="ocean">🌊 Ocean</option>
        </select>
      </div>
      <div style={{ textAlign: "center", marginBottom: 48, position: "relative", zIndex: 10 }}>
        {parsedConfig?.logo_url ? ( <img src={`${IMG_BASE}${parsedConfig.logo_url}`} alt="Shop Logo" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: `3px solid ${t.border}`, marginBottom: 16 }} />
        ) : ( <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div> )}
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, color: t.text, marginBottom: 8 }}>{shop.name}</div>
        {parsedConfig.institution_name && <div style={{ color: t.textDim, fontSize: 14 }}>{parsedConfig.institution_name}</div>}
        <div style={{ color: t.textDim, fontSize: 14, marginTop: 8 }}>How would you like your order today?</div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 10 }}>
        {[{ type: "dine_in", icon: "🍽️", label: shop?.shop_type === "restaurant" ? "Dine In / Room Service" : "Dine In", desc: "Enjoy it here" }, { type: "takeaway", icon: "📦", label: "Takeaway", desc: "Pack it to go" }].map(o => (
          <button key={o.type} onClick={() => { setOrderType(o.type as any); setStep("menu"); }}
            style={{ background: t.card, border: `2px solid ${t.border}`, borderRadius: 24, padding: "32px 48px", cursor: "pointer", textAlign: "center", transition: "all 0.3s ease", minWidth: 160 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 10px 30px ${color}22`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{o.icon}</div>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 18 }}>{o.label}</div>
            <div style={{ color: t.textDim, fontSize: 13, marginTop: 6 }}>{o.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={() => setStep("track")} style={{ position: "relative", zIndex: 10, marginTop: 40, background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 14, textDecoration: "underline" }}>
        Track existing order by token
      </button>
    </div>
  );

  if (step === "track") return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 36, maxWidth: 400, width: "100%" }}>
        <div style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Track Order</div>
        <div style={{ color: t.textDim, fontSize: 14, marginBottom: 28 }}>Enter the 6-character token from your receipt</div>
        <input value={trackToken} onChange={e => setTrackToken(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())} placeholder="e.g. AB12CD" maxLength={6} style={{ width: "100%", background: t.input, border: `2px solid ${t.border}`, borderRadius: 16, padding: "16px", color: t.text, fontSize: 24, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 8, textAlign: "center", outline: "none", marginBottom: 20 }} />
        <button onClick={handleTrackToken} style={{ width: "100%", background: color, border: "none", borderRadius: 14, padding: "16px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Track Order</button>
        <button onClick={() => setStep("type")} style={{ width: "100%", background: "transparent", border: "none", color: t.textDim, cursor: "pointer", marginTop: 16, fontSize: 14, fontWeight: 600 }}>← Back</button>
      </div>
    </div>
  );

  if (step === "receipt" && receipt) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 24 }}>
      {receipt.status !== "completed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textDim, fontSize: 14, background: t.card, padding: "12px 24px", borderRadius: 30, border: `1px solid ${t.border}` }}>
          <div style={{ width: 14, height: 14, border: `2px solid ${t.border}`, borderTopColor: color, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          Waiting for kitchen update…
        </div>
      )}
      <Receipt token={receipt.token} shopName={receipt.shop_name || shop.name} customerName={receipt.customer_name} customerPhone={receipt.customer_phone} hallTicket={receipt.hall_ticket} orderType={receipt.order_type} items={receipt.items} totalAmount={receipt.final_paid_amount || receipt.total_amount} status={receipt.status} paymentStatus={receipt.payment_status} createdAt={receipt.created_at} themeColor={color} estimatedTime={receipt.estimated_time} assignedWorker={receipt.assigned_worker} />
      <button onClick={() => { setStep("type"); setCart([]); setReceipt(null); }} style={{ background: "transparent", border: `2px solid ${t.border}`, borderRadius: 14, padding: "12px 32px", color: t.textDim, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Start New Order</button>
    </div>
  );

  if (step === "checkout") return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <button onClick={() => setStep("menu")} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 14, marginBottom: 24, fontWeight: 600 }}>← Back to menu</button>
      <div style={{ fontWeight: 800, color: t.text, fontSize: 28, marginBottom: 32 }}>Checkout</div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, marginBottom: 24 }}>
        <div style={{ color: t.text, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Your Details</div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: t.textDim, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Full Name *</div>
          <input id="checkout-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter your name" type="text" onKeyDown={e => e.key === "Enter" && document.getElementById("checkout-phone")?.focus()} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px", color: t.text, fontSize: 15, outline: "none" }} />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: t.textDim, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Mobile Number *</div>
          <input id="checkout-phone" value={customerPhone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setCustomerPhone(val); }} placeholder="10-digit mobile number" type="tel" onKeyDown={e => { if (e.key === "Enter") { if (hallTicketEnabled) document.getElementById("checkout-hallticket")?.focus(); else if (orderType === "dine_in" && shop?.shop_type === "restaurant") document.getElementById("checkout-location")?.focus(); else document.getElementById("checkout-submit")?.click(); } }} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px", color: t.text, fontSize: 15, outline: "none" }} />
        </div>
        
        {hallTicketEnabled && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: t.textDim, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Hall Ticket / ID Number *</div>
            <input id="checkout-hallticket" value={hallTicket} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); setHallTicket(val); }} placeholder="Your hall ticket / ID" type="text" onKeyDown={e => { if (e.key === "Enter") { if (orderType === "dine_in" && shop?.shop_type === "restaurant") document.getElementById("checkout-location")?.focus(); else document.getElementById("checkout-submit")?.click(); } }} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px", color: t.text, fontSize: 15, outline: "none" }} />
          </div>
        )}

        {orderType === "dine_in" && shop?.shop_type === "restaurant" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: t.textDim, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Table / Room Number *</div>
            <input id="checkout-location" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} placeholder="e.g. Table 5 or Room 101" type="text" onKeyDown={e => e.key === "Enter" && document.getElementById("checkout-submit")?.click()} style={{ width: "100%", background: t.input, border: `1px solid ${t.border}`, borderRadius: 14, padding: "14px 16px", color: t.text, fontSize: 15, outline: "none" }} />
          </div>
        )}
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, marginBottom: 24 }}>
        <div style={{ color: t.textDim, fontSize: 12, marginBottom: 16, fontWeight: 700 }}>ORDER SUMMARY</div>
        {cart.map((item, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 15, color: t.text }}><span><span style={{color: t.textDim, marginRight: 8}}>{item.qty}x</span> {item.name}</span><span style={{ fontWeight: 600 }}>₹{(item.price * item.qty).toFixed(2)}</span></div>))}
        
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${t.border}` }}>
          {!appliedPromo ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleApplyPromo()} placeholder="Got a Promo Code?" style={{ flex: 1, background: t.input, border: `1px solid ${promoError ? "red" : t.border}`, borderRadius: 12, padding: "10px 14px", color: t.text, outline: "none", fontSize: 14 }} />
              <button onClick={handleApplyPromo} disabled={validatingPromo} style={{ background: color, color: "#fff", border: "none", borderRadius: 12, padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>{validatingPromo ? "..." : "Apply"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 12 }}>
              <div>
                <div style={{ color: "#16a34a", fontWeight: 800, fontSize: 14 }}>✅ Code Applied: {appliedPromo.code}</div>
                <div style={{ color: "#15803d", fontSize: 12 }}>{appliedPromo.message}</div>
              </div>
              <button onClick={() => setAppliedPromo(null)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700 }}>Remove</button>
            </div>
          )}
          {promoError && <div style={{ color: "red", fontSize: 12, marginTop: 6, fontWeight: 600 }}>{promoError}</div>}
        </div>

        <div style={{ borderTop: `1px dashed ${t.border}`, marginTop: 16, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: t.textDim, fontSize: 14, marginBottom: 8 }}>
            <span>Subtotal</span><span>₹{cartTotal.toFixed(2)}</span>
          </div>
          {appliedPromo && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a", fontSize: 14, marginBottom: 8, fontWeight: 700 }}>
              <span>Discount</span><span>- ₹{appliedPromo.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: color, fontSize: 20, marginTop: 8 }}>
            <span>Total to Pay</span>
            <span>₹{appliedPromo ? appliedPromo.final_total.toFixed(2) : cartTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {codEnabled && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ color: t.textDim, fontSize: 12, marginBottom: 16, fontWeight: 700 }}>PAYMENT METHOD</div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setPaymentMethod("online")} style={{ flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, background: paymentMethod === "online" ? `${color}22` : t.input, border: `2px solid ${paymentMethod === "online" ? color : t.border}`, color: paymentMethod === "online" ? color : t.textDim }}>💳 Online</button>
            <button onClick={() => setPaymentMethod("cod")} style={{ flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, background: paymentMethod === "cod" ? `${color}22` : t.input, border: `2px solid ${paymentMethod === "cod" ? color : t.border}`, color: paymentMethod === "cod" ? color : t.textDim }}>💵 COD</button>
          </div>
        </div>
      )}

      <button id="checkout-submit" onClick={handlePlaceOrder} disabled={placing} style={{ width: "100%", background: color, border: "none", borderRadius: 16, padding: 18, color: "#fff", fontWeight: 800, fontSize: 16, cursor: placing ? "not-allowed" : "pointer", opacity: placing ? 0.7 : 1 }}>
        {placing ? "Processing..." : (codEnabled && paymentMethod === "cod") ? "Confirm Order (COD)" : `Proceed to Pay ₹${appliedPromo ? appliedPromo.final_total.toFixed(2) : cartTotal.toFixed(2)}`}
      </button>
    </div>
  );

  if (step === "payment") return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 24, padding: 40, maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🛡️</div>
        <div style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Secure Payment</div>
        <div style={{ color: t.textDim, fontSize: 15, marginBottom: 32 }}>Amount to pay: <span style={{ color: color, fontWeight: 800, fontSize: 20 }}>₹{orderData?.amount ? (orderData.amount / 100).toFixed(2) : "0.00"}</span></div>
        <button onClick={handleRazorpay} style={{ width: "100%", background: color, border: "none", borderRadius: 16, padding: 18, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 24 }}>Pay with UPI / Cards</button>
        <div style={{ color: t.textDim, fontSize: 12, background: t.input, padding: "12px", borderRadius: 12 }}>Token: <span style={{ color: t.text, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, letterSpacing: 2 }}>{orderData?.token}</span></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans',sans-serif", paddingBottom: cartCount > 0 ? "100px" : "0" }}>
      
      <div style={{ background: t.isMotion ? "rgba(10, 10, 15, 0.8)" : t.card, backdropFilter: "blur(20px)", borderBottom: `1px solid ${t.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {parsedConfig?.logo_url && (<img src={`${IMG_BASE}${parsedConfig.logo_url}`} alt="Logo" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />)}
            <div><div style={{ color: color, fontWeight: 900, fontSize: 22 }}>{shop.name}</div><div style={{ color: t.textDim, fontSize: 13, fontWeight: 500, marginTop: 2 }}>{orderType === "dine_in" ? (shop.shop_type === "restaurant" ? "🍽️ Room / Table" : "🍽️ Dine In") : "📦 Takeaway"}</div></div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select value={localTheme} onChange={(e) => setLocalTheme(e.target.value)} style={{ background: t.input, color: t.text, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer", outline: "none", display: typeof window !== 'undefined' && window.innerWidth < 600 ? 'none' : 'block' }}>
              <option value="light">☀️ Light</option><option value="dark">🌙 Dark</option><option value="motion">🌀 Motion</option><option value="nature">🌿 Nature</option><option value="ocean">🌊 Ocean</option>
            </select>
            {cartCount > 0 && (<button onClick={() => setStep("checkout")} style={{ background: color, border: "none", borderRadius: 24, padding: "10px 20px", fontWeight: 800, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><span>🛒 {cartCount}</span><div style={{width: 1, height: 14, background: "rgba(255,255,255,0.3)"}}></div><span>₹{cartTotal.toFixed(0)}</span></button>)}
          </div>
        </div>
      </div>

      <div className="main-layout" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
        
        <div className="category-sidebar no-scrollbar" style={{ width: "240px", flexShrink: 0, padding: "32px 24px" }}>
          <div style={{ color: t.textDim, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12, paddingLeft: 16 }}>MENU</div>
          {sectionKeys.map(sec => (
            <button key={sec} onClick={() => { setActiveSection(sec); document.getElementById(`section-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={{ display: "block", width: "100%", background: activeSection === sec ? `${color}15` : "transparent", border: "none", borderLeft: `4px solid ${activeSection === sec ? color : "transparent"}`, borderRadius: "0 12px 12px 0", padding: "14px 16px", color: activeSection === sec ? color : t.textDim, cursor: "pointer", fontSize: 15, textAlign: "left", fontWeight: activeSection === sec ? 700 : 500, transition: "all 0.2s ease" }}>{sec}</button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 300, padding: "32px 24px" }}>
          <div style={{ marginBottom: 32 }}>
            <input 
              type="text" 
              placeholder="🔍 Search for food..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredItems.length > 0) {
                  document.getElementById(`item-${filteredItems[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              style={{ width: "100%", background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: "16px 20px", color: t.text, fontSize: 16, outline: "none" }} 
            />
          </div>

          {sectionKeys.map((sec, secIdx) => (
            <div key={sec} id={`section-${sec}`} style={{ marginBottom: 48 }}>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>{sec}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {filteredSections[sec].map((item, i) => {
                  const inCart = cart.find(c => c.id === item.id);
                  
                  // Automatically generate a "fake" price that is 20% higher to show as a discount
                  const fakeOriginalPrice = Math.ceil(item.price * 1.20);
                  
                  return (
                    <div key={item.id} id={`item-${item.id}`} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ display: "flex", gap: 16, justifyContent: "space-between" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ width: 12, height: 12, border: "1px solid #22c55e", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><div style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%" }}></div></div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: t.text }}>{item.name}</div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            <div style={{ color: color, fontWeight: 800, fontSize: 16 }}>₹{item.price}</div>
                            <div style={{ textDecoration: "line-through", color: t.textDim, fontSize: 13, fontWeight: 500 }}>₹{fakeOriginalPrice}</div>
                            <div style={{ background: `${color}15`, color: color, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>20% OFF</div>
                          </div>

                          {item.description && <div style={{ color: t.textDim, fontSize: 13, marginTop: 8 }}>{item.description}</div>}
                        </div>
                        <div style={{ width: 100, height: 100, borderRadius: 16, background: t.input, flexShrink: 0, overflow: "hidden" }}>
                          {item.image_url ? <img src={`${IMG_BASE}${item.image_url}`} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, opacity: 0.5 }}>🍽️</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "auto" }}>
                        {inCart ? (
                          <div style={{ display: "flex", alignItems: "center", background: t.input, borderRadius: 100, padding: "4px" }}>
                            <button onClick={() => removeFromCart(item.id)} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", color: t.text, fontWeight: 600, cursor: "pointer", fontSize: 18 }}>−</button>
                            <span style={{ color: t.text, fontWeight: 700, minWidth: 24, textAlign: "center", fontSize: 15 }}>{inCart.qty}</span>
                            <button onClick={() => addToCart(item)} style={{ width: 36, height: 36, borderRadius: "50%", background: color, border: "none", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 18 }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)} style={{ background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 100, padding: "8px 24px", color: color, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>ADD</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cartCount > 0 && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 48px)", maxWidth: 400, zIndex: 50 }}>
          <button onClick={() => setStep("checkout")} style={{ width: "100%", background: color, border: "none", borderRadius: 20, padding: "16px 24px", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ background: "rgba(0,0,0,0.2)", padding: "4px 10px", borderRadius: 12, fontSize: 14 }}>{cartCount} items</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>₹{cartTotal.toFixed(2)} <span style={{ fontSize: 20 }}>→</span></span>
          </button>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media (min-width: 769px) {
          .category-sidebar {
            position: sticky;
            top: 90px;
            max-height: calc(100vh - 100px);
            overflow-y: auto;
          }
        }

        @media (max-width: 768px) { 
          .main-layout {
            flex-direction: column !important; 
          }
          .category-sidebar { 
            display: flex !important; 
            flex-direction: row !important; 
            align-items: center !important;
            width: 100% !important; 
            overflow-x: auto !important; 
            position: sticky !important; 
            top: 73px !important; 
            background: ${t.bg} !important; 
            padding: 16px 24px !important; 
            z-index: 45 !important; 
            border-bottom: 1px solid ${t.border}; 
          } 
          .category-sidebar > div { display: none; } 
          .category-sidebar > button { 
            display: inline-block !important;
            width: auto !important;
            border-left: none !important; 
            border-bottom: 2px solid transparent; 
            border-radius: 100px !important; 
            white-space: nowrap; 
            background: ${t.card} !important; 
            margin-right: 8px; 
            flex-shrink: 0; 
          } 
        }
      `}</style>
    </div>
  );
}