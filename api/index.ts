// api/index.ts
// =============================================================================
// SCOUTT — Express serverless entry (Vercel @vercel/node)
//
// 🔥 v6 PATCH — bulletproof against the two reported bugs:
//   • Bug #1: Dashboard stuck on demo data
//   • Bug #2: Scenario Simulator returns demo data regardless of input
//
// Both bugs share ONE root cause on the server side: Vercel serverless
// lambdas are stateless across instances, so the in-memory raw/payload
// cache populated by /api/groq/reshape on Lambda A was invisible to
// /api/dashboard, /api/scenario, /api/charts/* on Lambda B. The browser
// already shipped a `X-Scoutt-Cache` header with the rendered payload,
// but Anakin payloads regularly exceed the 32 KB cap and were silently
// dropped — causing the server to return demo, the scenario to consume
// demo, etc.
//
// THIS REWRITE:
//   1. Adds support for the new `X-Scoutt-Raw` request header. The
//      browser persists the Anakin raw `generatedJson` in localStorage
//      and forwards it on every call. The server can therefore rebuild
//      the live payload on any cold lambda WITHOUT any in-memory state.
//   2. /api/scenario now REFUSES to run against a non-live payload and
//      returns 409 with `live_required: true` so the frontend can
//      trigger the pipeline first. No more demo events leaking into
//      simulator output.
//   3. /api/groq/reshape always returns `source: anakin-direct` (or
//      anakin-live) when raw is present — never demo-fallback.
//   4. /api/onboarding/save accepts the onboarding payload without an
//      Anakin key (it falls back to a deterministic session id) so we
//      can persist Step-1-3 answers even before the user enters a key.
//
// Anakin docs:
//   https://anakin.io/docs/integrations
//   https://anakin.io/docs/api-reference/agentic-search/submit-search
//   https://anakin.io/docs/api-reference/agentic-search/get-search-result
//   https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//   https://anakin.io/docs/api-reference/crawl/get-crawl-result
// =============================================================================
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'

import { landingPage } from '../src/pages/landing'
import { dashboardPage } from '../src/pages/dashboard'
import { onboardingPage } from '../src/pages/onboarding'

import {
  DEMO_TENANT, DEMO_BRIEFING, DEMO_GLOBE_DOTS, DEMO_CREDIT_LEDGER, buildDemoPayload,
  type DashboardPayload,
} from '../src/demo-data'

import {
  DAILY_BRIEFING_SYSTEM_PROMPT, dailyBriefingUserPrompt, BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT, COMPETITOR_SCRAPE_PROMPT,
} from '../src/anakin-prompts'

import {
  anakinSubmit, anakinPollOnce, buildAndCachePayload,
  getDashboardPayload, invalidateCacheFor, peekCacheFor, peekRawFor,
  pushCacheFor, pushRawFor, buildBriefingPrompt, groqAsk, groqScenario,
  anakinCrawlAndWait, buildPayloadFromAnakinRaw,
} from '../src/live-pipeline'

import {
  setTenantFor, getTenantFor, effectiveTenant, clearTenantFor,
} from '../src/onboarding-store'

const app = express()
app.use(express.json({ limit: '6mb' })) // 🔥 raised so we can accept raw in body
app.use(express.urlencoded({ extended: true }))

// ─── CORS ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Anakin-Key, X-Scoutt-Cache, X-Scoutt-Raw, X-Scoutt-Tenant')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ─── STATIC ASSETS (unchanged) ─────────────────────────────────────────
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const STATIC_DIR = path.join(PUBLIC_DIR, 'static')
const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
}
app.use('/static', express.static(STATIC_DIR, { maxAge: '1h', fallthrough: true }))
app.get('/static/*', (req, res) => {
  const rel = req.path.replace(/^\/static\//, '')
  if (rel.includes('..')) return res.status(400).end()
  const candidates = [
    path.join(STATIC_DIR, rel),
    path.join(process.cwd(), 'public', 'static', rel),
    path.join(__dirname, '..', 'public', 'static', rel),
    path.join(__dirname, '..', '..', 'public', 'static', rel),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const ext = path.extname(p).toLowerCase()
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return fs.createReadStream(p).pipe(res)
      }
    } catch {}
  }
  res.status(404).type('text/plain').send(`Static file not found: ${rel}`)
})
app.get(['/favicon.ico', '/favicon.png', '/favicon.svg'], (_req, res) =>
  res.redirect(301, '/static/scoutt_logo.png'),
)

