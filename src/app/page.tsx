"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROAST_LEVELS, type RoastLevel } from "@/lib/mistral";

// ── WebGL animated background ──────────────────────────────────────────────
function ShaderBackground() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-[pulse_6s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, #FF4500 0%, transparent 70%)", top: "10%", left: "5%" }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-[pulse_8s_ease-in-out_infinite_2s]"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)", top: "40%", right: "5%" }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[80px] animate-[pulse_10s_ease-in-out_infinite_4s]"
        style={{ background: "radial-gradient(circle, #F97316 0%, transparent 70%)", bottom: "10%", left: "40%" }}
      />
    </div>
  );
}

// ── Score ring in preview ──────────────────────────────────────────────────
function ScoreRing({ score, color = "#FF4500" }: { score: number; color?: string }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: "Syne, sans-serif" }} className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-[#71717A]">/ 100</span>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "🎯", title: "Product Audit Engine", desc: "Problem clarity, value prop, differentiation — all scored with brutal specificity.", color: "#FF4500" },
  { icon: "👁️", title: "UX + Conversion Roast", desc: "Visual hierarchy, buried CTAs, friction points and drop-off predictions.", color: "#8B5CF6" },
  { icon: "🎭", title: "AI User Simulator", desc: "Three distinct personas tear your product apart — Visitor, Founder, Investor.", color: "#F97316" },
  { icon: "🦈", title: "Shark Tank Mode™", desc: "Investor panel fires tough questions and delivers a funding readiness verdict.", color: "#FF4500" },
  { icon: "⚰️", title: "Product Funeral™", desc: "AI assumes your startup failed in 3 years. Reverse-engineers exactly why.", color: "#8B5CF6" },
  { icon: "✅", title: "Prioritised Action Plan", desc: "Fix this week, this sprint, this quarter — no noise, just highest-ROI moves.", color: "#F97316" },
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"product" | "portfolio">("product");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "file">("url");
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("medium");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleRoast(e: React.FormEvent) {
    e.preventDefault();
    if (inputMode === "url") {
      if (!url.trim()) { setError("Please enter a URL."); return; }
      try { new URL(url); } catch { setError("Please enter a valid URL (include https://)"); return; }
    } else {
      if (!file) { setError("Please select a PDF or DOCX file."); return; }
    }

    setLoading(true);
    setError("");
    try {
      let res: Response;
      if (inputMode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", mode);
        formData.append("roastLevel", roastLevel);
        res = await fetch("/api/roast", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, mode, roastLevel }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data.result))));
      router.push(`/roast/${data.id}#${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 w-full z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span style={{ fontFamily: "Syne, sans-serif", color: "var(--primary)" }} className="text-xl font-bold">
              RoastMeBuddy!
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#71717A] hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-[#71717A] hover:text-white transition-colors">How It Works</a>
            <span className="text-xs px-3 py-1 rounded-full border border-[#FF4500]/30 text-[#FF4500] font-mono">Free</span>
          </nav>
          <a
            href="#hero"
            className="btn-primary px-5 py-2.5 rounded-full text-sm hidden md:block"
            onClick={() => inputRef.current?.focus()}
          >
            Roast My Product →
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
        <ShaderBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/30 via-[#0A0A0F]/60 to-[#0A0A0F] pointer-events-none z-0" />

        <div className="relative z-10 max-w-4xl mx-auto text-center fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/10 mb-8">
            <span className="text-lg">🔥</span>
            <span className="text-xs font-mono tracking-widest text-[#F1F1F3] uppercase">AI Product Audit</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "Syne, sans-serif" }} className="text-5xl md:text-7xl font-bold tracking-tight mb-4 leading-[1.05]">
            <span className="block text-white">Your Product,</span>
            <span className="block grad-text">Roasted.</span>
          </h1>
          <h2 style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl md:text-3xl font-semibold text-[#71717A] mb-6">
            Before The Market Does.
          </h2>
          <p className="text-lg text-[#71717A] max-w-2xl mx-auto mb-12 leading-relaxed">
            Drop in a URL or screenshot. Get back a structured, scored, brutally honest teardown —
            from a PM, an investor, and a real user. In under 60 seconds.
          </p>

            {/* Input */}
            <form onSubmit={handleRoast} className="max-w-2xl mx-auto">
              {/* Mode tabs */}
              <div className="flex justify-center mb-4">
                <div className="flex glass rounded-full p-1 border border-white/10 gap-1">
                  {(["product", "portfolio"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-5 py-2 rounded-full text-sm font-mono transition-all capitalize ${mode === m ? "tab-active" : "text-[#71717A] hover:text-white"}`}
                    >
                      {m === "product" ? "🎯 Product Roast" : "💼 Portfolio Roast"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roast level */}
              <div className="flex justify-center mb-4">
                <div className="flex glass rounded-full p-0.5 border border-white/10 gap-0.5">
                  {ROAST_LEVELS.map((rl) => (
                    <button
                      key={rl.id}
                      type="button"
                      onClick={() => setRoastLevel(rl.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap ${roastLevel === rl.id ? "tab-active" : "text-[#71717A] hover:text-white"}`}
                      title={rl.desc}
                    >
                      <span className="hidden sm:inline">{rl.icon} </span>{rl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input mode toggle: URL or File */}
              <div className="flex justify-center mb-4">
                <div className="flex glass rounded-full p-0.5 border border-white/10 gap-0.5">
                  {(["url", "file"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInputMode(m)}
                      className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${inputMode === m ? "tab-active" : "text-[#71717A] hover:text-white"}`}
                    >
                      {m === "url" ? "🔗 URL" : "📄 Upload CV"}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL input */}
              {inputMode === "url" && (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF4500] to-[#8B5CF6] rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                  <div className="relative flex items-center glass border border-white/10 rounded-full p-1.5 shadow-2xl">
                    <span className="text-[#71717A] ml-4 text-lg">🔗</span>
                    <input
                      ref={inputRef}
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setError(""); }}
                      placeholder="https://your-product.com"
                      className="flex-1 bg-transparent border-none outline-none text-[#F1F1F3] placeholder-[#71717A] px-4 py-3 font-mono text-base"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary flex-shrink-0 px-7 py-3 rounded-full flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Roasting…
                        </>
                      ) : "Roast It →"}
                    </button>
                  </div>
                </div>
              )}

              {/* File upload */}
              {inputMode === "file" && (
                <div className="relative">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#FF4500]/60"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#FF4500]/60"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-[#FF4500]/60");
                      const f = e.dataTransfer.files[0];
                      if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) {
                        setFile(f);
                        setError("");
                      } else {
                        setError("Please upload a PDF or DOCX file.");
                      }
                    }}
                    className="glass border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-[#FF4500]/40 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setFile(f); setError(""); }
                      }}
                    />
                    {file ? (
                      <div className="space-y-2">
                        <span className="text-4xl block">📄</span>
                        <p className="text-[#F1F1F3] font-mono text-sm">{file.name}</p>
                        <p className="text-[#71717A] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                        <p className="text-[#71717A] text-xs mt-2">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-4xl block group-hover:scale-110 transition-transform">📄</span>
                        <p className="text-[#F1F1F3] font-semibold">Drop your CV here</p>
                        <p className="text-[#71717A] text-sm font-mono">PDF or DOCX supported</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !file}
                    className="btn-primary mt-4 w-full px-7 py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Roasting…
                      </>
                    ) : "Roast My CV →"}
                  </button>
                </div>
              )}

              {error && <p className="mt-3 text-red-400 text-sm font-mono">{error}</p>}
            </form>

          {/* Social proof */}
          <div className="mt-10 flex flex-col items-center gap-3 opacity-60">
            <p className="text-xs font-mono text-[#71717A] uppercase tracking-widest">Free · No signup · Powered by Mistral AI</p>
            <div className="flex gap-6 text-xs text-[#71717A]">
              <span>🔥 2,400+ products roasted</span>
              <span>⚡ &lt;60s results</span>
              <span>🎯 6 audit dimensions</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAMPLE OUTPUT PREVIEW ── */}
      <section className="py-20 px-6 border-t border-white/[0.05]" style={{ background: "linear-gradient(to bottom, var(--bg), rgba(19,19,26,0.4))" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 style={{ fontFamily: "Syne, sans-serif" }} className="text-3xl md:text-5xl font-bold mb-3">
              The Brutal Truth, <span className="grad-text">Visualized.</span>
            </h2>
            <p className="text-[#71717A] text-lg">No fluff. Just actionable insights and cold, hard scores.</p>
          </div>

          <div className="glass rounded-2xl p-8 border border-white/[0.06] relative overflow-hidden glow-orange transition-all duration-500">
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: "var(--primary)" }} />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-15" style={{ background: "var(--secondary)" }} />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <ScoreRing score={68} />
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-xl font-bold text-white">Acme SaaS Landing Page</h3>
                    <p className="text-xs text-[#71717A] font-mono">acme.io · Analysed 2 mins ago</p>
                  </div>
                  <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-mono">
                    🦈 Shark Tank: &quot;Pivot or die&quot;
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="bg-black/30 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <span className="text-red-400 text-lg flex-shrink-0">🔴</span>
                    <div>
                      <span className="text-red-400 text-xs font-mono font-bold uppercase tracking-wider block mb-1">Critical</span>
                      <p className="text-sm text-[#F1F1F3]">Primary CTA is buried below the fold. Users abandon before they see any value prop.</p>
                    </div>
                  </div>
                  <div className="bg-black/30 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                    <span className="text-yellow-400 text-lg flex-shrink-0">🟡</span>
                    <div>
                      <span className="text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider block mb-1">Warning</span>
                      <p className="text-sm text-[#F1F1F3]">Value prop headline is generic (&quot;Empower your team&quot;). Needs quantifiable specifics.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <h2 style={{ fontFamily: "Syne, sans-serif" }} className="text-3xl md:text-5xl font-bold mb-4">
              Six ways we <span className="grad-text-purple">tear your product apart.</span>
            </h2>
            <p className="text-[#71717A] text-lg max-w-2xl">A comprehensive teardown engine designed to find flaws before your users do.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className={`glass rounded-2xl p-7 border border-white/[0.06] transition-all duration-300 cursor-default ${i % 2 === 0 ? "glow-orange" : "glow-purple"}`}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl mb-5 border border-white/10"
                  style={{ background: `${f.color}15` }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-[#71717A] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.05]" style={{ background: "var(--bg)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: "Syne, sans-serif" }} className="text-3xl md:text-5xl font-bold mb-3">How It Works</h2>
            <p className="text-[#71717A] text-lg">From submission to reality check in 60 seconds.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-4 relative">
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {[
              { num: "1", title: "Drop Your URL", desc: "Paste any product or portfolio link — or describe it in text.", color: "var(--primary)" },
              { num: "2", title: "AI Panel Tears It Apart", desc: "6 specialised AI engines run in parallel — PM, UX, investor, and more.", color: "var(--secondary)" },
              { num: "3", title: "Get Your Roast Report", desc: "Scored teardown with prioritised fixes, shareable via link.", color: "var(--tertiary)" },
            ].map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center w-full md:w-1/3 group">
                <div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mb-5 transition-all group-hover:border-[#FF4500]/40 group-hover:shadow-[0_0_20px_rgba(255,69,0,0.2)]">
                  <span style={{ fontFamily: "Geist Mono, monospace", color: s.color }} className="text-xl font-bold">{s.num}</span>
                </div>
                <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[#71717A] text-sm px-4 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.05] py-10 px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <span style={{ fontFamily: "Syne, sans-serif", color: "var(--primary)" }} className="font-bold">RoastMeBuddy!</span>
            <span className="text-[#71717A] text-sm ml-2">© 2026 · Built for bold builders · Powered by Mistral AI</span>
          </div>
          <div className="flex gap-6 text-sm text-[#71717A]">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
