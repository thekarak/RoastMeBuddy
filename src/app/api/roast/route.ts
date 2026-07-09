// app/api/roast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";
import { parseFile } from "@/lib/fileParser";
import {
  auditProduct,
  auditUX,
  simulatePersonas,
  sharkTankMode,
  productFuneral,
  buildActionPlan,
  portfolioRoast,
  generateAiroast,
  RoastContext,
  RoastLevel,
  FullRoastResult,
} from "@/lib/gemini";

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

    // Batch 1: audit, ux, personas (parallel)
    const [audit, ux, personas] = await Promise.all([
      auditProduct(ctx),
      auditUX(ctx),
      simulatePersonas(ctx),
    ]);
    await new Promise((r) => setTimeout(r, 1500));

    // Batch 2: sharkTank, funeral, aiRoast (parallel)
    const [sharkTank, funeral, aiRoast] = await Promise.all([
      sharkTankMode(ctx),
      productFuneral(ctx),
      generateAiroast(ctx),
    ]);

    // Batch 3: portfolio (if needed, depends on mode)
    const portfolio = mode === "portfolio" ? await portfolioRoast(ctx) : undefined;

    const partialResult: Partial<FullRoastResult> = {
      audit, ux, personas, sharkTank, funeral,
      ...(portfolio ? { portfolio } : {}),
    };
    const actionPlan = await buildActionPlan(partialResult);

    const fullResult: FullRoastResult = {
      audit, ux, personas, sharkTank, funeral, actionPlan, roastLevel, aiRoast,
      ...(portfolio ? { portfolio } : {}),
    };

    const id = generateId(12);
    // Cache in-memory so GET works even without a database
    resultCache.set(id, { result: fullResult, createdAt: Date.now() });
    await saveRoast(id, mode, url, fullResult);

    return NextResponse.json({ id, result: fullResult });
  } catch (err) {
    console.error("Roast API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("GEMINI_API_KEY") || msg.includes("api_key") || msg.includes("API_KEY_INVALID")) {
      return NextResponse.json({ error: "Invalid or missing Gemini API key. Get one free at aistudio.google.com" }, { status: 500 });
    }
    if (msg.includes("worker") || msg.includes("pdf")) {
      return NextResponse.json({ error: "Failed to parse PDF file. Try a different file." }, { status: 400 });
    }
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Check in-memory cache first
  const cached = resultCache.get(id);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json({ id, result: cached.result });
  }
  resultCache.delete(id); // expired

  // Fallback to database
  const roast = await getRoastById(id);
  if (!roast) return NextResponse.json({ error: "Roast not found" }, { status: 404 });

  return NextResponse.json({ id: roast.id, result: roast.result });
}

export const maxDuration = 60; // Vercel max for hobby plan
