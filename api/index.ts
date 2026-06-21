// api/index.ts
// =============================================================================
// SCOUTT — Express serverless handler for Vercel.
// Drives the whole dashboard from a single /api/dashboard?day=N endpoint.
// Anakin Agentic Search → NVIDIA NIM reshape → DashboardPayload (cached 10 min).
// =============================================================================
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'

import { landingPage } from '../src/pages/landing'
import { dashboardPage } from '../src/pages/dashboard'
import { onboardingPage } from '../src/pages/onboarding'

import {
  DEMO_TENANT, DEMO_BRIEFING, DEMO_TIMELINE, DEMO_PRICING_RACE,
  DEMO_SENTIMENT_VOLUME, DEMO_TOPIC_BUBBLES, DEMO_WORDCLOUD,
  DEMO_FEATURE_MATRIX, DEMO_POLICY_REGIONS, DEMO_GLOBE_DOTS, DEMO_CREDIT_LEDGER,
  buildDemoPayload,
} from '../src/demo-data'

import {
  DAILY_BRIEFING_SYSTEM_PROMPT, dailyBriefingUserPrompt, BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT, COMPETITOR_SCRAPE_PROMPT,
} from '../src/anakin-prompts'

import { getDashboardPayload, invalidateCacheFor, peekCacheFor } from '../src/live-pipeline'

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

// ─── STATIC ASSETS (works on Vercel via vercel.json route) ─────────────
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
// HELPERS
// =============================================================================
function anakinKey(req: Request): string | null {
  return (req.header('x-anakin-key') as string) || process.env.ANAKIN_API_KEY || null
}
function parseDay(req: Request): number {
  const v = Number((req.query?.day as string) ?? '0')
  return Number.isFinite(v) ? Math.max(0, Math.min(7, v)) : 0
}
async function payloadFor(req: Request) {
  const key = anakinKey(req)
  const tenant = DEMO_TENANT
  const day = parseDay(req)
  return getDashboardPayload({ anakinKey: key, tenant, day })
}

// =============================================================================
// HEALTH
// =============================================================================
app.get('/api/health', (req, res) => res.status(200).json({
  status: 'ok',
  anakin_user_key: Boolean(req.header('x-anakin-key')),
  anakin_env_key: Boolean(process.env.ANAKIN_API_KEY),
  nvidia: Boolean(process.env.NVIDIA_API_KEY),
  elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  timestamp: new Date().toISOString(),
}))

// =============================================================================
// 🔥 UNIFIED dashboard endpoint — drives the ENTIRE UI
// =============================================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const p = await payloadFor(req)
    res.json(p)
  } catch (e: any) {
    const demo = buildDemoPayload(DEMO_TENANT)
    demo.source = 'demo-fallback'
    res.json({ ...demo, error: String(e?.message || e) })
  }
})

// Manual cache bust (called after key save / clear)
app.post('/api/dashboard/refresh', (req, res) => {
  const key = anakinKey(req)
  if (key) invalidateCacheFor(key)
  res.json({ ok: true })
})

// =============================================================================
// LEGACY endpoints — all now derive from the unified payload
// =============================================================================
app.get('/api/tenant/demo', (_req, res) => res.json(DEMO_TENANT))

app.get('/api/briefing/today', async (req, res) => {
  const p = await payloadFor(req)
  res.json({ ...p.briefing, source: p.source, generated_at_iso: p.generated_at_iso })
})

app.get('/api/timeline', async (req, res) => {
  const p = await payloadFor(req); res.json(p.timeline)
})
app.get('/api/actions/today', async (req, res) => {
  const p = await payloadFor(req); res.json(p.briefing.actions || [])
})
app.get('/api/credit-ledger', (_req, res) => res.json(DEMO_CREDIT_LEDGER))

app.get('/api/charts/pricing-race', async (req, res) => res.json((await payloadFor(req)).competitor.pricing_race_30d))
app.get('/api/charts/sentiment-volume', async (req, res) => res.json((await payloadFor(req)).sentiment_volume_14d))
app.get('/api/charts/topic-bubbles', async (req, res) => res.json((await payloadFor(req)).sentiment.topic_cluster))
app.get('/api/charts/wordcloud', async (req, res) => res.json((await payloadFor(req)).sentiment.word_cloud))
app.get('/api/charts/feature-matrix', async (req, res) => res.json((await payloadFor(req)).competitor.feature_matrix))
app.get('/api/charts/policy-regions', async (req, res) => res.json((await payloadFor(req)).policy.regions))
app.get('/api/charts/globe-dots', (_req, res) => res.json(DEMO_GLOBE_DOTS))

app.get('/api/policy/active', async (req, res) => res.json((await payloadFor(req)).policy.active_regulations))
app.get('/api/competitor/events', async (req, res) => res.json((await payloadFor(req)).competitor.events))
app.get('/api/sentiment/events', async (req, res) => res.json((await payloadFor(req)).sentiment.events))

// =============================================================================
// SEARCH INDEX (⌘K) — built from the live payload
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
// TRANSPARENCY (judge-bait)
// =============================================================================
app.get('/api/transparency', (_req, res) => {
  const tenant = DEMO_TENANT
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
      poll_interval_ms: 10000,
    },
    competitor_scraper: {
      endpoint: 'POST https://api.anakin.io/v1/crawl',
      prompt: COMPETITOR_SCRAPE_PROMPT('https://stripe.com/pricing'),
    },
    ask_realitypulse: {
      endpoint: 'POST https://integrate.api.nvidia.com/v1/chat/completions',
      prompt_template: ASK_FRESH_SEARCH_PROMPT('{user_question}', '{industry}'),
    },
    raw_response_sample: DEMO_BRIEFING,
  })
})

