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

// ── Local CV scoring engine ───────────────────────────────────────────────
function computeCVScores(text: string): {
  overallScore: number; problemClarity: number; valueProp: number;
  differentiation: number; positioning: number;
  uxScore: number; visualHierarchy: number; ctaPlacement: number; trustSignals: number;
} {
  const t = text.toLowerCase();
  const wc = text.split(/\s+/).length;

  const hasEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLinkedIn = /linkedin/i.test(t);
  const hasGitHub = /github/i.test(t);

  const hasEducation   = /\b(education|degree|bachelor|master|phd|b\.sc|m\.sc|ba|ma|bs|university|college)\b/i.test(t);
  const hasExperience  = /\b(experience|employment|work history|professional|career)\b/i.test(t);
  const hasSkills      = /\b(skills|technologies|competencies|proficiencies|expertise|programming|languages)\b/i.test(t);
  const hasProjects    = /\b(projects|portfolio|repository|open.?source)\b/i.test(t);
  const hasCerts       = /\b(certified|certification|license|credential)\b/i.test(t);
  const sectionCount = [hasEducation, hasExperience, hasSkills, hasProjects, hasCerts].filter(Boolean).length;

  const quantified = (text.match(/\d+%|\$\d+|increased|decreased|improved|reduced|generated|saved|grew|boosted|delivered|achieved|led|managed|spearheaded/gi) || []).length;
  const actionVerbs = (text.match(/\b(developed|implemented|created|designed|launched|optimized|transformed|built|engineered|architected|established|automated|migrated|scaled|integrated)\b/gi) || []).length;

  const depth = Math.min(1, wc / 400);
  const hasSections = sectionCount >= 3;
  const hasMetrics = quantified >= 2;

  const achievementClarity = Math.round(Math.min(92, 20 + quantified * 6 + actionVerbs * 3 + depth * 10));
  const valueScore = Math.round(Math.min(92, 20 + sectionCount * 8 + (hasMetrics ? 12 : 0) + depth * 8 + (hasLinkedIn ? 5 : 0)));
  const diffScore = Math.round(Math.min(92, 18 + actionVerbs * 4 + quantified * 4 + (hasProjects ? 8 : 0) + (hasCerts ? 5 : 0)));
  const posScore = Math.round(Math.min(92, 22 + (hasEmail ? 6 : 0) + (hasPhone ? 4 : 0) + (hasSections ? 10 : 0) + depth * 5));
  const overall = Math.round((achievementClarity + valueScore + diffScore + posScore) / 4);

  const uxScore = Math.round(Math.min(92, 35 + depth * 15 + (hasSections ? 10 : 0) + ((hasLinkedIn || hasGitHub) ? 5 : 0)));
  const vh = Math.round(Math.min(92, 30 + depth * 20 + (hasSections ? 10 : 0)));
  const cta = Math.round(Math.min(92, 20 + (hasEmail ? 15 : 0) + (hasPhone ? 8 : 0) + (hasLinkedIn ? 10 : 0) + (hasGitHub ? 8 : 0)));
  const trust = Math.round(Math.min(92, 25 + (hasLinkedIn ? 12 : 0) + (hasGitHub ? 8 : 0) + (hasCerts ? 8 : 0) + depth * 5));

  return {
    overallScore: overall, problemClarity: achievementClarity, valueProp: valueScore,
    differentiation: diffScore, positioning: posScore,
    uxScore, visualHierarchy: vh, ctaPlacement: cta, trustSignals: trust,
  };
}

