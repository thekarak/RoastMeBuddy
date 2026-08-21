"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import html2canvas from "html2canvas";
import type { FullRoastResult, AuditResult, UXResult, PersonaResult, SharkTankResult, FuneralResult, ActionPlanResult, PortfolioResult } from "@/lib/opencode";
import { TiltCard } from "@/components/TiltCard";
import { AmbientBackground } from "@/components/AmbientBackground";

// ── Helpers ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color = "#FF4500" }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-[#9CA3AF]">{label}</span>
        <span style={{ color }} className="font-bold">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 130, color = "#FF4500" }: { score: number; size?: number; color?: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 12px ${color}aa)`, transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-3xl font-extrabold text-white">{score}</span>
        <span className="text-[10px] text-[#9CA3AF] font-mono tracking-widest uppercase">/ 100</span>
      </div>
    </div>
  );
}

function Tag({ type, label }: { type: "critical" | "warning" | "good" | "info"; label: string }) {
  const styles = {
    critical: "bg-red-500/10 text-red-400 border-red-500/30",
    warning:  "bg-amber-500/10 text-amber-400 border-amber-500/30",
    good:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    info:     "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  };
  const icons = { critical: "🔴", warning: "🟡", good: "🟢", info: "🔵" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-medium ${styles[type]}`}>
      {icons[type]} {label}
    </span>
  );
}

