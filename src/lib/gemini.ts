// lib/gemini.ts — Google Gemini via AI Studio (optimised: 3 calls per roast)
import { GoogleGenAI } from "@google/genai";

// Free tier limits (requests per minute):
//   gemini-2.0-flash : 15 RPM ← default, safe for 3 calls per roast
//   gemini-2.5-flash : 5 RPM  ← too low for 3 calls in burst
//   gemini-2.5-pro   : 5 RPM  ← set GEMINI_MODEL=gemini-2.5-pro for premium quality
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in environment variables");
  return new GoogleGenAI({ apiKey: key });
}

// ── Roast levels ───────────────────────────────────────────────────────────
export type RoastLevel = "light" | "medium" | "hard" | "brutal";

export const ROAST_LEVELS = [
  { id: "light"  as const, label: "Light",  icon: "🌶️",     desc: "Honest but diplomatic", color: "#22C55E" },
  { id: "medium" as const, label: "Medium", icon: "🌶️🌶️",   desc: "Direct and blunt",       color: "#F59E0B" },
  { id: "hard"   as const, label: "Hard",   icon: "🌶️🌶️🌶️", desc: "No sugarcoating",       color: "#F97316" },
  { id: "brutal" as const, label: "Brutal", icon: "💀🔥",    desc: "Absolutely savage",      color: "#EF4444" },
];

