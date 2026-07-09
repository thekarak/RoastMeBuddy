// lib/gemini.ts — Google Gemini via AI Studio
import { GoogleGenAI } from "@google/genai";

// gemini-2.0-flash : 15 RPM free tier — recommended for production
// gemini-2.5-flash : 5 RPM free tier  — hits quota with 7 calls per roast
// gemini-2.5-pro   : 5 RPM free tier  — set GEMINI_MODEL=gemini-2.5-pro to use
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in environment variables");
  return new GoogleGenAI({ apiKey: key });
}

// ── Roast levels ───────────────────────────────────────────────────────────
export type RoastLevel = "light" | "medium" | "hard" | "brutal";

export const ROAST_LEVELS = [
  { id: "light" as const,  label: "Light",  icon: "🌶️",    desc: "Honest but diplomatic", color: "#22C55E" },
  { id: "medium" as const, label: "Medium", icon: "🌶️🌶️",  desc: "Direct and blunt",       color: "#F59E0B" },
  { id: "hard" as const,   label: "Hard",   icon: "🌶️🌶️🌶️",desc: "No sugarcoating",       color: "#F97316" },
  { id: "brutal" as const, label: "Brutal", icon: "💀🔥",   desc: "Absolutely savage",      color: "#EF4444" },
];

function getRoastTone(level: RoastLevel): string {
  switch (level) {
    case "light":  return "Be honest but diplomatic. Use encouraging language while pointing out areas for improvement. Keep it professional and supportive.";
    case "medium": return "Be direct and honest. Point out problems clearly without being mean. Don't be afraid to be critical.";
    case "hard":   return "Be brutally honest. Don't hold back. Call out every flaw with strong language. Be aggressive and confrontational.";
    case "brutal": return "Be the most savage, ruthless product roaster on the internet. No mercy. Destroy every flaw with vicious language. Use harsh words like 'pathetic', 'embarrassing', 'disaster'. Make it sting.";
  }
}

function getPersonaTone(level: RoastLevel): string {
  switch (level) {
    case "light":  return "Each persona is honest but constructive.";
    case "medium": return "Each persona is direct and opinionated. Don't hold back on criticism.";
    case "hard":   return "Each persona is a HARSH critic who tears the product apart with brutal honesty.";
    case "brutal": return "Each persona is SAVAGE and RUTHLESS — use vicious language, be entertaining and devastating. Think comedy roast level brutal.";
  }
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
  thisWeek: { action: string; impact: string; effort: string }[];
  thisSprint: { action: string; impact: string; effort: string }[];
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
}

// ── Core call helper ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  const ai = getClient();
  const MAX_RETRIES = 4;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: jsonMode ? 4096 : 8192,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });
      return response.text?.trim() ?? "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

      if (is429 && attempt < MAX_RETRIES) {
        // Extract retry delay from error message if present, otherwise exponential backoff
        const retryMatch = msg.match(/retry[^\d]*(\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500
          : Math.min(5000 * Math.pow(2, attempt), 30000);
        console.warn(`Gemini 429 — waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
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
function normalizeStrings(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      return item.issue || item.suggestion || item.description || item.text || JSON.stringify(item);
    }
    return String(item);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAuditResult(data: any): AuditResult {
  return {
    overallScore:   Number(data.overallScore)   || 0,
    problemClarity: Number(data.problemClarity) || 0,
    valueProp:      Number(data.valueProp)       || 0,
    differentiation:Number(data.differentiation)|| 0,
    positioning:    Number(data.positioning)    || 0,
    summary:    String(data.summary || ""),
    strengths:  normalizeStrings(data.strengths),
    weaknesses: normalizeStrings(data.weaknesses),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUXResult(data: any): UXResult {
  return {
    score:           Number(data.score)          || 0,
    visualHierarchy: Number(data.visualHierarchy)|| 0,
    ctaPlacement:    Number(data.ctaPlacement)   || 0,
    trustSignals:    Number(data.trustSignals)   || 0,
    frictionPoints:  normalizeStrings(data.frictionPoints),
    criticalIssues:  normalizeStrings(data.criticalIssues),
    warnings:        normalizeStrings(data.warnings),
    quickWins:       normalizeStrings(data.quickWins),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFuneralResult(data: any): FuneralResult {
  return {
    causeOfDeath:  String(data.causeOfDeath  || ""),
    timeOfDeath:   String(data.timeOfDeath   || ""),
    missedSignals: normalizeStrings(data.missedSignals),
    epitaph:       String(data.epitaph       || ""),
    preventionPlan:normalizeStrings(data.preventionPlan),
    survivalChance:Number(data.survivalChance)|| 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePortfolioResult(data: any): PortfolioResult {
  return {
    overallScore:   Number(data.overallScore)    || 0,
    firstImpression:Number(data.firstImpression) || 0,
    caseStudyDepth: Number(data.caseStudyDepth)  || 0,
    designTaste:    Number(data.designTaste)     || 0,
    skillProof:     Number(data.skillProof)      || 0,
    ctaScore:       Number(data.ctaScore)        || 0,
    summary:        String(data.summary          || ""),
    topIssues:      normalizeStrings(data.topIssues),
    recruiterVerdict:String(data.recruiterVerdict|| ""),
  };
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (m) return JSON.parse(m[1].trim());
    } catch { /* fall through */ }
    return fallback;
  }
}

// ── AI Engines ─────────────────────────────────────────────────────────────

export async function auditProduct(ctx: RoastContext): Promise<AuditResult> {
  const prompt = `You are auditing a ${ctx.mode}. ${getRoastTone(ctx.roastLevel)}
Give specific scores 0-100 and identify real problems. Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 2000) || "Not provided"}

Respond ONLY with this JSON (no markdown, no extra text):
{"overallScore":0,"problemClarity":0,"valueProp":0,"differentiation":0,"positioning":0,"summary":"","strengths":[],"weaknesses":[]}`;

  const raw = await callGemini(prompt);
  return normalizeAuditResult(parseJSON<AuditResult>(raw, {
    overallScore: 50, problemClarity: 50, valueProp: 50, differentiation: 50, positioning: 50,
    summary: "Analysis unavailable.", strengths: [], weaknesses: [],
  }));
}

export async function auditUX(ctx: RoastContext): Promise<UXResult> {
  const prompt = `You are a UX + Conversion Rate expert auditing a ${ctx.mode}. ${getRoastTone(ctx.roastLevel)}
Find every friction point, every buried CTA, every trust gap. Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 2000) || "Not provided"}

