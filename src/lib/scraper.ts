// lib/scraper.ts
import * as cheerio from "cheerio";

export interface ScrapedData {
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  ctaTexts: string[];
  ogTitle: string;
  ogDescription: string;
  context: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, noscript, svg, img, nav, footer").remove();

  const title = $("title").text().trim();
  const description = $('meta[name="description"]').attr("content") ?? "";
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const ogDescription = $('meta[property="og:description"]').attr("content") ?? "";

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  const ctaTexts: string[] = [];
  $("button, a").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 60 && text.length > 2) ctaTexts.push(text);
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);

  const context = [
    `Title: ${title}`,
    `OG Title: ${ogTitle}`,
    `Meta Description: ${description || ogDescription}`,
    `Headings: ${headings.slice(0, 10).join(" | ")}`,
    `CTAs: ${[...new Set(ctaTexts)].slice(0, 15).join(", ")}`,
    `Body Text: ${bodyText}`,
  ].join("\n\n");

  return { title, description, headings, bodyText, ctaTexts, ogTitle, ogDescription, context };
}