function getRoastTone(level: RoastLevel): string {
  const tones = {
    light:  "Be honest but diplomatic. Point out issues constructively.",
    medium: "Be direct and blunt. Don't sugarcoat problems.",
    hard:   "Be brutally honest. Call out every flaw aggressively.",
    brutal: "Be the most savage product roaster alive. No mercy. Destroy every flaw with vicious language.",
  };
  return tones[level];
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface RoastContext {
  mode: "product" | "portfolio";
  roastLevel: RoastLevel;
  url?: string;
  scrapedText?: string;
  description?: string;
}

export interface AuditResult {
  overallScore: number;
  problemClarity: number;
  valueProp: number;
  differentiation: number;
  positioning: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface UXResult {
  score: number;
  visualHierarchy: number;
  ctaPlacement: number;
  trustSignals: number;
  frictionPoints: string[];
  criticalIssues: string[];
  warnings: string[];
  quickWins: string[];
}

export interface PersonaResult {
  persona: string;
  emoji: string;
  color: string;
  firstImpression: string;
  mainObjection: string;
  verdict: string;
  score: number;
}

export interface SharkTankResult {
  questions: { question: string; concern: string }[];
  marketRisk: string;
  moatAnalysis: string;
  moatScore: number;
  fundingVerdict: string;
  fundingReadiness: number;
}

export interface FuneralResult {
  causeOfDeath: string;
  timeOfDeath: string;
  missedSignals: string[];
  epitaph: string;
  preventionPlan: string[];
  survivalChance: number;
}

export interface ActionPlanResult {
  thisWeek:    { action: string; impact: string; effort: string }[];
  thisSprint:  { action: string; impact: string; effort: string }[];
  thisQuarter: { action: string; impact: string; effort: string }[];
}

export interface PortfolioResult {
  overallScore: number;
  firstImpression: number;
  caseStudyDepth: number;
  designTaste: number;
  skillProof: number;
  ctaScore: number;
  summary: string;
  topIssues: string[];
  recruiterVerdict: string;
}

export interface FullRoastResult {
  audit: AuditResult;
  ux: UXResult;
  personas: PersonaResult[];
  sharkTank: SharkTankResult;
  funeral: FuneralResult;
  actionPlan: ActionPlanResult;
  roastLevel: RoastLevel;
  aiRoast: string;
  portfolio?: PortfolioResult;
  scrapedText?: string;
  description?: string;
}

// ── Core call helper ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(
  prompt: string,
  opts: { jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const { jsonMode = true, maxTokens = 3000 } = opts;
  const ai = getClient();
  const MAX_RETRIES = 1;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });
      return response.text?.trim() ?? "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
      if (is429 && attempt < MAX_RETRIES) {
        const retryMatch = msg.match(/retry[^\d]*(\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500
          : Math.min(6000 * Math.pow(2, attempt), 32000);
        console.warn(`Gemini 429 — waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini API: rate limit exceeded after retries");
}

// ── Normalizers ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ns(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((i) =>
    typeof i === "string" ? i :
    i && typeof i === "object" ? (i.issue || i.suggestion || i.description || i.text || JSON.stringify(i)) :
    String(i)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAudit(d: any): AuditResult {
  return {
    overallScore:    Number(d?.overallScore)    || 0,
    problemClarity:  Number(d?.problemClarity)  || 0,
    valueProp:       Number(d?.valueProp)        || 0,
    differentiation: Number(d?.differentiation) || 0,
    positioning:     Number(d?.positioning)     || 0,
    summary:         String(d?.summary          || ""),
    strengths:       ns(d?.strengths  || []),
    weaknesses:      ns(d?.weaknesses || []),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUX(d: any): UXResult {
  return {
    score:           Number(d?.score)           || 0,
    visualHierarchy: Number(d?.visualHierarchy) || 0,
    ctaPlacement:    Number(d?.ctaPlacement)    || 0,
    trustSignals:    Number(d?.trustSignals)    || 0,
    frictionPoints:  ns(d?.frictionPoints  || []),
    criticalIssues:  ns(d?.criticalIssues  || []),
    warnings:        ns(d?.warnings        || []),
    quickWins:       ns(d?.quickWins       || []),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFuneral(d: any): FuneralResult {
  return {
    causeOfDeath:   String(d?.causeOfDeath  || ""),
    timeOfDeath:    String(d?.timeOfDeath   || ""),
    missedSignals:  ns(d?.missedSignals  || []),
    epitaph:        String(d?.epitaph       || ""),
    preventionPlan: ns(d?.preventionPlan || []),
    survivalChance: Number(d?.survivalChance) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePortfolio(d: any): PortfolioResult {
  return {
    overallScore:    Number(d?.overallScore)    || 0,
    firstImpression: Number(d?.firstImpression) || 0,
    caseStudyDepth:  Number(d?.caseStudyDepth)  || 0,
    designTaste:     Number(d?.designTaste)     || 0,
    skillProof:      Number(d?.skillProof)      || 0,
    ctaScore:        Number(d?.ctaScore)        || 0,
    summary:         String(d?.summary          || ""),
    topIssues:       ns(d?.topIssues || []),
    recruiterVerdict:String(d?.recruiterVerdict || ""),
  };
}

function parseJSON<T>(text: string, fallback: T): T {
  try { return JSON.parse(text); } catch { /* try fence strip */ }
  try {
    const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (m) return JSON.parse(m[1].trim());
  } catch { /* fall through */ }
  return fallback;
}

// ── Context helper ─────────────────────────────────────────────────────────
// Shared, trimmed context string used across all batch calls.
// One scrape → one context string → passed to all prompts.
function buildContext(ctx: RoastContext, maxChars = 2500): string {
  return [
    ctx.url ? `URL: ${ctx.url}` : "",
    ctx.scrapedText ? `Page content:\n${ctx.scrapedText.slice(0, maxChars)}` : "",
    ctx.description ? `Description: ${ctx.description}` : "",
  ].filter(Boolean).join("\n\n");
}

// ── BATCH 1: Mega-Batch (Audit + UX + Personas + SharkTank + Funeral + ActionPlan) — 1 API call ──
// Merges all structured reports into a single, clean JSON structure to avoid timeout limits.
export async function runMegaBatch(ctx: RoastContext): Promise<{
  audit: AuditResult;
  ux: UXResult;
  personas: PersonaResult[];
  sharkTank: SharkTankResult;
  funeral: FuneralResult;
  actionPlan: ActionPlanResult;
}> {
  const isPortfolio = ctx.mode === "portfolio";
  const personaDefs = isPortfolio
    ? [{ name: "Recruiter", emoji: "🔍", color: "#FF4500" }, { name: "Hiring Manager", emoji: "💼", color: "#8B5CF6" }, { name: "Fellow Designer", emoji: "🎨", color: "#F97316" }]
    : [{ name: "First-Time Visitor", emoji: "👀", color: "#FF4500" }, { name: "Founder", emoji: "🚀", color: "#8B5CF6" }, { name: "Investor", emoji: "💰", color: "#F97316" }];

  const tone = ctx.roastLevel;
  const investorTone = tone === "brutal" ? "the most RUTHLESS investors alive — destroy the pitch"
    : tone === "hard" ? "aggressive investors who tear apart weak pitches"
    : tone === "medium" ? "tough investors asking hard questions"
    : "thoughtful investors giving fair feedback";

  const funeralTone = tone === "brutal" ? "The product was murdered by its own incompetence. Be devastatingly savage."
    : tone === "hard" ? "The product died a horrible death. Be brutally honest."
    : tone === "medium" ? "The product failed. Write a direct autopsy."
    : "The product has failed. Write a thoughtful post-mortem.";

  const prompt = `You are a world-class product auditor, UX researcher, startup investor, and strategist. ${getRoastTone(ctx.roastLevel)}

Analyse the following ${ctx.mode} across multiple dimensions simultaneously and return a SINGLE JSON object.

${buildContext(ctx)}

Return ONLY this JSON structure (no markdown fences, no extra text):
{
  "audit": {
    "overallScore": 0, "problemClarity": 0, "valueProp": 0, "differentiation": 0, "positioning": 0,
    "summary": "", "strengths": [], "weaknesses": []
  },
  "ux": {
    "score": 0, "visualHierarchy": 0, "ctaPlacement": 0, "trustSignals": 0,
    "frictionPoints": [], "criticalIssues": [], "warnings": [], "quickWins": []
  },
  "personas": [
    {"persona":"${personaDefs[0].name}","emoji":"${personaDefs[0].emoji}","color":"${personaDefs[0].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},
    {"persona":"${personaDefs[1].name}","emoji":"${personaDefs[1].emoji}","color":"${personaDefs[1].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},
    {"persona":"${personaDefs[2].name}","emoji":"${personaDefs[2].emoji}","color":"${personaDefs[2].color}","firstImpression":"","mainObjection":"","verdict":"","score":0}
  ],
  "sharkTank": {
    "questions": [{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""}],
    "marketRisk": "", "moatAnalysis": "", "moatScore": 0, "fundingVerdict": "", "fundingReadiness": 0
  },
  "funeral": {
    "causeOfDeath": "", "timeOfDeath": "", "missedSignals": [], "epitaph": "", "preventionPlan": [], "survivalChance": 0
  },
  "actionPlan": {
    "thisWeek":    [{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"}],
    "thisSprint":  [{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"}],
    "thisQuarter": [{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"}]
  }
}`;

  const raw = await callGemini(prompt, { jsonMode: true, maxTokens: 4000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = parseJSON<any>(raw, {});

  return {
    audit: normalizeAudit(d?.audit || {}),
    ux: normalizeUX(d?.ux || {}),
    personas: Array.isArray(d?.personas) ? d.personas : personaDefs.map(p => ({
      persona: p.name, emoji: p.emoji, color: p.color,
      firstImpression: "N/A", mainObjection: "N/A", verdict: "N/A", score: 50,
    })),
    sharkTank: d?.sharkTank ? {
      questions: Array.isArray(d.sharkTank.questions) ? d.sharkTank.questions : [],
      marketRisk: String(d.sharkTank.marketRisk || ""),
      moatAnalysis: String(d.sharkTank.moatAnalysis || ""),
      moatScore: Number(d.sharkTank.moatScore) || 0,
      fundingVerdict: String(d.sharkTank.fundingVerdict || ""),
      fundingReadiness: Number(d.sharkTank.fundingReadiness) || 0,
    } : { questions: [], marketRisk: "", moatAnalysis: "", moatScore: 0, fundingVerdict: "", fundingReadiness: 0 },
    funeral: normalizeFuneral(d?.funeral || {}),
    actionPlan: d?.actionPlan ? {
      thisWeek: Array.isArray(d.actionPlan.thisWeek) ? d.actionPlan.thisWeek : [],
      thisSprint: Array.isArray(d.actionPlan.thisSprint) ? d.actionPlan.thisSprint : [],
      thisQuarter: Array.isArray(d.actionPlan.thisQuarter) ? d.actionPlan.thisQuarter : [],
    } : { thisWeek: [], thisSprint: [], thisQuarter: [] },
  };
}

// ── CALL 3: AI Roast narrative — 1 API call (plain text) ──────────────────
export async function generateAiroast(ctx: RoastContext): Promise<string> {
  const toneMap = {
    light:  "Be witty and observational. Like a clever friend at a coffee shop.",
    medium: "Be sharp and sarcastic. Good-natured roasting with real bite.",
    hard:   "Be savage and hilarious. Destroy it with brutal but funny insults.",
    brutal: "You are THE most savage roast master alive. Vicious, hilarious, devastating. No filter. Profanity welcome.",
  };

  const prompt = `${toneMap[ctx.roastLevel]}

ROAST this ${ctx.mode} in 3-5 paragraphs — funny opening, tear into specific flaws (mention actual content), killer punchline.
${buildContext(ctx, 1200)}

Return ONLY the roast text. No JSON, no labels, no formatting.`;

  const text = await callGemini(prompt, { jsonMode: false, maxTokens: 1200 });
  return text || "Could not generate roast. The product was so boring even the AI fell asleep.";
}

// ── CALL 4 (optional): Portfolio — only runs when mode=portfolio ───────────
export async function portfolioRoast(ctx: RoastContext): Promise<PortfolioResult> {
  const prompt = `You are a Hiring Manager who has seen thousands of portfolios. ${getRoastTone(ctx.roastLevel)}
${buildContext(ctx, 2000)}

Return ONLY this JSON:
{"overallScore":0,"firstImpression":0,"caseStudyDepth":0,"designTaste":0,"skillProof":0,"ctaScore":0,"summary":"","topIssues":[],"recruiterVerdict":""}`;

  const raw = await callGemini(prompt, { jsonMode: true, maxTokens: 1500 });
  return normalizePortfolio(parseJSON(raw, {}));
}

// ── Backwards-compat exports (used by existing pages) ─────────────────────
// These are kept for compatibility but are no longer called by the API route.
export async function auditProduct(ctx: RoastContext): Promise<AuditResult> {
  return (await runMegaBatch(ctx)).audit;
}
export async function auditUX(ctx: RoastContext): Promise<UXResult> {
  return (await runMegaBatch(ctx)).ux;
}
export async function simulatePersonas(ctx: RoastContext): Promise<PersonaResult[]> {
  return (await runMegaBatch(ctx)).personas;
}
export async function sharkTankMode(ctx: RoastContext): Promise<SharkTankResult> {
  return (await runMegaBatch(ctx)).sharkTank;
}
export async function productFuneral(ctx: RoastContext): Promise<FuneralResult> {
  return (await runMegaBatch(ctx)).funeral;
}
export async function buildActionPlan(_: Partial<FullRoastResult>): Promise<ActionPlanResult> {
  return { thisWeek: [], thisSprint: [], thisQuarter: [] };
}
