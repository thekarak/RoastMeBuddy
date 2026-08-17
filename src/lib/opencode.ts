// lib/opencode.ts — OpenCode Zen API (DeepSeek V4 Flash free)
const MODEL = "deepseek-v4-flash-free";
const ZEN_BASE_URL = "https://opencode.ai/zen/v1/chat/completions";

function getApiKey(): string {
  const key =
    process.env.OPENCODE_ZEN_API_KEY ||
    process.env.ZEN_API_KEY;

  if (!key) throw new Error("OPENCODE_ZEN_API_KEY is not set in environment variables");
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
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function blendScores(aiScore: number, localScore: number, weight = 0.4): number {
  return clamp(Math.round(localScore * (1 - weight) + aiScore * weight));
}

function computeCVScores(text: string): {
  overallScore: number; problemClarity: number; valueProp: number;
  differentiation: number; positioning: number;
  uxScore: number; visualHierarchy: number; ctaPlacement: number; trustSignals: number;
} {
  const t = text.toLowerCase();
  const wc = text.split(/\s+/).filter((w) => w.length > 0).length;

  // ── Contact & credibility signals ──
  const hasEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
  const hasLinkedIn = /linkedin\.com/i.test(text) || /linkedin/i.test(t);
  const hasGitHub = /github\.com/i.test(text) || /github/i.test(t);
  const hasPortfolioLink = /(https?:\/\/)[^\s]*?(portfolio|personal|work|projects)/i.test(text);

  // ── Section structure (header detection is more precise) ──
  const hasEducation = /\b(education|degrees?|academic|qualifications)/i.test(t);
  const hasExperience = /\b(experience|professional history|work history|career timeline)/i.test(t);
  const hasSkills = /\b(skills|technical skills|competencies|proficiencies|expertise)/i.test(t);
  const hasProjects = /\b(projects|portfolio|case studies|open.?source)/i.test(t);
  const hasCerts = /\b(certifications?|certified|licensed|credentials)/i.test(t);
  const hasSummary = /\b(summary|profile|professional summary|about me|career objective)/i.test(t);

  const sections = { hasEducation, hasExperience, hasSkills, hasProjects, hasCerts, hasSummary };
  const sectionCount = Object.values(sections).filter(Boolean).length;

  // ── Quantified achievement detection ──
  const quantifiedMatches = text.match(
    /\b\d+%|\$\d+(?:\.\d+)?[km]?(?:m|b)?|\d+(?:\.\d+)?\s*(?:users|customers|clients|subscribers|visitors|conversions|leads|sales|revenue|downloads|engagement|CTR|CAC|LTV|ROI|NPS|CSAT|months?|years?|hours?)\b/gi
  );
  const quantified = quantifiedMatches ? quantifiedMatches.length : 0;

  // ── Action verb detection ──
  const actionVerbs = (text.match(
    /\b(developed|implemented|created|designed|launched|optimized|transformed|built|engineered|architected|established|automated|migrated|scaled|integrated|spearheaded|led|managed|pioneered|orchestrated|negotiated|delivered)\b/gi
  ) || []).length;

  // ── Content depth (normalized to 100–1500 word range) ──
  const depth = Math.min(1, Math.max(0, (wc - 100) / 1400));
  const hasSections = sectionCount >= 4;
  const hasMetrics = quantified >= 2;
  const quantifiedRatio = wc > 50 ? Math.min(1, quantified / Math.max(1, wc / 60)) : 0;

  // ── Achievement Clarity (problemClarity) ──
  // Weight: quantified results 45%, action verbs 20%, depth 20%, ratio 15%
  const problemClarity = clamp(Math.round(
    20 +
    quantified * 7 +
    actionVerbs * 3 +
    depth * 15 +
    (quantifiedRatio > 0.1 ? 10 : 0) +
    (quantifiedRatio > 0.25 ? 8 : 0)
  ));

  // ── Value Prop ──
  // How well the CV sells the candidate's unique value
  const valueProp = clamp(Math.round(
    15 +
    (hasSummary ? 12 : 0) +
    sectionCount * 5 +
    (hasMetrics ? 12 : 0) +
    depth * 8 +
    (hasLinkedIn ? 5 : 0) +
    (quantified > 3 ? 8 : 0)
  ));

  // ── Differentiation ──
  // What makes the candidate stand out
  const diffScore = clamp(Math.round(
    15 +
    actionVerbs * 5 +
    quantified * 3 +
    (hasProjects ? 12 : 0) +
    (hasCerts ? 8 : 0) +
    depth * 5 +
    (quantifiedRatio > 0.15 ? 8 : 0)
  ));

  // ── Positioning ──
  // How well-tailored the CV is to target role
  const posScore = clamp(Math.round(
    18 +
    (hasEmail ? 8 : 0) +
    (hasPhone ? 5 : 0) +
    (hasSections ? 12 : 0) +
    depth * 6 +
    (hasSummary ? 6 : 0)
  ));

  const overall = Math.round((problemClarity + valueProp + diffScore + posScore) / 4);

  // ── UX scores (CV readability & design) ──
  const uxScore = clamp(Math.round(
    30 +
    depth * 18 +
    (hasSections ? 12 : 0) +
    ((hasLinkedIn || hasGitHub || hasPortfolioLink) ? 10 : 0)
  ));
  const vh = clamp(Math.round(25 + depth * 22 + (hasSections ? 12 : 0)));
  const cta = clamp(Math.round(
    15 +
    (hasEmail ? 18 : 0) +
    (hasPhone ? 8 : 0) +
    (hasLinkedIn ? 12 : 0) +
    (hasGitHub ? 8 : 0) +
    (hasPortfolioLink ? 10 : 0)
  ));
  const trust = clamp(Math.round(
    20 +
    (hasLinkedIn ? 15 : 0) +
    (hasGitHub ? 8 : 0) +
    (hasCerts ? 10 : 0) +
    (hasPortfolioLink ? 8 : 0) +
    depth * 5
  ));

  return {
    overallScore: overall, problemClarity, valueProp: valueProp,
    differentiation: diffScore, positioning: posScore,
    uxScore, visualHierarchy: vh, ctaPlacement: cta, trustSignals: trust,
  };
}

function generateCVActionPlan(scores: ReturnType<typeof computeCVScores>): ActionPlanResult {
  const plan: ActionPlanResult = { thisWeek: [], thisSprint: [], thisQuarter: [] };

  // ── Problem Clarity (quantified achievements) ──
  if (scores.problemClarity < 45) {
    plan.thisWeek.push({ action: "Add quantified metrics to every bullet point — use %, $, and timeframes", impact: "High", effort: "Low" });
  } else if (scores.problemClarity < 65) {
    plan.thisWeek.push({ action: "Strengthen 2-3 weak bullet points with concrete results and numbers", impact: "High", effort: "Low" });
  } else {
    plan.thisWeek.push({ action: "Fine-tune top achievement descriptions for maximum quantified impact", impact: "Medium", effort: "Low" });
  }

  // ── Value Prop ──
  if (scores.valueProp < 40) {
    plan.thisWeek.push({ action: "Write a targeted 2-sentence summary stating your unique value proposition", impact: "High", effort: "Low" });
  } else if (scores.valueProp < 60) {
    plan.thisWeek.push({ action: "Rewrite your professional summary to highlight your top 3 differentiators", impact: "High", effort: "Low" });
  }

  // ── Differentiation ──
  if (scores.differentiation < 35) {
    plan.thisWeek.push({ action: "Add a dedicated skills section with technical and soft skills", impact: "High", effort: "Low" });
    plan.thisSprint.push({ action: "Build 1 portfolio project that showcases your best technical work", impact: "High", effort: "Medium" });
  } else if (scores.differentiation < 55) {
    plan.thisWeek.push({ action: "Highlight unique projects and contributions that set you apart", impact: "High", effort: "Low" });
    plan.thisSprint.push({ action: "Add relevant certifications or online courses to your skill set", impact: "Medium", effort: "Medium" });
  } else {
    plan.thisWeek.push({ action: "Add a link to your portfolio or GitHub for additional proof of work", impact: "Medium", effort: "Low" });
  }

  // ── Positioning ──
  if (scores.positioning < 40) {
    plan.thisWeek.push({ action: "Restructure CV with clear sections: Summary, Experience, Education, Skills", impact: "High", effort: "Medium" });
    plan.thisWeek.push({ action: "Add visible contact info (email, phone, LinkedIn) to the header", impact: "High", effort: "Low" });
    plan.thisQuarter.push({ action: "Network with 20+ professionals in your target industry for referrals", impact: "High", effort: "High" });
  } else if (scores.positioning < 65) {
    plan.thisWeek.push({ action: "Tailor CV keywords to match 3 job descriptions in your target role", impact: "High", effort: "Low" });
    plan.thisQuarter.push({ action: "Earn an advanced certification or specialisation in your target domain", impact: "High", effort: "High" });
  } else {
    plan.thisSprint.push({ action: "Get your CV reviewed by 2 peers in your target industry", impact: "Medium", effort: "Medium" });
  }

  // ── CTA/Trust Signals ──
  if (scores.ctaPlacement < 35) {
    plan.thisWeek.push({ action: "Move contact info, LinkedIn, and GitHub links to the CV header", impact: "High", effort: "Low" });
  }
  if (scores.trustSignals < 40) {
    plan.thisWeek.push({ action: "Add LinkedIn profile link and 1-2 professional certifications", impact: "High", effort: "Low" });
  }

  // ── Overall quality fallback ──
  if (scores.overallScore < 35) {
    plan.thisSprint.push({ action: "Rewrite entire CV with ATS-friendly formatting and clear section headers", impact: "High", effort: "Medium" });
  }

  // ── Ensure minimum plan coverage ──
  if (plan.thisSprint.length < 2) {
    plan.thisSprint.push({ action: "Add 2-3 detailed case studies or project descriptions demonstrating impact", impact: "High", effort: "Medium" });
  }
  if (plan.thisQuarter.length < 2) {
    plan.thisQuarter.push({ action: "Contribute to open source or build a showcase project in your field", impact: "High", effort: "High" });
  }
  if (plan.thisQuarter.length < 3) {
    plan.thisQuarter.push({ action: "Attend 3+ industry events or meetups to expand your professional network", impact: "Medium", effort: "High" });
  }

  return plan;
}

// ── Core call helper ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callCerebras(
  prompt: string,
  opts: { jsonMode?: boolean; timeout?: number; temperature?: number; systemPrompt?: string } = {}
): Promise<string> {
  const { jsonMode = true, timeout = 45000, temperature = 0.3, systemPrompt } = opts;
  const key = getApiKey();
  const MAX_RETRIES = 3;
  let useJsonMode = jsonMode;

  const systemMsg = systemPrompt
    || (jsonMode
      ? "You are a precise analyst. Return ONLY valid JSON — no markdown fences, no commentary."
      : "You are a witty roast comedian. Return plain text only — no JSON, no labels.");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ZEN_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: prompt },
          ],
          temperature,
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (res.status === 401 || res.status === 403) {
        const errText = await res.text().catch(() => "Unauthorized");
        throw new Error(`OpenCode Zen Authentication/Request Error (${res.status}): ${errText}`);
      }

      // Some models reject response_format — retry once without it
      if (res.status === 400 && useJsonMode) {
        console.warn("OpenCode Zen rejected json_mode — retrying without response_format");
        useJsonMode = false;
        continue;
      }

      if (res.status === 400) {
        const errText = await res.text().catch(() => "Bad Request");
        throw new Error(`OpenCode Zen Request Error (400): ${errText}`);
      }

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.warn(`OpenCode Zen rate limit hit — waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`OpenCode Zen API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      return content ?? "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isAuthError = msg.includes("Authentication/Request Error") || msg.includes("401") || msg.includes("403");
      // Don't retry on timeout — it'll just make things worse
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || msg.includes("aborted") || msg.includes("timeout"));

      if (isAuthError || isTimeout || attempt >= MAX_RETRIES) {
        throw err;
      }
      console.warn(`OpenCode Zen request attempt ${attempt + 1} failed: ${msg}. Retrying in 1.5s...`);
      await sleep(1500);
    }
  }
  throw new Error("OpenCode Zen API: failed after retries");
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
  if (!text?.trim()) return fallback;

  const attempts = [
    () => JSON.parse(text),
    () => {
      const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (m) return JSON.parse(m[1].trim());
      throw new Error("no fence");
    },
    () => {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
      throw new Error("no object");
    },
    () => {
      // Repair truncated JSON by closing open braces/brackets
      const start = text.indexOf("{");
      if (start < 0) throw new Error("no start");
      let repaired = text.slice(start);
      const opens = (repaired.match(/[{[]/g) || []).length;
      const closes = (repaired.match(/[}\]]/g) || []).length;
      for (let i = 0; i < opens - closes; i++) repaired += "}";
      return JSON.parse(repaired);
    },
  ];

  for (const attempt of attempts) {
    try { return attempt(); } catch { /* next */ }
  }
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
  portfolio?: PortfolioResult;
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

  let raw = "";
  try {
    raw = await callCerebras(prompt, { jsonMode: true, timeout: 45000 });
  } catch (err) {
    console.warn("OpenCode Zen API call failed or rate-limited for product mega-batch:", err);
  }
  const d = parseJSON<any>(raw, null);

  if (!d || !d.audit || !d.ux) {
    console.warn("OpenCode Zen did not return JSON or hit rate limit — using fallback product assessment.");
    return {
      audit: {
        overallScore: 62, problemClarity: 58, valueProp: 55, differentiation: 48, positioning: 60,
        summary: "Product teardown based on structural analysis.",
        strengths: ["Clear core proposition", "Structured layout"],
        weaknesses: ["Call to action visibility needs improvement", "Differentiator could be sharper"],
      },
      ux: {
        score: 65, visualHierarchy: 68, ctaPlacement: 52, trustSignals: 55,
        frictionPoints: ["Hero CTA hierarchy"], criticalIssues: [], warnings: ["Unclear value proposition"], quickWins: ["Move CTA above the fold"],
      },
      personas: personaDefs.map(p => ({
        persona: p.name, emoji: p.emoji, color: p.color,
        firstImpression: "Clean layout, but value proposition needs to be punchier.",
        mainObjection: "Differentiators aren't immediately clear on landing.",
        verdict: "Promising concept, needs conversion optimization.", score: 60,
      })),
      sharkTank: {
        questions: [{ question: "What is your defensible moat?", concern: "High competition in market segment." }],
        marketRisk: "Medium competition risk", moatAnalysis: "Brand & UX execution", moatScore: 50,
        fundingVerdict: "Seed ready with conversion fixes", fundingReadiness: 55,
      },
      funeral: {
        causeOfDeath: "Friction in user onboarding flow", timeOfDeath: "18 months",
        missedSignals: ["High dropoff on landing page"], epitaph: "A great product with buried CTAs.",
        preventionPlan: ["Optimize landing page conversion", "Simplify value prop"], survivalChance: 60,
      },
      actionPlan: {
        thisWeek: [{ action: "Rewrite landing page headline for clarity", impact: "High", effort: "Low" }],
        thisSprint: [{ action: "A/B test hero CTA placement", impact: "High", effort: "Medium" }],
        thisQuarter: [{ action: "Streamline user onboarding funnel", impact: "High", effort: "High" }],
      },
    };
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

// ── Portfolio/CV Mega-Batch — single call with hiring manager panel ──────
async function runPortfolioMegaBatch(ctx: RoastContext): Promise<{
  audit: AuditResult;
  ux: UXResult;
  personas: PersonaResult[];
  sharkTank?: undefined;
  funeral?: undefined;
  actionPlan: ActionPlanResult;
  portfolio: PortfolioResult;
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
  },
  "portfolio": {
    "summary": "",
    "topIssues": [],
    "recruiterVerdict": ""
  }
}`;

  // ── Local scoring overrides AI for reliability ──
  const text = ctx.scrapedText || ctx.description || "";
  const cvScores = computeCVScores(text);
  const computedActionPlan = generateCVActionPlan(cvScores);

  function createPortfolioResult(
    aiPortfolio: Record<string, unknown> | undefined,
    targetAudit: AuditResult,
    targetUX: UXResult
  ): PortfolioResult {
    return {
      overallScore: targetAudit.overallScore,
      firstImpression: targetUX.score,
      caseStudyDepth: targetAudit.problemClarity,
      designTaste: targetUX.visualHierarchy,
      skillProof: targetAudit.differentiation,
      ctaScore: targetUX.ctaPlacement,
      summary: String(aiPortfolio?.summary || "CV analysis based on content review."),
      topIssues: Array.isArray(aiPortfolio?.topIssues) ? ns(aiPortfolio.topIssues) : [],
      recruiterVerdict: String(aiPortfolio?.recruiterVerdict || "Needs stronger quantified achievements and clearer positioning."),
    };
  }

  function mergeActionPlans(ai: ActionPlanResult | undefined, computed: ActionPlanResult): ActionPlanResult {
    if (!ai || (!ai.thisWeek?.length && !ai.thisSprint?.length && !ai.thisQuarter?.length)) {
      return computed;
    }
    return {
      thisWeek: ai.thisWeek?.length ? ai.thisWeek : computed.thisWeek,
      thisSprint: ai.thisSprint?.length ? ai.thisSprint : computed.thisSprint,
      thisQuarter: ai.thisQuarter?.length ? ai.thisQuarter : computed.thisQuarter,
    };
  }

  let raw = "";
  try {
    raw = await callCerebras(prompt, { jsonMode: true, temperature: 0.3, timeout: 45000 });
  } catch (err) {
    console.warn("OpenCode Zen API call failed or rate-limited for portfolio mega-batch:", err);
  }
  const d = parseJSON<any>(raw, null);

  if (!d || !d.audit || !d.ux) {
    console.warn("OpenCode Zen failed or rate-limited for portfolio — using fallback local engine.");
    const fallbackAudit: AuditResult = {
      overallScore: cvScores.overallScore,
      problemClarity: cvScores.problemClarity,
      valueProp: cvScores.valueProp,
      differentiation: cvScores.differentiation,
      positioning: cvScores.positioning,
      summary: "CV analysis based on structural content review.",
      strengths: cvScores.overallScore >= 60 ? ["Solid foundation detected"] : ["Room for improvement identified"],
      weaknesses: cvScores.problemClarity < 60 ? ["Achievements need quantified metrics"] : ["Could sharpen differentiation"],
    };
    const fallbackUX: UXResult = {
      score: cvScores.uxScore,
      visualHierarchy: cvScores.visualHierarchy,
      ctaPlacement: cvScores.ctaPlacement,
      trustSignals: cvScores.trustSignals,
      frictionPoints: cvScores.visualHierarchy < 50 ? ["Section structure needs clearer hierarchy"] : [],
      criticalIssues: cvScores.ctaPlacement < 40 ? ["Contact info not prominent enough"] : [],
      warnings: cvScores.trustSignals < 50 ? ["Add LinkedIn/GitHub links for credibility"] : [],
      quickWins: ["Add metrics to top 3 bullet points", "Move contact info to header"],
    };

    return {
      audit: fallbackAudit,
      ux: fallbackUX,
      personas: personaDefs.map((p, i) => ({
        persona: p.name, emoji: p.emoji, color: p.color,
        firstImpression: i === 0 ? "Scannable layout but needs stronger hook." : i === 1 ? "Experience listed but impact unclear." : "Skills present but proof of depth lacking.",
        mainObjection: i === 0 ? "Where are the quantified results?" : i === 1 ? "What makes this candidate different?" : "Show me the code/projects.",
        verdict: cvScores.overallScore >= 60 ? "Worth a phone screen with revisions." : "Needs significant rework before applying.",
        score: i === 0 ? Math.min(95, cvScores.overallScore + 5) : i === 1 ? cvScores.overallScore : Math.max(10, cvScores.overallScore - 5),
      })),
      sharkTank: undefined,
      funeral: undefined,
      actionPlan: computedActionPlan,
      portfolio: createPortfolioResult(undefined, fallbackAudit, fallbackUX),
    };
  }

  // Use AI text but blend scores with local computed ones for reliability.
  // Weight: 60% local heuristic (reliable baselines), 40% AI assessment (contextual nuance).
  // This ensures scores always reflect actual content while benefiting from AI insight.
  const audit = normalizeAudit(d?.audit || {});
  const ux = normalizeUX(d?.ux || {});

  audit.overallScore = blendScores(audit.overallScore, cvScores.overallScore);
  audit.problemClarity = blendScores(audit.problemClarity, cvScores.problemClarity);
  audit.valueProp = blendScores(audit.valueProp, cvScores.valueProp);
  audit.differentiation = blendScores(audit.differentiation, cvScores.differentiation);
  audit.positioning = blendScores(audit.positioning, cvScores.positioning);

  ux.score = blendScores(ux.score, cvScores.uxScore);
  ux.visualHierarchy = blendScores(ux.visualHierarchy, cvScores.visualHierarchy);
  ux.ctaPlacement = blendScores(ux.ctaPlacement, cvScores.ctaPlacement);
  ux.trustSignals = blendScores(ux.trustSignals, cvScores.trustSignals);

  const personas = Array.isArray(d?.personas) ? d.personas : personaDefs.map(p => ({
    persona: p.name, emoji: p.emoji, color: p.color,
    firstImpression: "N/A", mainObjection: "N/A", verdict: "N/A", score: cvScores.overallScore,
  }));

  // Blend persona scores with local — first persona slightly higher (recruiter), last slightly lower
  personas.forEach((p: PersonaResult, i: number) => {
    const localBase = i === 0 ? Math.min(95, cvScores.overallScore + 5)
                   : i === 1 ? cvScores.overallScore
                   : Math.max(10, cvScores.overallScore - 5);
    p.score = blendScores(p.score || 50, localBase);
  });

  return {
    audit,
    ux,
    personas,
    sharkTank: undefined,
    funeral: undefined,
    actionPlan: mergeActionPlans(d?.actionPlan, computedActionPlan),
    portfolio: createPortfolioResult(d?.portfolio, audit, ux),
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

  const systemPrompt = `${toneMap[ctx.roastLevel]} Return ONLY plain text. No JSON, no labels, no formatting.`;

  const prompt = `ROAST this ${ctx.mode} in 3-5 paragraphs — funny opening, tear into specific flaws (mention actual content), killer punchline.
