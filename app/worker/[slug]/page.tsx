"use client";
import { useState, useEffect, useRef, use } from "react";
import { useSearchParams } from "next/navigation";

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.7:8000";

type OrderItem = { name: string; quantity: number; price: number; variants?: any; addons?: any[] };
type Order = {
  id: number;
  token: string;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  total_amount: number;
  payment_status: string;
  created_at: string;
  is_cod: boolean;
};

// 🔥 NATIVE SWIPE COMPONENT (No external libraries needed!)
const SwipeButton = ({ onSwipe, text, trackBg, thumbBg, disabled }: any) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    startXRef.current = e.clientX - dragX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || disabled || !trackRef.current) return;
    let newX = e.clientX - startXRef.current;
    const maxDrag = trackRef.current.offsetWidth - 56; // 56px is the thumb width
    if (newX < 0) newX = 0;
    if (newX > maxDrag) newX = maxDrag;
    setDragX(newX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || disabled || !trackRef.current) return;
    setIsDragging(false);
    const maxDrag = trackRef.current.offsetWidth - 56;
    
    if (dragX > maxDrag * 0.75) { // If swiped more than 75% of the way
      setDragX(maxDrag);
      onSwipe();
      setTimeout(() => setDragX(0), 300); // Reset for the next state
    } else {
      setDragX(0); // Snap back to start
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div ref={trackRef} style={{ background: trackBg, borderRadius: 16, height: 56, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.6 : 1, marginTop: 16 }}>
       <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, zIndex: 1, pointerEvents: 'none', paddingLeft: 24, letterSpacing: 0.5 }}>{text}</div>
       <div 
         onPointerDown={handlePointerDown} 
         onPointerMove={handlePointerMove} 
         onPointerUp={handlePointerUp} 
         onPointerCancel={handlePointerUp}
         style={{ position: 'absolute', left: 2, top: 2, width: 52, height: 52, background: thumbBg, borderRadius: 14, cursor: disabled ? 'wait' : 'grab', transform: `translateX(${dragX}px)`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', touchAction: 'none' }}
       >
         {disabled ? "⏳" : "👉"}
       </div>
    </div>
  );
};

