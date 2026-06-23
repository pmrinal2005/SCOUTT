// api/index.ts
// =============================================================================
// SCOUTT — Express serverless entry (Vercel @vercel/node)
//
// 🔥 v7 PATCH — fixes the two reported bugs:
//   • Bug #1: Dashboard stuck on demo data after Anakin key is set.
//   • Bug #2: Scenario Simulator returns hardcoded demo content regardless
//             of the query.
//
// Root causes & fixes (full diagnosis at the top of src/live-pipeline.ts).
//
// Key behavioural changes in this file:
//   1. /api/groq/reshape → routes to qwen/qwen3-32b (via live-pipeline). On
//      success it stamps `source: 'anakin-live'` and `reshape_model: 'qwen/qwen3-32b'`.
//   2. /api/dashboard now exposes `source: 'demo-warming'` distinctly when
//      the user has set a key but the pipeline hasn't completed — the
//      frontend uses this to render a SKELETON instead of the literal demo.
//   3. /api/scenario no longer hard-fails with 409 when reshape hasn't
//      finished. It now ALSO accepts the raw Anakin payload (from
//      X-Scoutt-Raw header or body) and lets qwen3-32b reason against it,
//      so the simulator works the instant Anakin polling completes. Demo
//      payloads still cannot reach the scenario route — that property is
//      preserved by checking `(payload.source !== 'demo' && payload.source !== 'demo-warming')`
//      OR the presence of raw.
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
  NVIDIA_MODEL, GROQ_MODEL,
} from '../src/live-pipeline'

import {
  setTenantFor, getTenantFor, effectiveTenant, clearTenantFor,
} from '../src/onboarding-store'

const app = express()
app.use(express.json({ limit: '6mb' }))
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

// ─── STATIC ASSETS ─────────────────────────────────────────────────────
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
// HELPERS
// =============================================================================
function anakinKey(req: Request): string | null {
  return (req.header('x-anakin-key') as string) || process.env.ANAKIN_API_KEY || null
}
function parseDay(req: Request): number {
  const v = Number((req.query?.day as string) ?? '0')
  return Number.isFinite(v) ? Math.max(0, Math.min(7, v)) : 0
}

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
  const headerTenant = readTenantHeader(req)
  if (headerTenant && key) {
    try { setTenantFor(key, headerTenant) } catch {}
  }
  return headerTenant || effectiveTenant(key)
}

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

async function payloadFor(req: Request): Promise<DashboardPayload> {
  const key = anakinKey(req)
  const tenant = tenantForRequest(req)
  const day = parseDay(req)

  const clientCached = readClientCache(req)
  if (clientCached) {
    if (key) pushCacheFor(key, clientCached)
    return clientCached
  }
  const clientRaw = readClientRaw(req)
  if (clientRaw && key) {
    const p = buildPayloadFromAnakinRaw(clientRaw, tenant)
    ;(p as any).source = 'anakin-direct'
    pushRawFor(key, clientRaw)
    pushCacheFor(key, p)
    return p
  }
  return getDashboardPayload({ anakinKey: key, tenant, day, forcedRaw: clientRaw })
}

// =============================================================================
// HEALTH
// =============================================================================
app.get('/api/health', (req, res) => res.status(200).json({
  status: 'ok',
  anakin_user_key:   Boolean(req.header('x-anakin-key')),
  anakin_env_key:    Boolean(process.env.ANAKIN_API_KEY),
  nvidia:            Boolean(process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY),
  elevenlabs:        Boolean(process.env.ELEVENLABS_API_KEY),
  cached_live:       Boolean(req.header('x-anakin-key') && peekCacheFor(String(req.header('x-anakin-key')))),
  reshape_model:     NVIDIA_MODEL,
  reshape_provider:  'nvidia-nim',
  scenario_model:    NVIDIA_MODEL,
  user_tenant:       Boolean(getTenantFor(anakinKey(req))) || Boolean(readTenantHeader(req)),
  client_cache_hdr:  Boolean(req.header('x-scoutt-cache')),
  client_raw_hdr:    Boolean(req.header('x-scoutt-raw')),
  client_tenant_hdr: Boolean(req.header('x-scoutt-tenant')),
  timestamp:         new Date().toISOString(),
}))

