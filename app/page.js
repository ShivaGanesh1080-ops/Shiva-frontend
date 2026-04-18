"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  {
    icon: "💸",
    title: "Instant Checkouts",
    desc: "1-click Razorpay integration. No middleman, no delays — money hits your account in seconds.",
    color: "from-orange-500/20 to-transparent",
    border: "border-orange-500/20",
    glow: "shadow-[0_0_40px_rgba(249,115,22,0.15)]",
  },
  {
    icon: "🔥",
    title: "Live Kitchen Sync",
    desc: "Orders appear on the kitchen display the instant they're placed. Zero latency, zero missed orders.",
    color: "from-red-500/20 to-transparent",
    border: "border-red-500/20",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.15)]",
  },
  {
    icon: "📊",
    title: "Crystal Analytics",
    desc: "Revenue, orders, peak hours — broken down to the last rupee. Know your business cold.",
    color: "from-blue-500/20 to-transparent",
    border: "border-blue-500/20",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  },
  {
    icon: "🏪",
    title: "Multi-Tenant Ready",
    desc: "Onboard every canteen on campus under one master dashboard. Scale without chaos.",
    color: "from-purple-500/20 to-transparent",
    border: "border-purple-500/20",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.15)]",
  },
  {
    icon: "🛡️",
    title: "Role-Based Access",
    desc: "Admins, kitchen staff, and cashiers — each see exactly what they need, nothing more.",
    color: "from-emerald-500/20 to-transparent",
    border: "border-emerald-500/20",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.15)]",
  },
  {
    icon: "📱",
    title: "Mobile-First UX",
    desc: "Designed for the phone in your pocket. Students order, staff fulfil — all from any device.",
    color: "from-amber-500/20 to-transparent",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.15)]",
  },
];

