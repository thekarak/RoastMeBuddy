# 🔥 CVRoaster

> **AI-powered product audit tool.** Drop in a URL, get back a brutally honest, scored teardown — from a PM, an investor, and a real user. In under 60 seconds.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thekarak/CVRoaster&env=CEREBRAS_API_KEY&envDescription=Get%20your%20Cerebras%20API%20key%20at%20cloud.cerebras.ai&envLink=https://cloud.cerebras.ai)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Cerebras](https://img.shields.io/badge/Cerebras_AI-gpt--oss--120b-orange?logo=ai)](https://cloud.cerebras.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is CVRoaster?

CVRoaster gives founders, designers, and job-seekers a **24/7 panel of AI experts** that will tear apart their product or portfolio — before the market does it for free.

Built for the **Mind the Product × World Product Day 2026** hackathon.

---

## ✨ Features

| # | Feature | Description |
|---|---------|-------------|
| 01 | 🎯 **Product Audit Engine** | Scores problem clarity, value prop, differentiation, and positioning |
| 02 | 👁️ **UX + Conversion Roast** | Visual hierarchy, CTA placement, friction points, trust signals |
| 03 | 🎭 **AI User Simulator** | Three distinct personas: First-Time Visitor, Founder, Investor |
| 04 | 🦈 **Shark Tank Mode™** | Investor panel fires tough questions, delivers a funding verdict |
| 05 | ⚰️ **Product Funeral™** | AI assumes your startup failed in 3 years — reverse-engineers why |
| 06 | ✅ **Prioritised Action Plan** | Fix this week / this sprint / this quarter — no noise |
| 07 | 💼 **Portfolio Roast** | Hiring Manager Mode™ for designers and job-seekers |
| 08 | 🔥 **AI Roast Narrative** | A full comedy-style roast of your product, 4 intensity levels |

### 🌶️ Roast Intensity Levels
Choose how hard you want to be hit:
- **Light** — Honest but diplomatic
- **Medium** — Direct and blunt  
- **Hard** — No sugarcoating
- **Brutal** — Absolutely savage 💀

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) — App Router, TypeScript |
| **AI Model** | [Cerebras AI](https://cloud.cerebras.ai) — gpt-oss-120b |
| **Styling** | Tailwind CSS v4 — dark mode, glassmorphism |
| **Database** | [Neon](https://neon.tech) PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| **Scraping** | [Cheerio](https://cheerio.js.org) — server-side HTML parsing (no Puppeteer) |
| **Hosting** | [Vercel](https://vercel.com) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A free [Cerebras Cloud](https://cloud.cerebras.ai) account (for the API key)
- *(Optional)* A free [Neon](https://neon.tech) project (for persistent share links)

### 1. Clone & Install

```bash
git clone https://github.com/thekarak/CVRoaster.git
cd CVRoaster
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and add your keys:

```env
# Required — get at https://cloud.cerebras.ai
CEREBRAS_API_KEY=cbs-...

# Optional — enables persistent share links
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
```

**Getting your Cerebras API key:**
1. Go to [cloud.cerebras.ai](https://cloud.cerebras.ai)
2. Click **API Keys** → **Create API Key**
3. Copy and paste into `.env.local`

### 3. (Optional) Set Up Database

If you added a `DATABASE_URL`, run the migration:

```bash
npm run db:push
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── roast/[id]/page.tsx   # Results page (7 audit panels)
│   ├── api/roast/route.ts    # Main API — scrape + AI orchestration
│   └── globals.css           # Design system
└── lib/
    ├── cerebras.ts           # All 8 AI engines (Cerebras gpt-oss-120b)
    ├── scraper.ts            # Cheerio URL scraper
    ├── fileParser.ts         # PDF / DOCX file parsing
    ├── db.ts                 # Neon + Drizzle connection
    └── schema.ts             # Database schema
```

---

## 🚢 Deploy to Vercel

### One-click deploy:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thekarak/CVRoaster&env=CEREBRAS_API_KEY)

### Manual deploy:
```bash
npx vercel --prod
```

Add these environment variables in your Vercel project settings:
- `CEREBRAS_API_KEY` — **required**
- `DATABASE_URL` — optional (Neon connection string)

---

## 🏗️ Architecture

```
User Input (URL / File / Text)
        │
        ▼
   Cheerio Scraper  ──►  Page context (title, headings, CTAs, body)
        │
        ▼
  Cerebras AI  ──►  Parallel AI batch processing
  ┌─────────────────────────────────────┐
  │ runMegaBatch                        │  ← Batch 1 (Audit, UX, Personas,
  │ (Audit, UX, Personas, Shark Tank,   │    Shark Tank, Funeral, Action Plan)
  │  Funeral, Action Plan in 1 Call)    │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │ generateAiroast                     │  ← Batch 2 (Lazy text generation)
  └─────────────────────────────────────┘
        │
        ▼
   Save to Neon DB  ──►  Return share link
```

---

## 📋 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:push    # Push schema to Neon database
npm run db:studio  # Open Drizzle Studio (DB browser)
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a Pull Request

---

## 📄 License

MIT © 2026 CVRoaster — Built for bold builders.

---

<p align="center">
  <strong>Built with ❤️ and 🔥 for the Mind the Product × World Product Day 2026 Hackathon</strong><br/>
  <em>Powered by Cerebras Cloud · Hosted on Vercel · Data on Neon</em>
</p>
