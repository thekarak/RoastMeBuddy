"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import html2canvas from "html2canvas";
import type { FullRoastResult, AuditResult, PersonaResult, SharkTankResult, FuneralResult, ActionPlanResult, PortfolioResult } from "@/lib/mistral";

// ── Helpers ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color = "#FF4500" }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-[#71717A]">{label}</span>
        <span style={{ color }}>{value}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 120, color = "#FF4500" }: { score: number; size?: number; color?: string }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-[#71717A] font-mono">/ 100</span>
      </div>
    </div>
  );
}

function Tag({ type, label }: { type: "critical" | "warning" | "good" | "info"; label: string }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    good:     "bg-green-500/10 text-green-400 border-green-500/20",
    info:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  const icons = { critical: "🔴", warning: "🟡", good: "🟢", info: "🔵" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${styles[type]}`}>
      {icons[type]} {label}
    </span>
  );
}

function IssueRow({ text, type }: { text: string; type: "critical" | "warning" | "good" }) {
  const clr = { critical: "#EF4444", warning: "#F59E0B", good: "#22C55E" };
  return (
    <div className={`flex gap-3 items-start p-4 rounded-xl border`}
      style={{ background: `${clr[type]}08`, borderColor: `${clr[type]}25` }}>
      <span className="flex-shrink-0 mt-0.5">
        {type === "critical" ? "🔴" : type === "warning" ? "🟡" : "🟢"}
      </span>
      <p className="text-sm text-[#F1F1F3] leading-relaxed">{text}</p>
    </div>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────
function RoastPanel({ text, loading }: { text: string; loading: boolean }) {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="glass rounded-2xl p-8 border border-white/[0.06] relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ background: "#EF4444" }} />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ background: "#F97316" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">{loading ? "⏳" : "🎤"}</span>
            <div>
              <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl font-bold text-white">
                {loading ? "Generating the Roast..." : "The Roast"}
              </h3>
              <p className="text-xs text-[#71717A] font-mono">
                {loading ? "AI is crafting pure verbal destruction, please wait..." : "Professional comedy roast — no filters, no mercy"}
              </p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              {(text || "The product is so boring even the AI fell asleep.").split("\n").filter(Boolean).map((paragraph, i, arr) => (
                <p key={i} className="text-base md:text-lg leading-relaxed text-[#F1F1F3] mb-4 last:mb-0" style={{ fontFamily: "Georgia, serif", fontStyle: i === arr.length - 1 ? "italic" : "normal" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditPanel({ data }: { data: AuditResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="glass rounded-2xl p-6 border border-white/[0.06] flex flex-col md:flex-row gap-6 items-start">
        <ScoreRing score={data.overallScore} size={130} />
        <div className="flex-1 space-y-4">
          <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-xl font-bold text-white">Overall Audit</h3>
          <p className="text-[#71717A] text-sm leading-relaxed">{data.summary}</p>
          <div className="space-y-3">
            <ScoreBar label="Problem Clarity" value={data.problemClarity} color="#FF4500" />
            <ScoreBar label="Value Proposition" value={data.valueProp} color="#8B5CF6" />
            <ScoreBar label="Differentiation" value={data.differentiation} color="#F97316" />
            <ScoreBar label="Positioning" value={data.positioning} color="#22C55E" />
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-white/[0.06]">
          <h4 className="text-xs font-mono text-green-400 uppercase tracking-wider mb-4">✅ Strengths</h4>
          <ul className="space-y-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#F1F1F3]"><span className="text-green-400 flex-shrink-0">→</span>{s}</li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/[0.06]">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-4">❌ Weaknesses</h4>
          <ul className="space-y-2">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#F1F1F3]"><span className="text-red-400 flex-shrink-0">→</span>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


function PersonasPanel({ data }: { data: PersonaResult[] }) {
  return (
    <div className="space-y-5 fade-in-up">
      {data.map((p, i) => (
        <div key={i} className="glass rounded-2xl p-6 border border-white/[0.06] transition-all hover:border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{p.emoji}</span>
              <div>
                <h3 style={{ fontFamily: "Syne, sans-serif", color: p.color }} className="font-bold">{p.persona}</h3>
              </div>
            </div>
            <ScoreRing score={p.score} size={64} color={p.color} />
          </div>
          <div className="space-y-3">
            <div className="glass rounded-xl p-4 border border-white/[0.04]">
              <span className="text-xs font-mono text-[#71717A] uppercase tracking-wider block mb-1">First Impression</span>
              <p className="text-sm text-[#F1F1F3]">{p.firstImpression}</p>
            </div>
            <div className="glass rounded-xl p-4 border border-white/[0.04]" style={{ borderColor: `${p.color}20` }}>
              <span className="text-xs font-mono uppercase tracking-wider block mb-1" style={{ color: p.color }}>Main Objection</span>
              <p className="text-sm text-[#F1F1F3]">{p.mainObjection}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-mono text-[#71717A]">Verdict:</span>
              <span className="text-sm text-[#F1F1F3] italic">&ldquo;{p.verdict}&rdquo;</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SharkTankPanel({ data }: { data: SharkTankResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      {/* Verdict */}
      <div className="glass rounded-2xl p-6 border border-red-500/20 text-center">
        <span className="text-4xl block mb-3">🦈</span>
        <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl font-bold text-white mb-2">Funding Verdict</h3>
        <p className="text-xl text-red-400 font-semibold italic">&ldquo;{data.fundingVerdict}&rdquo;</p>
        <div className="mt-4">
          <ScoreBar label="Funding Readiness" value={data.fundingReadiness} color="#EF4444" />
        </div>
      </div>
      {/* Questions */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono text-[#71717A] uppercase tracking-wider">💣 Tough Questions You&apos;ll Face</h4>
        {data.questions.map((q, i) => (
          <div key={i} className="glass rounded-xl p-5 border border-white/[0.06]">
            <p className="text-white font-semibold mb-2">&ldquo;{q.question}&rdquo;</p>
            <p className="text-xs text-[#71717A] font-mono"><span className="text-[#F97316]">↳ Why they ask: </span>{q.concern}</p>
          </div>
        ))}
      </div>
      {/* Market + Moat */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 border border-white/[0.06]">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3">⚠️ Market Risk</h4>
          <p className="text-sm text-[#F1F1F3] leading-relaxed">{data.marketRisk}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/[0.06]">
          <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3">🏰 Moat Analysis</h4>
          <p className="text-sm text-[#F1F1F3] leading-relaxed">{data.moatAnalysis}</p>
          <div className="mt-3">
            <ScoreBar label="Moat Score" value={data.moatScore} color="#8B5CF6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FuneralPanel({ data }: { data: FuneralResult }) {
  return (
    <div className="space-y-5 fade-in-up">
      {/* Tombstone header */}
      <div className="glass rounded-2xl p-8 border border-white/[0.06] text-center bg-gradient-to-b from-[#1C1C26]/80 to-transparent">
        <span className="text-5xl block mb-4">⚰️</span>
        <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl font-bold text-white mb-2">Product Funeral™</h3>
        <div className="inline-block border border-white/10 rounded-xl px-6 py-3 mt-2">
          <p className="text-[#71717A] text-xs font-mono">DIED</p>
          <p className="text-white font-semibold">{data.timeOfDeath}</p>
        </div>
        <p className="mt-4 text-[#F97316] italic text-lg">&ldquo;{data.epitaph}&rdquo;</p>
      </div>
      {/* Cause */}
      <div className="glass rounded-2xl p-5 border border-red-500/20">
        <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3">💀 Cause of Death</h4>
        <p className="text-sm text-[#F1F1F3] leading-relaxed">{data.causeOfDeath}</p>
      </div>
      {/* Survival */}
      <div className="glass rounded-2xl p-5 border border-white/[0.06]">
        <ScoreBar label="Survival Chance (if nothing changes)" value={data.survivalChance} color={data.survivalChance < 30 ? "#EF4444" : data.survivalChance < 60 ? "#F59E0B" : "#22C55E"} />
      </div>
      {/* Missed signals */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono text-[#71717A] uppercase tracking-wider">📡 Missed Signals</h4>
        {data.missedSignals.map((s, i) => (
          <div key={i} className="flex gap-3 items-start glass rounded-xl p-4 border border-white/[0.06]">
            <span className="text-red-400 flex-shrink-0 font-mono text-sm">0{i + 1}</span>
            <p className="text-sm text-[#F1F1F3]">{s}</p>
          </div>
        ))}
      </div>
      {/* Prevention */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono text-green-400 uppercase tracking-wider">🛡️ Prevention Plan (Do This Now)</h4>
        {data.preventionPlan.map((p, i) => (
          <IssueRow key={i} text={p} type="good" />
        ))}
      </div>
    </div>
  );
}

function ActionPlanPanel({ data }: { data: ActionPlanResult }) {
  const cols = [
    { key: "thisWeek" as const, label: "This Week", color: "#FF4500", bg: "rgba(255,69,0,0.07)", icon: "⚡" },
    { key: "thisSprint" as const, label: "This Sprint", color: "#8B5CF6", bg: "rgba(139,92,246,0.07)", icon: "🏃" },
    { key: "thisQuarter" as const, label: "This Quarter", color: "#F97316", bg: "rgba(249,115,22,0.07)", icon: "🎯" },
  ];
  return (
    <div className="fade-in-up">
      <div className="grid md:grid-cols-3 gap-4">
        {cols.map((col) => (
          <div key={col.key} className="glass rounded-2xl p-5 border border-white/[0.06]" style={{ background: col.bg }}>
            <h4 style={{ fontFamily: "Syne, sans-serif", color: col.color }} className="font-bold mb-4 flex items-center gap-2">
              <span>{col.icon}</span>{col.label}
            </h4>
            <div className="space-y-3">
              {data[col.key].map((item, i) => (
                <div key={i} className="glass rounded-xl p-3.5 border border-white/[0.04]">
                  <p className="text-sm text-[#F1F1F3] mb-2 leading-relaxed">{item.action}</p>
                  <div className="flex gap-2">
                    <Tag type={item.impact === "High" ? "critical" : item.impact === "Medium" ? "warning" : "info"} label={`Impact: ${item.impact}`} />
                    <Tag type={item.effort === "Low" ? "good" : item.effort === "Medium" ? "warning" : "critical"} label={`Effort: ${item.effort}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioPanel({ data }: { data: PortfolioResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="glass rounded-2xl p-6 border border-white/[0.06] flex flex-col md:flex-row gap-6 items-start">
        <ScoreRing score={data.overallScore} size={130} color="#8B5CF6" />
        <div className="flex-1 space-y-3">
          <h3 style={{ fontFamily: "Syne, sans-serif" }} className="text-xl font-bold text-white">Hiring Manager Mode™</h3>
          <p className="text-[#71717A] text-sm leading-relaxed">{data.summary}</p>
          <ScoreBar label="First Impression" value={data.firstImpression} color="#FF4500" />
          <ScoreBar label="Case Study Depth" value={data.caseStudyDepth} color="#8B5CF6" />
          <ScoreBar label="Design Taste" value={data.designTaste} color="#F97316" />
          <ScoreBar label="Skill vs. Effort Proof" value={data.skillProof} color="#22C55E" />
          <ScoreBar label="Hiring CTA" value={data.ctaScore} color="#06B6D4" />
        </div>
      </div>
      <div className="glass rounded-2xl p-5 border border-purple-500/20">
        <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3">💼 Recruiter Verdict</h4>
        <p className="text-[#F1F1F3] italic">&ldquo;{data.recruiterVerdict}&rdquo;</p>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider">Top Issues to Fix</h4>
        {data.topIssues.map((issue, i) => <IssueRow key={i} text={issue} type="warning" />)}
      </div>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 fade-in-up">
      {/* Tab skeleton */}
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      {/* Main panel skeleton */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06] flex flex-col md:flex-row gap-6 items-start">
        <SkeletonBlock className="w-[130px] h-[130px] rounded-full" />
        <div className="flex-1 space-y-4">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <div className="space-y-3 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Two-column skeleton */}
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-white/[0.06] space-y-3">
            <SkeletonBlock className="h-4 w-24" />
            {[...Array(3)].map((_, j) => (
              <SkeletonBlock key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TABS config ────────────────────────────────────────────────────────────
const TABS = [
  { id: "audit",     label: "🎯 Audit",       color: "#FF4500" },
  { id: "roast",     label: "🎤 Roast",       color: "#EF4444" },
  { id: "personas",  label: "🎭 Personas",    color: "#F97316" },
  { id: "sharktank", label: "🦈 Shark Tank",  color: "#EF4444" },
  { id: "funeral",   label: "⚰️ Funeral",     color: "#71717A" },
  { id: "actions",   label: "✅ Action Plan", color: "#22C55E" },
  { id: "portfolio", label: "💼 Portfolio",   color: "#06B6D4" },
];

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function RoastResultPage() {
  const params = useParams();
  const id = params?.id as string;
  const [result, setResult] = useState<FullRoastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audit");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aiRoastText, setAiRoastText] = useState("");
  const [loadingRoast, setLoadingRoast] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Sync state with loaded result
  useEffect(() => {
    if (result) {
      setAiRoastText(result.aiRoast || "");
    }
  }, [result]);

  // Lazy generation effect when "roast" tab is selected
  useEffect(() => {
    if (activeTab === "roast" && !aiRoastText && !loadingRoast && id) {
      setLoadingRoast(true);
      fetch(`/api/roast?id=${id}&type=narrative`)
        .then((res) => {
          if (!res.ok) throw new Error("Narrative fetch failed");
          return res.json();
        })
        .then((data) => {
          if (data.aiRoast) {
            setAiRoastText(data.aiRoast);
            if (result) {
              const updated = { ...result, aiRoast: data.aiRoast };
              setResult(updated);
              sessionStorage.setItem(`roast_${id}`, JSON.stringify(updated));
            }
          }
        })
        .catch((err) => console.error("Failed to load AI roast narrative:", err))
        .finally(() => setLoadingRoast(false));
    }
  }, [activeTab, aiRoastText, loadingRoast, id, result]);

  useEffect(() => {
    async function load() {
      // 1. Check URL hash first (shared links)
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const hash = window.location.hash.slice(1);
          const decoded = JSON.parse(decodeURIComponent(escape(atob(hash))));
          setResult(decoded);
          setLoading(false);
          return;
        } catch {
          // hash decode failed, fall through
        }
      }
      // 2. Check sessionStorage (set by landing page after roast)
      const cached = sessionStorage.getItem(`roast_${id}`);
      if (cached) {
        setResult(JSON.parse(cached));
        setLoading(false);
        return;
      }
      // 3. Fallback: fetch from API
      try {
        const res = await fetch(`/api/roast?id=${id}`);
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          setResult(data.result);
        }
      } catch (e) {
        console.error("Failed to fetch roast data from API:", e);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const updateShareUrl = useCallback(() => {
    if (!result) return;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(result))));
    const newUrl = `${window.location.origin}/roast/${id}#${encoded}`;
    window.history.replaceState(null, "", `/roast/${id}#${encoded}`);
    return newUrl;
  }, [result, id]);

  function copyLink() {
    const url = updateShareUrl() || window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadImage() {
    if (!captureRef.current || !result) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0A0A0F",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `cvroast-${id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Image export failed:", err);
    }
    setDownloading(false);
  }

  const visibleTabs = TABS.filter(t => {
    if (t.id === "portfolio") return !!result?.portfolio;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <header className="glass border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
            <span>🔥</span>
            <span style={{ fontFamily: "Syne, sans-serif", color: "var(--primary)" }} className="font-bold ml-2">RoastMeBuddy!</span>
          </div>
        </header>
        <div className="text-center pt-12 pb-6">
          <div className="text-5xl animate-bounce mb-4">🔥</div>
          <p style={{ fontFamily: "Syne, sans-serif" }} className="text-xl font-bold text-white mb-1">Roasting your product…</p>
          <p className="text-[#71717A] font-mono text-sm">Running 6 AI engines in parallel</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <span className="text-5xl">💀</span>
        <p style={{ fontFamily: "Syne, sans-serif" }} className="text-2xl font-bold text-white">Roast not found</p>
        <Link href="/" className="btn-primary px-6 py-3 rounded-full">← Back Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="glass border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span>🔥</span>
            <span style={{ fontFamily: "Syne, sans-serif", color: "var(--primary)" }} className="font-bold">RoastMeBuddy!</span>
          </Link>
          <div className="flex items-center gap-3">
            {result.roastLevel && (
              <span
                className="text-xs font-mono px-3 py-1 rounded-full border"
                style={{
                  color: result.roastLevel === "brutal" ? "#EF4444" : result.roastLevel === "hard" ? "#F97316" : result.roastLevel === "medium" ? "#F59E0B" : "#22C55E",
                  borderColor: result.roastLevel === "brutal" ? "rgba(239,68,68,0.3)" : result.roastLevel === "hard" ? "rgba(249,115,22,0.3)" : result.roastLevel === "medium" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)",
                  background: result.roastLevel === "brutal" ? "rgba(239,68,68,0.1)" : result.roastLevel === "hard" ? "rgba(249,115,22,0.1)" : result.roastLevel === "medium" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                }}
              >
                {result.roastLevel === "brutal" ? "💀🔥" : result.roastLevel === "hard" ? "🌶️🌶️🌶️" : result.roastLevel === "medium" ? "🌶️🌶️" : "🌶️"} {result.roastLevel.toUpperCase()}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs font-mono text-[#71717A]">
              <span>Overall:</span>
              <span style={{ color: "var(--primary)" }} className="font-bold text-sm">{result.audit.overallScore}/100</span>
            </div>
            <button onClick={copyLink} className="btn-primary px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
              {copied ? "✅ Copied!" : "🔗 Share"}
            </button>
            <button onClick={downloadImage} disabled={downloading} className="px-4 py-1.5 rounded-full text-sm flex items-center gap-2 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50">
              {downloading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting…
                </>
              ) : "📷 Download"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-mono transition-all whitespace-nowrap ${activeTab === tab.id ? "tab-active" : "text-[#71717A] hover:text-white hover:bg-white/5"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div ref={captureRef} className="rounded-2xl">
          {activeTab === "audit"     && <AuditPanel data={result.audit} />}
          {activeTab === "roast"    && <RoastPanel text={aiRoastText} loading={loadingRoast} />}
          {activeTab === "personas"  && <PersonasPanel data={result.personas} />}
          {activeTab === "sharktank" && <SharkTankPanel data={result.sharkTank} />}
          {activeTab === "funeral"   && <FuneralPanel data={result.funeral} />}
          {activeTab === "actions"   && <ActionPlanPanel data={result.actionPlan} />}
          {activeTab === "portfolio" && result.portfolio && <PortfolioPanel data={result.portfolio} />}
        </div>
      </div>
    </div>
  );
}
