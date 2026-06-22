// api/index.ts
// =============================================================================
// SCOUTT — Express serverless handler for Vercel.
//
// 🔥 REWRITTEN to fix two reported bugs and add three new capabilities:
//
// BUG FIX #1 — "scraping always uses stripe/adyen/checkout no matter what the
// user picks during onboarding"
//   ▸ /api/anakin/start now derives the Anakin prompt from the user's own
//     onboarding tenant (stored per-API-key in src/onboarding-store.ts).
//   ▸ payloadFor(req) and every legacy endpoint downstream of it use that
//     tenant when building the demo template, so even the warming/fallback
//     state reflects the user's industry / region / competitors / pillars.
//   ▸ New endpoints /api/onboarding/save and /api/onboarding/get bridge the
//     wizard's localStorage to the server.
//
// BUG FIX #2 — "scenario simulator always shows demo data, even after API key
// is set"
//   ▸ /api/scenario now calls Groq llama-4-scout-17b (groqScenario) with the
//     user's full cached live briefing + tenant context, so the narrative and
//     impacted-events list are dynamic per query. The old regex math is kept
//     only as a graceful offline fallback when GROQ_API_KEY is missing.
//
// NEW — Anakin Crawl API integration
//   ▸ POST /api/competitor/scrape uses /v1/crawl + /v1/crawl/{id} (see
//     https://anakin.io/docs/api-reference/crawl/submit-crawl-job and
//     https://anakin.io/docs/api-reference/crawl/get-crawl-result) to scrape
//     the user's own competitor pricing pages end-to-end.
// =============================================================================
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'

import { landingPage } from '../src/pages/landing'
import { dashboardPage } from '../src/pages/dashboard'
import { onboardingPage } from '../src/pages/onboarding'

import {
  DEMO_TENANT, DEMO_BRIEFING, DEMO_GLOBE_DOTS, DEMO_CREDIT_LEDGER, buildDemoPayload,
} from '../src/demo-data'

import {
  DAILY_BRIEFING_SYSTEM_PROMPT, dailyBriefingUserPrompt, BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT, COMPETITOR_SCRAPE_PROMPT,
} from '../src/anakin-prompts'

import {
  anakinSubmit, anakinPollOnce, buildAndCachePayload, groqReshape,
  getDashboardPayload, invalidateCacheFor, peekCacheFor, peekRawFor,
  buildBriefingPrompt, groqAsk, groqScenario,
  anakinCrawlAndWait,
} from '../src/live-pipeline'

import {
  setTenantFor, getTenantFor, effectiveTenant, clearTenantFor,
} from '../src/onboarding-store'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── CORS ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anakin-Key')
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

app.get('/static/*', (req: Request, res: Response) => {
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
    } catch { /* try next */ }
  }
  res.status(404).type('text/plain').send(`Static file not found: ${rel}`)
})

app.get(['/favicon.ico', '/favicon.png', '/favicon.svg'], (_req, res) =>
  res.redirect(301, '/static/scoutt_logo.png'),
)

// =============================================================================
// PAGE ROUTES
// =============================================================================
app.get('/', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(landingPage()) })
app.get('/dashboard', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(false)) })
app.get('/threat-index', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(true)) })
app.get('/onboarding', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(onboardingPage()) })

// =============================================================================
// HELPERS — every request now resolves to the USER's tenant when possible.
// =============================================================================
function anakinKey(req: Request): string | null {
  return (req.header('x-anakin-key') as string) || process.env.ANAKIN_API_KEY || null
}
function parseDay(req: Request): number {
  const v = Number((req.query?.day as string) ?? '0')
  return Number.isFinite(v) ? Math.max(0, Math.min(7, v)) : 0
}

/**
 * Resolve the effective tenant for THIS request.
 *   1. If the caller has an Anakin key AND has POSTed /api/onboarding/save,
 *      use that overlay.
 *   2. Otherwise, fall back to DEMO_TENANT (so anonymous demo visitors still
 *      see something meaningful).
 */
function tenantForRequest(req: Request) {
  const key = anakinKey(req)
  return effectiveTenant(key)
}

async function payloadFor(req: Request) {
  const key = anakinKey(req)
  const tenant = tenantForRequest(req)
  const day = parseDay(req)
  return getDashboardPayload({ anakinKey: key, tenant, day })
}

