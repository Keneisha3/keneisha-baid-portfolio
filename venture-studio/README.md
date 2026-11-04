# Venture Studio

Type a business idea and Venture Studio takes it through five steps:

1. **Analyze:** researches the market on the live web (customers, market size, real competitors with links, trends, pricing, risks) and scores the idea 0–10 with a go / pivot / no-go verdict.
2. **Plan:** writes the MVP spec, brand, KPIs, go-to-market channels and a 30-day plan.
3. **Build:** generates a working web app (landing page, core feature, waitlist signup) with analytics built in.
4. **Launch:** hosts the app inside the studio, or deploys it to Vercel if you add a token.
5. **Monitor:** tracks visitors, CTA clicks, signups and feature usage, re-checks the market on a schedule (new competitors, news, threats), and recommends what to change next. One click applies the recommendations, rebuilds the app and relaunches it.

Claude (the Anthropic API) does the research, scoring, planning and app building. Without an API key it runs in **demo mode** with sample data, so you can try the whole flow first.

## Run it

```bash
cd venture-studio
npm install
cp .env.example .env    # then paste your API key into .env
npm start
```

Open http://localhost:4321.

## Getting an Anthropic API key

1. Go to https://console.anthropic.com and sign up.
2. Under **Billing**, add a payment method and some credit (API usage is pay-as-you-go, separate from a Claude.ai subscription).
3. Under **API Keys**, click **Create Key** and copy it (it starts with `sk-ant-`).
4. Paste it into `venture-studio/.env` as `ANTHROPIC_API_KEY=...` and restart the studio.

Never commit `.env`; it's already in `.gitignore`.

**Cost:** a full run (research, plan, build, pulse) usually costs well under a few dollars, mostly from the web research and app generation. Automatic pulses run once a day per launched venture by default; set `PULSE_HOURS=0` to turn them off.

## Settings (`.env`)

| Variable | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on real research and building. |
| `VERCEL_TOKEN` | Deploys generated apps to Vercel instead of hosting them in the studio. |
| `STUDIO_PUBLIC_URL` | Public URL of the studio. Apps deployed elsewhere send analytics here, so it must be reachable from the internet when you use Vercel. |
| `PULSE_HOURS` | Hours between automatic market pulses (default 24, `0` = off). |
| `PORT`, `HOST` | Where the studio listens (default `127.0.0.1:4321`). |
| `STUDIO_MODEL` | The Claude model used (default `claude-opus-5-5`). |

## How it's built

- `server.js`: Express server with the studio API, the public analytics endpoint (`/api/track/:id`), hosting for generated apps (`/apps/:id/`) and the monitoring scheduler.
- `lib/pipeline.js`: the five stages and the prompts.
- `lib/claude.js`: Claude API calls (web search for research, structured JSON output for everything else).
- `lib/schemas.js`: the shape of each stage's output.
- `lib/deploy.js`: studio hosting or Vercel deploys.
- `lib/demo.js`: sample output for demo mode.
- `public/`: the dashboard (plain HTML/CSS/JS).
- `data/`: projects, generated apps and analytics events (git-ignored).

## Limits

- Generated apps are static front-ends that save data in the visitor's browser. Accounts, payments and a shared database would come in a later version.
- The scheduler only runs while the studio is running. To monitor around the clock, run it on an always-on host (Render, Railway, Fly.io, or a small VPS) and set `STUDIO_PUBLIC_URL` to its address.
- The studio has no login. Keep `HOST=127.0.0.1` unless it sits behind a login or proxy.