function generateCVActionPlan(scores: ReturnType<typeof computeCVScores>): ActionPlanResult {
  const plan: ActionPlanResult = { thisWeek: [], thisSprint: [], thisQuarter: [] };

  if (scores.problemClarity < 50) {
    plan.thisWeek.push({ action: "Add quantified achievements to every role — use numbers, percentages, and dollar amounts", impact: "High", effort: "Low" });
  } else if (scores.problemClarity < 70) {
    plan.thisWeek.push({ action: "Strengthen weak bullet points with concrete results and metrics", impact: "High", effort: "Low" });
  } else {
    plan.thisWeek.push({ action: "Fine-tune achievement descriptions for maximum impact", impact: "Medium", effort: "Low" });
  }

  if (scores.differentiation < 40) {
    plan.thisWeek.push({ action: "Add a skills section highlighting technical and soft skills", impact: "High", effort: "Low" });
    plan.thisSprint.push({ action: "Build a portfolio project that demonstrates your best work", impact: "High", effort: "Medium" });
  } else if (scores.differentiation < 65) {
    plan.thisWeek.push({ action: "Highlight unique projects and contributions that set you apart", impact: "High", effort: "Low" });
    plan.thisSprint.push({ action: "Add relevant certifications and online courses", impact: "Medium", effort: "Medium" });
  } else {
    plan.thisWeek.push({ action: "Add a link to your portfolio or GitHub to provide extra proof", impact: "Medium", effort: "Low" });
  }

  if (scores.positioning < 45) {
    plan.thisWeek.push({ action: "Write a targeted professional summary aligned with your desired role", impact: "High", effort: "Low" });
    plan.thisQuarter.push({ action: "Network with professionals in your target industry for referrals", impact: "High", effort: "High" });
  } else if (scores.positioning < 70) {
    plan.thisWeek.push({ action: "Tailor your CV keywords to match job descriptions in your field", impact: "High", effort: "Low" });
    plan.thisQuarter.push({ action: "Pursue an advanced certification or specialisation in your domain", impact: "High", effort: "High" });
  } else {
    plan.thisSprint.push({ action: "Get your CV reviewed by peers in your target industry", impact: "Medium", effort: "Medium" });
  }

  if (scores.valueProp < 50) {
    plan.thisWeek.push({ action: "Rewrite your CV summary to clearly state your unique value proposition", impact: "High", effort: "Low" });
  }

  if (scores.ctaPlacement < 40) {
    plan.thisWeek.push({ action: "Add visible contact info, LinkedIn, and GitHub links to the top of your CV", impact: "High", effort: "Low" });
  }

  if (scores.overallScore < 35) {
    plan.thisSprint.push({ action: "Restructure your CV with clear sections: Summary, Experience, Education, Skills", impact: "High", effort: "Medium" });
  }

  if (plan.thisSprint.length < 2) {
    plan.thisSprint.push({ action: "Add case studies or detailed project descriptions to demonstrate depth", impact: "High", effort: "Medium" });
  }
  if (plan.thisQuarter.length < 2) {
    plan.thisQuarter.push({ action: "Contribute to open source or build a showcase project in your field", impact: "High", effort: "High" });
  }
  if (plan.thisQuarter.length < 3) {
    plan.thisQuarter.push({ action: "Attend industry events and build your professional network", impact: "Medium", effort: "High" });
  }

  return plan;
}