// =============================================================================
// HEALTH
// =============================================================================
app.get('/api/health', (req, res) => res.status(200).json({
  status: 'ok',
  anakin_user_key:  Boolean(req.header('x-anakin-key')),
  anakin_env_key:   Boolean(process.env.ANAKIN_API_KEY),
  groq:             Boolean(process.env.GROQ_API_KEY),
  elevenlabs:       Boolean(process.env.ELEVENLABS_API_KEY),
  cached_live:      Boolean(req.header('x-anakin-key') && peekCacheFor(String(req.header('x-anakin-key')))),
  reshape_model:    'meta-llama/llama-4-scout-17b-16e-instruct (Groq)',
  user_tenant:      Boolean(getTenantFor(anakinKey(req))),
  timestamp:        new Date().toISOString(),
}))

// =============================================================================
// 🆕 ONBOARDING — persist / read the user's tenant overlay (per Anakin key)
// =============================================================================
app.post('/api/onboarding/save', (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required to bind tenant' })
  try {
    const body = (req.body || {}) as any
    const saved = setTenantFor(key, {
      industry: body.industry,
      region: body.region,
      competitor_domains: body.competitor_domains || body.competitors,
      pillars_enabled: body.pillars_enabled || body.pillars,
      name: body.name,
    })
    // Any cached live dashboard is now stale.
    invalidateCacheFor(key)
    res.json({ ok: true, tenant: saved })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: String(e?.message || e) })
  }
})

app.get('/api/onboarding/get', (req, res) => {
  const key = anakinKey(req)
  const t = getTenantFor(key)
  res.json({ ok: true, tenant: t, fallback: t ? null : DEMO_TENANT })
})

app.post('/api/onboarding/clear', (req, res) => {
  const key = anakinKey(req)
  if (key) { clearTenantFor(key); invalidateCacheFor(key) }
  res.json({ ok: true })
})

