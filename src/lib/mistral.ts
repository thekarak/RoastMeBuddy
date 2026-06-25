// lib/mistral.ts

const MODEL = "mistral-large-2512";
const MISTRAL_BASE_URL = "https://api.mistral.ai/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY is not set in environment variables");
  return key;
}

// ── Roast levels ───────────────────────────────────────────────────────────
export type RoastLevel = "light" | "medium" | "hard" | "brutal";

export const ROAST_LEVELS = [
  { id: "light" as const, label: "Light", icon: "🌶️", desc: "Honest but diplomatic", color: "#22C55E" },
  { id: "medium" as const, label: "Medium", icon: "🌶️🌶️", desc: "Direct and blunt", color: "#F59E0B" },
  { id: "hard" as const, label: "Hard", icon: "🌶️🌶️🌶️", desc: "No sugarcoating", color: "#F97316" },
  { id: "brutal" as const, label: "Brutal", icon: "💀🔥", desc: "Absolutely savage", color: "#EF4444" },
];

function getRoastPrompt(level: RoastLevel): string {
  switch (level) {
    case "light":
      return "You are a friendly product consultant giving constructive feedback. Be honest but diplomatic. Use encouraging language while pointing out areas for improvement. Keep it professional and supportive. Never use profanity or harsh language.";
    case "medium":
      return "You are an experienced product consultant who doesn't sugarcoat things. Give direct, honest feedback. Point out problems clearly without being mean. Be straightforward and constructive. Don't be afraid to be critical.";
    case "hard":
      return "You are a blunt, no-BS product critic. Be brutally honest. Don't hold back. Call out every flaw, every weakness, every bad decision with strong language. Be aggressive and confrontational. This is tough love — tear it apart.";
    case "brutal":
      return "You are the most savage, ruthless product roaster on the internet. Absolutely no mercy. Destroy every flaw with savage, vicious language. Be the Gordon Ramsay of product reviews — make the creator question their life choices. Use harsh words like 'pathetic', 'embarrassing', 'disaster', 'trainwreck', 'garbage'. Be entertaining, devastating, and legendary. Hold NOTHING back. This is a ROAST. Make it hurt.";
  }
}

function getPersonaPrompt(level: RoastLevel): string {
  switch (level) {
    case "light":
      return "You simulate distinct user personas. Each persona is honest but constructive. Be specific. Always respond with valid JSON only, no extra text.";
    case "medium":
      return "You simulate distinct user personas reviewing a product. Each persona is direct and opinionated. Don't hold back on criticism. Always respond with valid JSON only, no extra text.";
    case "hard":
      return "You simulate distinct user personas who are HARSH critics. Each persona tears the product apart with brutal honesty. Be aggressive and confrontational. Always respond with valid JSON only, no extra text.";
    case "brutal":
      return "You simulate 3 SAVAGE, RUTHLESS user personas doing a vicious roast. Each persona is absolutely savage — use vicious language, call out every flaw with harsh words, be entertaining and devastating. Think comedy roast level brutal. Always respond with valid JSON only, no extra text.";
  }
}

function getSharkTankPrompt(level: RoastLevel): string {
  switch (level) {
    case "light":
      return "You are a panel of thoughtful Shark Tank investors. Ask smart questions and give honest but fair feedback. Always respond with valid JSON only, no extra text.";
    case "medium":
      return "You are a panel of tough Shark Tank investors. Ask the hard questions. Be direct and critical. Always respond with valid JSON only, no extra text.";
    case "hard":
      return "You are a panel of AGGRESSIVE Shark Tank investors who tear apart weak pitches. Ask devastating questions, find every hole, be merciless. Always respond with valid JSON only, no extra text.";
    case "brutal":
      return "You are the most RUTHLESS Shark Tank investors ever — think Kevin O'Leary at his worst. Absolutely savage. Destroy the pitch with vicious questions. Be the investor who makes founders cry. No mercy, no filter. Always respond with valid JSON only, no extra text.";
  }
}