export default function WorkerDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const rawSlug = use(params).slug;
  const slug = rawSlug.toLowerCase();
  
  const searchParams = useSearchParams();
  const workerName = searchParams.get("worker") || "Kitchen Staff";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Auto-refresh orders every 15 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [slug]);

  async function fetchOrders() {
    try {
      const res = await fetch(`${BASE_API}/api/menu/worker/${slug}/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Failed to fetch orders", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: number, currentStatus: string) {
    const nextStatusMap: Record<string, string> = {
      "pending": "preparing",
      "preparing": "ready",
      "ready": "completed"
    };
    
    const newStatus = nextStatusMap[currentStatus];
    if (!newStatus) return;

    setUpdatingId(orderId);
    
    // Optimistic UI Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));

    try {
      await fetch(`${BASE_API}/api/menu/worker/${slug}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      alert("Network Error: Failed to update order status.");
      fetchOrders(); // Revert on failure
    } finally {
      setUpdatingId(null);
    }
  }

  // 🔥 GHOST ORDER FIX: Only show fully paid or COD orders
  const validOrders = orders.filter(o => 
    (o.is_cod === true || o.payment_status === "paid" || o.payment_status === "completed") 
    && o.status !== "cancelled"
  );

  const pendingOrders = validOrders.filter(o => o.status === "pending");
  const preparingOrders = validOrders.filter(o => o.status === "preparing");
  const readyOrders = validOrders.filter(o => o.status === "ready");

  const OrderCard = ({ order }: { order: Order }) => {
    const timeAgo = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
    const isLate = timeAgo > 10 && order.status === "pending"; // Red warning if older than 10 mins

    let trackBg = "#422006"; // Pending bg
    let thumbBg = "#eab308"; // Pending thumb
    let swipeText = "SWIPE TO PREPARE";

    if (order.status === "preparing") {
      trackBg = "#064e3b"; thumbBg = "#22c55e"; swipeText = "SWIPE TO READY";
    } else if (order.status === "ready") {
      trackBg = "#1e293b"; thumbBg = "#64748b"; swipeText = "SWIPE TO CLEAR";
    }

    return (
      <div style={{ 
        background: "#1e293b", border: `2px solid ${isLate ? "#ef4444" : "#334155"}`, borderRadius: 20, padding: 20, 
        display: "flex", flexDirection: "column", boxShadow: isLate ? "0 0 15px rgba(239,68,68,0.2)" : "none",
        animation: "fadeUp 0.3s ease-out"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #334155", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: 2, fontFamily: "monospace" }}>#{order.token}</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 4, fontWeight: 600 }}>{order.customer_name || "Guest"} • {order.is_cod ? "💵 COD" : "💳 Paid"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: isLate ? "#ef4444" : "#cbd5e1", fontWeight: 800, fontSize: 15, background: isLate ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 8 }}>
              {timeAgo < 1 ? "New" : `${timeAgo}m ago`}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>
              <div><span style={{ color: "#38bdf8", marginRight: 10, background: "rgba(56,189,248,0.1)", padding: "2px 8px", borderRadius: 6 }}>{item.quantity}x</span> {item.name}</div>
            </div>
          ))}
        </div>

        {/* The Native Swipe Action Button */}
        <SwipeButton 
          text={swipeText} 
          trackBg={trackBg} 
          thumbBg={thumbBg} 
          onSwipe={() => updateOrderStatus(order.id, order.status)} 
          disabled={updatingId === order.id} 
        />
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 24, color: "#fff" }}>Kitchen Display System</div>
          <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: 14 }}>Station: {workerName}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {loading && <div style={{ color: "#94a3b8", fontSize: 14 }}>Syncing...</div>}
          <div style={{ background: "#334155", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 15 }}>
            <span style={{color: "#eab308"}}>{pendingOrders.length} Pending</span>
          </div>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, padding: 24, alignItems: "start" }}>
        
        {/* Column 1: New Orders */}
        <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 24, padding: 16, minHeight: "80vh" }}>
          <div style={{ borderBottom: "3px solid #eab308", paddingBottom: 12, marginBottom: 20, color: "#eab308", fontWeight: 900, fontSize: 18, display: "flex", justifyContent: "space-between", letterSpacing: 1 }}>
            <span>NEW ORDERS</span>
            <span style={{background: "#eab308", color: "#000", padding: "2px 10px", borderRadius: 12}}>{pendingOrders.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pendingOrders.length === 0 ? <div style={{ textAlign: "center", color: "#64748b", padding: 32, fontWeight: 600 }}>Waiting for orders...</div> : pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 24, padding: 16, minHeight: "80vh" }}>
          <div style={{ borderBottom: "3px solid #38bdf8", paddingBottom: 12, marginBottom: 20, color: "#38bdf8", fontWeight: 900, fontSize: 18, display: "flex", justifyContent: "space-between", letterSpacing: 1 }}>
            <span>PREPARING</span>
            <span style={{background: "#38bdf8", color: "#000", padding: "2px 10px", borderRadius: 12}}>{preparingOrders.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {preparingOrders.length === 0 ? <div style={{ textAlign: "center", color: "#64748b", padding: 32, fontWeight: 600 }}>Kitchen is clear</div> : preparingOrders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>

        {/* Column 3: Ready for Pickup */}
        <div style={{ background: "rgba(30, 41, 59, 0.5)", borderRadius: 24, padding: 16, minHeight: "80vh" }}>
          <div style={{ borderBottom: "3px solid #22c55e", paddingBottom: 12, marginBottom: 20, color: "#22c55e", fontWeight: 900, fontSize: 18, display: "flex", justifyContent: "space-between", letterSpacing: 1 }}>
            <span>READY FOR PICKUP</span>
            <span style={{background: "#22c55e", color: "#000", padding: "2px 10px", borderRadius: 12}}>{readyOrders.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {readyOrders.length === 0 ? <div style={{ textAlign: "center", color: "#64748b", padding: 32, fontWeight: 600 }}>No orders waiting</div> : readyOrders.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>

      </div>
    </div>
  );
}