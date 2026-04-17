import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
      {/* Glowing Orbs for Cyberpunk/Startup Vibe */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto border-b border-white/10 backdrop-blur-md bg-black/20">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <span className="text-orange-500">⚡</span> Shiva12<span className="text-gray-400 font-light">OS</span>
        </div>
        <Link href="/admin" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 transition-all text-sm font-semibold backdrop-blur-md">
          Master Login
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center max-w-5xl mx-auto">
        <div className="inline-block px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-bold mb-8 uppercase tracking-widest shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          The Future of Campus Dining
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Run your campus food network <br className="hidden md:block"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
            at the speed of light.
          </span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          The ultimate multi-tenant operating system for college canteens and restaurants. 
          Instant Razorpay checkouts, real-time kitchen syncing, and beautiful analytics.
        </p>
        
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/admin" className="px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-lg transition-all shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.6)] hover:-translate-y-1">
            Access Command Center
          </Link>
        </div>
      </main>

      {/* Glassmorphism Feature Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Instant Checkouts", desc: "1-click Razorpay integration bypassing the middleman.", icon: "💸" },
          { title: "Live Kitchen Sync", desc: "Workers see orders instantly. No refreshing required.", icon: "🔥" },
          { title: "Crystal Analytics", desc: "Know exactly how much revenue you make, down to the rupee.", icon: "📊" }
        ].map((feature, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:bg-white/[0.06] transition-all hover:-translate-y-2">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}