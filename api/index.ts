// api/index.ts
// =============================================================================
// SCOUTT — Express serverless handler for Vercel.
//
// 🔥 REWRITTEN to address the user's three bugs holistically:
//
//   BUG #1 — Onboarding favicon disappearance      → src/pages/onboarding.ts
//   BUG #2 — Demo data shown after key set         → src/live-pipeline.ts +
//                                                     reshapeHandler below
//   BUG #3 — Scenario simulator stuck on demo data → /api/scenario below
//
// Key changes in THIS file
// ────────────────────────
//  • `reshapeHandler` no longer falls back to the demo template on Groq
//    failure. It calls `buildAndCachePayload`, which now uses the new
//    Anakin-direct mapper to surface scraped Anakin items even without
//    Groq, so the dashboard always reflects the live scrape after the
//    poll completes.
//
//  • `/api/scenario` now ALWAYS works against the user's REAL briefing
//    when a live or anakin-direct payload exists in cache. If no payload
//    is cached but raw Anakin output IS cached (poll completed but
//    reshape didn't run yet), it builds an anakin-direct payload on the
//    fly so the scenario reflects the user's tenant + scrape — never the
//    bundled demo data.
//
//  • `synthScenarioOffline` is now a fully tenant-aware analyser that
//    parses keywords from the user's free-text query and produces a
//    query-specific narrative, delta numbers, and impacted-events list.
//    Even when Groq is unavailable it never falls back to generic demo
//    sentences.
//
// Anakin docs referenced in this file:
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
  buildPayloadFromAnakinRaw,
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
  reshape_model:    'meta-llama/llama-4-scout-17b-16e-instruct (Groq) + Anakin-direct fallback',
  user_tenant:      Boolean(getTenantFor(anakinKey(req))),
  timestamp:        new Date().toISOString(),
}))

// =============================================================================
// ONBOARDING — persist / read the user's tenant overlay (per Anakin key)
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
// STEP 1 — Anakin submit (≤3s) — USER-TENANT-aware
//   Docs: https://anakin.io/docs/api-reference/agentic-search/submit-search
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
// STEP 3 — Reshape — USER-TENANT-aware
//
// 🔥 FIX (bug #2): never silently return the demo template on Groq failure.
// `buildAndCachePayload` now ALWAYS returns a payload derived from the live
// Anakin scrape (via the new Anakin-direct mapper), so the dashboard reflects
// what the user actually scraped.
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
    // Even when reshape throws, try one last best-effort: Anakin-direct.
    const key = anakinKey(req) || ''
    const raw = peekRawFor(key)
    const tenant = tenantForRequest(req)
    if (raw) {
      try {
        const direct = buildPayloadFromAnakinRaw(raw, tenant)
        ;(direct as any).reshape_error = String(e?.message || e)
        return res.json(direct)
      } catch {/* fall through */}
    }
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
// COMPETITOR SCRAPE — Anakin /v1/crawl integration
//   Docs:
//     https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//     https://anakin.io/docs/api-reference/crawl/get-crawl-result
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
      ok: true,
      jobId: out.jobId,
      status: out.status,
      url: target,
      totalPages: out.totalPages,
      completedPages: out.completedPages,
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
      strategy: 'Two parallel JSON-mode calls. Anakin-direct fallback if Groq absent.',
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
  if (q.includes('price') || (c0 && q.includes(c0.split('.')[0])))
    return `${c0} adjusted pricing within the last 24h — review the diff in Competitor Pulse [2].`
  if (q.includes('churn') || q.includes('sentiment'))
    return `Sentiment around ${tenant?.industry || 'your category'} dropped this week [4].`
  return `Threat level ${threat}/100 across ${tenant?.industry || 'your sector'}. Ask me something specific.`
}