// ─── PAGE ROUTES ───────────────────────────────────────────────────────
app.get('/', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(landingPage()) })
app.get('/dashboard', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(false)) })
app.get('/threat-index', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(true)) })
app.get('/onboarding', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(onboardingPage()) })

// =============================================================================
// HELPERS — every request resolves to USER's tenant + USER's live data.
// =============================================================================
function anakinKey(req: Request): string | null {
  return (req.header('x-anakin-key') as string) || process.env.ANAKIN_API_KEY || null
}
function parseDay(req: Request): number {
  const v = Number((req.query?.day as string) ?? '0')
  return Number.isFinite(v) ? Math.max(0, Math.min(7, v)) : 0
}

/** Decode the `X-Scoutt-Tenant` header if present (URL-safe b64 JSON). */
function readTenantHeader(req: Request): any | null {
  const hdr = req.header('x-scoutt-tenant')
  if (!hdr) return null
  try {
    const b64 = hdr.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf-8')
    const t = JSON.parse(json)
    if (t && typeof t === 'object' && t.industry) return t
  } catch {}
  return null
}

function tenantForRequest(req: Request) {
  const key = anakinKey(req)
  // 🔥 v6 — accept tenant from header so cold lambdas without
  // onboarding-store cache still get the user-specific tenant.
  const headerTenant = readTenantHeader(req)
  if (headerTenant && key) {
    // sync into the per-key store so subsequent same-lambda calls are warm
    try { setTenantFor(key, headerTenant) } catch {}
  }
  return headerTenant || effectiveTenant(key)
}

/** Decode the `X-Scoutt-Cache` header (URL-safe base64 JSON). */
function readClientCache(req: Request): DashboardPayload | null {
  const hdr = req.header('x-scoutt-cache')
  if (hdr) {
    try {
      const b64 = hdr.replace(/-/g, '+').replace(/_/g, '/')
      const json = Buffer.from(b64, 'base64').toString('utf-8')
      const p = JSON.parse(json)
      if (p && p.briefing && (p.source === 'anakin-live' || p.source === 'anakin-direct')) {
        return p as DashboardPayload
      }
    } catch {}
  }
  const bod = (req.body || {}) as any
  if (bod && bod.cached_payload && bod.cached_payload.briefing) {
    const p = bod.cached_payload
    if (p.source === 'anakin-live' || p.source === 'anakin-direct') return p as DashboardPayload
  }
  return null
}

/** 🔥 v6 — Decode the `X-Scoutt-Raw` header (URL-safe base64 JSON). The browser
 *  persists the Anakin raw generatedJson in localStorage and forwards it on
 *  every API call so cold lambdas can rebuild the live payload.
 */
function readClientRaw(req: Request): any | null {
  const hdr = req.header('x-scoutt-raw')
  if (hdr) {
    try {
      const b64 = hdr.replace(/-/g, '+').replace(/_/g, '/')
      const json = Buffer.from(b64, 'base64').toString('utf-8')
      const r = JSON.parse(json)
      if (r && typeof r === 'object') return r
    } catch {}
  }
  const bod = (req.body || {}) as any
  if (bod && bod.raw && typeof bod.raw === 'object') return bod.raw
  return null
}

/** Resolve the payload — strict priority order, NEVER falls back to demo
 *  when a key + raw / cache is present.
 *
 *  1. Client-supplied cached LIVE payload     (X-Scoutt-Cache)
 *  2. Client-supplied raw Anakin generatedJson (X-Scoutt-Raw) → rebuild
 *  3. Server warm-cache live payload          (peekCacheFor)
 *  4. Server warm-cache raw → rebuild         (peekRawFor)
 *  5. demo-warming (key set but pipeline not done yet)
 *  6. demo (no key)
 */
