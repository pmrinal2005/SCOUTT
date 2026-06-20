# 🛰️ RealityPulse — Bloomberg Terminal for SMBs

A daily "Battle Brief" that fuses **Anakin Agentic Search** + **NVIDIA NIM (`meta/llama-3.2-3b-instruct`)** + **Supabase + pgvector** into a single dashboard covering Policy, Competitor, and Sentiment intelligence — with a Pulse Wheel hero visual, side-by-side competitor diffs, RAG-powered `Cmd+K` chat, scenario simulator, and a full Anakin Transparency Drawer.

This README is the canonical setup guide for **Windows + Vercel Hobby + Supabase Free Tier**.

---

## 🧱 Stack at a glance

| Layer | Tech | Why |
|---|---|---|
| Web framework | [Hono](https://hono.dev) | Ultra-light, runs on Node + Vercel |
| Hosting | **Vercel Hobby (free)** | Single serverless function: `api/index.ts` |
| Database | **Supabase Postgres (free)** + `pgvector` | Holds tenants, briefings, events, embeddings |
| Reasoning LLM | **NVIDIA NIM — `meta/llama-3.2-3b-instruct`** | Ask RealityPulse chat, action drafts |
| Agentic search | **Anakin Agentic Search** | Daily brief + competitor scrape (optional) |
| UI | Tailwind (CDN) + Chart.js (CDN) + custom SVG | Pulse Wheel, threat meter, sankey, bubble cloud |
| Static assets | Vercel CDN (`/public`) | Tiny: favicon + dashboard.js |

---

## 🗂️ Repo layout

```
realitypulse/
├── api/
│   └── index.ts              # Vercel serverless entry (imports src/index.tsx)
├── scripts/
│   └── dev.ts                # Local dev server (replaces wrangler)
├── src/
│   ├── index.tsx             # Hono app — every route lives here
│   ├── supabase.ts           # Supabase client + data accessors
│   ├── anakin-prompts.ts     # Exact Anakin prompt strings + JSON schema
│   ├── demo-data.ts          # Deterministic demo seed (fallback)
│   └── pages/
│       ├── shell.ts          # HTML shell (Tailwind + Chart.js CDN)
│       ├── landing.ts        # Landing page (animated SVG globe)
│       ├── onboarding.ts     # 3-step onboarding wizard
│       └── dashboard.ts      # Command Center + 5 tabs
├── public/
│   └── static/
│       ├── dashboard.js      # All client-side interactivity
│       └── favicon.svg
├── migrations/
│   ├── 0001_initial_schema.sql     # tenants, briefings, events, pgvector…
│   ├── 0002_demo_seed.sql          # Demo tenant + briefing
│   └── 0003_realitypulse_rls.sql   # Row-Level Security policies
├── .env.example
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md (you are here)
```

---

## ⚙️ 1. Prerequisites (Windows)

Install these once:

1. **Node.js 20 LTS** — <https://nodejs.org/en/download> (use the Windows MSI installer).
2. **Git for Windows** — <https://git-scm.com/download/win>.
3. **A code editor** — VS Code recommended.

Verify in **PowerShell** (or `cmd`):

```powershell
node --version    REM should print v20.x
npm --version     REM should print 10.x
git --version
```

---

## 📥 2. Clone & install

Open **PowerShell** (or `cmd`) and run:

```powershell
git clone https://github.com/pmrinal2005/SCOUTT.git realitypulse
cd realitypulse
npm install
```

This installs `hono`, `@hono/node-server`, `@supabase/supabase-js`, `tsx`, `typescript`.

---

## 🗄️ 3. Set up Supabase (free tier)

### 3a. Create the project

1. Go to <https://supabase.com> and sign up (free).
2. Click **New project** → name it `realitypulse` → choose a region near you → set a strong DB password → **Create**.
3. Wait ~2 minutes for provisioning.

### 3b. Run the migrations

In the Supabase dashboard:

1. Open **SQL Editor** (left sidebar) → **+ New query**.
2. Open `migrations/0001_initial_schema.sql` in your editor, copy the entire contents, paste into the SQL editor, click **Run**.
3. Repeat with `migrations/0002_demo_seed.sql`.
4. Repeat with `migrations/0003_realitypulse_rls.sql`.

You should see `Success. No rows returned` after each. The schema enables `pgvector` and `uuid-ossp`, creates all 8 tables, the RLS policies, and the demo tenant.

### 3c. Grab your keys

In the Supabase dashboard → **Settings → API** copy these three values:

| Field on Supabase | Variable name |
|---|---|
| `Project URL` | `SUPABASE_URL` |
| `Project API keys → anon public` | `SUPABASE_ANON_KEY` |
| `Project API keys → service_role` | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ The `service_role` key bypasses RLS. **Never** expose it in client-side code. We only use it server-side inside `api/index.ts`.

---

## 🤖 4. Get an NVIDIA NIM key (free)

1. Go to <https://build.nvidia.com/meta/llama-3.2-3b-instruct>.
2. Click **Get API Key** (top right) → sign in.
3. Copy the key — it looks like `nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxx`.
4. NVIDIA grants generous free credits — more than enough for demos.

---

## 🔑 5. Create `.env.local`

In the project root:

```powershell
copy .env.example .env.local
```

Then open `.env.local` in your editor and fill in the four values you just collected:

```bash
SUPABASE_URL=https://abcdefg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NVIDIA_API_KEY=nvapi-xxxxxxxx
DEMO_TENANT_ID=00000000-0000-0000-0000-000000000001
PORT=3000
```

Leave `ANAKIN_API_KEY` blank for now — the app gracefully falls back to demo data.

---

## ▶️ 6. Run locally on Windows

```powershell
npm run dev
```

You should see:

```
🛰️  RealityPulse running at http://localhost:3000
   Landing:   http://localhost:3000/
   Dashboard: http://localhost:3000/dashboard?demo=true
   Supabase:  ✅ connected
   NVIDIA:    ✅ live
```

Open the dashboard URL in your browser. Try `Cmd+K` (`Ctrl+K` on Windows) — Ask RealityPulse a question; the real `meta/llama-3.2-3b-instruct` will answer with inline citations.

### Common Windows gotchas

| Symptom | Fix |
|---|---|
| `'tsx' is not recognized` | Run `npm install` again — make sure it completes. Then `npx tsx --version` |
| Port 3000 already in use | `set PORT=3001 && npm run dev` (or change in `.env.local`) |
| `npm install` hangs behind a proxy | `npm config set proxy http://your-proxy:8080` |
| `EACCES` on save | Run PowerShell as Administrator once, then `npm install` |
| Long-paths error | `git config --system core.longpaths true` |

---

## 🚀 7. Deploy to Vercel (free Hobby tier)

### 7a. Push to GitHub (you've already done this — repo is `pmrinal2005/SCOUTT`)

If you forked or made changes:

```powershell
git add .
git commit -m "Vercel + Supabase migration"
git push origin main
```

### 7b. Import to Vercel

1. Go to <https://vercel.com> → sign up with GitHub (free).
2. Click **Add New… → Project** → pick `SCOUTT` from your repos.
3. **Framework Preset:** leave as **Other** (Vercel auto-reads `vercel.json`).
4. **Build & Output Settings:** leave defaults — `vercel.json` controls everything.
5. **Environment Variables** — add each variable from your `.env.local`:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGciOi…` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi…` |
   | `NVIDIA_API_KEY` | `nvapi-…` |
   | `DEMO_TENANT_ID` | `00000000-0000-0000-0000-000000000001` |

6. Click **Deploy**. ~30 seconds later you get a live URL like `https://realitypulse.vercel.app`.

### 7c. (Optional) Push demo data into Supabase from the live app

Once the URL is live, hit the one-shot seeder:

```powershell
curl -X POST https://realitypulse.vercel.app/api/sync/seed
```

Expected response:

```json
{ "ok": true, "tenant_id": "00000000-0000-0000-0000-000000000001", "briefing_date": "2026-06-20" }
```

> The same seeding is already done by `0002_demo_seed.sql`. `/api/sync/seed` is just a convenience endpoint for re-seeding without re-running SQL.

---

## 🩺 8. Health check

Any time, hit:

```
https://realitypulse.vercel.app/api/health
```

You get:

```json
{ "ok": true, "supabase": true, "nvidia": true, "anakin": false, "time": "…" }
```

If `supabase: false` → your env vars are missing on Vercel.
If `nvidia: false` → Ask RealityPulse will still work (mock answers).

---

## 🧪 9. Verifying each "Wow" feature

| Feature | How to test |
|---|---|
| **Pulse Wheel** | `/dashboard?demo=true` → hover any tick → tooltip + "Open source" link |
| **Side-by-side competitor diff** | Click **Competitor Pulse** tab → see red/green Stripe pricing diff |
| **Threat-level animated needle** | Bottom of Command Center → needle sweeps from -90° to +73 |
| **"What if?" Simulator** | **Scenario** tab → type "What if EU AI Act passes?" → Run |
| **Audio podcast** | Top banner → **🎧 Listen** → browser TTS reads the brief (0 credits) |
| **Auto-generated emails** | Today's 3 Actions card → ✉️ Email → copy-ready draft |
| **Public Threat Index** | `/threat-index` route |
| **Demo mode** | Any URL + `?demo=true` (no auth required) |
| **Credit Meter** | Top-right of dashboard → arc gauge ticks with real Supabase usage |
| **Time Machine** | Top of dashboard → drag slider → re-labels cached state |
| **Archetype** | **Archetype** tab → radar chart you vs industry baseline |
| **Anakin Transparency Drawer** | Top nav → **👁️ How we know this** → slide-in drawer with the exact prompt, JSON schema, credits, cache hours |

---

## 🧠 10. How the data actually flows

```
06:00 UTC daily        ┌─────────────────────┐
  (Vercel Cron) ─────▶ │   /api/cron/daily   │ (you can wire this on Vercel
                       └──────────┬──────────┘  cron schedule — see below)
                                  │
                                  ▼
                  ┌──────────────────────────────┐
                  │  Anakin Agentic Search       │
                  │  POST /v1/agentic-search     │
                  │  prompt = anakin-prompts.ts  │
                  │  schema = BRIEFING_JSON_SCHEMA│
                  └──────────────┬───────────────┘
                                  │ poll every 10s
                                  ▼
                  ┌──────────────────────────────┐
                  │  insertBriefing(...)          │  ──▶  briefings (jsonb)
                  │  + per-event INSERT into     │  ──▶  events
                  │  events table                 │
                  └──────────────┬───────────────┘
                                  │
                                  ▼ Supabase Realtime broadcast
                  ┌──────────────────────────────┐
                  │  Dashboard live-updates       │
                  │  (Framer-style slide-up)      │
                  └──────────────┬───────────────┘
                                  │
   Cmd+K  ─────▶ /api/ask  ─────▶│ NVIDIA meta/llama-3.2-3b-instruct
                                  │ + pgvector RAG over embeddings
                                  ▼
                            Inline citations
```

### Wiring the daily cron on Vercel (optional)

Vercel Hobby allows up to 2 daily cron jobs. Add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 6 * * *" }]
}
```

…then add a route in `src/index.tsx`:

```ts
app.get('/api/cron/daily', async (c) => {
  // submit Anakin job, poll, call insertBriefing(), return job id
  return c.json({ ok: true })
})
```

Anakin code is intentionally left as a stub — the prompts in `src/anakin-prompts.ts` are the exact strings to POST.

---

## 🧹 11. What changed vs. the original Cloudflare version

| File | Status | Reason |
|---|---|---|
| `wrangler.jsonc` | **DELETED** | Cloudflare-specific |
| `ecosystem.config.cjs` | **DELETED** | PM2 + wrangler dev |
| `src/renderer.tsx` | **DELETED** | Dead code (pages bypassed it) |
| `public/static/style.css` | **DELETED** | Empty file |
| `package.json` | **REWRITTEN** | Dropped wrangler/vite-build-cloudflare; added Supabase + tsx |
| `vite.config.ts` | **REWRITTEN** | Now a stub — no Cloudflare adapter |
| `vercel.json` | **NEW** | Routes everything to `api/index.ts` |
| `api/index.ts` | **NEW** | Vercel serverless entry |
| `scripts/dev.ts` | **NEW** | Replaces `wrangler pages dev` on Windows |
| `src/supabase.ts` | **NEW** | Real DB layer with graceful demo-data fallback |
| `src/index.tsx` | **MODIFIED** | Reads from Supabase; drops `CloudflareBindings` type |
| `src/pages/landing.ts` | **MODIFIED** | Replaced Cloudflare badge with Vercel; updated footer |
| `migrations/0002_demo_seed.sql` | **REWRITTEN** | Now seeds the FULL briefing JSONB + all events |
| `migrations/0003_realitypulse_rls.sql` | **NEW** | RLS policies for anon-key reads |
| `.env.example` | **NEW** | Documents every env var |
| `README.md` | **REWRITTEN** | (this file) |

**Untouched (still original):**

- `src/pages/dashboard.ts` — the 708-line Command Center / Pulse Wheel UI
- `src/pages/onboarding.ts` — the 3-step wizard
- `src/pages/shell.ts` — the HTML shell + Tailwind config
- `src/anakin-prompts.ts` — the exact prompts
- `src/demo-data.ts` — the deterministic demo dataset
- `public/static/dashboard.js` — all 640 lines of client-side interactivity
- `public/static/favicon.svg`
- `migrations/0001_initial_schema.sql`

---

## 📜 12. License & credits

MIT. Hat tips:

- [Hono](https://hono.dev) — the framework
- [Anakin Agentic Search](https://anakin.io/docs/api-reference/agentic-search/submit-search)
- [Anakin Pricing](https://anakin.io/pricing) · [Anakin Rate Limits](https://anakin.io/docs/documentation/rate-limits)
- [NVIDIA NIM `meta/llama-3.2-3b-instruct`](https://build.nvidia.com/meta/llama-3.2-3b-instruct)
- [Supabase](https://supabase.com) + [pgvector](https://github.com/pgvector/pgvector)
- [Vercel](https://vercel.com)