const STATS = [
  { value: "2.4s", label: "Avg. order time" },
  { value: "₹0", label: "Setup fee" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "∞", label: "Canteens supported" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Register your canteen", desc: "Takes under 5 minutes. We handle the onboarding, you focus on the food." },
  { step: "02", title: "Configure your menu", desc: "Upload items, set prices, toggle availability in real-time. No tech skills needed." },
  { step: "03", title: "Go live instantly", desc: "Share your QR code. Students scan, order, pay. Your kitchen dashboard lights up." },
];

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function RevealSection({ children, className = "", delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    const handleMouse = (e) =>
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouse);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#060606] text-white overflow-x-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .display { font-family: 'Syne', sans-serif; }
        @keyframes grain {
          0%,100% { transform: translate(0,0); }
          10% { transform: translate(-2%,-3%); }
          30% { transform: translate(2%,3%); }
          50% { transform: translate(-1%,2%); }
          70% { transform: translate(3%,-1%); }
          90% { transform: translate(-3%,1%); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes slide-up {
          from { opacity:0; transform: translateY(40px); }
          to { opacity:1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity:0; } to { opacity:1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hero-tag { animation: slide-up 0.6s ease 0.1s both; }
        .hero-h1 { animation: slide-up 0.7s ease 0.25s both; }
        .hero-p { animation: slide-up 0.7s ease 0.4s both; }
        .hero-cta { animation: slide-up 0.7s ease 0.55s both; }
        .hero-stats { animation: slide-up 0.7s ease 0.7s both; }
        .float-card { animation: float 5s ease-in-out infinite; }
        .float-card-2 { animation: float 6s ease-in-out 1s infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #f97316, #ef4444, #f97316, #ef4444);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .grain-overlay {
          position: fixed; inset: -50%; width: 200%; height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          animation: grain 0.5s steps(1) infinite;
          z-index: 1;
        }
        .grid-bg {
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .step-line::after {
          content: '';
          position: absolute;
          top: 24px;
          left: calc(100% + 1px);
          width: calc(100% - 2px);
          height: 1px;
          background: linear-gradient(90deg, rgba(249,115,22,0.4), transparent);
        }
      `}</style>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Dynamic mouse orb */}
      <div
        className="fixed w-[60vw] h-[60vw] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
          transform: "translate(-50%, -50%)",
          transition: "left 1.2s ease, top 1.2s ease",
        }}
      />

      {/* Static orbs */}
      <div className="fixed top-[-15%] right-[-5%] w-[50vw] h-[50vw] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-blue-700/8 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-black/60 backdrop-blur-2xl border-b border-white/10 py-4"
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="display text-2xl font-black tracking-tight flex items-center gap-2">
            <span className="relative">
              <span className="text-orange-500">⚡</span>
              <span className="absolute inset-0 blur-sm text-orange-500 opacity-70">⚡</span>
            </span>
            Shiva<span className="text-orange-500">12</span>
            <span className="text-white/30 font-light">OS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#stats" className="hover:text-white transition-colors">Stats</a>
          </div>
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-orange-300 transition-all text-sm font-semibold"
          >
            Master Login →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 grid-bg min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
        {/* Radial fade over grid */}
        <div className="absolute inset-0 bg-radial-[at_50%_50%] from-transparent via-transparent to-[#060606] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#060606] to-transparent pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <div className="hero-tag inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/8 text-orange-400 text-xs font-bold mb-8 uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            Now live on campus · The Future of Dining
          </div>

          <h1 className="display hero-h1 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.05]">
            Run your campus{" "}
            <br className="hidden md:block" />
            food network{" "}
            <span className="shimmer-text">at lightspeed.</span>
          </h1>

          <p className="hero-p text-white/40 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            The ultimate multi-tenant OS for college canteens. Instant Razorpay checkouts,
            real-time kitchen sync, and analytics sharp enough to run a business on.
          </p>

          <div className="hero-cta flex gap-4 flex-wrap justify-center mb-16">
            <Link
              href="/admin"
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(249,115,22,0.5)]"
            >
              <span className="relative z-10">Access Command Center →</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-semibold text-base transition-all duration-300"
            >
              See how it works
            </a>
          </div>

          {/* Stats strip */}
          <div
            id="stats"
            className="hero-stats grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]"
          >
            {STATS.map((s, i) => (
              <div key={i} className="bg-[#060606]/80 backdrop-blur-sm px-6 py-5 text-center">
                <div className="display text-2xl md:text-3xl font-black text-orange-400 mb-1">
                  {s.value}
                </div>
                <div className="text-white/30 text-xs uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating indicator cards */}
        <div className="hidden lg:block absolute left-10 top-[40%] float-card">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl text-left w-48">
            <div className="text-xs text-white/40 mb-1">New order</div>
            <div className="text-sm font-semibold">Chicken Biryani ×2</div>
            <div className="text-xs text-emerald-400 mt-1">Paid · ₹280</div>
          </div>
        </div>
        <div className="hidden lg:block absolute right-10 top-[45%] float-card-2">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl text-left w-48">
            <div className="text-xs text-white/40 mb-1">Today's revenue</div>
            <div className="display text-2xl font-black text-orange-400">₹18,420</div>
            <div className="text-xs text-emerald-400 mt-1">↑ 24% vs yesterday</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <RevealSection className="text-center mb-16">
          <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-3">Built different</p>
          <h2 className="display text-4xl md:text-5xl font-black tracking-tight">
            Everything you need.<br />
            <span className="text-white/30">Nothing you don't.</span>
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <RevealSection key={i} delay={i * 80}>
              <div
                className={`group h-full bg-white/[0.02] hover:bg-white/[0.05] border ${f.border} rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1 cursor-default relative overflow-hidden ${f.glow}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="display text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <RevealSection className="text-center mb-20">
          <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-3">Dead simple</p>
          <h2 className="display text-4xl md:text-5xl font-black tracking-tight">
            Up and running<br />
            <span className="text-white/30">in under 10 minutes.</span>
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <RevealSection key={i} delay={i * 120} className="relative">
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[60%] right-0 h-px bg-gradient-to-r from-orange-500/30 to-transparent" />
              )}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="display text-5xl font-black text-orange-500/20">{step.step}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <h3 className="display text-xl font-bold">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <RevealSection>
        <section className="relative z-10 max-w-5xl mx-auto px-6 pb-32">
          <div className="relative rounded-[2rem] overflow-hidden border border-orange-500/20 bg-gradient-to-br from-orange-600/10 via-red-600/5 to-transparent p-12 md:p-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,0.15),transparent_70%)] pointer-events-none" />
            {/* Pulse rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-orange-500/10 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-orange-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />

            <div className="relative">
              <h2 className="display text-4xl md:text-5xl font-black tracking-tight mb-4">
                Ready to run faster?
              </h2>
              <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto font-light">
                Join the campuses already processing thousands of orders daily through Shiva12OS.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(249,115,22,0.5)]"
              >
                Launch Command Center
                <span className="text-orange-200">→</span>
              </Link>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="display text-xl font-black text-white/20 flex items-center gap-1.5">
            <span className="text-orange-500/40">⚡</span> Shiva12OS
          </div>
          <p className="text-white/20 text-sm">
            Built for campus. Optimized for scale.
          </p>
          <div className="flex gap-6 text-sm text-white/20">
            <a href="#features" className="hover:text-white/50 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white/50 transition-colors">How it works</a>
            <Link href="/admin" className="hover:text-white/50 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}