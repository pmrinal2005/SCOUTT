# SCOUTT — Bloomberg Terminal for Small & Mid-market Businesses

<p align="left">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/NVIDIA_NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="NVIDIA" />
  <img src="https://img.shields.io/badge/Anakin_AI-7C3AED?style=for-the-badge&logo=openai&logoColor=white" alt="Anakin" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js" />
  <img src="https://img.shields.io/badge/Font_Awesome-528DD7?style=for-the-badge&logo=fontawesome&logoColor=white" alt="FontAwesome" />
  <img src="https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white" alt="ElevenLabs" />
  <img src="https://img.shields.io/badge/Llama_3.2-FF6F00?style=for-the-badge&logo=meta&logoColor=white" alt="Llama 3.2" />
</p>

> Daily Battle Brief on policy, competitors, and sentiment — fused into one decisive
> screen before your first coffee. Powered by an **Anakin Agentic Search → NVIDIA NIM
> reshape** pipeline that turns raw web intelligence into a fully structured
> dashboard payload.

🔗 **Live demo:** <https://scouttbymrinal.vercel.app/>
🔗 **Source:** <https://github.com/pmrinal2005/SCOUTT>

---

## 🚀 What is SCOUTT?

SCOUTT is a Bloomberg-Terminal-grade morning briefing for small and mid-market
operators. Every business day at 06:00 UTC it scans regulatory filings, competitor
pricing pages, and consumer sentiment streams, then synthesises everything into:

- A single **Threat Level** score (0-100) with a Bloomberg-style needle gauge.
- A 24-hour **Pulse Wheel** of events across Policy / Competitor / Sentiment.
- A **Global Regulatory Heatmap** of enforcement activity (real world map).
- The **Top 3 actions** the operator should take today — ready as email & Slack drafts.
- An NVIDIA-powered **Ask SCOUTT** chat over the day's evidence with bracket citations.

---

## 🏗️ Architecture

```
              ┌────────────────────────┐
   Browser ──▶│  POST /api/anakin/start│──▶  Anakin Agentic Search
              └────────────────────────┘            │  (15-credit briefing job)
                          ▲                         │
                          │ {job_id}                ▼
              ┌────────────────────────┐     ┌────────────┐
              │ GET /api/anakin/poll/… │ ◀── │  job queue │  (poll every 8s)
              └────────────────────────┘     └────────────┘
                          ▲                         │
                          │ status: completed       ▼
              ┌────────────────────────┐    ┌─────────────────────┐
              │POST /api/nvidia/reshape│──▶ │ NVIDIA NIM           │
              │  body: {raw}           │    │ meta/llama-3.2-3b   │
              └────────────────────────┘    │ instruct             │
                          │                 └─────────────────────┘
                          ▼
              ┌────────────────────────┐
              │ DashboardPayload (JSON)│ ──▶ rendered into every tile,
              │  cached 10 min per key │     every tab, every chart.
              └────────────────────────┘
```

### Why the pipeline is split across **three** short serverless calls

Vercel **Hobby** plan caps every serverless function at **60s**. A real
Anakin Agentic Search job typically takes 40-90s, plus the NVIDIA NIM
reshape (5-15s). Running all of that inside a single request always
timed out before NVIDIA was even invoked — that's why the previous
deploy showed *"Live call failed — Anakin poll timeout (Vercel 60s cap)"*
and NVIDIA logs were empty.

The fix splits the pipeline:

| Step | Endpoint                       | Duration | Purpose                              |
|------|--------------------------------|----------|--------------------------------------|
| 1    | `POST /api/anakin/start`       | ≤3 s     | Submit Anakin job, return `job_id`. |
| 2    | `GET  /api/anakin/poll/:jobId` | ≤2 s     | One Anakin poll (browser loops).    |
| 3    | `POST /api/nvidia/reshape`     | ≤15 s    | NVIDIA reshape → DashboardPayload.  |

The browser orchestrates the loop. No single serverless call ever
approaches the 60 s wall, and NVIDIA is now reliably invoked.

---

## 🧰 Tech Stack

