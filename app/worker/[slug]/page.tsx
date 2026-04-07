"use client";
import { useState, useEffect, useRef, use } from "react";
import { API, WS_BASE } from "@/lib/api";
import Receipt from "@/components/Receipt";

type Order = {
  id: number; token: string; customer_name: string; customer_phone: string;
  hall_ticket: string; order_type: string; items: any[]; total_amount: number;
  status: string; payment_status: string; created_at: string;
  assigned_worker?: string;
  estimated_time?: number;
  is_cod?: boolean; // Added this to match the backend
};

export default function WorkerPage({ params }: { params: Promise<{ slug: string }> }) {
  const rawSlug = use(params).slug;
  const slug = rawSlug.toLowerCase(); 

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [slideX, setSlideX] = useState(0);
  const [sliding, setSliding] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    fetchOrders(); 
    connectWS(); 
    return () => wsRef.current?.close(); 
  }, [slug]);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  async function fetchOrders() {
    try {
      const data = await API.getWorkerOrders(slug);
      setOrders(Array.isArray(data) ? data : []);
    } catch { }
  }

  function connectWS() {
    const ws = new WebSocket(`${WS_BASE}/api/orders/ws/${slug}`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setTimeout(connectWS, 3000); };
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "new_order") {
        setOrders(prev => [msg.order, ...prev]);
        new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==").play().catch(() => {});
      }
    };
    wsRef.current = ws;
  }

  async function completeOrder(token: string) {
    setCompleting(token);
    try {
      await API.completeOrder(token);
      setOrders(prev => prev.filter(o => o.token !== token));
      setSelectedOrder(null);
    } catch (e) {
      alert("Failed to complete order");
    } finally {
      setCompleting(null);
      setSlideX(0);
    }
  }

  const statusColor: Record<string, string> = {
    confirmed: "#3b82f6", preparing: "#8b5cf6", ready: "#22c55e",
  };

  if (!mounted) return null;

  // 🔥 THE GHOST ORDER FIX: Filter out any orders that are unpaid or cancelled
  const validOrders = orders.filter(o => 
    (o.is_cod === true || o.payment_status === "paid" || o.payment_status === "completed") 
    && o.status !== "cancelled"
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "'DM Sans',sans-serif", color: "#111827" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}
        .order-card{transition:all 0.2s ease;cursor:pointer;}
        .order-card:hover{transform:translateX(4px);}
        .slide-btn{position:relative;overflow:hidden;border-radius:14px;height:56px;background:#e5e7eb;border:none;cursor:pointer;width:100%;touch-action:none;}
        .slide-track{position:absolute;left:0;top:0;bottom:0;width:64px;background:#22c55e;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:grab;box-shadow: 2px 0 10px rgba(0,0,0,0.1); z-index: 10; color: white;}
        .slide-track:active{cursor:grabbing;}
        .slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#16a34a;font-weight:800;font-size:15px;pointer-events:none;letter-spacing:1px; z-index: 5;}
      `}</style>

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18 }}>👨‍🍳 Kitchen Display</div>
          <div style={{ color: "#4b5563", fontSize: 12 }}>{slug}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444", position: "relative" }}>
            {connected && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#22c55e", animation: "ping 1.5s infinite" }} />}
          </div>
          <span style={{ fontSize: 12, color: connected ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{connected ? "Live" : "Offline"}</span>
          <div style={{ background: "#FF6B00", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
            {validOrders.length} pending
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 65px)", flexDirection: "column" }}>
        
        {/* Mobile-Friendly Split View */}
        <div style={{ display: "flex", flex: 1, flexDirection: typeof window !== "undefined" && window.innerWidth < 768 ? "column" : "row" }}>
          
          {/* Orders List */}
          <div style={{ width: selectedOrder && typeof window !== "undefined" && window.innerWidth >= 768 ? "40%" : "100%", borderRight: selectedOrder && typeof window !== "undefined" && window.innerWidth >= 768 ? "1px solid #e5e7eb" : "none", overflowY: "auto", padding: 16, transition: "width 0.3s ease", maxHeight: typeof window !== "undefined" && window.innerWidth < 768 && selectedOrder ? "30vh" : "auto", borderBottom: typeof window !== "undefined" && window.innerWidth < 768 && selectedOrder ? "1px solid #e5e7eb" : "none" }}>
            {validOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#4b5563" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 600 }}>Kitchen is clear!</div>
                <div style={{ marginTop: 8, display: "inline-block", width: 20, height: 20, border: "2px solid #e5e7eb", borderTopColor: "#FF6B00", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {validOrders.map((order, i) => (
                  <div key={order.token} className="order-card"
                    onClick={() => setSelectedOrder(selectedOrder?.token === order.token ? null : order)}
                    style={{ background: selectedOrder?.token === order.token ? "#f3f4f6" : "#ffffff", border: `1px solid ${selectedOrder?.token === order.token ? "#3b82f6" : "#e5e7eb"}`, borderRadius: 16, padding: 14, animation: `fadeUp 0.3s ease ${i * 0.05}s both`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: "#FF6B00", fontSize: 18, letterSpacing: 2 }}>{order.token}</div>
                      <div style={{ background: `${statusColor[order.status] || "#888"}22`, color: statusColor[order.status] || "#888", borderRadius: 10, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                        {order.status}
                      </div>
                    </div>
                    <div style={{ color: "#111827", fontWeight: 700, fontSize: 14 }}>{order.customer_name}</div>
                    
                    {/* Display AI Assigned Worker Name & ETA */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      {order.assigned_worker && <div style={{ color: "#8b5cf6", fontSize: 12, fontWeight: 700 }}>👨‍🍳 Assigned: {order.assigned_worker}</div>}
                      <div style={{ color: "#d97706", fontSize: 12, fontWeight: 800, background: "rgba(245, 158, 11, 0.1)", padding: "2px 8px", borderRadius: 6 }}>
                        ⏳ ETA: {order.estimated_time || 0}m
                      </div>
                    </div>
                    
                    <div style={{ color: "#4b5563", fontSize: 12, marginTop: 8, fontWeight: 500 }}>
                      {order.order_type === "dine_in" ? "🍽️ Dine In" : "📦 Takeaway"} • {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Detail View */}
          {selectedOrder && (
            <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, background: "#f9fafb" }}>
              <Receipt
                token={selectedOrder.token} shopName={slug} 
                customerName={selectedOrder.customer_name} customerPhone={selectedOrder.customer_phone}
                hallTicket={selectedOrder.hall_ticket} orderType={selectedOrder.order_type}
                items={selectedOrder.items} totalAmount={selectedOrder.total_amount}
                status={selectedOrder.status} paymentStatus={selectedOrder.payment_status}
                createdAt={selectedOrder.created_at} themeColor="#FF6B00" compact
              />

              {/* Interactive Slide to Complete */}
              <div style={{ width: "100%", maxWidth: 440, opacity: completing === selectedOrder.token ? 0.6 : 1, pointerEvents: completing === selectedOrder.token ? "none" : "auto" }}>
                <div 
                  ref={slideRef} 
                  className="slide-btn"
                  onPointerDown={(e) => {
                    setSliding(true);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!sliding || !slideRef.current) return;
                    const rect = slideRef.current.getBoundingClientRect();
                    const maxX = rect.width - 64; 
                    let currentX = e.clientX - rect.left - 32; 
                    if (currentX < 0) currentX = 0;
                    if (currentX > maxX) currentX = maxX;
                    setSlideX(currentX);
                  }}
                  onPointerUp={(e) => {
                    if (!sliding || !slideRef.current) return;
                    setSliding(false);
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    const maxX = slideRef.current.getBoundingClientRect().width - 64;
                    if (slideX > maxX * 0.85) {
                      setSlideX(maxX);
                      completeOrder(selectedOrder.token);
                    } else {
                      setSlideX(0);
                    }
                  }}
                  onPointerCancel={() => {
                    setSliding(false);
                    setSlideX(0);
                  }}
                >
                  <div className="slide-label">
                    {completing === selectedOrder.token ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 18, height: 18, border: "3px solid #16a34a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> 
                        Completing...
                      </span>
                    ) : "SLIDE TO COMPLETE >>>"}
                  </div>
                  
                  <div 
                    className="slide-track" 
                    style={{ transform: `translateX(${slideX}px)`, transition: sliding ? "none" : "transform 0.3s ease-out" }}
                  >
                    ▶
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}