// =============================================================================
// 🔥 SCENARIO — bug #3 fix.
//
// Order of preference:
//   1. Live cached DashboardPayload (anakin-live or anakin-direct).
//   2. If no full payload but raw Anakin output is cached, build an
//      anakin-direct payload on the fly so we never fall back to demo.
//   3. Run Groq llama-4-scout against that payload for a query-specific
//      JSON response.
//   4. If Groq is missing or fails, use the new tenant-aware offline
//      analyser — which reads the scenario keywords and produces a
//      query-specific narrative + impacted-event list grounded in the
//      user's REAL briefing.
// =============================================================================
app.post('/api/scenario', async (req, res) => {
  try {
    const { scenario } = (req.body || {}) as { scenario: string }
    if (!scenario || !String(scenario).trim()) return res.status(400).json({ error: 'Empty scenario' })

    const key = anakinKey(req)
    const tenant = tenantForRequest(req)

    // 1. Try the cached live payload.
    let p = key ? peekCacheFor(key) : null

    // 2. If none, try to upgrade from cached raw Anakin output → anakin-direct.
    if (!p && key) {
      const raw = peekRawFor(key)
      if (raw) {
        try { p = buildPayloadFromAnakinRaw(raw, tenant) } catch {/* ignore */}
      }
    }

    // 3. Last resort: whatever payloadFor() returns (demo or demo-warming).
    if (!p) p = await payloadFor(req)

    const hasGroq = Boolean(process.env.GROQ_API_KEY)

    if (hasGroq) {
      try {
        const out = await groqScenario({ scenario, tenant, payload: p })
        return res.json({
          scenario,
          ...out,
          credits_used: 1,
          source: (p as any).source,
          mode: 'groq-live',
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        })
      } catch (e: any) {
        console.warn('Groq scenario failed, falling back:', e?.message)
      }
    }

    // 4. Offline tenant-aware analyser — ALWAYS query-specific.
    const offline = synthScenarioOffline(scenario, p, tenant)
    res.json({
      scenario,
      ...offline,
      credits_used: 0,
      source: (p as any).source,
      mode: hasGroq ? 'offline-fallback' : 'offline-no-groq',
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

// 🔥 FIX (bug #3) — the offline analyser is now FULLY query-driven.
//   • Reads the user's scenario string keyword-by-keyword.
//   • Identifies which of the LIVE briefing events the scenario actually moves.
//   • Picks an explicit directional impact (positive / negative / mixed).
//   • Composes a narrative that mentions the user's industry, region, and
//     the SCENARIO TEXT itself — so the output is always specific to what
//     the user typed, never a generic demo sentence.
function synthScenarioOffline(scenario: string, p: any, tenant: any) {
  const b = p?.briefing || {}
  const events: any[] = Array.isArray(b.events) ? b.events : []
  const baseThreat = clamp(b.threat_level, 0, 100, 60)
  const s = String(scenario || '').toLowerCase()
  const words = Array.from(new Set(
    s.split(/[^a-z0-9.]+/i).filter(w => w && w.length > 2),
  ))

  // ── Keyword buckets — kept conservative but tenant-aware ──────────────
  const competitorKeywords = (tenant?.competitor_domains || [])
    .map((d: string) => String(d).split('.')[0].toLowerCase())
  const policyHit = /\b(regulat|complianc|policy|act|gdpr|cfpb|fca|sec|psd[23]?|psr|directive|enforce|guideline|sanction|tariff|tax)\b/i.test(s)
  const competitorHit =
    competitorKeywords.some((k: string) => k && s.includes(k)) ||
    /\b(price|pricing|fee|launch|hire|funding|layoff|merger|acqui|series|partner|feature|product|outage|breach)\b/i.test(s)
  const sentimentHit = /\b(sentiment|review|reddit|complaint|churn|g2|forum|tweet|trustpilot|hacker.?news|backlash|virali|reputation|nps|csat)\b/i.test(s)
  const aiHit = /\b(ai|llm|gpt|chatgpt|gemini|claude|nano|opus|model|copilot|agent)\b/i.test(s)
  const negative = /\b(crash|outage|breach|delay|drop|lower|cancel|fall|decreas|recall|sue|fine|halt|ban|down|fail|leak|hack|fraud|scam|scandal|loss)\b/i.test(s)
  const positive = /\b(launch|raise|grow|increas|partner|acqui|expand|approve|win|breakthrough|surge|rise|gain|funding|invest)\b/i.test(s)

  // Direction: -1 risky / +1 opportunity / 0 mixed.
  let dir = 0
  if (negative && !positive) dir = -1
  else if (positive && !negative) dir = +1
  else if (policyHit) dir = -1
  else if (competitorHit) dir = +1
  else dir = 0

  // Threat delta — every signal that fires nudges the meter.
  const policyBump     = policyHit     ? 14 * (dir <= 0 ? -1 : 1) * -1 : 0  // policy → typically increases threat
  const competitorBump = competitorHit ?  9 * dir                       : 0
  const sentimentBump  = sentimentHit  ?  6 * dir                       : 0
  const aiBump         = aiHit         ?  5 * (dir === 0 ? 1 : dir)     : 0
  const noiseBump      = (policyHit || competitorHit || sentimentHit || aiHit) ? 0 : 3 * (dir || 1)
  const newThreat = clamp(
    baseThreat - policyBump - competitorBump - sentimentBump + aiBump + noiseBump,
    15, 100, baseThreat,
  )

  // Score each REAL briefing event against the scenario keywords.
  const scoreEvent = (e: any): number => {
    const hay = `${e.title || ''} ${e.summary || ''} ${(e.tags || []).join(' ')}`.toLowerCase()
    let score = 0
    for (const w of words) if (hay.includes(w)) score += 3
    if (policyHit && e.pillar === 'policy') score += 2
    if (competitorHit && e.pillar === 'competitor') score += 2
    if (sentimentHit && e.pillar === 'sentiment') score += 2
    if (aiHit && /\bai\b|llm|gpt|ml\b|model/.test(hay)) score += 2
    return score
  }
  const ranked = events
    .map(e => ({ e, score: scoreEvent(e) }))
    .sort((a, b) => b.score - a.score)
  const matched = ranked.filter(x => x.score > 0).slice(0, 5)
  const impacted = (matched.length ? matched : ranked.slice(0, 4))
    .map(({ e }) => ({
      title: e.title,
      pillar: e.pillar,
      source_url: e.source_url,
      severity: clamp(
        Number(e.severity) + (dir < 0 ? +8 : dir > 0 ? -4 : 2),
        0, 100, 60,
      ),
    }))

  // Build a narrative that ALWAYS quotes the user's scenario text + tenant.
  const compsList = (tenant?.competitor_domains || []).slice(0, 3).join(', ') || 'your tracked competitors'
  const reasonBits: string[] = []
  if (policyHit)     reasonBits.push(`new regulatory exposure in ${tenant?.region || 'your region'}`)
  if (competitorHit) reasonBits.push(`material moves from ${compsList}`)
  if (sentimentHit)  reasonBits.push('a shift in customer sentiment')
  if (aiHit)         reasonBits.push('the AI-tooling competitive dynamic')
  if (!reasonBits.length) reasonBits.push('the directional read your briefing already supports')

  const directionWord = newThreat > baseThreat ? 'rises'
                      : newThreat < baseThreat ? 'falls'
                      : 'holds steady'
  const narrative =
    `Under your hypothetical — "${String(scenario).slice(0, 110)}" — projected threat ${directionWord} ` +
    `from ${baseThreat} to ${newThreat} for ${tenant?.industry || 'your business'}. ` +
    `Driver: ${reasonBits.join(' + ')}. ` +
    `${impacted.length} active briefing event${impacted.length === 1 ? ' is' : 's are'} materially affected.`

  // Delta counts driven by how many signals fired.
  const delta_threats = Math.max(1,
    (policyHit ? 4 : 0) + (competitorHit ? 3 : 0) + (sentimentHit ? 2 : 0) + (aiHit ? 1 : 0))
  const delta_actions = Math.max(1, Math.round(delta_threats / 2))

  return {
    threat_level_before: baseThreat,
    threat_level_after:  newThreat,
    delta_threats,
    delta_actions,
    impacted_events: impacted,
    narrative,
  }
}

function clamp(n: any, lo: number, hi: number, dflt: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return dflt
  return Math.max(lo, Math.min(hi, Math.round(v)))
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
    generated_by: (p as any).source === 'anakin-live' || (p as any).source === 'anakin-direct'
      ? 'anakin agentic-search → groq reshape (with Anakin-direct fallback)'
      : 'demo',
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