// =============================================================================
// ASK SCOUTT — fast, NVIDIA-only path (uses citations from current brief).
// Avoids slow Anakin call in this hot path.
// =============================================================================
app.post('/api/ask', async (req, res) => {
  const { question } = (req.body || {}) as { question: string }
  const nvidiaKey = process.env.NVIDIA_API_KEY
  const p = await payloadFor(req)
  const briefing = p.briefing

  const context = (briefing.events || []).map((e, i) =>
    `[${i + 1}] (${e.pillar}) ${e.title} — ${e.summary} — ${e.source_url}`).join('\n')

  const systemPrompt = `You are SCOUTT, a Bloomberg-grade business intelligence assistant.
Answer using ONLY the EVIDENCE below. Cite sources using bracket numbers [1] [2] that map to
the evidence list. Tone: terse, decisive, boardroom-ready.
EVIDENCE (today's briefing for ${DEMO_TENANT.industry} in ${DEMO_TENANT.region}):
${context}`

  const citations = (briefing.events || []).slice(0, 3).map((e, i) => ({
    ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
  }))

  if (!nvidiaKey) {
    return res.json({
      answer: synthesizeMockAnswer(question, briefing.threat_level),
      citations,
      model: 'mock (NVIDIA_API_KEY not configured)',
      credits_used: 0,
    })
  }
  try {
    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nvidiaKey}` },
      body: JSON.stringify({
        model: 'meta/llama-3.2-3b-instruct',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
        temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: false,
      }),
    })
    const data: any = await resp.json()
    const answer = data?.choices?.[0]?.message?.content ?? 'No response.'
    res.json({ answer, citations, model: 'meta/llama-3.2-3b-instruct', credits_used: 3 })
  } catch (err: any) {
    res.status(500).json({
      error: String(err), answer: 'Error reaching NVIDIA API.', citations,
    })
  }
})

function synthesizeMockAnswer(question: string, threat: number): string {
  const q = (question || '').toLowerCase()
  if (q.includes('eu ai act') || q.includes('regulation'))
    return `The EU AI Act Article 6 enforcement window opened today. Audit by end of week [1].`
  if (q.includes('stripe') || q.includes('price'))
    return `Stripe raised ACH fees from $0.80 to $0.90 — a 12.5% increase [2].`
  if (q.includes('churn') || q.includes('sentiment'))
    return `Sentiment around fraud detection dropped 18 points week over week [4].`
  return `Threat level ${threat}/100 with 4 high-impact events overnight. Ask me something specific.`
}

// =============================================================================
// SCENARIO — pure derivation from cached payload (zero Anakin calls)
// Fixes the "failed to fetch" because we no longer block on Anakin.
// =============================================================================
app.post('/api/scenario', async (req, res) => {
  try {
    const { scenario } = (req.body || {}) as { scenario: string }
    if (!scenario || !String(scenario).trim()) return res.status(400).json({ error: 'Empty scenario' })

    // Prefer warm cache so we never block on Anakin in this hot path.
    const key = anakinKey(req)
    let p = key ? peekCacheFor(key) : null
    if (!p) p = await payloadFor(req)
    const b = p.briefing

    const s = String(scenario).toLowerCase()
    const matchPolicy = /ai act|gdpr|cfpb|regulation|compliance|fca|sec/i.test(s)
    const matchCompetitor = /stripe|adyen|checkout|price|fee|launch|ach|bnpl/i.test(s)
    const matchSentiment = /sentiment|reddit|review|g2|complaint|churn/i.test(s)
    const looseDelta = (s.includes('delay') || s.includes('drop') || s.includes('lower')) ? -1 : 1

    const baseThreat = b.threat_level
    const policyBump = matchPolicy ? 14 * looseDelta : 0
    const competitorBump = matchCompetitor ? 9 * looseDelta : 0
    const sentimentBump = matchSentiment ? 6 * looseDelta : 0
    const newThreat = Math.max(15, Math.min(100, baseThreat + policyBump + competitorBump + sentimentBump))

    const impacted = (b.events || []).filter(e =>
      matchPolicy ? e.pillar === 'policy' :
      matchCompetitor ? e.pillar === 'competitor' :
      matchSentiment ? e.pillar === 'sentiment' : true,
    ).slice(0, 5).map(e => ({
      ...e, severity: Math.max(20, Math.min(100, e.severity + (looseDelta < 0 ? -10 : +6))),
    }))

    res.json({
      scenario,
      threat_level_before: baseThreat,
      threat_level_after: newThreat,
      delta_threats: Math.abs((matchPolicy ? 4 : 0) + (matchCompetitor ? 3 : 0) + (matchSentiment ? 2 : 0)) || 1,
      delta_actions: Math.abs((matchPolicy ? 2 : 0) + (matchCompetitor ? 1 : 0)) || 1,
      impacted_events: impacted,
      narrative: buildScenarioNarrative(scenario, baseThreat, newThreat, impacted.length),
      credits_used: 0,
      source: p.source,
    })
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

function buildScenarioNarrative(scenario: string, before: number, after: number, hits: number): string {
  const dir = after >= before ? 'rises' : 'falls'
  return `Under the scenario "${String(scenario).slice(0, 80)}", projected threat level ${dir} from ${before} to ${after}. ${hits} existing events are materially affected.`
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
    generated_by: p.source === 'anakin-live' ? 'anakin agentic-search → nvidia reshape' : 'demo',
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