Respond ONLY with this JSON:
{"score":0,"visualHierarchy":0,"ctaPlacement":0,"trustSignals":0,"frictionPoints":[],"criticalIssues":[],"warnings":[],"quickWins":[]}`;

  const raw = await callGemini(prompt);
  return normalizeUXResult(parseJSON<UXResult>(raw, {
    score: 50, visualHierarchy: 50, ctaPlacement: 50, trustSignals: 50,
    frictionPoints: [], criticalIssues: [], warnings: [], quickWins: [],
  }));
}

export async function simulatePersonas(ctx: RoastContext): Promise<PersonaResult[]> {
  const isPortfolio = ctx.mode === "portfolio";
  const personas = isPortfolio
    ? [
        { name: "Recruiter",       emoji: "🔍", color: "#FF4500" },
        { name: "Hiring Manager",  emoji: "💼", color: "#8B5CF6" },
        { name: "Fellow Designer", emoji: "🎨", color: "#F97316" },
      ]
    : [
        { name: "First-Time Visitor", emoji: "👀", color: "#FF4500" },
        { name: "Founder",            emoji: "🚀", color: "#8B5CF6" },
        { name: "Investor",           emoji: "💰", color: "#F97316" },
      ];

  const prompt = `You simulate 3 distinct user personas reviewing a ${ctx.mode}. ${getPersonaTone(ctx.roastLevel)}