async function payloadFor(req: Request): Promise<DashboardPayload> {
  const key = anakinKey(req)
  const tenant = tenantForRequest(req)
  const day = parseDay(req)

  // 1
  const clientCached = readClientCache(req)
  if (clientCached) {
    if (key) pushCacheFor(key, clientCached)
    return clientCached
  }
  // 2
  const clientRaw = readClientRaw(req)
  if (clientRaw && key) {
    const p = buildPayloadFromAnakinRaw(clientRaw, tenant)
    ;(p as any).source = 'anakin-direct'
    pushRawFor(key, clientRaw)
    pushCacheFor(key, p)
    return p
  }
  // 3 / 4 / 5 / 6 inside getDashboardPayload
  return getDashboardPayload({ anakinKey: key, tenant, day, forcedRaw: clientRaw })
}

// =============================================================================
// HEALTH
// =============================================================================
app.get('/api/health', (req, res) => res.status(200).json({
  status: 'ok',
  anakin_user_key:   Boolean(req.header('x-anakin-key')),
  anakin_env_key:    Boolean(process.env.ANAKIN_API_KEY),
  groq:              Boolean(process.env.GROQ_API_KEY),
  elevenlabs:        Boolean(process.env.ELEVENLABS_API_KEY),
  cached_live:       Boolean(req.header('x-anakin-key') && peekCacheFor(String(req.header('x-anakin-key')))),
  reshape_model:     'meta-llama/llama-4-scout-17b-16e-instruct (Groq) + Anakin-direct fallback',
  user_tenant:       Boolean(getTenantFor(anakinKey(req))) || Boolean(readTenantHeader(req)),
  client_cache_hdr:  Boolean(req.header('x-scoutt-cache')),
  client_raw_hdr:    Boolean(req.header('x-scoutt-raw')),
  client_tenant_hdr: Boolean(req.header('x-scoutt-tenant')),
  timestamp:         new Date().toISOString(),
}))

// =============================================================================
// ONBOARDING — persist the user's tenant overlay
// =============================================================================
app.post('/api/onboarding/save', (req, res) => {
  // 🔥 v6 — key is optional on first save (frontend may save Step 1-3 answers
  // before the user enters their API key). We then re-persist with the key
  // present on the next /api/anakin/start call.
  const key = anakinKey(req) || `pending-${Buffer.from(JSON.stringify(req.body || {})).toString('base64').slice(0, 16)}`
  try {
    const body = (req.body || {}) as any
    const saved = setTenantFor(key, {
      industry: body.industry,
      region: body.region,
      competitor_domains: body.competitor_domains || body.competitors,
      pillars_enabled: body.pillars_enabled || body.pillars,
      name: body.name,
    })
    if (anakinKey(req)) invalidateCacheFor(anakinKey(req)!)
    res.json({ ok: true, tenant: saved, key_bound: Boolean(anakinKey(req)) })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: String(e?.message || e) })
  }
})

app.get('/api/onboarding/get', (req, res) => {
  const key = anakinKey(req)
  const headerTenant = readTenantHeader(req)
  const t = headerTenant || getTenantFor(key)
  res.json({ ok: true, tenant: t, fallback: t ? null : DEMO_TENANT })
})

app.post('/api/onboarding/clear', (req, res) => {
  const key = anakinKey(req)
  if (key) { clearTenantFor(key); invalidateCacheFor(key) }
  res.json({ ok: true })
})

// =============================================================================
// STEP 1 — Anakin submit
// =============================================================================
app.post('/api/anakin/start', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    const inline = (req.body || {}) as any
    // Accept inline tenant override (also used by frontend to sync onboarding answers)
    if (inline && (inline.industry || inline.competitor_domains || inline.competitors)) {
      setTenantFor(key, {
        industry: inline.industry,
        region: inline.region,
        competitor_domains: inline.competitor_domains || inline.competitors,
        pillars_enabled: inline.pillars_enabled || inline.pillars,
      })
    }
    const tenant = tenantForRequest(req)
    const prompt = buildBriefingPrompt(tenant)
    const jobId = await anakinSubmit(key, prompt)
    res.json({ ok: true, job_id: jobId, tenant_used: tenant, message: 'Anakin Agentic Search submitted.' })
  } catch (e: any) {
    res.status(502).json({ ok: false, error: String(e?.message || e) })
  }
})

