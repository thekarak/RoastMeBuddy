"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROAST_LEVELS, type RoastLevel } from "@/lib/opencode";
import { TiltCard } from "@/components/TiltCard";
import { AmbientBackground } from "@/components/AmbientBackground";
import { HolographicDropzone } from "@/components/HolographicDropzone";

// 45s cooldown — safely below the 15 RPM free tier limit (3 calls per roast)
const COOLDOWN_MS = 45_000;

// ── Cooldown ring component ────────────────────────────────────────────────
function CooldownRing({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = remainingMs / totalMs; // 1 → 0
  const offset = circ * (1 - progress);  // ring depletes as time passes
  const secs = Math.ceil(remainingMs / 1000);

  // Colour shifts orange → yellow → green as timer nears zero
  const color = secs <= 5 ? "#22C55E" : secs <= 15 ? "#F59E0B" : "#FF4500";

  return (
    <div className="flex items-center gap-3 py-3 px-5 glass rounded-full border border-white/10 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
      {/* Depleting ring */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="24" cy="24" r={r} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.1s linear, stroke 0.5s ease",
              filter: `drop-shadow(0 0 6px ${color}aa)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: "Space Mono, monospace", color, fontSize: 11 }} className="font-bold leading-none">
            {secs}
          </span>
        </div>
      </div>
      {/* Label */}
      <div className="text-left">
        <p className="text-xs font-mono font-semibold" style={{ color }}>Cooling down…</p>
        <p className="text-[10px] text-[#9CA3AF] font-mono">Next roast ready in {secs}s</p>
      </div>
      {/* Shimmer bar */}
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden min-w-[70px]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(1 - progress) * 100}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            transition: "width 0.1s linear",
          }}
        />
      </div>
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
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 12px ${color}bb)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs font-mono text-[#9CA3AF]">/ 100</span>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: "🎯", title: "CV Audit Engine", desc: "Problem clarity, value prop, differentiation — all scored with brutal specificity.", color: "#FF4500" },
  { icon: "👁️", title: "Layout & Scanability Roast", desc: "Visual hierarchy, buried contact info, typography, and ATS compatibility.", color: "#8B5CF6" },
  { icon: "🎭", title: "Recruiter Simulator", desc: "Three distinct personas tear your resume apart — Recruiter, Hiring Manager, Senior Engineer.", color: "#F97316" },
  { icon: "💼", title: "Hiring Manager Mode™", desc: "Direct portfolio review, first impression score, case study depth, and recruiter verdict.", color: "#00F2FF" },
  { icon: "⚰️", title: "Product Funeral™", desc: "AI predicts fatal conversion friction and reverse-engineers exactly why drop-offs happen.", color: "#8B5CF6" },
  { icon: "✅", title: "Prioritised Action Plan", desc: "Fix this week, this sprint, this quarter — no noise, just highest-ROI career moves.", color: "#10B981" },
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"product" | "portfolio">("portfolio");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "file">("file");
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore cooldown from localStorage on mount + tick every 100ms
  useEffect(() => {
    function tick() {
      const stored = localStorage.getItem("lastRoastTime");
      if (!stored) { setCooldownMs(0); return; }
      const remaining = COOLDOWN_MS - (Date.now() - parseInt(stored));
      setCooldownMs(remaining > 0 ? remaining : 0);
    }
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

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
    const effectiveMode = inputMode === "file" ? "portfolio" : mode;
    try {
      let res: Response;
      if (inputMode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", effectiveMode);
        formData.append("roastLevel", roastLevel);
        res = await fetch("/api/roast", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, mode: effectiveMode, roastLevel }),
        });
      }
      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          res.ok 
            ? "Invalid server response format." 
            : `Server error (${res.status}): ${responseText.slice(0, 150)}`
        );
      }

      if (!res.ok) throw new Error(data.error || "Failed");

      // Persist full result for result page + narrative generation
      sessionStorage.setItem(`roast_${data.id}`, JSON.stringify(data.result));

      // Start cooldown timer (skip if it was a cache hit)
      if (!data.cached) localStorage.setItem("lastRoastTime", Date.now().toString());

      // Shareable hash excludes bulky scrapedText — kept in sessionStorage/API cache
      const shareResult = { ...data.result };
      delete shareResult.scrapedText;
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareResult))));
      router.push(`/roast/${data.id}#${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06060A] text-[#F3F4F6]">
      {/* ── AMBIENT MESH & GLOW ── */}
      <AmbientBackground />

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 w-full z-50 glass-specular border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">🔥</span>
            <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-xl font-extrabold tracking-tight grad-text">
              RoastMeBuddy!
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-mono text-[#9CA3AF] hover:text-white transition-colors">Features</a>
            <a href="#preview" className="text-sm font-mono text-[#9CA3AF] hover:text-white transition-colors">Telemetry</a>
            <a href="#how-it-works" className="text-sm font-mono text-[#9CA3AF] hover:text-white transition-colors">How It Works</a>
            <span className="text-xs px-3 py-1 rounded-full border border-[#00F2FF]/30 text-[#00F2FF] bg-[#00F2FF]/10 font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-ping" />
              STATUS: READY
            </span>
          </nav>
          <a
            href="#roast-form"
            className="btn-primary px-5 py-2 rounded-full text-sm hidden md:flex items-center gap-1.5 font-bold"
            onClick={() => inputRef.current?.focus()}
          >
            <span>Roast Now</span>
            <span>→</span>
          </a>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section id="hero" className="relative pt-36 pb-20 px-6 z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Holographic Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/15 mb-8 shadow-[0_0_25px_rgba(255,69,0,0.2)]">
            <span className="text-base animate-pulse">⚡</span>
            <span className="text-xs font-mono tracking-widest text-[#F3F4F6] uppercase font-bold">
              AI Recruiter & Career Teardown
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            <span className="block text-white">Your Resume,</span>
            <span className="block grad-text">Brutally Roasted.</span>
          </h1>

          <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-xl md:text-2xl font-medium text-[#9CA3AF] mb-8 max-w-2xl mx-auto leading-relaxed">
            Before hiring managers reject you in 6 seconds.
          </h2>

          <p className="text-base text-[#9CA3AF] max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your CV or drop a URL. Get back a structured, scored, brutally honest teardown from a Recruiter, Hiring Manager, and Senior Engineer.
          </p>

          {/* 3D Glassmorphic Form Card */}
          <div id="roast-form" className="max-w-2xl mx-auto">
            <TiltCard maxTilt={4} scale={1.01} className="neon-border-box p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <form onSubmit={handleRoast} className="space-y-6">
                {/* Mode Tabs */}
                <div className="flex justify-center">
                  <div className="flex glass rounded-full p-1 border border-white/10 gap-1">
                    {(["portfolio", "product"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`px-5 py-2 rounded-full text-xs sm:text-sm font-mono transition-all capitalize ${
                          mode === m ? "tab-active font-bold" : "text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {m === "portfolio" ? "💼 CV / Portfolio Roast" : "🎯 Product Roast"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Roast Level Selector */}
                <div className="flex justify-center">
                  <div className="flex glass rounded-full p-1 border border-white/10 gap-1 overflow-x-auto max-w-full">
                    {ROAST_LEVELS.map((rl) => (
                      <button
                        key={rl.id}
                        type="button"
                        onClick={() => setRoastLevel(rl.id)}
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap ${
                          roastLevel === rl.id ? "tab-active font-bold" : "text-[#9CA3AF] hover:text-white"
                        }`}
                        title={rl.desc}
                      >
                        <span>{rl.icon} </span>
                        <span>{rl.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Mode Toggle */}
                <div className="flex justify-center">
                  <div className="flex glass rounded-full p-1 border border-white/10 gap-1">
                    {(["file", "url"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setInputMode(m);
                          if (m === "file") setMode("portfolio");
                          else setMode("product");
                        }}
                        className={`px-5 py-2 rounded-full text-xs sm:text-sm font-mono transition-all ${
                          inputMode === m ? "tab-active font-bold" : "text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {m === "file" ? "📄 Upload CV File" : "🔗 Paste a URL"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input View: Holographic File Dropzone */}
                {inputMode === "file" && (
                  <div className="space-y-4">
                    <HolographicDropzone
                      file={file}
                      onFileSelect={(selected) => {
                        setFile(selected);
                        setError("");
                      }}
                      disabled={loading || cooldownMs > 0}
                    />

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || !file || cooldownMs > 0}
                      className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,69,0,0.4)]"
                    >
                      {loading ? (
                        <>
                          <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Scanning & Roasting CV…</span>
                        </>
                      ) : (
                        <>
                          <span>🔥 Roast My Resume Now</span>
                          <span>→</span>
                        </>
                      )}
                    </button>

                    {cooldownMs > 0 && !loading && (
                      <div className="flex justify-center pt-2 fade-in-up">
                        <CooldownRing remainingMs={cooldownMs} totalMs={COOLDOWN_MS} />
                      </div>
                    )}
                  </div>
                )}

                {/* Input View: URL Field */}
                {inputMode === "url" && (
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="relative flex items-center glass-specular border border-white/15 rounded-xl p-2 shadow-2xl">
                        <span className="text-[#9CA3AF] ml-3 text-lg">🔗</span>
                        <input
                          ref={inputRef}
                          type="url"
                          value={url}
                          onChange={(e) => { setUrl(e.target.value); setError(""); }}
                          placeholder="https://your-portfolio-or-product.com"
                          className="flex-1 bg-transparent border-none outline-none text-[#F3F4F6] placeholder-[#71717A] px-4 py-3 font-mono text-sm sm:text-base"
                          disabled={loading || cooldownMs > 0}
                        />
                        <button
                          type="submit"
                          disabled={loading || cooldownMs > 0}
                          className="btn-primary flex-shrink-0 px-6 py-3 rounded-lg flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Roasting…</span>
                            </>
                          ) : (
                            <span>Roast It →</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {cooldownMs > 0 && !loading && (
                      <div className="flex justify-center pt-2 fade-in-up">
                        <CooldownRing remainingMs={cooldownMs} totalMs={COOLDOWN_MS} />
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-mono">
                    ⚠️ {error}
                  </div>
                )}
              </form>
            </TiltCard>
          </div>

          {/* Social Proof Telemetry */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-6 text-xs font-mono text-[#9CA3AF]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF8C00]">🔥</span> 2,400+ resumes roasted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#00F2FF]">⚡</span> &lt;45s analysis
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#10B981]">🔒</span> Zero data storage
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3D TELEMETRY PREVIEW ── */}
      <section id="preview" className="py-20 px-6 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-3xl md:text-5xl font-extrabold mb-3">
              The Brutal Truth, <span className="grad-text">Visualized.</span>
            </h2>
            <p className="text-[#9CA3AF] text-base md:text-lg">No sugarcoating. Just calibrated recruiter telemetry and cold, hard scores.</p>
          </div>

          <TiltCard maxTilt={5} scale={1.02} className="glass-specular rounded-3xl p-8 md:p-10 border border-white/15 relative overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-[#FF4500]" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-[#8B5CF6]" />
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <ScoreRing score={58} />
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold text-white">
                      Senior Software Engineer Resume
                    </h3>
                    <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">Scanned with Recruiter AI Engine</p>
                  </div>
                  <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-3.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                    <span>💀</span> VERDICT: REWRITE REQUIRED
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="glass rounded-xl p-4 border border-red-500/20 flex gap-3.5 items-start">
                    <span className="text-red-400 text-lg flex-shrink-0">🔴</span>
                    <div>
                      <span className="text-red-400 text-xs font-mono font-bold uppercase tracking-wider block mb-1">Critical Flaw</span>
                      <p className="text-sm text-[#F3F4F6] leading-relaxed">
                        Zero quantified metrics in previous 2 roles. You listed job responsibilities instead of business impact.
                      </p>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-4 border border-yellow-500/20 flex gap-3.5 items-start">
                    <span className="text-yellow-400 text-lg flex-shrink-0">🟡</span>
                    <div>
                      <span className="text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider block mb-1">Cliché Warning</span>
                      <p className="text-sm text-[#F3F4F6] leading-relaxed">
                        &quot;Passionate, results-driven professional&quot; summary detected. Cut the buzzwords and lead with your top achievement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* ── 3D FEATURES GRID ── */}
      <section id="features" className="py-24 px-6 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 text-center md:text-left">
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-3xl md:text-5xl font-extrabold mb-4">
              Six dimensions of <span className="grad-text-cyber">pure reality check.</span>
            </h2>
            <p className="text-[#9CA3AF] text-lg max-w-2xl">A comprehensive teardown engine engineered to detect flaws before human recruiters do.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <TiltCard
                key={i}
                maxTilt={6}
                scale={1.03}
                className="glass-specular rounded-2xl p-7 border border-white/10 transition-all duration-300 cursor-default hover:border-white/25"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  style={{ background: `${f.color}15`, borderColor: `${f.color}30` }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-[#9CA3AF] text-sm leading-relaxed">{f.desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 relative z-10 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-3xl md:text-5xl font-extrabold mb-3">How It Works</h2>
            <p className="text-[#9CA3AF] text-lg">From file upload to complete breakdown in under 45 seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {[
              { num: "01", title: "Upload Your File", desc: "Drag & drop your CV/Resume PDF or DOCX file, or paste your portfolio link.", color: "#FF4500" },
              { num: "02", title: "AI Panel Analysis", desc: "Three specialized recruiter personas critique your impact, formatting, and proof of work.", color: "#8B5CF6" },
              { num: "03", title: "Get Your Action Plan", desc: "Receive cold, hard scores and a prioritized action plan for this week, sprint, and quarter.", color: "#00F2FF" },
            ].map((s, i) => (
              <TiltCard key={i} maxTilt={5} scale={1.02} className="glass rounded-2xl p-8 border border-white/10 text-center flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-2xl glass border border-white/20 flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(255,255,255,0.05)]"
                  style={{ color: s.color }}
                >
                  <span style={{ fontFamily: "Space Mono, monospace" }} className="text-2xl font-bold">{s.num}</span>
                </div>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-xl font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[#9CA3AF] text-sm leading-relaxed">{s.desc}</p>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.08] py-12 px-6 relative z-10 bg-[#06060A]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-lg font-bold grad-text">RoastMeBuddy!</span>
            <span className="text-[#9CA3AF] text-xs font-mono ml-2">© 2026 · Built for ambitious builders</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-[#9CA3AF]">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
