"use client";
import React from "react";

interface ReceiptProps {
  token: string;
  shopName: string;
  customerName?: string;
  customerPhone?: string;
  hallTicket?: string;
  orderType: string;
  items: any[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt?: string;
  themeColor?: string;
  compact?: boolean;
  assignedWorker?: string | null;
  estimatedTime?: number | null;
}

export default function Receipt({
  token, shopName, customerName, customerPhone, hallTicket,
  orderType, items, totalAmount, status, paymentStatus,
  createdAt, themeColor = "#FF6B00", compact = false,
  assignedWorker, estimatedTime
}: ReceiptProps) {
  
  const isReady = status === "ready";
  const dateStr = createdAt ? new Date(createdAt).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }) : "";

  return (
    <div style={{
      background: "#111118", border: `1px solid ${isReady ? "#22c55e" : "#1a1a2e"}`,
      borderRadius: 24, padding: compact ? 24 : 32, width: "100%", maxWidth: 400,
      boxShadow: isReady ? "0 0 40px rgba(34, 197, 94, 0.1)" : "0 20px 40px rgba(0,0,0,0.4)",
      position: "relative", overflow: "hidden", transition: "all 0.4s ease", color: "#fff"
    }}>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseBorder { 0% { border-color: #1a1a2e; } 50% { border-color: ${themeColor}66; } 100% { border-color: #1a1a2e; } }
      `}</style>
      
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: isReady ? "#22c55e" : themeColor, boxShadow: `0 0 20px ${isReady ? "#22c55e" : themeColor}` }} />

      <div style={{ textAlign: "center", marginBottom: 24, animation: "slideDown 0.4s ease" }}>
        <div style={{ fontSize: compact ? 40 : 56, marginBottom: 12 }}>{isReady ? "🎉" : "🍳"}</div>
        <div style={{ fontWeight: 800, fontSize: compact ? 20 : 24, fontFamily: "'Syne',sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>{isReady ? "Order Ready!" : "Order Received"}</div>
        <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>{shopName}</div>
      </div>

      {!isReady && (
        <div style={{ background: "#0a0a0f", border: `1px solid ${themeColor}44`, borderRadius: 16, padding: 16, marginBottom: 24, animation: "pulseBorder 2s infinite" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: assignedWorker ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 20 }}>⏳</div>
              <div>
                <div style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>ESTIMATED WAIT</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{estimatedTime && estimatedTime > 0 ? `${estimatedTime} minutes` : "Calculating..."}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1,2,3].map(i => (<div key={i} style={{ width: 4, height: 16, background: themeColor, borderRadius: 4, animation: `pulseBorder 1s infinite ${i * 0.2}s`, opacity: 0.8 }} />))}
            </div>
          </div>
          {assignedWorker && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px dashed #222", paddingTop: 12 }}>
              <div style={{ background: `${themeColor}22`, color: themeColor, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👨‍🍳</div>
              <div><div style={{ color: "#888", fontSize: 11 }}>Prepared by</div><div style={{ fontWeight: 600, fontSize: 13 }}>{assignedWorker}</div></div>
            </div>
          )}
        </div>
      )}

      <div style={{ background: "#0a0a0f", border: "1px dashed #333", borderRadius: 16, padding: 20, marginBottom: 24, textAlign: "center" }}>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 4, fontWeight: 600, letterSpacing: 1 }}>YOUR TOKEN</div>
        <div style={{ color: themeColor, fontWeight: 900, fontSize: 36, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 4 }}>{token}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, fontSize: 14 }}>
        {customerName && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>Customer</span><span style={{ fontWeight: 600 }}>{customerName}</span></div>}
        {customerPhone && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>Phone</span><span style={{ fontWeight: 600 }}>{customerPhone}</span></div>}
        {hallTicket && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>ID / Ticket</span><span style={{ fontWeight: 600 }}>{hallTicket}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>Type</span><span style={{ fontWeight: 600 }}>{orderType === "dine_in" ? "🍽️ Dine In" : "📦 Takeaway"}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#888" }}>Date</span><span style={{ fontWeight: 600 }}>{dateStr}</span></div>
      </div>

      <div style={{ borderTop: "1px dashed #333", borderBottom: "1px dashed #333", padding: "16px 0", marginBottom: 24 }}>
        <div style={{ color: "#888", fontSize: 12, marginBottom: 12, fontWeight: 700, letterSpacing: 1 }}>ITEMS</div>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span><span style={{ color: "#888", marginRight: 8 }}>{item.qty}x</span>{item.name}</span>
            <span style={{ fontWeight: 600 }}>₹{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#888", fontSize: 12, fontWeight: 700 }}>TOTAL PAID</div>
          <div style={{ color: paymentStatus === "paid" ? "#22c55e" : "#f59e0b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{paymentStatus}</div>
        </div>
        <div style={{ color: themeColor, fontWeight: 900, fontSize: 24 }}>₹{totalAmount.toFixed(2)}</div>
      </div>
    </div>
  );
}