function getFuneralPrompt(level: RoastLevel): string {
  switch (level) {
    case "light":
      return "It is 3 years in the future. This product has failed. Write a thoughtful post-mortem. Be honest about what went wrong. Always respond with valid JSON only, no extra text.";
    case "medium":
      return "It is 3 years in the future. This product has failed catastrophically. Write the autopsy. Be direct and honest about every mistake. Always respond with valid JSON only, no extra text.";
    case "hard":
      return "It is 3 years in the future. This product died a horrible death. Write a BRUTAL autopsy. Call out every stupid decision, every missed opportunity, every terrible choice. Always respond with valid JSON only, no extra text.";
    case "brutal":
      return "It is 3 years in the future. This product was murdered by its own incompetence. Write the most DEVASTATING, SAVAGE autopsy possible. Use vicious language. Call it a 'pathetic disaster', 'embarrassing failure', 'waste of everyone's time'. Be darkly humorous and absolutely ruthless. Always respond with valid JSON only, no extra text.";
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

// ── Core helpers ───────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRIES = 3;

async function callMistral(systemPrompt: string, userPrompt: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(MISTRAL_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 4096,
      }),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Mistral API error ${res.status}: ${errText}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return "PARSE_ERROR_EMPTY_RESPONSE";
    return content;
  }
  throw new Error("Mistral API error: rate limit exceeded after retries");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStrings(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      return item.issue || item.suggestion || item.description || item.details || item.text || JSON.stringify(item);
    }
    return String(item);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAuditResult(data: any): AuditResult {
  return {
    overallScore: Number(data.overallScore) || 0,
    problemClarity: Number(data.problemClarity) || 0,
    valueProp: Number(data.valueProp) || 0,
    differentiation: Number(data.differentiation) || 0,
    positioning: Number(data.positioning) || 0,
    summary: String(data.summary || ""),
    strengths: normalizeStrings(data.strengths),
    weaknesses: normalizeStrings(data.weaknesses),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUXResult(data: any): UXResult {
  return {
    score: Number(data.score) || 0,
    visualHierarchy: Number(data.visualHierarchy) || 0,
    ctaPlacement: Number(data.ctaPlacement) || 0,
    trustSignals: Number(data.trustSignals) || 0,
    frictionPoints: normalizeStrings(data.frictionPoints),
    criticalIssues: normalizeStrings(data.criticalIssues),
    warnings: normalizeStrings(data.warnings),
    quickWins: normalizeStrings(data.quickWins),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFuneralResult(data: any): FuneralResult {
  return {
    causeOfDeath: String(data.causeOfDeath || ""),
    timeOfDeath: String(data.timeOfDeath || ""),
    missedSignals: normalizeStrings(data.missedSignals),
    epitaph: String(data.epitaph || ""),
    preventionPlan: normalizeStrings(data.preventionPlan),
    survivalChance: Number(data.survivalChance) || 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePortfolioResult(data: any): PortfolioResult {
  return {
    overallScore: Number(data.overallScore) || 0,
    firstImpression: Number(data.firstImpression) || 0,
    caseStudyDepth: Number(data.caseStudyDepth) || 0,
    designTaste: Number(data.designTaste) || 0,
    skillProof: Number(data.skillProof) || 0,
    ctaScore: Number(data.ctaScore) || 0,
    summary: String(data.summary || ""),
    topIssues: normalizeStrings(data.topIssues),
    recruiterVerdict: String(data.recruiterVerdict || ""),
  };
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
    } catch {}
    return fallback;
  }
}

// ── AI engines ─────────────────────────────────────────────────────────────

export async function auditProduct(ctx: RoastContext): Promise<AuditResult> {
  const raw = await callMistral(
    `${getRoastPrompt(ctx.roastLevel)} You are auditing a ${ctx.mode}. Give specific scores 0-100 and identify real problems. Be ${ctx.roastLevel === "brutal" ? "absolutely savage" : ctx.roastLevel === "hard" ? "extremely harsh" : ctx.roastLevel === "medium" ? "direct and blunt" : "honest but constructive"}. Always respond with valid JSON only, no extra text.`,
    `Audit this ${ctx.mode === "portfolio" ? "portfolio" : "product"}.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON:
{"overallScore":0,"problemClarity":0,"valueProp":0,"differentiation":0,"positioning":0,"summary":"","strengths":[],"weaknesses":[]}`
  );
  return normalizeAuditResult(parseJSON<AuditResult>(raw, {
    overallScore: 50, problemClarity: 50, valueProp: 50, differentiation: 50, positioning: 50,
    summary: "Analysis unavailable.", strengths: ["Could not analyse"], weaknesses: ["Could not analyse"]
  }));
}

export async function auditUX(ctx: RoastContext): Promise<UXResult> {
  const raw = await callMistral(
    `${getRoastPrompt(ctx.roastLevel)} You are a UX + CRO expert. Find every friction point, every buried CTA, every trust gap. Be specific and ${ctx.roastLevel === "brutal" ? "merciless" : ctx.roastLevel === "hard" ? "ruthless" : ctx.roastLevel === "medium" ? "direct" : "constructive"}. Always respond with valid JSON only, no extra text.`,
    `Audit the UX of this page.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON:
{"score":0,"visualHierarchy":0,"ctaPlacement":0,"trustSignals":0,"frictionPoints":[],"criticalIssues":[],"warnings":[],"quickWins":[]}`
  );
  return normalizeUXResult(parseJSON<UXResult>(raw, {
    score: 50, visualHierarchy: 50, ctaPlacement: 50, trustSignals: 50,
    frictionPoints: [], criticalIssues: [], warnings: [], quickWins: []
  }));
}

export async function simulatePersonas(ctx: RoastContext): Promise<PersonaResult[]> {
  const isPortfolio = ctx.mode === "portfolio";
  const personas = isPortfolio
    ? [
        { name: "Recruiter", emoji: "🔍", color: "#FF4500" },
        { name: "Hiring Manager", emoji: "💼", color: "#8B5CF6" },
        { name: "Fellow Designer", emoji: "🎨", color: "#F97316" },
      ]
    : [
        { name: "First-Time Visitor", emoji: "👀", color: "#FF4500" },
        { name: "Founder", emoji: "🚀", color: "#8B5CF6" },
        { name: "Investor", emoji: "💰", color: "#F97316" },
      ];

  const raw = await callMistral(
    getPersonaPrompt(ctx.roastLevel),
    `Simulate these 3 personas reviewing this ${ctx.mode} at ROAST LEVEL: ${ctx.roastLevel.toUpperCase()}.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1000) || "Not provided"}

${ctx.roastLevel === "brutal" ? "BE ABSOLUTELY SAVAGE. Use vicious language. Make it hurt. No mercy." : ctx.roastLevel === "hard" ? "Be very harsh and confrontational." : ctx.roastLevel === "medium" ? "Be direct and unfiltered." : "Be honest but constructive."}

Respond ONLY with this JSON array (3 items):
[{"persona":"${personas[0].name}","emoji":"${personas[0].emoji}","color":"${personas[0].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},{"persona":"${personas[1].name}","emoji":"${personas[1].emoji}","color":"${personas[1].color}","firstImpression":"","mainObjection":"","verdict":"","score":0},{"persona":"${personas[2].name}","emoji":"${personas[2].emoji}","color":"${personas[2].color}","firstImpression":"","mainObjection":"","verdict":"","score":0}]`
  );
  return parseJSON<PersonaResult[]>(raw, personas.map(p => ({
    persona: p.name, emoji: p.emoji, color: p.color,
    firstImpression: "Analysis unavailable.", mainObjection: "N/A", verdict: "N/A", score: 50
  })));
}

export async function sharkTankMode(ctx: RoastContext): Promise<SharkTankResult> {
  const raw = await callMistral(
    getSharkTankPrompt(ctx.roastLevel),
    `Run a Shark Tank panel on this product at ROAST LEVEL: ${ctx.roastLevel.toUpperCase()}.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1200) || "Not provided"}

${ctx.roastLevel === "brutal" ? "DESTROY this pitch. Be the investor who makes founders cry." : ""}

Respond ONLY with this JSON:
{"questions":[{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""},{"question":"","concern":""}],"marketRisk":"","moatAnalysis":"","moatScore":0,"fundingVerdict":"","fundingReadiness":0}`
  );
  return parseJSON<SharkTankResult>(raw, {
    questions: [], marketRisk: "", moatAnalysis: "", moatScore: 0,
    fundingVerdict: "Unable to generate verdict.", fundingReadiness: 0
  });
}

export async function productFuneral(ctx: RoastContext): Promise<FuneralResult> {
  const raw = await callMistral(
    getFuneralPrompt(ctx.roastLevel),
    `Write the product funeral for this ${ctx.mode} at ROAST LEVEL: ${ctx.roastLevel.toUpperCase()}.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1200) || "Not provided"}

Respond ONLY with this JSON:
{"causeOfDeath":"","timeOfDeath":"","missedSignals":[],"epitaph":"","preventionPlan":[],"survivalChance":0}`
  );
  return normalizeFuneralResult(parseJSON<FuneralResult>(raw, {
    causeOfDeath: "", timeOfDeath: "", missedSignals: [], epitaph: "",
    preventionPlan: [], survivalChance: 50
  }));
}

export async function buildActionPlan(allResults: Partial<FullRoastResult>): Promise<ActionPlanResult> {
  const summary = JSON.stringify({
    auditScore: allResults.audit?.overallScore,
    uxScore: allResults.ux?.score,
    criticalIssues: allResults.ux?.criticalIssues,
    weaknesses: allResults.audit?.weaknesses,
    missedSignals: allResults.funeral?.missedSignals,
  }).slice(0, 2000);

  const raw = await callMistral(
    `You are a Chief of Staff. Synthesise audit findings into a prioritised action list. No fluff — specific, high-ROI moves only. Be direct and actionable. Always respond with valid JSON only.`,
    `Based on these results, create a prioritised action plan:
${summary}

Respond ONLY with this JSON:
{"thisWeek":[{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"},{"action":"","impact":"High","effort":"Low"}],"thisSprint":[{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"},{"action":"","impact":"High","effort":"Medium"}],"thisQuarter":[{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"},{"action":"","impact":"High","effort":"High"}]}`
  );
  return parseJSON<ActionPlanResult>(raw, { thisWeek: [], thisSprint: [], thisQuarter: [] });
}

export async function portfolioRoast(ctx: RoastContext): Promise<PortfolioResult> {
  const raw = await callMistral(
    `${getRoastPrompt(ctx.roastLevel)} You are a Hiring Manager who has seen thousands of portfolios. You know what gets someone hired vs ghosted. Be ${ctx.roastLevel === "brutal" ? "absolutely savage — destroy weak portfolios" : ctx.roastLevel === "hard" ? "extremely harsh" : ctx.roastLevel === "medium" ? "direct and honest" : "constructive"}. Always respond with valid JSON only, no extra text.`,
    `Review this portfolio for hiring readiness at ROAST LEVEL: ${ctx.roastLevel.toUpperCase()}.
URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1500) || "Not provided"}

Respond ONLY with this JSON:
{"overallScore":0,"firstImpression":0,"caseStudyDepth":0,"designTaste":0,"skillProof":0,"ctaScore":0,"summary":"","topIssues":[],"recruiterVerdict":""}`
  );
  return normalizePortfolioResult(parseJSON<PortfolioResult>(raw, {
    overallScore: 50, firstImpression: 50, caseStudyDepth: 50, designTaste: 50,
    skillProof: 50, ctaScore: 50, summary: "", topIssues: [], recruiterVerdict: ""
  }));
}

async function callMistralText(systemPrompt: string, userPrompt: string): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(MISTRAL_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 8192,
      }),
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Mistral API error ${res.status}: ${errText}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || "";
  }
  throw new Error("Mistral API error: rate limit exceeded after retries");
}

export async function generateAiroast(ctx: RoastContext): Promise<string> {
  const level = ctx.roastLevel;
  const systemPrompt = level === "light"
    ? "You are a witty comedian roasting a product/portfolio. Be funny and clever but not mean. Make observational humor. Use casual, conversational language like a friend giving feedback at a bar."
    : level === "medium"
    ? "You are a stand-up comedian doing a roast of a product/portfolio. Be funny but sharp. Use good-natured sarcasm. Call out flaws with humor and wit. Casual, conversational tone."
    : level === "hard"
    ? "You are a professional roast master at a comedy roast. Be savage, aggressive, and hilarious. Use brutal but funny insults. Destroy the product/portfolio with clever wordplay and vicious humor. No filter."
    : "You are THE MOST SAVAGE roast master alive — Anthony Jeselnik meets Gordon Ramsay meets a Twitter troll. This is a DESTROY-level roast. Be vicious, cruel, hilarious, and absolutely devastating. Use profanity. Make the creator cry then laugh. This is legendary-level roasting. Leave NO shred of dignity intact.";

  const userPrompt = `ROAST this ${ctx.mode} like you're on stage at a comedy roast. Be ${level === "brutal" ? "absolutely DEVASTATING — use profanity, be vicious" : level === "hard" ? "extremely harsh and savage" : level === "medium" ? "sharp and sarcastic" : "witty and clever"}.

URL: ${ctx.url || "Not provided"}
Content: ${ctx.scrapedText?.slice(0, 1200) || "Not provided"}

Give me a proper roast — 3-5 paragraphs of pure entertainment. Start with a funny opening, then tear into the specific flaws, then close with a killer punchline. Make it read like a real human comedian roasting something. Use conversational language. Be specific about what's on the page — mention actual content you see.

Just return the roast text, no formatting, no JSON, no labels.`;

  const text = await callMistralText(systemPrompt, userPrompt);
  return text || "Could not generate roast. The product is so boring even the AI has nothing to say.";
}