// ── Core call helper ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callCerebras(
  prompt: string,
  opts: { jsonMode?: boolean; timeout?: number; temperature?: number } = {}
): Promise<string> {
  const { jsonMode = true, timeout = 6000, temperature = 0.3 } = opts;
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
          temperature,
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
  if (ctx.mode === "portfolio") {
    return runPortfolioMegaBatch(ctx);
  }

  const personaDefs = [
    { name: "First-Time Visitor", emoji: "👀", color: "#FF4500" },
    { name: "Founder", emoji: "🚀", color: "#8B5CF6" },
    { name: "Investor", emoji: "💰", color: "#F97316" },
  ];

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

  // ── Local scoring overrides AI for reliability ──
  const text = ctx.scrapedText || ctx.description || "";
  const cvScores = computeCVScores(text);
  const computedActionPlan = generateCVActionPlan(cvScores);

  const raw = await callCerebras(prompt, { jsonMode: true, temperature: 0.3, timeout: 10000 });
  const d = parseJSON<any>(raw, null);

  if (!d || !d.audit || !d.ux) {
    console.error("Cerebras failed to output valid JSON for portfolio. Raw response:", raw);
    // Fall back to fully computed result
    return {
      audit: {
        overallScore: cvScores.overallScore,
        problemClarity: cvScores.problemClarity,
        valueProp: cvScores.valueProp,
        differentiation: cvScores.differentiation,
        positioning: cvScores.positioning,
        summary: "CV analysis based on content review.",
        strengths: ["Analysis available"],
        weaknesses: ["Full AI review unavailable"],
      },
      ux: {
        score: cvScores.uxScore,
        visualHierarchy: cvScores.visualHierarchy,
        ctaPlacement: cvScores.ctaPlacement,
        trustSignals: cvScores.trustSignals,
        frictionPoints: [],
        criticalIssues: [],
        warnings: [],
        quickWins: [],
      },
      personas: personaDefs.map(p => ({
        persona: p.name, emoji: p.emoji, color: p.color,
        firstImpression: "N/A", mainObjection: "N/A", verdict: "N/A", score: cvScores.overallScore,
      })),
      sharkTank: undefined,
      funeral: undefined,
      actionPlan: computedActionPlan,
    };
  }

  // Use AI text but override scores with computed ones (more reliable)
  const audit = normalizeAudit(d?.audit || {});
  const ux = normalizeUX(d?.ux || {});

  audit.overallScore = cvScores.overallScore;
  audit.problemClarity = cvScores.problemClarity;
  audit.valueProp = cvScores.valueProp;
  audit.differentiation = cvScores.differentiation;
  audit.positioning = cvScores.positioning;
  ux.score = cvScores.uxScore;
  ux.visualHierarchy = cvScores.visualHierarchy;
  ux.ctaPlacement = cvScores.ctaPlacement;
  ux.trustSignals = cvScores.trustSignals;

  const personas = Array.isArray(d?.personas) ? d.personas : personaDefs.map(p => ({
    persona: p.name, emoji: p.emoji, color: p.color,
    firstImpression: "N/A", mainObjection: "N/A", verdict: "N/A", score: cvScores.overallScore,
  }));

  // Override persona scores too
  personas.forEach((p: PersonaResult, i: number) => {
    if (i === 0) p.score = Math.min(92, cvScores.overallScore + 5);
    else if (i === 1) p.score = cvScores.overallScore;
    else p.score = Math.max(10, cvScores.overallScore - 5);
  });

  return {
    audit,
    ux,
    personas,
    sharkTank: undefined,
    funeral: undefined,
    actionPlan: computedActionPlan,
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
  const text = ctx.scrapedText || ctx.description || "";
  const scores = computeCVScores(text);

  const prompt = `You are a Hiring Manager who has seen thousands of portfolios. ${getRoastTone(ctx.roastLevel)}
${buildContext(ctx, 2000)}

CRITICAL: Keep summary under 2 sentences. Keep topIssues items under 12 words each. Be punchy.

Return ONLY this JSON (replace example scores with actual assessments):
{"overallScore":${scores.overallScore},"firstImpression":${scores.uxScore},"caseStudyDepth":${scores.problemClarity},"designTaste":${scores.visualHierarchy},"skillProof":${scores.differentiation},"ctaScore":${scores.ctaPlacement},"summary":"","topIssues":[],"recruiterVerdict":""}`;

  const raw = await callCerebras(prompt, { jsonMode: true, temperature: 0.3, timeout: 10000 });
  const ai = parseJSON<any>(raw, {});

  // Override scores with computed ones for reliability
  return {
    overallScore: scores.overallScore,
    firstImpression: scores.uxScore,
    caseStudyDepth: scores.problemClarity,
    designTaste: scores.visualHierarchy,
    skillProof: scores.differentiation,
    ctaScore: scores.ctaPlacement,
    summary: String(ai?.summary || ""),
    topIssues: Array.isArray(ai?.topIssues) ? ai.topIssues : [],
    recruiterVerdict: String(ai?.recruiterVerdict || ""),
  };
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