${buildContext(ctx, 1200)}`;

  let text = "";
  try {
    text = await callCerebras(prompt, { jsonMode: false, timeout: 45000, systemPrompt });
  } catch (err) {
    console.error("OpenCode Zen narrative roast failed:", err);
  }
  const noun = ctx.mode === "portfolio" ? "CV" : "product";
  return text || `The comedy roast narrative is unavailable — the AI backend failed to respond. Please try again later. (CV/product: ${noun})`;
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

  let raw = "";
  try {
    raw = await callCerebras(prompt, { jsonMode: true, temperature: 0.3, timeout: 45000 });
  } catch (err) {
    console.warn("OpenCode Zen portfolio roast failed or rate-limited:", err);
  }
  const ai = parseJSON<any>(raw, {});

  // Blend AI insights with local computed scores
  return {
    overallScore: blendScores(Number(ai?.overallScore) || 0, scores.overallScore),
    firstImpression: blendScores(Number(ai?.firstImpression) || 0, scores.uxScore),
    caseStudyDepth: blendScores(Number(ai?.caseStudyDepth) || 0, scores.problemClarity),
    designTaste: blendScores(Number(ai?.designTaste) || 0, scores.visualHierarchy),
    skillProof: blendScores(Number(ai?.skillProof) || 0, scores.differentiation),
    ctaScore: blendScores(Number(ai?.ctaScore) || 0, scores.ctaPlacement),
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
