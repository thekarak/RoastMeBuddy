// app/api/roast/route.ts (redeploy trigger)
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";
import { parseFile } from "@/lib/fileParser";
import {
  runMegaBatch,
  generateAiroast,
  portfolioRoast,
  RoastContext,
  RoastLevel,
  FullRoastResult,
} from "@/lib/cerebras";

function generateId(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  let id = "";
  for (let i = 0; i < length; i++) id += chars[randomValues[i] % chars.length];
  return id;
}

// Simple in-memory rate limiter (per-process; on Vercel this resets per cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// In-memory cache fallback so shared links work without a database
const resultCache = new Map<string, { result: unknown; createdAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── URL result cache ──────────────────────────────────────────────────────
// Same URL + mode + roastLevel within 30 min = instant result, 0 API calls.
const urlResultCache = new Map<string, { result: FullRoastResult; createdAt: number }>();
const URL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getUrlCacheKey(url: string | undefined, mode: string, roastLevel: string): string {
  return `${(url || "").toLowerCase().trim()}::${mode}::${roastLevel}`;
}

function getCachedResult(key: string): FullRoastResult | null {
  const entry = urlResultCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > URL_CACHE_TTL) {
    urlResultCache.delete(key);
    return null;
  }
  return entry.result;
}


async function saveRoast(id: string, mode: string, url: string | undefined, result: unknown) {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/lib/db");
    const { roasts } = await import("@/lib/schema");
    await db.insert(roasts).values({ id, mode, inputUrl: url, inputType: "url", result });
  } catch (e) {
    console.error("DB save failed (non-fatal):", e);
  }
}

async function getRoastById(id: string) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/lib/db");
    const { roasts } = await import("@/lib/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(roasts).where(eq(roasts.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let url: string | undefined;
    let mode: "product" | "portfolio" = "product";
    let roastLevel: RoastLevel = "medium";
    let description: string | undefined;
    let scrapedText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      mode = (formData.get("mode") as "product" | "portfolio") || "product";
      roastLevel = (formData.get("roastLevel") as RoastLevel) || "medium";
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      scrapedText = await parseFile(buffer, file.name);
    } else {
      const body = await req.json();
      url = body.url as string | undefined;
      mode = (body.mode as "product" | "portfolio") || "product";
      roastLevel = (body.roastLevel as RoastLevel) || "medium";
      description = body.description as string | undefined;

      if (!url && !description) {
        return NextResponse.json({ error: "URL or description required" }, { status: 400 });
      }

      if (url) {
        try {
          const scraped = await scrapeUrl(url);
          scrapedText = scraped.context;
        } catch (e) {
          console.error("Scrape failed:", e);
          scrapedText = `[SCRAPING FAILED] Could not access the page at ${url}.\nURL: ${url}\nDescription: ${description || "Not provided"}\nAnalyse based on URL alone — the page may be blocked, slow, or non-existent.`;
        }
      } else {
        scrapedText = description || "";
      }
    }

    const ctx: RoastContext = { mode, roastLevel, url, scrapedText, description };

    // ── URL result cache check ────────────────────────────────────────────
    // If same URL+mode+level was roasted in the last 30 min, return instantly (0 API calls).
    const cacheKey = getUrlCacheKey(url, mode, roastLevel);
    const cachedFull = url ? getCachedResult(cacheKey) : null;
    if (cachedFull) {
      console.log(`Cache hit for ${url} — skipping AI calls`);
      const id = generateId(12);
      resultCache.set(id, { result: cachedFull, createdAt: Date.now() });
      return NextResponse.json({ id, result: cachedFull, cached: true });
    }

    // ── 1-call mega-batch orchestration (was 2 calls, originally 7) ───────
    // We defer generateAiroast to a separate lazy GET call to keep initial
    // request well under the Vercel Hobby 10-second serverless execution limit.
    const megaBatch = await runMegaBatch(ctx);
    const { audit, ux, personas, sharkTank, funeral, actionPlan } = megaBatch;

    // Call 2 (optional): portfolio mode only
    const portfolio = mode === "portfolio" ? await portfolioRoast(ctx) : undefined;

    const fullResult: FullRoastResult = {
      audit,
      ux,
      personas,
      sharkTank,
      funeral,
      actionPlan,
      roastLevel,
      aiRoast: "", // Populated lazily on demand
      ...(portfolio ? { portfolio } : {}),
      scrapedText, // Cached to allow lazy generation
      description,
    };

    // Store in URL cache for next identical request
    if (url) urlResultCache.set(cacheKey, { result: fullResult, createdAt: Date.now() });

    const id = generateId(12);
    // Cache in-memory so GET works even without a database
    resultCache.set(id, { result: fullResult, createdAt: Date.now() });
    await saveRoast(id, mode, url, fullResult);

    return NextResponse.json({ id, result: fullResult });
  } catch (err) {
    console.error("Roast API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("CEREBRAS_API_KEY is not set")) {
      const availableKeys = Object.keys(process.env)
        .filter(k => k.toUpperCase().includes("KEY") || k.toUpperCase().includes("CEREB") || k.toUpperCase().includes("GEMINI") || k.toUpperCase().includes("DATABASE"))
        .join(", ");
      return NextResponse.json({ 
        error: `Server Configuration Error: CEREBRAS_API_KEY is not defined. Available env vars on Vercel: [${availableKeys || "None"}]` 
      }, { status: 500 });
    }
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("API_KEY_INVALID") || msg.includes("api_key")) {
      return NextResponse.json({ error: "Authentication Error: The Cerebras API key was rejected as invalid. Check your key at cloud.cerebras.ai." }, { status: 500 });
    }
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json({ error: "Cerebras rate limit hit. Please wait a few seconds and try again." }, { status: 429 });
    }
    if (msg.includes("worker") || msg.includes("pdf")) {
      return NextResponse.json({ error: "Failed to parse PDF file. Try a different file." }, { status: 400 });
    }
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}