| Layer            | Technology                                                                        |
|------------------|-----------------------------------------------------------------------------------|
| Web framework    | [Express](https://expressjs.com/) on Vercel `@vercel/node`                       |
| Language         | TypeScript 5.x                                                                    |
| Hosting          | [Vercel](https://vercel.com) (Hobby / Pro)                                       |
| Database         | [Supabase](https://supabase.com) (Postgres + pgvector + Realtime + RLS)          |
| LLM              | [NVIDIA NIM](https://build.nvidia.com) `meta/llama-3.2-3b-instruct`              |
| Agentic search   | [Anakin Agentic Search](https://anakin.io/docs/api-reference/agentic-search)     |
| Styling          | Tailwind CDN + Inter / JetBrains Mono                                            |
| Charts           | Chart.js + custom SVG (Pulse Wheel, Threat Meter, World Map, Sankey, Bubbles)    |
| TTS              | [ElevenLabs](https://elevenlabs.io) (multilingual v2)                            |
| Icons            | Font Awesome 6                                                                    |

---

## 📁 Project Structure

```
SCOUTT/
├── api/
│   └── index.ts                       # Vercel serverless entry (Express app)
├── src/
│   ├── live-pipeline.ts               # 🆕 Async Anakin → NVIDIA pipeline
│   ├── anakin-prompts.ts              # Anakin briefing prompt + NVIDIA reshape prompt
│   ├── demo-data.ts                   # Demo template + buildDemoPayload + DashboardPayload type
│   ├── supabase.ts                    # Supabase client + data accessors
│   └── pages/
│       ├── shell.ts                   # HTML shell (Tailwind/Chart.js CDN)
│       ├── landing.ts                 # Marketing landing page
│       ├── onboarding.ts              # 3-step onboarding wizard
│       └── dashboard.ts               # Command Center + 5 tabs + modals
├── public/
│   └── static/
│       ├── dashboard.js               # All client-side interactivity
│       └── world-map-paths.js         # 🆕 Real-world country SVG paths
├── supabase_setup.sql                 # The one SQL file to paste into Supabase
├── vercel.json                        # Routes & runtime config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API Endpoints

### Async live pipeline (new)

| Method | Endpoint                       | Notes                                                |
|--------|--------------------------------|------------------------------------------------------|
| POST   | `/api/anakin/start`            | Submit Anakin job. Requires `X-Anakin-Key` header.   |
| GET    | `/api/anakin/poll/:job_id`     | One-shot poll. Returns `{status, raw?}`.             |
| POST   | `/api/nvidia/reshape`          | Body `{raw}`. Runs NVIDIA `meta/llama-3.2-3b-instruct`, caches result, returns `DashboardPayload`. |

### Read endpoints (all derive from the cached `DashboardPayload`)

| Endpoint                          | Returns                              |
|-----------------------------------|--------------------------------------|
| `GET /api/dashboard?day=N`        | The unified payload (day-aged).      |
| `GET /api/briefing/today`         | Today's briefing block.              |
| `GET /api/timeline`               | 7-day event timeline.                |
| `GET /api/charts/pricing-race`    | Pricing race series.                 |
| `GET /api/charts/sentiment-volume`| Sentiment volume series.             |
| `GET /api/charts/topic-bubbles`   | Topic cluster bubbles.               |
| `GET /api/charts/policy-regions`  | Policy heatmap pins.                 |
| `GET /api/charts/globe-dots`      | Globe dots (derived from regions).   |
| `GET /api/policy/active`          | Active regulations cards.            |
| `GET /api/competitor/events`      | Competitor events feed.              |
| `GET /api/sentiment/events`       | Sentiment events feed.               |
| `GET /api/search-index`           | ⌘K search corpus.                    |
| `GET /api/transparency`           | Exact prompts + schema (judge bait). |

### Misc

| Endpoint                       | Notes                                                |
|--------------------------------|------------------------------------------------------|
| `POST /api/ask`                | NVIDIA-powered RAG chat over today's evidence.       |
| `POST /api/scenario`           | Re-runs threat math against the cached briefing.     |
| `POST /api/action/draft`       | Returns the cached email / Slack draft for an action.|
| `POST /api/tts`                | ElevenLabs proxy.                                    |
| `POST /api/dashboard/refresh`  | Bust the warm cache for the current key.             |
| `GET  /api/health`             | Reports which integrations are configured.           |

---

## 🛠️ Local setup

> Requires **Node ≥ 18.18** and **npm 9+**.

```bash
# 1) Clone
git clone https://github.com/pmrinal2005/SCOUTT.git
cd SCOUTT

# 2) Install dependencies
npm install

# 3) Configure env vars
cp .env.example .env.local
# fill in keys (see below)

# 4) Run dev server
npm run dev
# → http://localhost:3000
# → http://localhost:3000/dashboard
```

### `.env.local`

```ini
# Required for the NVIDIA reshape step (https://build.nvidia.com/meta/llama-3.2-3b-instruct)
NVIDIA_API_KEY=nvapi-...

# Optional — if not set, users can paste a key from the dashboard UI
ANAKIN_API_KEY=anakin-live-...

# Optional — enables ElevenLabs voice for the "Listen" button
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb

# Supabase (free tier is enough for the demo)
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_TENANT_ID=00000000-0000-0000-0000-000000000001

NODE_ENV=development
```

---

## ☁️ Deploy to Vercel

1. Push to GitHub.
2. <https://vercel.com/new> → import the repo.
3. **Framework preset:** `Other` (`vercel.json` configures everything).
4. Add the env vars from `.env.example` for Production / Preview / Development.
5. **Deploy.**

Verify after the first deploy:

```bash
curl https://your-app.vercel.app/api/health
# → { "status": "ok", "nvidia": true, "anakin_env_key": true, ... }
```

---

## 🔑 Using the live pipeline

1. Open `/dashboard`.
2. Click **Enter API Key** (top right).
3. Paste your Anakin API key (from <https://anakin.io/docs/integrations>).
4. Click **Save & go live**.

The browser then runs the three-step pipeline:

1. `POST /api/anakin/start` → Anakin returns a `job_id`.
2. Loop `GET /api/anakin/poll/:job_id` every 8 s. The loading overlay shows
   *"Step 2/3 — Anakin status: processing (Xs elapsed)"*.
3. Once status is `completed`, the browser calls `POST /api/nvidia/reshape`
   with the raw JSON. NVIDIA reshapes it into the canonical
   `DashboardPayload`, the server caches it for 10 minutes, and the dashboard
   re-renders **every tile** in every tab with the dynamic data.

If the live call ever fails the dashboard gracefully falls back to demo
data and surfaces the error in a toast — the UI never breaks.

---

## 🧪 Verifying NVIDIA is hit

```bash
# After the browser pipeline completes:
curl https://your-app.vercel.app/api/health \
  -H "X-Anakin-Key: anakin-live-..."
# → { ..., "cached_live": true }
```

NVIDIA dashboard at <https://build.nvidia.com> should now show metric
hits for `meta/llama-3.2-3b-instruct`.

---

## 🐞 Bugfixes shipped in this revision

| # | Issue                                                                | Resolution                                                                                       |
|---|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| 1 | Vercel 60 s timeout → NVIDIA never invoked                           | Split the pipeline into 3 short serverless calls orchestrated by the browser (`live-pipeline.ts`).|
| 2 | In-memory cache lost on cold start                                   | Browser carries the Anakin `raw` JSON across calls; server cache is purely an optimisation.       |
| 3 | Threat-Level meter needle pointing outside the gauge card            | Corrected SVG rotation formula in `renderThreatMeter` (`-90° → +90°`, no extra offset).           |
| 4 | "Global Regulatory Heatmap" rendered as crude blobs                  | Replaced with a real equirectangular world map (`world-map-paths.js`) keeping the lat/lng pin math.|
| 5 | `/api/charts/globe-dots` returned demo only                          | Now derives from live `policy.regions` when available.                                            |

---

## 📚 References

- Anakin Agentic Search — <https://anakin.io/docs/api-reference/agentic-search/submit-search>
- NVIDIA NIM Llama 3.2-3B-Instruct — <https://build.nvidia.com/meta/llama-3.2-3b-instruct>
- Vercel serverless function limits — <https://vercel.com/docs/functions/runtimes#size-limits>
- Supabase Realtime — <https://supabase.com/docs/guides/realtime>
- pgvector — <https://github.com/pgvector/pgvector>

---

## 📝 License

MIT.