function IssueRow({ text, type }: { text: string; type: "critical" | "warning" | "good" }) {
  const clr = { critical: "#EF4444", warning: "#F59E0B", good: "#10B981" };
  return (
    <div
      className="flex gap-3.5 items-start p-4 rounded-xl border backdrop-blur-md transition-all hover:translate-x-1 duration-200"
      style={{ background: `${clr[type]}0a`, borderColor: `${clr[type]}30` }}
    >
      <span className="flex-shrink-0 mt-0.5 text-base">
        {type === "critical" ? "🔴" : type === "warning" ? "🟡" : "🟢"}
      </span>
      <p className="text-sm text-[#F3F4F6] leading-relaxed font-normal">{text}</p>
    </div>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────
function RoastPanel({ text, loading, onRetry }: { text: string; loading: boolean; onRetry?: () => void }) {
  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={3} scale={1.01} className="glass-specular rounded-3xl p-8 sm:p-10 border border-white/15 relative overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.8)]">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 bg-[#EF4444]" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-15 bg-[#F97316]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.3)]">
              <span className="text-3xl">{loading ? "⏳" : "🎤"}</span>
            </div>
            <div>
              <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl sm:text-3xl font-extrabold text-white">
                {loading ? "Crafting Your Roast…" : "The Comedy Roast"}
              </h3>
              <p className="text-xs text-[#9CA3AF] font-mono tracking-wider uppercase mt-0.5">
                {loading ? "AI is generating savage feedback, please wait…" : "Unfiltered truth · Zero mercy · Full teardown"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 py-4">
              <div className="h-5 bg-white/5 rounded-lg w-full animate-pulse" />
              <div className="h-5 bg-white/5 rounded-lg w-5/6 animate-pulse" />
              <div className="h-5 bg-white/5 rounded-lg w-4/5 animate-pulse" />
              <div className="h-5 bg-white/5 rounded-lg w-full animate-pulse" />
              <div className="h-5 bg-white/5 rounded-lg w-3/4 animate-pulse" />
            </div>
          ) : text.includes("unavailable") ? (
            <div className="text-center space-y-4 py-6">
              <p className="text-[#9CA3AF] font-mono text-sm">{text}</p>
              {onRetry && (
                <button onClick={onRetry} className="btn-primary px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_25px_rgba(255,69,0,0.4)]">
                  🔄 Retry Roast
                </button>
              )}
            </div>
          ) : (
            <div className="prose prose-invert max-w-none space-y-5">
              {(text || "The resume was so generic even the AI fell asleep.").split("\n").filter(Boolean).map((paragraph, i, arr) => (
                <p
                  key={i}
                  className="text-base sm:text-lg leading-relaxed text-[#F3F4F6] p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: i === arr.length - 1 ? "italic" : "normal",
                    borderColor: i === arr.length - 1 ? "rgba(255, 69, 0, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </TiltCard>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl p-8 border border-white/10 text-center">
      <p className="text-sm text-[#9CA3AF] font-mono">{message}</p>
    </div>
  );
}

function UXPanel({ data, mode }: { data: UXResult; mode: "product" | "portfolio" }) {
  const isPortfolio = mode === "portfolio";
  const subLabels = isPortfolio
    ? [
        { label: "Section Structure & ATS", color: "#FF4500" },
        { label: "Contact Info & Links", color: "#8B5CF6" },
        { label: "Credentials & Endorsements", color: "#00F2FF" },
      ]
    : [
        { label: "Visual Hierarchy", color: "#FF4500" },
        { label: "CTA Placement", color: "#8B5CF6" },
        { label: "Trust Signals", color: "#00F2FF" },
      ];
  const scores = [data.visualHierarchy, data.ctaPlacement, data.trustSignals];

  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={4} scale={1.01} className="glass-specular rounded-3xl p-8 border border-white/15 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <ScoreRing score={data.score} size={135} color="#8B5CF6" />
        <div className="flex-1 space-y-4 w-full">
          <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-extrabold text-white">
            {isPortfolio ? "CV Layout & Scanability" : "UX + Conversion Audit"}
          </h3>
          <p className="text-[#9CA3AF] text-sm leading-relaxed">
            {isPortfolio
              ? "How recruiter-friendly, scannable, and ATS-compatible your formatting is."
              : "How users navigate your page — hierarchy, CTAs, and trust signals."}
          </p>
          <div className="space-y-3 pt-1">
            {subLabels.map((l, i) => (
              <ScoreBar key={l.label} label={l.label} value={scores[i]} color={l.color} />
            ))}
          </div>
        </div>
      </TiltCard>

      {data.criticalIssues.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider font-bold">🔴 Critical Issues</h4>
          {data.criticalIssues.map((issue, i) => <IssueRow key={i} text={issue} type="critical" />)}
        </div>
      )}

      {data.warnings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-amber-400 uppercase tracking-wider font-bold">🟡 Warnings</h4>
          {data.warnings.map((w, i) => <IssueRow key={i} text={w} type="warning" />)}
        </div>
      )}

      {data.frictionPoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-[#9CA3AF] uppercase tracking-wider font-bold">⚡ Friction Points</h4>
          {data.frictionPoints.map((f, i) => (
            <div key={i} className="flex gap-3.5 items-start glass rounded-xl p-4 border border-white/10">
              <span className="text-[#F97316] flex-shrink-0">→</span>
              <p className="text-sm text-[#F3F4F6]">{f}</p>
            </div>
          ))}
        </div>
      )}

      {data.quickWins.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">🟢 Quick Wins</h4>
          {data.quickWins.map((q, i) => <IssueRow key={i} text={q} type="good" />)}
        </div>
      )}

      {data.criticalIssues.length === 0 && data.warnings.length === 0 &&
       data.frictionPoints.length === 0 && data.quickWins.length === 0 && (
        <EmptySection message="No critical format issues flagged — scores above reflect overall quality." />
      )}
    </div>
  );
}

function AuditPanel({ data, mode }: { data: AuditResult; mode: "product" | "portfolio" }) {
  const isPortfolio = mode === "portfolio";
  const subLabels = isPortfolio
    ? [
        { label: "Achievement Clarity", color: "#FF4500" },
        { label: "Unique Value", color: "#8B5CF6" },
        { label: "Differentiation", color: "#F97316" },
        { label: "Target Role Fit", color: "#10B981" },
      ]
    : [
        { label: "Problem Clarity", color: "#FF4500" },
        { label: "Value Proposition", color: "#8B5CF6" },
        { label: "Differentiation", color: "#F97316" },
        { label: "Market Positioning", color: "#10B981" },
      ];

  const scores = [data.problemClarity, data.valueProp, data.differentiation, data.positioning];

  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={4} scale={1.01} className="glass-specular rounded-3xl p-8 border border-white/15 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <ScoreRing score={data.overallScore} size={135} />
        <div className="flex-1 space-y-4 w-full">
          <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-extrabold text-white">
            {isPortfolio ? "Candidate Hireability Audit" : "Overall Product Audit"}
          </h3>
          <p className="text-[#9CA3AF] text-sm leading-relaxed">{data.summary}</p>
          <div className="space-y-3 pt-1">
            {subLabels.map((l, i) => (
              <ScoreBar key={l.label} label={l.label} value={scores[i]} color={l.color} />
            ))}
          </div>
        </div>
      </TiltCard>

      <div className="grid md:grid-cols-2 gap-5">
        <TiltCard maxTilt={3} scale={1.01} className="glass rounded-2xl p-6 border border-emerald-500/20">
          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-1.5">
            <span>✅</span> Strengths Detected
          </h4>
          <ul className="space-y-3">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[#F3F4F6]">
                <span className="text-emerald-400 flex-shrink-0">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </TiltCard>

        <TiltCard maxTilt={3} scale={1.01} className="glass rounded-2xl p-6 border border-red-500/20">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-4 font-bold flex items-center gap-1.5">
            <span>❌</span> Flaws & Weak Points
          </h4>
          <ul className="space-y-3">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[#F3F4F6]">
                <span className="text-red-400 flex-shrink-0">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </TiltCard>
      </div>
    </div>
  );
}

function PersonasPanel({ data }: { data: PersonaResult[] }) {
  return (
    <div className="space-y-5 fade-in-up">
      {data.map((p, i) => (
        <TiltCard
          key={i}
          maxTilt={4}
          scale={1.01}
          className="glass-specular rounded-2xl p-6 border border-white/10 transition-all hover:border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10">{p.emoji}</span>
              <div>
                <h3 style={{ fontFamily: "Space Grotesk, sans-serif", color: p.color }} className="text-xl font-bold">
                  {p.persona}
                </h3>
                <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Simulated Recruiter Review</span>
              </div>
            </div>
            <ScoreRing score={p.score} size={64} color={p.color} />
          </div>

          <div className="space-y-3">
            <div className="glass rounded-xl p-4 border border-white/5">
              <span className="text-xs font-mono text-[#9CA3AF] uppercase tracking-wider block mb-1">First Impression</span>
              <p className="text-sm text-[#F3F4F6]">{p.firstImpression}</p>
            </div>
            <div className="glass rounded-xl p-4 border border-white/5" style={{ borderColor: `${p.color}30` }}>
              <span className="text-xs font-mono uppercase tracking-wider block mb-1 font-bold" style={{ color: p.color }}>
                Main Objection
              </span>
              <p className="text-sm text-[#F3F4F6]">{p.mainObjection}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-mono text-[#9CA3AF]">Verdict:</span>
              <span className="text-sm text-[#F3F4F6] italic">&ldquo;{p.verdict}&rdquo;</span>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  );
}

function SharkTankPanel({ data }: { data: SharkTankResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={3} scale={1.01} className="glass-specular rounded-3xl p-8 border border-red-500/30 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <span className="text-4xl block mb-3">🦈</span>
        <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold text-white mb-2">Funding Verdict</h3>
        <p className="text-xl text-red-400 font-semibold italic">&ldquo;{data.fundingVerdict}&rdquo;</p>
        <div className="mt-5 max-w-md mx-auto">
          <ScoreBar label="Funding Readiness" value={data.fundingReadiness} color="#EF4444" />
        </div>
      </TiltCard>

      <div className="space-y-3">
        <h4 className="text-xs font-mono text-[#9CA3AF] uppercase tracking-wider font-bold">💣 Tough Investor Questions</h4>
        {data.questions.map((q, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-white/10">
            <p className="text-white font-semibold mb-2">&ldquo;{q.question}&rdquo;</p>
            <p className="text-xs text-[#9CA3AF] font-mono"><span className="text-[#F97316]">↳ Why they ask: </span>{q.concern}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3 font-bold">⚠️ Market Risk</h4>
          <p className="text-sm text-[#F3F4F6] leading-relaxed">{data.marketRisk}</p>
        </div>
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 font-bold">🏰 Moat Analysis</h4>
          <p className="text-sm text-[#F3F4F6] leading-relaxed">{data.moatAnalysis}</p>
          <div className="mt-4">
            <ScoreBar label="Moat Score" value={data.moatScore} color="#8B5CF6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FuneralPanel({ data }: { data: FuneralResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={3} scale={1.01} className="glass-specular rounded-3xl p-8 border border-white/10 text-center relative overflow-hidden">
        <span className="text-5xl block mb-4 animate-bounce">⚰️</span>
        <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold text-white mb-2">Product Funeral™</h3>
        <div className="inline-block border border-white/10 rounded-xl px-6 py-2.5 my-3 bg-black/40">
          <p className="text-[#9CA3AF] text-xs font-mono">TIME OF DEATH</p>
          <p className="text-white font-semibold">{data.timeOfDeath}</p>
        </div>
        <p className="mt-3 text-[#F97316] italic text-lg">&ldquo;{data.epitaph}&rdquo;</p>
      </TiltCard>

      <div className="glass rounded-2xl p-6 border border-red-500/20">
        <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3 font-bold">💀 Cause of Death</h4>
        <p className="text-sm text-[#F3F4F6] leading-relaxed">{data.causeOfDeath}</p>
      </div>

      <div className="glass rounded-2xl p-6 border border-white/10">
        <ScoreBar label="Survival Chance (if nothing changes)" value={data.survivalChance} color={data.survivalChance < 30 ? "#EF4444" : data.survivalChance < 60 ? "#F59E0B" : "#10B981"} />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono text-[#9CA3AF] uppercase tracking-wider font-bold">📡 Missed Warning Signals</h4>
        {data.missedSignals.map((s, i) => (
          <div key={i} className="flex gap-3.5 items-start glass rounded-xl p-4 border border-white/10">
            <span className="text-red-400 flex-shrink-0 font-mono text-sm font-bold">0{i + 1}</span>
            <p className="text-sm text-[#F3F4F6]">{s}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">🛡️ Prevention Plan</h4>
        {data.preventionPlan.map((p, i) => (
          <IssueRow key={i} text={p} type="good" />
        ))}
      </div>
    </div>
  );
}

function ActionPlanPanel({ data }: { data: ActionPlanResult }) {
  const cols = [
    { key: "thisWeek" as const, label: "This Week (Quick Wins)", color: "#FF4500", icon: "⚡" },
    { key: "thisSprint" as const, label: "This Sprint (Major Fixes)", color: "#8B5CF6", icon: "🏃" },
    { key: "thisQuarter" as const, label: "This Quarter (Career Growth)", color: "#00F2FF", icon: "🎯" },
  ];
  return (
    <div className="fade-in-up">
      <div className="grid md:grid-cols-3 gap-5">
        {cols.map((col) => (
          <TiltCard key={col.key} maxTilt={4} scale={1.01} className="glass rounded-2xl p-6 border border-white/10 flex flex-col">
            <h4 style={{ fontFamily: "Space Grotesk, sans-serif", color: col.color }} className="font-bold mb-4 flex items-center gap-2 text-base">
              <span>{col.icon}</span>
              <span>{col.label}</span>
            </h4>
            <div className="space-y-3 flex-1">
              {(data[col.key].length > 0 ? data[col.key] : [{ action: "No actions required for this timeframe.", impact: "—", effort: "—" }]).map((item, i) => (
                <div key={i} className="glass rounded-xl p-4 border border-white/5 space-y-2.5">
                  <p className="text-sm text-[#F3F4F6] leading-relaxed">{item.action}</p>
                  <div className="flex gap-2">
                    <Tag type={item.impact === "High" ? "critical" : item.impact === "Medium" ? "warning" : "info"} label={`Impact: ${item.impact}`} />
                    <Tag type={item.effort === "Low" ? "good" : item.effort === "Medium" ? "warning" : "critical"} label={`Effort: ${item.effort}`} />
                  </div>
                </div>
              ))}
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}

function PortfolioPanel({ data }: { data: PortfolioResult }) {
  return (
    <div className="space-y-6 fade-in-up">
      <TiltCard maxTilt={4} scale={1.01} className="glass-specular rounded-3xl p-8 border border-white/15 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <ScoreRing score={data.overallScore} size={135} color="#8B5CF6" />
        <div className="flex-1 space-y-3.5 w-full">
          <h3 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-extrabold text-white">
            Hiring Manager Assessment
          </h3>
          <p className="text-[#9CA3AF] text-sm leading-relaxed">{data.summary}</p>
          <div className="space-y-2.5 pt-1">
            <ScoreBar label="First Impression" value={data.firstImpression} color="#FF4500" />
            <ScoreBar label="Case Study / Project Depth" value={data.caseStudyDepth} color="#8B5CF6" />
            <ScoreBar label="Design & Typography Taste" value={data.designTaste} color="#F97316" />
            <ScoreBar label="Proof of Competence" value={data.skillProof} color="#10B981" />
            <ScoreBar label="Contact & Hiring CTA" value={data.ctaScore} color="#00F2FF" />
          </div>
        </div>
      </TiltCard>

      <TiltCard maxTilt={3} scale={1.01} className="glass rounded-2xl p-6 border border-purple-500/30">
        <h4 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-2 font-bold">💼 Recruiter Verdict</h4>
        <p className="text-[#F3F4F6] italic text-base leading-relaxed">&ldquo;{data.recruiterVerdict}&rdquo;</p>
      </TiltCard>

      <div className="space-y-3">
        <h4 className="text-xs font-mono text-red-400 uppercase tracking-wider font-bold">Top Priority Fixes</h4>
        {data.topIssues.map((issue, i) => <IssueRow key={i} text={issue} type="warning" />)}
      </div>
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────
function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 fade-in-up">
      <div className="flex gap-2 overflow-x-auto">
        {[...Array(6)].map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-28 rounded-full flex-shrink-0" />
        ))}
      </div>
      <div className="glass rounded-3xl p-8 border border-white/10 flex flex-col md:flex-row gap-8 items-start">
        <SkeletonBlock className="w-[135px] h-[135px] rounded-full" />
        <div className="flex-1 space-y-4 w-full">
          <SkeletonBlock className="h-8 w-48" />
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
    </div>
  );
}

// ── Tabs config ────────────────────────────────────────────────────────────
const ALL_TABS = [
  { id: "audit",     label: "🎯 Audit",       color: "#FF4500", productOnly: false },
  { id: "ux",        label: "👁️ Layout",      color: "#8B5CF6", productOnly: false },
  { id: "roast",     label: "🎤 Roast",       color: "#EF4444", productOnly: false },
  { id: "personas",  label: "🎭 Personas",    color: "#F97316", productOnly: false },
  { id: "sharktank", label: "🦈 Shark Tank",  color: "#EF4444", productOnly: true },
  { id: "funeral",   label: "⚰️ Funeral",     color: "#71717A", productOnly: true },
  { id: "actions",   label: "✅ Action Plan", color: "#10B981", productOnly: false },
  { id: "portfolio", label: "💼 Portfolio",   color: "#00F2FF", productOnly: false },
];

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

  const fetchNarrative = useCallback(() => {
    if (!id) return;
    setLoadingRoast(true);
    setAiRoastText("");

    const fallbackNarrative = () => {
      fetch("/api/roast?type=narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          mode: result?.mode || "portfolio",
          roastLevel: result?.roastLevel || "medium",
          scrapedText: result?.scrapedText || "",
          description: result?.description || "",
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.aiRoast) {
            setAiRoastText(d.aiRoast);
            setResult((prev) => {
              if (!prev) return prev;
              const updated = { ...prev, aiRoast: d.aiRoast };
              sessionStorage.setItem(`roast_${id}`, JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch((e) => {
          console.error("Narrative generation error:", e);
          setAiRoastText("This CV has all the buzzwords of a senior executive and all the measurable impact of a spectator.\n\nFirst off, your experience section is suffering from an acute allergy to numbers. You 'collaborated with cross-functional teams' and 'spearheaded initiatives' — but did you actually move a single KPI, or did you just attend meetings and nod attentively?\n\nVerdict: Stop describing what your team did and start owning what YOU delivered. Add numbers to your top achievements, sharpen the pitch, and make hiring managers actually stop scrolling.");
        })
        .finally(() => setLoadingRoast(false));
    };

    fetch(`/api/roast?id=${id}&type=narrative`)
      .then((res) => {
        if (!res.ok) throw new Error("Narrative fetch failed");
        return res.json();
      })
      .then((data) => {
        if (data.aiRoast && !data.aiRoast.includes("unavailable")) {
          setAiRoastText(data.aiRoast);
          setResult((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, aiRoast: data.aiRoast };
            sessionStorage.setItem(`roast_${id}`, JSON.stringify(updated));
            return updated;
          });
          setLoadingRoast(false);
        } else {
          fallbackNarrative();
        }
      })
      .catch(() => {
        fallbackNarrative();
      });
  }, [id, result]);

  // Sync state with loaded result
  useEffect(() => {
    if (result?.aiRoast) {
      setAiRoastText(result.aiRoast);
    }
  }, [result]);

  // Lazy generation when "roast" tab is selected
  useEffect(() => {
    if (activeTab === "roast" && !aiRoastText && !loadingRoast && id) {
      fetchNarrative();
    }
  }, [activeTab, aiRoastText, loadingRoast, id, fetchNarrative]);

  useEffect(() => {
    async function load() {
      // 1. sessionStorage — full result from same browser session
      const cached = sessionStorage.getItem(`roast_${id}`);
      if (cached) {
        try {
          setResult(JSON.parse(cached));
          setLoading(false);
          return;
        } catch { /* fall through */ }
      }

      // 2. URL hash — shared links
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const hash = window.location.hash.slice(1);
          const decoded = JSON.parse(decodeURIComponent(escape(atob(hash))));
          setResult(decoded);
          sessionStorage.setItem(`roast_${id}`, JSON.stringify(decoded));
          setLoading(false);
          return;
        } catch { /* fall through */ }
      }

      // 3. Fallback: fetch from API
      try {
        const res = await fetch(`/api/roast?id=${id}`);
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          setResult(data.result);
          sessionStorage.setItem(`roast_${id}`, JSON.stringify(data.result));
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
        backgroundColor: "#06060A",
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (_, element) => {
          element.style.setProperty("background", "#06060A", "important");
          element.style.setProperty("padding", "32px", "important");
          element.style.setProperty("border-radius", "24px", "important");

          const headings = element.querySelectorAll("h1, h2, h3, h4");
          headings.forEach((h: any) => h.style.setProperty("color", "#FFFFFF", "important"));

          const paragraphs = element.querySelectorAll("p");
          paragraphs.forEach((p: any) => p.style.setProperty("color", "#F3F4F6", "important"));
        }
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

  const visibleTabs = ALL_TABS.filter(t => {
    if (t.productOnly) return result?.mode === "product";
    if (t.id === "portfolio") return result?.mode === "portfolio";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#06060A] text-[#F3F4F6]">
        <AmbientBackground />
        <header className="glass-specular border-b border-white/[0.08] relative z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
            <span className="text-2xl">🔥</span>
            <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-xl font-bold grad-text ml-2">
              RoastMeBuddy!
            </span>
          </div>
        </header>
        <div className="text-center pt-16 pb-8 relative z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl glass border border-white/20 flex items-center justify-center text-4xl mb-6 animate-bounce shadow-[0_0_40px_rgba(255,69,0,0.3)]">
            ⚡
          </div>
          <h2 style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            {result?.mode === "portfolio" ? "Roasting your CV…" : "Roasting your product…"}
          </h2>
          <p className="text-[#9CA3AF] font-mono text-sm">Evaluating structure, achievements, and impact across 6 dimensions</p>
        </div>
        <div className="relative z-10">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#06060A] text-[#F3F4F6] relative">
        <AmbientBackground />
        <span className="text-6xl relative z-10 animate-pulse">💀</span>
        <p style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-2xl font-bold text-white relative z-10">Roast not found</p>
        <Link href="/" className="btn-primary px-6 py-3 rounded-full relative z-10 font-bold">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06060A] text-[#F3F4F6]">
      <AmbientBackground />

      {/* Header Navbar */}
      <header className="glass-specular border-b border-white/[0.08] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">🔥</span>
            <span style={{ fontFamily: "Space Grotesk, sans-serif" }} className="text-lg font-extrabold grad-text">
              RoastMeBuddy!
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {result.roastLevel && (
              <span
                className="text-xs font-mono font-bold px-3 py-1 rounded-full border shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                style={{
                  color: result.roastLevel === "brutal" ? "#EF4444" : result.roastLevel === "hard" ? "#F97316" : result.roastLevel === "medium" ? "#F59E0B" : "#10B981",
                  borderColor: result.roastLevel === "brutal" ? "rgba(239,68,68,0.4)" : result.roastLevel === "hard" ? "rgba(249,115,22,0.4)" : result.roastLevel === "medium" ? "rgba(245,158,11,0.4)" : "rgba(16,185,129,0.4)",
                  background: result.roastLevel === "brutal" ? "rgba(239,68,68,0.12)" : result.roastLevel === "hard" ? "rgba(249,115,22,0.12)" : result.roastLevel === "medium" ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                }}
              >
                {result.roastLevel === "brutal" ? "💀🔥" : result.roastLevel === "hard" ? "🌶️🌶️🌶️" : result.roastLevel === "medium" ? "🌶️🌶️" : "🌶️"} {result.roastLevel.toUpperCase()}
              </span>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#9CA3AF] px-3 py-1 rounded-full glass border border-white/10">
              <span>Overall:</span>
              <span className="font-extrabold text-sm text-[#FF8C00]">{result.audit.overallScore}/100</span>
            </div>
            <button onClick={copyLink} className="btn-primary px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              {copied ? "✅ Copied!" : "🔗 Share"}
            </button>
            {activeTab === "roast" && (
              <button
                onClick={downloadImage}
                disabled={downloading}
                className="btn-ghost px-4 py-1.5 rounded-full text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Exporting…</span>
                  </>
                ) : (
                  <span>📷 Export</span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Navigation Tabs with Smooth Glass Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-8 scrollbar-hide">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs sm:text-sm font-mono transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "tab-active font-bold"
                  : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.id === "ux" && result.mode === "portfolio" ? "📄 CV Layout" : tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Panel Content */}
        <div ref={captureRef} className="rounded-3xl">
          {activeTab === "audit"     && <AuditPanel data={result.audit} mode={result.mode} />}
          {activeTab === "ux"        && <UXPanel data={result.ux} mode={result.mode} />}
          {activeTab === "roast"     && <RoastPanel text={aiRoastText} loading={loadingRoast} onRetry={fetchNarrative} />}
          {activeTab === "personas"  && <PersonasPanel data={result.personas} />}
          {activeTab === "sharktank" && result.sharkTank && <SharkTankPanel data={result.sharkTank} />}
          {activeTab === "funeral"   && result.funeral && <FuneralPanel data={result.funeral} />}
          {activeTab === "actions"   && <ActionPlanPanel data={result.actionPlan} />}
          {activeTab === "portfolio" && result.portfolio && <PortfolioPanel data={result.portfolio} />}
        </div>
      </div>
    </div>
  );
}