async function updateRoastInDb(id: string, result: unknown) {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/lib/db");
    const { roasts } = await import("@/lib/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(roasts).set({ result }).where(eq(roasts.id, id));
  } catch (e) {
    console.error("DB update failed (non-fatal):", e);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // 1. Get the roast from cache or database
  let cachedEntry = resultCache.get(id);
  let roastData: FullRoastResult | null = null;
  let mode = "product";
  let inputUrl: string | undefined = undefined;

  if (cachedEntry && Date.now() - cachedEntry.createdAt < CACHE_TTL_MS) {
    roastData = cachedEntry.result as FullRoastResult;
  } else {
    const dbRoast = await getRoastById(id);
    if (dbRoast) {
      roastData = dbRoast.result as FullRoastResult;
      mode = dbRoast.mode;
      inputUrl = dbRoast.inputUrl || undefined;
    }
  }

  if (!roastData) return NextResponse.json({ error: "Roast not found" }, { status: 404 });

  // 2. If client is requesting lazy AI Roast text narrative
  if (type === "narrative") {
    if (roastData.aiRoast) {
      return NextResponse.json({ aiRoast: roastData.aiRoast });
    }

    try {
      const { generateAiroast } = await import("@/lib/cerebras");
      const ctx: RoastContext = {
        mode: (mode as "product" | "portfolio"),
        roastLevel: roastData.roastLevel,
        url: inputUrl,
        scrapedText: roastData.scrapedText || "",
        description: roastData.description || "",
      };

      const generatedRoast = await generateAiroast(ctx);
      
      // Update data structure
      roastData.aiRoast = generatedRoast;

      // Save back to in-memory cache
      resultCache.set(id, { result: roastData, createdAt: Date.now() });
      
      // Save back to PostgreSQL database
      await updateRoastInDb(id, roastData);

      return NextResponse.json({ aiRoast: generatedRoast });
    } catch (err) {
      console.error("Lazy aiRoast generation failed:", err);
      return NextResponse.json({ error: "Failed to generate AI roast narrative." }, { status: 500 });
    }
  }

  return NextResponse.json({ id, result: roastData });
}

export const maxDuration = 60; // Vercel max for hobby plan
