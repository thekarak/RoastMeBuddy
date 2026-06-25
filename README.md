# RoastMeBuddy!

So I built this thing where you paste a URL or upload your CV, and AI tears it apart. Brutally. It gives you scores, tells you what's wrong, even roleplays as different people reviewing your product. Kind of like getting roasted by your friends, except the friends are AI and they don't hold back.

## What it does

You give it a URL (or a PDF/DOCX), pick how harsh you want the roast to be, and it runs 7 different AI "engines" on your stuff:

- **Product Audit** — Scores your product on problem clarity, value prop, differentiation, positioning. Gives you strengths and weaknesses.
- **UX Teardown** — Finds friction points, buried CTAs, trust issues. Basically tells you why people leave your site.
- **Persona Simulation** — 3 different people (visitor, founder, investor) react to your product and give their honest take.
- **Shark Tank Mode** — Investors grill you with tough questions and give a funding verdict.
- **Product Funeral** — Imagines your product died in 3 years and writes a post-mortem explaining why.
- **AI Comedy Roast** — Just a straight-up roast. Like a stand-up comedian going after your product.
- **Portfolio Review** — If you're showing a portfolio, a hiring manager reviews it and tells you if you'd get hired or ghosted.

## Roast levels

- 🌶️ **Light** — Honest but diplomatic
- 🌶️🌶️ **Medium** — Direct and blunt
- 🌶️🌶️🌶️ **Hard** — No sugarcoating
- 💀🔥 **Brutal** — Absolutely savage

## Sharing and exporting

- Results are encoded right in the URL, so you can share a link with anyone. No account needed.
- You can also download any tab as an image (PNG) to post on social media or send to someone.

## Tech stuff

Built with Next.js 16, React 19, Tailwind CSS v4, and TypeScript. AI is powered by Mistral. PDF/DOCX parsing with pdf2json and mammoth. Image export with html2canvas.

## How to run it

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file and add your Mistral API key:
```
MISTRAL_API_KEY=your_key_here
```
You can get a free key at [console.mistral.ai](https://console.mistral.ai).

3. Start the dev server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) and roast something.

## Optional stuff

If you want shared links to persist across server restarts, you can connect a Neon database:
```
DATABASE_URL=your_neon_connection_string
```
It works fine without it — links are encoded in the URL anyway.

Hosting:

thinking of hosting in Vercel.

## License

MIT