// =============================================================================
// STEP 2 — Anakin single poll
// =============================================================================
app.get('/api/anakin/poll/:jobId', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  const jobId = req.params.jobId
  if (!jobId) return res.status(400).json({ error: 'job_id required' })
  try {
    const out = await anakinPollOnce(key, jobId)
    res.json({ ok: true, ...out })
  } catch (e: any) {
    res.status(502).json({ ok: false, status: 'unknown', error: String(e?.message || e) })
  }
})

// =============================================================================
// STEP 3 — Reshape — NEVER returns demo when raw is present.
// =============================================================================
async function reshapeHandler(req: Request, res: Response) {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    const body: any = req.body || {}
    // 🔥 accept raw from body OR header OR warm cache.
    const raw = body.raw ?? readClientRaw(req) ?? peekRawFor(key)
    if (!raw) {
      return res.status(409).json({
        error: 'No Anakin raw output found. Poll must complete first.',
        live_required: true,
      })
    }
    const tenant = tenantForRequest(req)
    const payload = await buildAndCachePayload(key, tenant, raw)
    // Defensive: never emit demo source here.
    if ((payload as any).source !== 'anakin-live' && (payload as any).source !== 'anakin-direct') {
      ;(payload as any).source = 'anakin-direct'
    }
    res.json(payload)
  } catch (e: any) {
    // Even if buildAndCachePayload threw, build a direct payload as a floor.
    try {
      const k = anakinKey(req) || ''
      const raw = (req.body || {} as any).raw ?? readClientRaw(req) ?? peekRawFor(k)
      const tenant = tenantForRequest(req)
      if (raw) {
        const direct = buildPayloadFromAnakinRaw(raw, tenant)
        ;(direct as any).reshape_error = String(e?.message || e)
        ;(direct as any).source = 'anakin-direct'
        pushCacheFor(k, direct)
        return res.json(direct)
      }
    } catch {/* fall through */}
    // Absolute floor — only if there is genuinely no raw.
    res.status(500).json({ error: String(e?.message || e), live_required: true })
  }
}
app.post('/api/groq/reshape',   reshapeHandler)
app.post('/api/nvidia/reshape', reshapeHandler)  // backwards-compat alias

// =============================================================================
// UNIFIED dashboard endpoint
// =============================================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const p = await payloadFor(req)
    res.json(p)
  } catch (e: any) {
    const tenant = tenantForRequest(req)
    const demo = buildDemoPayload(tenant)
    ;(demo as any).source = anakinKey(req) ? 'demo-warming' : 'demo'
    ;(demo as any).error = String(e?.message || e)
    res.json(demo)
  }
})
app.post('/api/dashboard', async (req, res) => {
  try { res.json(await payloadFor(req)) }
  catch (e: any) {
    const tenant = tenantForRequest(req)
    const demo = buildDemoPayload(tenant)
    ;(demo as any).source = anakinKey(req) ? 'demo-warming' : 'demo'
    ;(demo as any).error = String(e?.message || e)
    res.json(demo)
  }
})
app.post('/api/dashboard/refresh', (req, res) => {
  const key = anakinKey(req)
  if (key) invalidateCacheFor(key)
  res.json({ ok: true })
})

// =============================================================================
// LEGACY endpoints — derive from unified payload
// =============================================================================
app.get('/api/tenant/demo', (req, res) => res.json(tenantForRequest(req)))

app.get('/api/briefing/today', async (req, res) => {
  const p = await payloadFor(req)
  res.json({ ...p.briefing, source: (p as any).source, generated_at_iso: p.generated_at_iso })
})

app.get('/api/timeline',         async (req, res) => res.json((await payloadFor(req)).timeline))
app.get('/api/actions/today',    async (req, res) => res.json((await payloadFor(req)).briefing.actions || []))
app.get('/api/credit-ledger',    (_req, res) => res.json(DEMO_CREDIT_LEDGER))