// =============================================================================
// STEP 1 — Anakin submit (≤3s) — now USER-TENANT-aware
//   Docs: https://anakin.io/docs/api-reference/agentic-search/submit-search
// =============================================================================
app.post('/api/anakin/start', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    // Optional inline tenant override on the request body — lets the dashboard
    // start a fresh briefing the instant the user clicks "Save & go live"
    // without an extra round-trip.
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
//   Docs: https://anakin.io/docs/api-reference/agentic-search/get-search-result
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
// STEP 3 — Groq reshape — USER-TENANT-aware
// =============================================================================
async function reshapeHandler(req: Request, res: Response) {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  try {
    const body: any = req.body || {}
    const raw = body.raw ?? peekRawFor(key)
    if (!raw) return res.status(409).json({ error: 'No Anakin raw output found. Poll must complete first.' })
    const tenant = tenantForRequest(req)
    const payload = await buildAndCachePayload(key, tenant, raw)
    res.json(payload)
  } catch (e: any) {
    const tenant = tenantForRequest(req)
    const demo = buildDemoPayload(tenant)
    ;(demo as any).source = 'demo-fallback'
    ;(demo as any).error = String(e?.message || e)
    res.status(200).json(demo)
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
    ;(demo as any).source = 'demo-fallback'
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
// LEGACY endpoints — all derive from the unified, tenant-aware payload.
// =============================================================================
app.get('/api/tenant/demo', (req, res) => res.json(tenantForRequest(req)))

app.get('/api/briefing/today', async (req, res) => {
  const p = await payloadFor(req)
  res.json({ ...p.briefing, source: p.source, generated_at_iso: p.generated_at_iso })
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
// 🆕 COMPETITOR SCRAPE — Anakin /v1/crawl integration
// Docs:
//   https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//   https://anakin.io/docs/api-reference/crawl/get-crawl-result
// =============================================================================
app.post('/api/competitor/scrape', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.status(400).json({ error: 'X-Anakin-Key header required' })
  const body = (req.body || {}) as any
  const tenant = tenantForRequest(req)
  // Default to the FIRST competitor the user picked in onboarding.
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
      ok: true,
      jobId: out.jobId,
      status: out.status,
      url: target,
      totalPages: out.totalPages,
      completedPages: out.completedPages,
      results: (out.results || []).map(r => ({
        url: r.url, status: r.status,
        // truncate to keep response tight
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
  res.json({ index: idx, source: p.source })
})

// =============================================================================
// TRANSPARENCY
// =============================================================================
app.get('/api/transparency', (req, _res) => {
  const tenant = tenantForRequest(req)
  _res.json({
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
      strategy: 'Two parallel JSON-mode calls.',
    },
    competitor_scraper: {
      endpoint: 'POST https://api.anakin.io/v1/crawl',
      poll_endpoint: 'GET https://api.anakin.io/v1/crawl/{job_id}',
      prompt: COMPETITOR_SCRAPE_PROMPT(`https://${tenant.competitor_domains?.[0] || 'example.com'}/pricing`),
    },
    ask_scoutt: {
      endpoint: 'POST https://api.groq.com/openai/v1/chat/completions',
      model:    'meta-llama/llama-4-scout-17b-16e-instruct',
      prompt_template: ASK_FRESH_SEARCH_PROMPT('{user_question}', '{industry}'),
    },
    raw_response_sample: DEMO_BRIEFING,
  })
})

// =============================================================================
// ASK SCOUTT
// =============================================================================
app.post('/api/ask', async (req, res) => {
  const { question } = (req.body || {}) as { question: string }
  const groqKey = process.env.GROQ_API_KEY
  const p = await payloadFor(req)
  const tenant = tenantForRequest(req)
  const briefing = p.briefing

  const context = (briefing.events || []).map((e, i) =>
    `[${i + 1}] (${e.pillar}) ${e.title} — ${e.summary} — ${e.source_url}`).join('\n')

  const systemPrompt = `You are SCOUTT, a Bloomberg-grade business intelligence assistant.
Answer using ONLY the EVIDENCE below. Cite sources using bracket numbers [1] [2] that map to
the evidence list. Tone: terse, decisive, boardroom-ready.
EVIDENCE (today's briefing for ${tenant.industry} in ${tenant.region}):
${context}`

  const citations = (briefing.events || []).slice(0, 3).map((e, i) => ({
    ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
  }))

  if (!groqKey) {
    return res.json({
      answer: synthesizeMockAnswer(question, briefing.threat_level, tenant),
      citations,
      model: 'mock (GROQ_API_KEY not configured)',
      credits_used: 0,
    })
  }
  try {
    const answer = await groqAsk(systemPrompt, question)
    res.json({
      answer,
      citations,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      credits_used: 3,
    })
  } catch (err: any) {
    res.status(500).json({
      error: String(err), answer: 'Error reaching Groq API.', citations,
    })
  }
})

function synthesizeMockAnswer(question: string, threat: number, tenant: any): string {
  const q = (question || '').toLowerCase()
  const c0 = tenant?.competitor_domains?.[0] || 'your top competitor'
  if (q.includes('regulation') || q.includes('compliance'))
    return `Top-of-feed regulation in your ${tenant?.region || 'region'} just changed — audit by end of week [1].`
  if (q.includes('price') || c0 && q.includes(c0.split('.')[0]))
    return `${c0} adjusted pricing within the last 24h — review the diff in Competitor Pulse [2].`
  if (q.includes('churn') || q.includes('sentiment'))
    return `Sentiment around ${tenant?.industry || 'your category'} dropped this week [4].`
  return `Threat level ${threat}/100 across ${tenant?.industry || 'your sector'}. Ask me something specific.`
}

// =============================================================================
// 🆕 SCENARIO — now Groq-driven, falls back to local synth only if GROQ_API_KEY
// is missing. Uses the user's CACHED LIVE briefing whenever it exists.
// =============================================================================
app.post('/api/scenario', async (req, res) => {
  try {
    const { scenario } = (req.body || {}) as { scenario: string }
    if (!scenario || !String(scenario).trim()) return res.status(400).json({ error: 'Empty scenario' })

    const key = anakinKey(req)
    const tenant = tenantForRequest(req)
    let p = key ? peekCacheFor(key) : null
    if (!p) p = await payloadFor(req)

    const hasGroq = Boolean(process.env.GROQ_API_KEY)

    if (hasGroq) {
      try {
        const out = await groqScenario({ scenario, tenant, payload: p })
        return res.json({
          scenario,
          ...out,
          credits_used: 1,
          source: p.source,
          mode: 'groq-live',
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        })
      } catch (e: any) {
        // fall through to offline synth
        console.warn('Groq scenario failed, falling back:', e?.message)
      }
    }

    // ── Offline synthesis (last-resort) — still derived from the LIVE payload
    // if cached, otherwise demo. Now also tenant-aware so it doesn't lock on
    // stripe/adyen/checkout keywords.
    const offline = synthScenarioOffline(scenario, p, tenant)
    res.json({
      scenario,
      ...offline,
      credits_used: 0,
      source: p.source,
      mode: hasGroq ? 'offline-fallback' : 'offline-no-groq',
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

function synthScenarioOffline(scenario: string, p: any, tenant: any) {
  const b = p.briefing
  const s = String(scenario).toLowerCase()
  const compKeywords = (tenant?.competitor_domains || [])
    .map((d: string) => d.split('.')[0].toLowerCase())
  const matchPolicy     = /(regulat|complianc|policy|act\b|gdpr|cfpb|fca|sec\b)/i.test(s)
  const matchCompetitor = compKeywords.some((k: string) => k && s.includes(k)) ||
                          /(price|fee|launch|hire|funding)/i.test(s)
  const matchSentiment  = /(sentiment|review|reddit|complaint|churn|g2\b)/i.test(s)
  const dir = /(delay|drop|lower|cancel|fall|decreas)/i.test(s) ? -1 : 1

  const baseThreat = b.threat_level
  const policyBump     = matchPolicy     ? 14 * dir : 0
  const competitorBump = matchCompetitor ?  9 * dir : 0
  const sentimentBump  = matchSentiment  ?  6 * dir : 0
  // Even when nothing matches, nudge by 3 so the gauge actually moves.
  const noiseBump      = (matchPolicy || matchCompetitor || matchSentiment) ? 0 : 3 * dir
  const newThreat = Math.max(15, Math.min(100,
    baseThreat + policyBump + competitorBump + sentimentBump + noiseBump))

  const pickedPillar = matchPolicy ? 'policy'
                     : matchCompetitor ? 'competitor'
                     : matchSentiment ? 'sentiment'
                     : null

  const impacted = (b.events || [])
    .filter((e: any) => pickedPillar ? e.pillar === pickedPillar : true)
    .slice(0, 5)
    .map((e: any) => ({
      title: e.title, pillar: e.pillar, source_url: e.source_url,
      severity: Math.max(20, Math.min(100, e.severity + (dir < 0 ? -10 : +6))),
    }))

  return {
    threat_level_before: baseThreat,
    threat_level_after: newThreat,
    delta_threats: Math.max(1, (matchPolicy ? 4 : 0) + (matchCompetitor ? 3 : 0) + (matchSentiment ? 2 : 0)),
    delta_actions: Math.max(1, (matchPolicy ? 2 : 0) + (matchCompetitor ? 1 : 0)),
    impacted_events: impacted,
    narrative: `Under "${String(scenario).slice(0, 90)}", projected threat ${newThreat >= baseThreat ? 'rises' : 'falls'} from ${baseThreat} to ${newThreat}. ${impacted.length} ${tenant.industry} events are materially affected.`,
  }
}

// =============================================================================
// ACTION DRAFT
// =============================================================================
app.post('/api/action/draft', async (req, res) => {
  const { action_id, kind } = (req.body || {}) as { action_id: number; kind: 'email' | 'slack' }
  const p = await payloadFor(req)
  const action = (p.briefing.actions || [])[action_id]
  if (!action) return res.status(404).json({ error: 'Action not found' })
  res.json({
    kind,
    body: kind === 'email' ? action.email_draft : action.slack_message,
    generated_by: p.source === 'anakin-live' ? 'anakin agentic-search → groq reshape' : 'demo',
    credits_used: 0,
  })
})

// =============================================================================
// ELEVENLABS TTS PROXY
// =============================================================================
app.post('/api/tts', async (req, res) => {
  const elKey = process.env.ELEVENLABS_API_KEY
  const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'
  if (!elKey) return res.status(400).json({ error: 'ELEVENLABS_API_KEY not set' })
  const { text } = (req.body || {}) as { text: string }
  if (!text) return res.status(400).json({ error: 'No text' })
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': elKey, 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text: String(text).slice(0, 2400),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.7 },
      }),
    })
    if (!r.ok) return res.status(r.status).json({ error: 'TTS upstream ' + r.status })
    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(buf)
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// =============================================================================
// EXPORT
// =============================================================================
export default app
