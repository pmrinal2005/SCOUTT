# 🛰️ RealityPulse / SCOUTT
**Bloomberg Terminal for Small & Mid-market Businesses**
Daily Battle Brief on policy, competitors, and sentiment — powered by Anakin Agentic Search + NVIDIA NIM + Supabase + Vercel.

---

## 🚀 One-paragraph pitch

RealityPulse fuses three streams — regulatory filings, competitor pricing-page diffs, and consumer-sentiment signals — into a single 06:00-UTC **Daily Battle Brief** rendered on a Bloomberg-Terminal-grade dashboard with the **Pulse Wheel** as its hero visual. Anakin Agentic Search does the synthesis (≈15 credits/brief), NVIDIA `meta/llama-3.2-3b-instruct` powers the `Cmd+K` "Ask RealityPulse" chat over a pgvector RAG index, and Supabase Realtime broadcasts INSERTs so the dashboard live-updates with Framer-Motion entrances.

---

## 📐 Architecture (data flow)

1. **Onboarding** → user picks industry + region + competitor domains → saved to `tenants`.
2. **Vercel Cron (06:00 UTC daily)** → kicks the daily briefing route.
3. **Briefing pipeline** → submits an Anakin Agentic Search with templated prompt + custom JSON schema, polls every 10 s.
4. **On completion** → `generated_json` written to `briefings` (JSONB). Sources embedded (NVIDIA NV-Embed-v2) → `pgvector`.
5. **Supabase Realtime** broadcasts the `INSERT` → dashboard updates live.
6. **Hourly check** → `/v1/url-scraper` on competitor pricing pages → diff → `competitor_moves` row + Resend/Slack alert.

---

## 🛠️ Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | [Hono](https://hono.dev/) | Ultra-light, runs on Node + Vercel |
| Hosting | Vercel **Hobby (free)** | Serverless Node functions + global CDN |
| Database | Supabase **Free tier** | Postgres + pgvector + Realtime + RLS |
| LLM | NVIDIA NIM `meta/llama-3.2-3b-instruct` | Free for development on build.nvidia.com |
| Agentic search | Anakin Agentic Search | Structured-output search engine |
| Styling | Tailwind CDN + Inter/JetBrains Mono | Zero build step |
| Charts | Chart.js CDN + custom SVG (Pulse Wheel) | Zero npm bloat |

---

## 📁 Project structure

```
SCOUTT/
├── api/
│   └── index.ts                  # Vercel serverless entry (imports src/index.tsx)
├── scripts/
│   └── dev.ts                    # Local dev server (Node + Hono)
├── src/
│   ├── index.tsx                 # Hono app — every route lives here
│   ├── supabase.ts               # Supabase client + data accessors
│   ├── anakin-prompts.ts         # Exact Anakin prompts + JSON schema
│   ├── demo-data.ts              # Deterministic demo seed (fallback)
│   ├── hono-node-server.d.ts     # Type shim for serve-static subpath
│   └── pages/
│       ├── shell.ts              # HTML shell (Tailwind + Chart.js CDN)
│       ├── landing.ts            # Landing page (animated SVG globe)
│       ├── onboarding.ts         # 3-step onboarding wizard
│       └── dashboard.ts          # Command Center + 5 tabs
├── public/
│   └── static/
│       ├── dashboard.js          # All client-side interactivity
│       └── favicon.svg
├── migrations/                   # Reference only — use supabase_setup.sql
│   ├── 0001_initial_schema.sql
│   ├── 0002_demo_seed.sql
│   └── 0003_realitypulse_rls.sql
├── supabase_setup.sql            # ★ The one file you paste in Supabase
├── .env.example
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 🪟 Local setup — Windows (PowerShell)

> Requires **Node ≥ 18.18** and **npm ≥ 9**. (`node -v` to verify.)

```powershell
# 1) Clone
git clone https://github.com/pmrinal2005/SCOUTT.git
cd SCOUTT

# 2) Install dependencies
npm install

# 3) Configure env vars
copy .env.example .env.local
notepad .env.local   # fill in Supabase + NVIDIA keys