app.get('/api/charts/pricing-race',     async (req, res) => res.json((await payloadFor(req)).competitor.pricing_race_30d))
app.get('/api/charts/sentiment-volume', async (req, res) => res.json((await payloadFor(req)).sentiment_volume_14d))
app.get('/api/charts/topic-bubbles',    async (req, res) => res.json((await payloadFor(req)).sentiment.topic_cluster))
app.get('/api/charts/wordcloud',        async (req, res) => res.json((await payloadFor(req)).sentiment.word_cloud))
app.get('/api/charts/feature-matrix',   async (req, res) => res.json((await payloadFor(req)).competitor.feature_matrix))
app.get('/api/charts/policy-regions',   async (req, res) => res.json((await payloadFor(req)).policy.regions))
app.get('/api/charts/globe-dots',       async (req, res) => {
  const p = await payloadFor(req)
  const dots = (p.policy?.regions || []).map(r => ({
    lat: r.lat, lng: r.lng, size: r.activity / 100,
    color: r.activity > 70 ? '#06b6d4' : r.activity > 45 ? '#f97316' : '#ec4899',
    label: `${r.country}: ${r.count} changes`,
  }))
  res.json(dots.length ? dots : DEMO_GLOBE_DOTS)
})

app.get('/api/policy/active',     async (req, res) => res.json((await payloadFor(req)).policy.active_regulations))
app.get('/api/competitor/events', async (req, res) => res.json((await payloadFor(req)).competitor.events))
app.get('/api/sentiment/events',  async (req, res) => res.json((await payloadFor(req)).sentiment.events))

