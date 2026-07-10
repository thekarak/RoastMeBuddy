// lib/cerebras.ts — Cerebras AI API
const MODEL = "gpt-oss-120b";
const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1/chat/completions";

function getApiKey(): string {
  const key = 
    process.env.CEREBRAS_API_KEY || 
    process.env.CEREBERAS_API_KEY || 
    process.env.CEREBRAS_KEY || 
    process.env.CEREBERAS_KEY;
    
  if (!key) throw new Error("CEREBRAS_API_KEY is not set in environment variables");
  return key;
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
  sharkTank?: SharkTankResult;
  funeral?: FuneralResult;
  actionPlan: ActionPlanResult;
  roastLevel: RoastLevel;
  mode: "product" | "portfolio";
  aiRoast: string;
  portfolio?: PortfolioResult;
  scrapedText?: string;
  description?: string;
}

// ── Core call helper ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callCerebras(
  prompt: string,
  opts: { jsonMode?: boolean; timeout?: number } = {}
): Promise<string> {
  const { jsonMode = true, timeout = 6000 } = opts;
  const key = getApiKey();
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(CEREBRAS_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.8,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if ((res.status === 401 || res.status === 403) || res.status === 400) {
        const errText = await res.text().catch(() => "Unauthorized/Invalid Request");
        throw new Error(`Cerebras Authentication/Request Error (${res.status}): ${errText}`);
      }

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.warn(`Cerebras rate limit hit — waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`Cerebras API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      return content ?? "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isAuthError = msg.includes("Authentication/Request Error") || msg.includes("401") || msg.includes("403");
      
      if (isAuthError || attempt >= MAX_RETRIES) {
        throw err;
      }
      console.warn(`Cerebras request attempt ${attempt + 1} failed: ${msg}. Retrying in 1.5s...`);
      await sleep(1500);
    }
  }
  throw new Error("Cerebras API: failed after retries");
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
function buildContext(ctx: RoastContext, maxChars = 2500): string {
  return [
    ctx.url ? `URL: ${ctx.url}` : "",
    ctx.scrapedText ? `Page content:\n${ctx.scrapedText.slice(0, maxChars)}` : "",
    ctx.description ? `Description: ${ctx.description}` : "",
  ].filter(Boolean).join("\n\n");
}

// ── BATCH 1: Mega-Batch — 1 API call ───────────────────────────────────────
export async function runMegaBatch(ctx: RoastContext): Promise<{
  audit: AuditResult;
  ux: UXResult;
  personas: PersonaResult[];
  sharkTank?: SharkTankResult;
  funeral?: FuneralResult;
  actionPlan: ActionPlanResult;
}> {
  const isPortfolio = ctx.mode === "portfolio";
  const tone = ctx.roastLevel;

  if (isPortfolio) {
    return runPortfolioMegaBatch(ctx);
  }

  const personaDefs = [
    { name: "First-Time Visitor", emoji: "👀", color: "#FF4500" },
    { name: "Founder", emoji: "🚀", color: "#8B5CF6" },
    { name: "Investor", emoji: "💰", color: "#F97316" },
  ];

  const investorTone = tone === "brutal" ? "the most RUTHLESS investors alive — destroy the pitch"
    : tone === "hard" ? "aggressive investors who tear apart weak pitches"
    : tone === "medium" ? "tough investors asking hard questions"
    : "thoughtful investors giving fair feedback";

  const funeralTone = tone === "brutal" ? "The product was murdered by its own incompetence. Be devastatingly savage."
    : tone === "hard" ? "The product died a horrible death. Be brutally honest."
    : tone === "medium" ? "The product failed. Write a direct autopsy."
    : "The product has failed. Write a thoughtful post-mortem.";

  const prompt = `You are a world-class product auditor, UX researcher, startup investor, and strategist. ${getRoastTone(ctx.roastLevel)}

Analyse the following product across multiple dimensions simultaneously and return a SINGLE JSON object.

CRITICAL: Keep all summaries and text explanations under 2 sentences. Keep all list items under 12 words. Be punchy, direct, and concise to avoid response truncation.

CRITICAL SCORE RULE: All scores (overallScore, problemClarity, valueProp, differentiation, positioning, score, visualHierarchy, ctaPlacement, trustSignals, personas[].score, moatScore, fundingReadiness, survivalChance) MUST be integers rated on a 0 to 100 scale (e.g. 78, 92, 34, NOT 0 to 10).

SCORING RUBRIC — Grade each dimension independently based on actual content quality:
- Unique differentiation, strong proof, clear value → 75-95
- Solid fundamentals but generic or unclear → 50-74
- Weak, vague, missing, or poorly executed → 10-49
- Irrelevant, absent, or extremely poor → 0-9

Distribute scores across the full 0-100 range. Identify specific content elements that justify each score. If content shows excellence in one area but flaws in another, reflect that variation in the scores.

${buildContext(ctx)}

Return ONLY this JSON structure (no markdown fences, no extra text). Replace ALL numeric values with your actual assessed scores — do NOT copy the example numbers:
{
  "audit": {
    "overallScore": 62, "problemClarity": 55, "valueProp": 48, "differentiation": 40, "positioning": 58,
    "summary": "", "strengths": [], "weaknesses": []
  },
  "ux": {
    "score": 65, "visualHierarchy": 70, "ctaPlacement": 45, "trustSignals": 50,
    "frictionPoints": [], "criticalIssues": [], "warnings": [], "quickWins": []
  },
  "personas": [
    {"persona":"${personaDefs[0].name}","emoji":"${personaDefs[0].emoji}","color":"${personaDefs[0].color}","firstImpression":"","mainObjection":"","verdict":"","score":55},
    {"persona":"${personaDefs[1].name}","emoji":"${personaDefs[1].emoji}","color":"${personaDefs[1].color}","firstImpression":"","mainObjection":"","verdict":"","score":60},
    {"persona":"${personaDefs[2].name}","emoji":"${personaDefs[2].emoji}","color":"${personaDefs[2].color}","firstImpression":"","mainObjection":"","verdict":"","score":50}
  ],
  "sharkTank": {
    "questions": [{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""}],
    "marketRisk": "", "moatAnalysis": "", "moatScore": 45, "fundingVerdict": "", "fundingReadiness": 38
  },
  "funeral": {
    "causeOfDeath": "", "timeOfDeath": "", "missedSignals": [], "epitaph": "", "preventionPlan": [], "survivalChance": 42
  },
  "actionPlan": {
    "thisWeek":    [{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"}],
    "thisSprint":  [{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"}],
    "thisQuarter": [{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"}]
  }
}`;

  const raw = await callCerebras(prompt, { jsonMode: true });
  const d = parseJSON<any>(raw, null);

  if (!d || !d.audit || !d.ux) {
    console.error("Cerebras failed to output valid JSON. Raw response:", raw);
    throw new Error(`AI generated invalid response structure. Raw: ${raw.slice(0, 150)}...`);
  }

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

// ── Portfolio/CV Mega-Batch — separate prompt, no sharkTank/funeral ──────
async function runPortfolioMegaBatch(ctx: RoastContext): Promise<{
  audit: AuditResult;
  ux: UXResult;
  personas: PersonaResult[];
  sharkTank?: undefined;
  funeral?: undefined;
  actionPlan: ActionPlanResult;
}> {
  const personaDefs = [
    { name: "Recruiter", emoji: "🔍", color: "#FF4500" },
    { name: "Hiring Manager", emoji: "💼", color: "#8B5CF6" },
    { name: "Senior Engineer", emoji: "⚙️", color: "#F97316" },
  ];

  const tone = ctx.roastLevel;
  const careerTone = tone === "brutal" ? "Be the most savage career coach alive. Destroy mediocre CVs without mercy."
    : tone === "hard" ? "Be brutally honest about every CV flaw. No sugarcoating."
    : tone === "medium" ? "Be direct and blunt about what's holding their career back."
    : "Be honest but constructive. Help them land more interviews.";

  const prompt = `You are a world-class Hiring Manager and Career Coach who has reviewed 10,000+ CVs. ${careerTone}

Analyse this CV/portfolio across multiple dimensions and return a SINGLE JSON object.

CRITICAL: Keep all summaries and text explanations under 2 sentences. Keep all list items under 12 words. Be punchy, direct, and concise to avoid response truncation.

CRITICAL SCORE RULE: All scores MUST be integers rated on a 0 to 100 scale. Base scores on ACTUAL CV content — not a default. A fresh grad with good projects might score 65. A professional with no metrics might score 45. An impressive senior dev scores 85. DO NOT default everything to 30-50.

SCORING RUBRIC — Grade each dimension independently based on actual CV content:
- Exceptional achievements with measurable impact, polished presentation → 75-95
- Solid experience but generic descriptions, lacks metrics → 50-74
- Vague, poorly formatted, missing key sections → 10-49
- Incomplete, broken formatting, or absent → 0-9

IMPORTANT: Scores should VARY across dimensions. A CV can have great layout (75) but poor differentiation (30). Reflect real quality variation.

CV-SPECIFIC DIMENSIONS:
- overallScore → Overall hireability and CV quality
- problemClarity → How clearly are achievements and impact stated? Are results quantified?
- valueProp → How well does the CV sell the candidate's unique value?
- differentiation → What makes this candidate stand out from other applicants?
- positioning → How well is the CV tailored to the target role/industry?

UX DIMENSIONS (CV readability & design):
- score → Overall CV layout, design quality, and scanability
- visualHierarchy → Section ordering, spacing, typography, ATS-friendliness
- ctaPlacement → Visibility of contact info, LinkedIn, GitHub, portfolio links
- trustSignals → LinkedIn presence, credentials, certifications, endorsements

ACTION PLAN — All actions MUST be specific CV/career improvement steps. DO NOT give startup or product advice:
- thisWeek: Quick CV text fixes (reword bullets, add numbers, fix formatting)
- thisSprint: Medium effort (build projects, rewrite sections, update LinkedIn)
- thisQuarter: Big career investments (certifications, open source, networking)

${buildContext(ctx)}

Return ONLY this JSON structure (no markdown fences, no extra text). Replace ALL numeric values with your actual assessed scores — do NOT copy the example numbers:
{
  "audit": {
    "overallScore": 62, "problemClarity": 55, "valueProp": 48, "differentiation": 40, "positioning": 58,
    "summary": "", "strengths": [], "weaknesses": []
  },
  "ux": {
    "score": 65, "visualHierarchy": 70, "ctaPlacement": 45, "trustSignals": 50,
    "frictionPoints": [], "criticalIssues": [], "warnings": [], "quickWins": []
  },
  "personas": [
    {"persona":"${personaDefs[0].name}","emoji":"${personaDefs[0].emoji}","color":"${personaDefs[0].color}","firstImpression":"","mainObjection":"","verdict":"","score":55},
    {"persona":"${personaDefs[1].name}","emoji":"${personaDefs[1].emoji}","color":"${personaDefs[1].color}","firstImpression":"","mainObjection":"","verdict":"","score":60},
    {"persona":"${personaDefs[2].name}","emoji":"${personaDefs[2].emoji}","color":"${personaDefs[2].color}","firstImpression":"","mainObjection":"","verdict":"","score":50}
  ],
  "actionPlan": {
    "thisWeek":    [{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"}],
    "thisSprint":  [{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"}],
    "thisQuarter": [{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"}]
  }
}`;

  const raw = await callCerebras(prompt, { jsonMode: true });
  const d = parseJSON<any>(raw, null);

  if (!d || !d.audit || !d.ux) {
    console.error("Cerebras failed to output valid JSON for portfolio. Raw response:", raw);
    throw new Error(`AI generated invalid response structure. Raw: ${raw.slice(0, 150)}...`);
  }

  return {
    audit: normalizeAudit(d?.audit || {}),
    ux: normalizeUX(d?.ux || {}),
    personas: Array.isArray(d?.personas) ? d.personas : personaDefs.map(p => ({
      persona: p.name, emoji: p.emoji, color: p.color,
      firstImpression: "N/A", mainObjection: "N/A", verdict: "N/A", score: 50,
    })),
    sharkTank: undefined,
    funeral: undefined,
    actionPlan: d?.actionPlan ? {
      thisWeek: Array.isArray(d.actionPlan.thisWeek) ? d.actionPlan.thisWeek : [],
      thisSprint: Array.isArray(d.actionPlan.thisSprint) ? d.actionPlan.thisSprint : [],
      thisQuarter: Array.isArray(d.actionPlan.thisQuarter) ? d.actionPlan.thisQuarter : [],
    } : { thisWeek: [], thisSprint: [], thisQuarter: [] },
  };
}

// ── CALL 2: AI Roast narrative — 1 API call (plain text) ──────────────────
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

  const text = await callCerebras(prompt, { jsonMode: false, timeout: 9000 });
  const noun = ctx.mode === "portfolio" ? "CV" : "product";
  return text || `Could not generate roast. The ${noun} was so boring even the AI fell asleep.`;
}

// ── CALL 3 (optional): Portfolio — only runs when mode=portfolio ───────────
export async function portfolioRoast(ctx: RoastContext): Promise<PortfolioResult> {
  const prompt = `You are a Hiring Manager who has seen thousands of portfolios. ${getRoastTone(ctx.roastLevel)}
${buildContext(ctx, 2000)}

CRITICAL SCORE RULE: All scores (overallScore, firstImpression, caseStudyDepth, designTaste, skillProof, ctaScore) MUST be integers rated on a 0 to 100 scale (e.g. 85, NOT 0 to 10).

SCORING RUBRIC — Grade each dimension independently based on actual portfolio content:
- Exceptional proof of skills, clear impact metrics, polished design → 75-95
- Competent but lacks differentiation or measurable results → 50-74
- Generic, unpolished, missing context or weak presentation → 10-49
- Incomplete, broken, or absent → 0-9

Distribute scores across the full 0-100 range. Back each score with specific observations from the content.

Return ONLY this JSON:
{"overallScore":0,"firstImpression":0,"caseStudyDepth":0,"designTaste":0,"skillProof":0,"ctaScore":0,"summary":"","topIssues":[],"recruiterVerdict":""}`;

  const raw = await callCerebras(prompt, { jsonMode: true });
  return normalizePortfolio(parseJSON(raw, {}));
}

// ── Backwards-compat exports ───────────────────────────────────────────────
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
  return (await runMegaBatch(ctx)).sharkTank ?? { questions: [], marketRisk: "", moatAnalysis: "", moatScore: 0, fundingVerdict: "", fundingReadiness: 0 };
}
export async function productFuneral(ctx: RoastContext): Promise<FuneralResult> {
  return (await runMegaBatch(ctx)).funeral ?? { causeOfDeath: "", timeOfDeath: "", missedSignals: [], epitaph: "", preventionPlan: [], survivalChance: 0 };
}
export async function buildActionPlan(_: Partial<FullRoastResult>): Promise<ActionPlanResult> {
  return { thisWeek: [], thisSprint: [], thisQuarter: [] };
}