# 4) Run dev server
npm run dev
# → http://localhost:3000
# → http://localhost:3000/dashboard?demo=true
```

### macOS / Linux
```bash
git clone https://github.com/pmrinal2005/SCOUTT.git
cd SCOUTT
npm install
cp .env.example .env.local
nano .env.local
npm run dev
```

---

## 🗄️ Supabase setup (free tier)

1. Create a project at **https://supabase.com/dashboard** (Free tier).
2. Open **SQL Editor → New Query**.
3. Paste the **entire content of `supabase_setup.sql`** (provided in this repo).
4. Click **Run**. You should see `Success. No rows returned`.
5. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(secret — never expose to the client)*

✅ Done. The demo tenant `Acme Fintech` plus today's briefing are now in the DB.

---

## 🚢 Deploy to Vercel (Hobby — free)

1. Push the repo to GitHub.
2. Go to **https://vercel.com/new** → Import your GitHub repo.
3. Framework Preset: **Other** (vercel.json already configures everything).
4. **Environment Variables** — add these for *Production*, *Preview*, and *Development*:

   | Key | Source |
   |---|---|
   | `SUPABASE_URL` | Supabase → Settings → API |
   | `SUPABASE_ANON_KEY` | Supabase → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
   | `DEMO_TENANT_ID` | `00000000-0000-0000-0000-000000000001` |
   | `NVIDIA_API_KEY` | https://build.nvidia.com/meta/llama-3.2-3b-instruct |
   | `ANAKIN_API_KEY` | (optional) https://anakin.io/docs |
   | `NODE_ENV` | `production` |

5. Click **Deploy**. Vercel runs `npm install` and ships `api/index.ts` as a Node serverless function. No build step.

> **❗ Why the previous deploy failed**: `api/index.ts` exported `config.runtime = 'nodejs20.x'`. That option is reserved for `edge`/`experimental-edge` only — the Node runtime is set by `vercel.json` → `functions["api/index.ts"].runtime`. Removing the `config` export fixes the deployment.

---

## 🔌 Hit the live API

| Endpoint | What it returns |
|---|---|
| `GET /` | Landing page |
| `GET /onboarding` | 3-step wizard |
| `GET /dashboard?demo=true` | Bloomberg-style Command Center |
| `GET /threat-index` | Public viral page |
| `GET /api/health` | Status of Supabase / NVIDIA / Anakin connections |
| `GET /api/briefing/today` | Today's full briefing JSON |
| `GET /api/timeline` | 7-day event timeline |
| `GET /api/credit-ledger` | Anakin credit usage |
| `GET /api/transparency` | The exact Anakin prompt + JSON schema (judge-bait) |
| `POST /api/ask` `{question}` | NVIDIA-powered RAG chat |
| `POST /api/scenario` `{scenario}` | Re-runs threat math (0 credits) |
| `POST /api/action/draft` `{action_id, kind}` | Email / Slack draft |
| `POST /api/sync/seed` | One-shot seed Supabase from `demo-data.ts` |

---

## 🧠 NVIDIA NIM integration (Ask RealityPulse)

```ts
const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NVIDIA_API_KEY}` },
  body: JSON.stringify({
    model: 'meta/llama-3.2-3b-instruct',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
    temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: false,
  }),
})
```
The system prompt injects the day's briefing events as `[1] [2] [3]` evidence rows; the LLM must cite back using those bracket numbers. Citations are rendered as clickable chips that scroll to the source card.

---

## 💰 Credit budget (Anakin)

| Activity | Cost | Frequency |
|---|---|---|
| Daily Battle Brief (Agentic Search) | 15 | 1× / day / tenant |
| Competitor pricing diff (url-scraper) | 1 | hourly / domain |
| Ask RealityPulse (fresh search) | 3 | per question |
| Cached scenarios / drafts | 0 | unlimited |

Default budget: **150 credits = 40 dev / 60 demo seed / 30 live / 20 buffer**.

---

## 🧪 Verify deployment

```bash
curl https://YOUR-APP.vercel.app/api/health
# → { "ok": true, "supabase": true, "nvidia": true, "anakin": false, "time": "..." }
```

To re-seed Supabase from the deployed app:
```bash
curl -X POST https://YOUR-APP.vercel.app/api/sync/seed
```

---

## 🏆 Wow features list

| # | Feature | Why it wins |
|---|---|---|
| 1 | Pulse Wheel hero visual | Single memorable image |
| 2 | Side-by-side competitor diff | Tangible Anakin proof |
| 3 | Animated threat-level needle | Bloomberg feel |
| 4 | "What if?" scenario simulator | 0 new credits |
| 5 | Audio podcast brief | Free SpeechSynthesis API |
| 6 | Auto-generated email/Slack drafts | Free, cached |
| 7 | Public Threat Index | Viral SEO play |
| 8 | `?demo=true` deterministic mode | WiFi-proof |
| 9 | Credit Meter widget | Engineering maturity |
| 10 | Time-Machine slider | 0 credits |
| 11 | Archetype comparisons | Free synthetic baseline |
| 12 | Anakin Transparency Drawer | Shows prompts/schema/credits |

---

## 📚 References

- Anakin Agentic Search — https://anakin.io/docs/api-reference/agentic-search/submit-search
- Anakin Pricing — https://anakin.io/pricing
- Anakin Rate Limits — https://anakin.io/docs/documentation/rate-limits
- NVIDIA NIM (Llama 3.2-3B-Instruct) — https://build.nvidia.com/meta/llama-3.2-3b-instruct
- Hono — https://hono.dev
- Supabase Realtime — https://supabase.com/docs/guides/realtime
- pgvector — https://github.com/pgvector/pgvector

---

## 🧹 License

MIT.