// =============================================================================
// ONBOARDING
// =============================================================================
app.post('/api/onboarding/save', (req, res) => {
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
//   POST https://api.anakin.io/v1/agentic-search
// =============================================================================
app.post('/api/anakin/start', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    const inline = (req.body || {}) as any
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
//   GET https://api.anakin.io/v1/agentic-search/{job_id}
// =============================================================================
app.get('/api/anakin/poll/:jobId', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  const jobId = req.params.jobId
  if (!jobId) return res.status(400).json({ error: 'job_id required' })
  try {
    const out = await anakinPollOnce(key, jobId)
    // 🔥 v7 — surface the raw so the frontend can persist it and forward
    // X-Scoutt-Raw on subsequent calls.
    res.json({ ok: true, ...out })
  } catch (e: any) {
    res.status(502).json({ ok: false, status: 'unknown', error: String(e?.message || e) })
  }
})

// =============================================================================
// STEP 3 — Reshape via qwen/qwen3-32b — NEVER returns demo when raw is present.
//   Anakin raw  ──>  Groq qwen/qwen3-32b  ──>  structured DashboardPayload
// =============================================================================
async function reshapeHandler(req: Request, res: Response) {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    const body: any = req.body || {}
    const raw = body.raw ?? readClientRaw(req) ?? peekRawFor(key)
    if (!raw) {
      return res.status(409).json({
        error: 'No Anakin raw output found. Poll must complete first.',
        live_required: true,
      })
    }
    const tenant = tenantForRequest(req)
    const payload = await buildAndCachePayload(key, tenant, raw)
    if ((payload as any).source !== 'anakin-live' && (payload as any).source !== 'anakin-direct') {
      ;(payload as any).source = 'anakin-direct'
    }
    ;(payload as any).reshape_model = (payload as any).reshape_model || GROQ_MODEL
    res.json(payload)
  } catch (e: any) {
    try {
      const k = anakinKey(req) || ''
      const raw = (req.body || {} as any).raw ?? readClientRaw(req) ?? peekRawFor(k)
      const tenant = tenantForRequest(req)
      if (raw) {
        const direct = buildPayloadFromAnakinRaw(raw, tenant)
        ;(direct as any).reshape_error = String(e?.message || e)
        ;(direct as any).reshape_model = `${GROQ_MODEL} (failed — fell to direct mapper)`
        ;(direct as any).source = 'anakin-direct'
        pushCacheFor(k, direct)
        return res.json(direct)
      }
    } catch {}
    res.status(500).json({ error: String(e?.message || e), live_required: true })
  }
}
app.post('/api/groq/reshape',   reshapeHandler)
app.post('/api/nvidia/reshape', reshapeHandler) // back-compat alias

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
// 🔥 SCENARIO SIMULATOR — v7 — qwen/qwen3-32b
//   Accepts ANY free-text query and runs it through Groq qwen3-32b against
//   the live briefing OR — if reshape hasn't completed — the raw Anakin
//   payload directly. NEVER serves a demo response. NEVER throws 409 when
//   raw is available.
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

    // 1. Resolve a LIVE payload if available (strict).
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

    // 2. Also try to obtain a raw Anakin payload (for qwen3-32b context).
    const rawAnakin: any =
      readClientRaw(req) ||
      peekRawFor(key)    ||
      (p ? null : null)

    // 3. Hard gate: must have EITHER a live payload OR raw Anakin output.
    //    We allow raw-only so the simulator works the second Anakin finishes
    //    polling, even before reshape completes.
    const src = p ? (p as any).source : null
    const hasLivePayload = src === 'anakin-live' || src === 'anakin-direct'
    if (!hasLivePayload && !rawAnakin) {
      return res.status(409).json({
        error: 'Live briefing not available yet. Wait for the Anakin pipeline to complete (poll) before running a scenario.',
        live_required: true,
        source: src || 'none',
      })
    }

    // 4. Run through Groq qwen/qwen3-32b.
    const hasNvidia = Boolean(process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY)
    if (hasNvidia) {
      try {
        const out = await groqScenario({
          scenario,
          tenant,
          payload: hasLivePayload ? p : null,
          rawAnakin: rawAnakin || null,
        })
        return res.json({
          scenario, ...out,
          credits_used: 1,
          source: src || 'anakin-raw',
          is_live: true,
          mode: 'nvidia-live',
          provider: 'nvidia-nim',
          model: NVIDIA_MODEL,
        })
      } catch (e: any) {
        console.warn('NVIDIA llama-3.3-70b scenario failed, falling back to offline:', e?.message)
      }
    }

    // 5. Offline fallback — only runs against LIVE payload events.
    if (hasLivePayload && p) {
      const offline = synthScenarioOffline(scenario, p, tenant)
      return res.json({
        scenario, ...offline,
        credits_used: 0,
        source: src, is_live: true,
        mode: hasNvidia ? 'offline-fallback' : 'offline-no-nvidia',
        model: hasNvidia ? `${NVIDIA_MODEL} (failed — fell to offline)` : 'offline (no NVIDIA_API_KEY)',
      })
    }

    // 6. Absolute floor — derive synthetic from raw + tenant.
    const synth = buildPayloadFromAnakinRaw(rawAnakin, tenant)
    ;(synth as any).source = 'anakin-direct'
    const offline = synthScenarioOffline(scenario, synth, tenant)
    return res.json({
      scenario, ...offline,
      credits_used: 0, source: 'anakin-direct', is_live: true,
      mode: 'offline-from-raw',
      model: 'offline (nvidia unavailable)',
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// Offline scenario synthesiser — pure JS heuristic, operates ONLY on the
// LIVE briefing events. Never references the demo template.
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

  const scored = events.map(e => {
    const hay = `${e.title} ${e.summary} ${(e.tags || []).join(' ')}`.toLowerCase()
    let score = 0
    s.split(/\s+/).filter(w => w.length >= 3).forEach(w => {
      if (hay.includes(w)) score += 2
    })
    if (/regulat|policy|complian|act|law|gdpr|psd|directive/.test(s) && e.pillar === 'policy') score += 3
    if (/competitor|pric|launch|funding|hire|layoff/.test(s) && e.pillar === 'competitor') score += 3
    if (/sentiment|review|reddit|social|backlash|trust/.test(s) && e.pillar === 'sentiment') score += 3
    return { e, score }
  }).sort((a, b) => b.score - a.score)

  const picks = (scored.filter(x => x.score > 0).slice(0, 6).length
    ? scored.filter(x => x.score > 0).slice(0, 6)
    : scored.slice(0, 3))

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
// COMPETITOR SCRAPE — Anakin /v1/crawl
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
// TRANSPARENCY — shows the LIVE raw Anakin response + pipeline metadata
// (used by the "How we know this" drawer in the header).
// =============================================================================
app.get('/api/transparency', async (req, res) => {
  const tenant = tenantForRequest(req)
  const key = anakinKey(req)

  // Pull whatever live state we currently have. Order: client header > cache > none.
  const rawAnakin: any = readClientRaw(req) || (key ? peekRawFor(key) : null)
  const cachedPayload: any = readClientCache(req) || (key ? peekCacheFor(key) : null)
  const source = cachedPayload?.source || (rawAnakin ? 'anakin-raw' : (key ? 'awaiting-anakin' : 'demo'))

  res.json({
    source,
    generated_at: cachedPayload?.generated_at_iso || new Date().toISOString(),
    has_anakin_key: Boolean(key),
    has_nvidia_key: Boolean(process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY),
    pipeline: {
      step_1_anakin_submit: {
        endpoint: 'POST https://api.anakin.io/v1/agentic-search',
        system_prompt: DAILY_BRIEFING_SYSTEM_PROMPT,
        user_prompt: dailyBriefingUserPrompt({
          industry: tenant.industry, region: tenant.region,
          competitor_domains: tenant.competitor_domains,
          pillars_enabled: tenant.pillars_enabled,
        }),
        json_schema: BRIEFING_JSON_SCHEMA,
      },
      step_2_anakin_poll: {
        endpoint: 'GET https://api.anakin.io/v1/agentic-search/{job_id}',
        poll_interval_ms: 8000,
      },
      step_3_nvidia_reshape: {
        endpoint: 'POST https://integrate.api.nvidia.com/v1/chat/completions',
        provider: 'nvidia-nim',
        model: NVIDIA_MODEL,
        strategy: 'Anakin agentic-search raw → NVIDIA NIM reshape → structured DashboardPayload.',
      },
      step_4_scenario: {
        endpoint: 'POST /api/scenario → NVIDIA NIM',
        provider: 'nvidia-nim',
        model: NVIDIA_MODEL,
      },
      competitor_scraper: {
        endpoint: 'POST https://api.anakin.io/v1/crawl',
        poll_endpoint: 'GET https://api.anakin.io/v1/crawl/{job_id}',
        prompt: COMPETITOR_SCRAPE_PROMPT(`https://${tenant.competitor_domains?.[0] || 'example.com'}/pricing`),
      },
    },
    tenant,
    reshape_model: cachedPayload?.reshape_model || NVIDIA_MODEL,
    reshape_provider: cachedPayload?.reshape_provider || 'nvidia-nim',
    // 🔥 THIS is what the user wants to see: the LIVE Anakin response
    anakin_live_response: rawAnakin || null,
    anakin_live_response_present: Boolean(rawAnakin),
  })
})

// =============================================================================
// ACTION DRAFTS
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