Each persona must have a unique voice and different objections. Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON array (exactly 3 items):
[{"persona":"${personas[0].name}","emoji":"${personas[0].emoji}","color":"${personas[0].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},{"persona":"${personas[1].name}","emoji":"${personas[1].emoji}","color":"${personas[1].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},{"persona":"${personas[2].name}","emoji":"${personas[2].emoji}","color":"${personas[2].color}","firstImpression":"","mainObjection":"","verdict":"","score":0}]`;

  const raw = await callGemini(prompt);
  return parseJSON<PersonaResult[]>(raw, personas.map((p) => ({
    persona: p.name, emoji: p.emoji, color: p.color,
    firstImpression: "Analysis unavailable.", mainObjection: "N/A", verdict: "N/A", score: 50,
  })));
}

export async function sharkTankMode(ctx: RoastContext): Promise<SharkTankResult> {
  const investorTone = ctx.roastLevel === "brutal"
    ? "You are the most RUTHLESS Shark Tank investors — destroy the pitch with vicious questions. No mercy."
    : ctx.roastLevel === "hard"
    ? "You are aggressive Shark Tank investors who tear apart weak pitches mercilessly."
    : ctx.roastLevel === "medium"
    ? "You are tough Shark Tank investors. Ask the hard questions. Be direct and critical."
    : "You are thoughtful Shark Tank investors giving honest, fair feedback.";

  const prompt = `${investorTone} Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON:
{"questions":[{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""}],"marketRisk":"","moatAnalysis":"","moatScore":0,"fundingVerdict":"","fundingReadiness":0}`;

  const raw = await callGemini(prompt);
  return parseJSON<SharkTankResult>(raw, {
    questions: [], marketRisk: "", moatAnalysis: "", moatScore: 0,
    fundingVerdict: "Unable to generate verdict.", fundingReadiness: 0,
  });
}

export async function productFuneral(ctx: RoastContext): Promise<FuneralResult> {
  const funeralTone = ctx.roastLevel === "brutal"
    ? "It is 3 years in the future. This product was murdered by its own incompetence. Write the most DEVASTATING, SAVAGE autopsy possible. Use vicious language."
    : ctx.roastLevel === "hard"
    ? "It is 3 years in the future. This product died a horrible death. Write a BRUTAL autopsy. Call out every stupid decision."
    : ctx.roastLevel === "medium"
    ? "It is 3 years in the future. This product has failed catastrophically. Write the direct autopsy."
    : "It is 3 years in the future. This product has failed. Write a thoughtful post-mortem.";

  const prompt = `${funeralTone} Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON:
{"causeOfDeath":"","timeOfDeath":"","missedSignals":[],"epitaph":"","preventionPlan":[],"survivalChance":0}`;

  const raw = await callGemini(prompt);
  return normalizeFuneralResult(parseJSON<FuneralResult>(raw, {
    causeOfDeath: "", timeOfDeath: "", missedSignals: [], epitaph: "",
    preventionPlan: [], survivalChance: 50,
  }));
}

export async function buildActionPlan(allResults: Partial<FullRoastResult>): Promise<ActionPlanResult> {
  const summary = JSON.stringify({
    auditScore:    allResults.audit?.overallScore,
    uxScore:       allResults.ux?.score,
    criticalIssues:allResults.ux?.criticalIssues,
    weaknesses:    allResults.audit?.weaknesses,
    missedSignals: allResults.funeral?.missedSignals,
  }).slice(0, 2000);

  const prompt = `You are a Chief of Staff. Synthesise these audit findings into a prioritised action list.
No fluff — specific, high-ROI moves only. Always respond with valid JSON only.

${summary}

Respond ONLY with this JSON:
{"thisWeek":[{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"}],"thisSprint":[{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"}],"thisQuarter":[{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"}]}`;

  const raw = await callGemini(prompt);
  return parseJSON<ActionPlanResult>(raw, { thisWeek: [], thisSprint: [], thisQuarter: [] });
}

export async function portfolioRoast(ctx: RoastContext): Promise<PortfolioResult> {
  const prompt = `You are a Hiring Manager who has seen thousands of portfolios. ${getRoastTone(ctx.roastLevel)}
You know exactly what gets someone hired vs ghosted. Always respond with valid JSON only.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 2000) || "Not provided"}

Respond ONLY with this JSON:
{"overallScore":0,"firstImpression":0,"caseStudyDepth":0,"designTaste":0,"skillProof":0,"ctaScore":0,"summary":"","topIssues":[],"recruiterVerdict":""}`;

  const raw = await callGemini(prompt);
  return normalizePortfolioResult(parseJSON<PortfolioResult>(raw, {
    overallScore: 50, firstImpression: 50, caseStudyDepth: 50, designTaste: 50,
    skillProof: 50, ctaScore: 50, summary: "", topIssues: [], recruiterVerdict: "",
  }));
}

export async function generateAiroast(ctx: RoastContext): Promise<string> {
  const tone = {
    light:  "You are a witty comedian giving funny but gentle feedback. Be clever and observational. Use casual, conversational language like a friend at a coffee shop.",
    medium: "You are a stand-up comedian doing a roast. Be sharp and sarcastic. Call out flaws with humor and wit. No filter — but keep it clever.",
    hard:   "You are a professional roast master. Be savage, aggressive, and hilarious. Destroy the product with brutal but funny insults and vicious humor.",
    brutal: "You are THE most savage roast master alive — Anthony Jeselnik meets Gordon Ramsay. This is DESTROY-level. Be vicious, hilarious, and absolutely devastating. Profanity welcome. Leave no shred of dignity intact.",
  }[ctx.roastLevel];

  const prompt = `${tone}

ROAST this ${ctx.mode} like you're on stage at a comedy roast:
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Give me 3-5 paragraphs of pure entertainment. Start with a funny opening, tear into specific flaws (mention actual content from the page), close with a killer punchline.
Return ONLY the roast text — no JSON, no formatting, no labels.`;

  const text = await callGemini(prompt, false);
  return text || "Could not generate roast. The product was so boring even the AI fell asleep.";
}