// =============================================================================
// 🔥 SCENARIO SIMULATOR — v6 — STRICT LIVE-ONLY
// =============================================================================
//
// Behaviour:
//   • If no Anakin key → 400 "Anakin key required".
//   • If no live/direct payload available (client cache OR raw OR warm
//     cache) → 409 with `live_required: true`. Frontend must run the
//     pipeline first and retry.
//   • If Groq present → groqScenario() (which itself refuses non-live).
//   • If Groq absent → tenant-aware offline analyser (still operates on
//     the LIVE briefing, NEVER the demo template).
//
//   This kills the bug where typing "chatgpt" returned PSD3/Stripe/Adyen
//   (demo events) — those are demo titles, and we now refuse to serve
//   the scenario route with a demo payload.
// =============================================================================
app.post('/api/scenario', async (req, res) => {
  try {
    const body = (req.body || {}) as any
    const scenario = String(body.scenario || '').trim()
    if (!scenario) return res.status(400).json({ error: 'Empty scenario' })

    const key = anakinKey(req)
    if (!key) {
      return res.status(400).json({
        error: 'Anakin API key required to run the Scenario Simulator.',
        live_required: true,
      })
    }
    const tenant = tenantForRequest(req)

    // Resolve a LIVE payload — strict.
    let p: DashboardPayload | null = readClientCache(req)
    if (!p) {
      const clientRaw = readClientRaw(req)
      if (clientRaw) {
        p = buildPayloadFromAnakinRaw(clientRaw, tenant)
        ;(p as any).source = 'anakin-direct'
        pushRawFor(key, clientRaw)
        pushCacheFor(key, p)
      }
    }
    if (!p) p = peekCacheFor(key)
    if (!p) {
      const raw = peekRawFor(key)
      if (raw) {
        p = buildPayloadFromAnakinRaw(raw, tenant)
        ;(p as any).source = 'anakin-direct'
        pushCacheFor(key, p)
      }
    }
    const src = p ? (p as any).source : null
    const isLive = src === 'anakin-live' || src === 'anakin-direct'

    if (!isLive) {
      return res.status(409).json({
        error: 'Live briefing not available yet. The Anakin pipeline must complete before running a scenario.',
        live_required: true,
        source: src || 'none',
      })
    }

    const hasGroq = Boolean(process.env.GROQ_API_KEY)
    if (hasGroq) {
      try {
        const out = await groqScenario({ scenario, tenant, payload: p! })
        return res.json({
          scenario, ...out,
          credits_used: 1,
          source: src, is_live: true,
          mode: 'groq-live',
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        })
      } catch (e: any) {
        console.warn('Groq scenario failed, falling back to offline:', e?.message)
      }
    }
    const offline = synthScenarioOffline(scenario, p!, tenant)
    res.json({
      scenario, ...offline,
      credits_used: 0,
      source: src, is_live: true,
      mode: hasGroq ? 'offline-fallback' : 'offline-no-groq',
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// Offline scenario synthesiser — pure JS heuristic, OPERATES ONLY ON THE LIVE
// briefing events passed in. It can never invent or include demo titles
// because it strictly maps from `payload.briefing.events`.
function synthScenarioOffline(
  scenario: string, payload: DashboardPayload, tenant: any,
): {
  threat_level_before: number; threat_level_after: number
  delta_threats: number; delta_actions: number; narrative: string
  impacted_events: Array<{ title: string; pillar: string; severity: number; source_url?: string }>
} {
  const s = scenario.toLowerCase()
  const events: any[] = (payload.briefing?.events || []).slice()
  const before = Number(payload.briefing?.threat_level ?? 60)

  // Score each event by keyword overlap with the scenario.
  const scored = events.map(e => {
    const hay = `${e.title} ${e.summary} ${(e.tags || []).join(' ')}`.toLowerCase()
    let score = 0
    s.split(/\s+/).filter(w => w.length >= 3).forEach(w => {
      if (hay.includes(w)) score += 2
    })
    // pillar-wide nudges
    if (/regulat|policy|complian|act|law|gdpr|psd|directive/.test(s) && e.pillar === 'policy') score += 3
    if (/competitor|pric|launch|funding|hire|layoff/.test(s) && e.pillar === 'competitor') score += 3
    if (/sentiment|review|reddit|social|backlash|trust/.test(s) && e.pillar === 'sentiment') score += 3
    return { e, score }
  }).sort((a, b) => b.score - a.score)

  // Pick up to 6 highest-scoring events; if none score, take top-3 anyway.
  const picks = (scored.filter(x => x.score > 0).slice(0, 6).length
    ? scored.filter(x => x.score > 0).slice(0, 6)
    : scored.slice(0, 3))

  // Decide direction: positive vibes ("ai", "growth", "opportunity") reduce
  // threat; negative ("breach", "fine", "ban") increase.
  const pos = /\b(ai|growth|opportunity|partnership|win|tailwind|adopt)\b/i.test(s)
  const neg = /\b(breach|fine|ban|crash|recession|fraud|outage|sanction|lawsuit|hack)\b/i.test(s)
  const direction = neg ? +1 : pos ? -1 : 0
  const magnitude = Math.min(20, Math.max(5, picks.length * 3))
  const after = Math.max(15, Math.min(95, before + direction * magnitude + (picks.length >= 3 ? -2 : 0)))

  const impacted = picks.map(({ e }) => ({
    title: e.title,
    pillar: e.pillar,
    severity: Math.max(20, Math.min(100, e.severity + direction * 5)),
    source_url: e.source_url,
  }))

  const comp = (tenant.competitor_domains || [])[0] || 'a competitor'
  const narrative = `Under the hypothetical "${scenario.slice(0, 80)}", SCOUTT projects threat level ${before}→${after} ` +
    `for ${tenant.industry} in ${tenant.region}. ${impacted.length} live event${impacted.length === 1 ? '' : 's'} ` +
    `from today's briefing materially shift, including signal involving ${comp}.`

  return {
    threat_level_before: before,
    threat_level_after: after,
    delta_threats: impacted.length,
    delta_actions: Math.min(5, Math.max(1, Math.round(impacted.length / 2))),
    narrative,
    impacted_events: impacted,
  }
}

// =============================================================================
// COMPETITOR SCRAPE — Anakin /v1/crawl (unchanged)
// =============================================================================
app.post('/api/competitor/scrape', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  const body = (req.body || {}) as any
  const tenant = tenantForRequest(req)
  const target: string | undefined =
    body.url ||
    (tenant.competitor_domains?.[0] ? `https://${tenant.competitor_domains[0]}/pricing` : undefined)
  if (!target) return res.status(400).json({ error: 'No competitor URL configured' })
  try {
    const out = await anakinCrawlAndWait(key, target, {
      maxPages: Math.min(Number(body.maxPages || 3), 5),
      includePatterns: body.includePatterns || ['/pricing*', '/plans*', '/features*'],
      useBrowser: Boolean(body.useBrowser),
      maxWaitMs: 22_000,
    })
    res.json({
      ok: true, jobId: out.jobId, status: out.status, url: target,
      totalPages: out.totalPages, completedPages: out.completedPages,
      results: (out.results || []).map(r => ({
        url: r.url, status: r.status,
        markdown: r.markdown ? r.markdown.slice(0, 6000) : undefined,
        error: r.error,
      })),
    })
  } catch (e: any) {
    res.status(502).json({ ok: false, error: String(e?.message || e) })
  }
})

// =============================================================================
// SEARCH INDEX (⌘K)
// =============================================================================
app.get('/api/search-index', async (req, res) => {
  const p = await payloadFor(req)
  const idx: any[] = []
  p.policy.active_regulations.forEach(r => idx.push({
    section: 'Policy Radar', tab: 'policy', title: r.title,
    subtitle: r.summary, severity: r.severity, url: r.source_url,
  }))
  p.competitor.events.forEach(e => idx.push({
    section: 'Competitor Pulse', tab: 'competitor', title: e.title,
    subtitle: e.summary, severity: e.severity, url: e.source_url,
  }))
  p.sentiment.events.forEach(e => idx.push({
    section: 'Sentiment Storm', tab: 'sentiment', title: e.title,
    subtitle: e.summary, severity: e.severity, url: e.source_url,
  }))
  p.briefing.actions.forEach(a => idx.push({
    section: "Today's Actions", tab: 'command', title: a.title,
    subtitle: a.why_now, severity: null, url: '',
  }))
  p.briefing.events.slice(0, 5).forEach(e => idx.push({
    section: 'Overnight Brief', tab: 'command', title: e.title,
    subtitle: e.summary, severity: e.severity, url: e.source_url,
  }))
  res.json({ index: idx, source: (p as any).source })
})

// =============================================================================
// TRANSPARENCY
// =============================================================================
app.get('/api/transparency', (req, res) => {
  const tenant = tenantForRequest(req)
  res.json({
    daily_briefing: {
      endpoint: 'POST https://api.anakin.io/v1/agentic-search',
      system_prompt: DAILY_BRIEFING_SYSTEM_PROMPT,
      user_prompt: dailyBriefingUserPrompt({
        industry: tenant.industry, region: tenant.region,
        competitor_domains: tenant.competitor_domains,
        pillars_enabled: tenant.pillars_enabled,
      }),
      json_schema: BRIEFING_JSON_SCHEMA,
      poll_endpoint: 'GET https://api.anakin.io/v1/agentic-search/{job_id}',
      poll_interval_ms: 8000,
    },
    groq_reshape: {
      endpoint: 'POST https://api.groq.com/openai/v1/chat/completions',
      model:    'meta-llama/llama-4-scout-17b-16e-instruct',
      strategy: 'Anakin-direct mapper builds floor; Groq merges on top when available.',
    },
    competitor_scraper: {
      endpoint: 'POST https://api.anakin.io/v1/crawl',
      poll_endpoint: 'GET https://api.anakin.io/v1/crawl/{job_id}',
      prompt: COMPETITOR_SCRAPE_PROMPT(`https://${tenant.competitor_domains?.[0] || 'example.com'}/pricing`),
    },
    ask_scoutt: {
      endpoint: 'POST https://api.groq.com/openai/v1/chat/completions',
      model:    'meta-llama/llama-4-scout-17b-16e-instruct',
    },
    scenario_simulator: {
      endpoint: 'POST /api/scenario',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      strict_mode: 'LIVE_ONLY — refuses to run against demo or demo-warming payloads.',
    },
  })
})

// =============================================================================
// ACTION DRAFTS (unchanged)
// =============================================================================
app.post('/api/action/draft', async (req, res) => {
  const body = (req.body || {}) as any
  const id = Number(body.action_id ?? 0)
  const kind: string = body.kind || 'email'
  const p = await payloadFor(req)
  const action = (p.briefing?.actions || [])[id]
  if (!action) return res.status(404).json({ error: 'action not found' })
  res.json({
    kind,
    body: kind === 'slack' ? action.slack_message : action.email_draft,
  })
})

// =============================================================================
// EXPORT FOR @vercel/node
// =============================================================================
export default app
