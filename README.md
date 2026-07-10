# 🔥 CVRoaster (RoastMeBuddy!)

> **An AI-powered product & portfolio teardown engine.** Paste a link, and get a brutally honest, multi-dimensional audit from a Product Manager, a UX Designer, a Startup Investor, and a Roast Master. 

---

## 🙋‍♂️ Hey there! I'm Sourasis.
I am a student, a beginner developer, and someone who is incredibly passionate about AI, Machine Learning, and building cool things. 

I built **CVRoaster** because I wanted to create something fun but genuinely useful for builders, founders, and designers. We all need feedback before launching, but getting busy people to look at your work is hard. So, I built a panel of virtual experts that will tear your creation apart for free in under 60 seconds.

---

## ✨ Features
- 🎯 **Multi-Perspective Audits:** Instant scores for problem clarity, value proposition, and positioning.
- 👁️ **UX & Friction Teardowns:** Analyzes visual hierarchy, CTA placements, and conversion rates.
- 🎭 **Persona Simulators:** Simulates reactions from a first-time visitor, a target user, and a VC investor.
- 🦈 **Investor Pitch & Autopsy:** A simulated Shark Tank panel with tough questions and a reverse-engineered startup post-mortem.
- 💼 **Hiring Manager Mode:** Specific evaluation for design and engineering portfolios.
- 🎤 **The Roast:** A comedy-style narrative write-up of your site, with 4 heat levels (Light, Medium, Hard, and Brutal 💀).
- 📷 **Dashboard Export:** Download your roast card as a shareable image (available on the Roast tab).

---

## 🛠️ Tech Stack
- **Framework:** [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- **AI Backend:** [Cerebras Inference Cloud](https://cloud.cerebras.ai) (Powered by `gpt-oss-120b` for ultra-fast, high-reasoning text generation)
- **Styling:** Tailwind CSS v4 (Glassmorphic dark UI)
- **Scraping:** Jina Reader API (`r.jina.ai`) + Cheerio
- **Database:** Neon PostgreSQL + Drizzle ORM (for saving and sharing roasts)
- **Export:** html2canvas

---

## 🧠 What I Learned (My AI/ML Journey)
Building this app was a massive learning experience. As a beginner, it taught me how to take raw AI models and turn them into a structured, production-ready product:
- **LLM Structured Outputs:** I learned how to instruct models to return strict, parseable JSON structures (`json_object`) instead of plain text, so the frontend can render charts, score bars, and cards dynamically.
- **Parallel AI Execution:** I learned how to handle multiple LLM queries in parallel using asynchronous JavaScript.
- **Headless Page Crawling:** I discovered how modern web parsers convert complex DOM layouts into readable markdown context for LLMs.
- **Browser-Side Rendering:** I learned how to manipulate the browser DOM dynamically to capture and export interactive cards as images.

---

## 🚧 Real Engineering Challenges I Faced
Since I was building on free-tier APIs and serverless hosting (Vercel), I ran into several real-world limitations. Here is how I solved them:

### 1. The 10-Second Vercel Timeout (504 Errors)
- *The Problem:* Initially, the app made 6 sequential calls to the LLM. On Vercel's Hobby tier, functions terminate after 10 seconds. Sequential calls took 15–20 seconds, causing constant `504 Gateway Timeout` crashes.
- *The Solution:* I merged 6 separate prompts into a single, unified **"Mega-Batch"** prompt. The LLM processes everything in one round trip. I then deferred the heavy, creative narrative roast to a separate **lazy-loaded GET call** that loads in the background when the user opens the Roast tab, keeping the initial load under 3 seconds!

### 2. Truncated JSON Outputs & Empty 0/100 Scores
- *The Problem:* The model would sometimes run out of output tokens halfway through writing a large JSON block, causing the JSON parser to crash and defaulting the frontend to `0/100` scores.
- *The Solution:* I bumped the API's `maxOutputTokens` limit to `8192` and added a strict conciseness instruction to the system prompt (e.g. keeping explanations under 2 sentences). I also wrote a fallback JSON cleaner to ensure minor truncation doesn't crash the UI.

### 3. JavaScript SPA Portfolios & Cloudflare Blocks (403 Errors)
- *The Problem:* When scraping portfolio links (especially custom domains or Vercel sites), our standard fetch requests were blocked by Cloudflare firewalls. Even when successful, modern React/Next.js portfolios returned a blank HTML template (`<div id="root"></div>`) because they require client-side JavaScript.
- *The Solution:* I implemented a dual-scraping pipeline. The scraper first routes the URL through **Jina Reader API (`r.jina.ai`)** which handles JS rendering and bypasses Cloudflare blocks, and automatically falls back to Cheerio if Jina is down.

### 4. Invisible Text on Exported PNGs (html2canvas bugs)
- *The Problem:* Users downloading their roast cards reported that the text was completely black/invisible in the PNG. This happened because browser extensions (like Dark Reader) and Tailwind v4's native CSS variables override colors. html2canvas couldn't resolve these variables in its sandbox, defaulting text to black.
- *The Solution:* I utilized html2canvas’s `onclone` callback. Before the screenshot is snapped, my script intercepts the cloned DOM, strips the `.prose` stylesheets, forces card backgrounds to a solid `#14141E`, and overrides text nodes with explicit `!important` color values.

---

## 🚀 Future Improvements (What I want to build next)
- [ ] **Custom System Instructions:** Let users choose the persona of the roaster (e.g., Steve Jobs, Gordon Ramsay, or a friendly mentor).
- [ ] **OCR Image Uploads:** Allow users to upload screenshots of their mobile app or website dashboard instead of just pasting a link.
- [ ] **Deep Link Scanning:** Crawl subpages (like a portfolio's detailed case study page) rather than only scanning the landing page.
- [ ] **PDF Resume Parsing:** Improve CV uploads to give specific feedback on resume layout, typography, and word count.

---

## 💻 Getting Started

### Prerequisites
- Node.js 18+
- A free [Cerebras Cloud](https://cloud.cerebras.ai) API key.

### Setup
1. Clone the repo:
   ```bash
   git clone https://github.com/thekarak/CVRoaster.git
   cd CVRoaster
   npm install
   ```
2. Create a `.env.local` file:
   ```env
   CEREBRAS_API_KEY=your_cerebras_key_here
   # Optional for share links:
   DATABASE_URL=your_postgresql_connection_string
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

<p align="center">
  <strong>Made with ❤️, ☕, and 🔥 by Sourasis Karak</strong><br/>
  <em>Learning, building, and growing in the world of AI/ML.</em>
</p>
