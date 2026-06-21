// api/index.ts
import express, { Request, Response, NextFunction } from 'express'
import path from 'path'

import { landingPage } from '../src/pages/landing'
import { dashboardPage } from '../src/pages/dashboard'
import { onboardingPage } from '../src/pages/onboarding'

import {
  DEMO_TENANT, DEMO_BRIEFING, DEMO_TIMELINE, DEMO_PRICING_RACE,
  DEMO_SENTIMENT_VOLUME, DEMO_TOPIC_BUBBLES, DEMO_WORDCLOUD,
  DEMO_FEATURE_MATRIX, DEMO_POLICY_REGIONS, DEMO_GLOBE_DOTS, DEMO_CREDIT_LEDGER,
} from '../src/demo-data'

import {
  DAILY_BRIEFING_SYSTEM_PROMPT, dailyBriefingUserPrompt, BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT, COMPETITOR_SCRAPE_PROMPT,
} from '../src/anakin-prompts'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── CORS ───
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anakin-Key')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ─── Static ───
const PUBLIC_DIR = path.join(process.cwd(), 'public')
app.use('/static', express.static(path.join(PUBLIC_DIR, 'static'), { maxAge: '1h', fallthrough: true }))
app.get(['/favicon.ico', '/favicon.png'], (_req, res) => res.redirect(301, '/static/scoutt_logo.png'))

// ============================================================
// ANAKIN HELPERS (per https://anakin.io/docs/api-reference/agentic-search)
// ============================================================
function anakinKey(req: Request): string | null {
  return (req.header('x-anakin-key') as string) || process.env.ANAKIN_API_KEY || null
}

async function anakinSubmit(key: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.anakin.io/v1/agentic-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ prompt }),
  })
  const j: any = await r.json()
  if (!r.ok) throw new Error(j?.message || `Anakin submit failed (${r.status})`)
  return j.job_id
}

async function anakinPoll(key: string, jobId: string, timeoutMs = 120_000): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`https://api.anakin.io/v1/agentic-search/${jobId}`, {
      headers: { 'X-API-Key': key },
    })
    const j: any = await r.json()
    if (j.status === 'completed') return j.generatedJson
    if (j.status === 'failed') throw new Error('Anakin job failed: ' + (j?.message || 'unknown'))
    await new Promise(res => setTimeout(res, 10_000))
  }
  throw new Error('Anakin poll timed out')
}

// In-memory cache keyed by Anakin key + scope
const cache = new Map<string, { ts: number; data: any }>()
const TTL = 10 * 60 * 1000
function cacheGet(k: string) { const v = cache.get(k); return v && (Date.now() - v.ts < TTL) ? v.data : null }
function cacheSet(k: string, data: any) { cache.set(k, { ts: Date.now(), data }) }

// Map Anakin output → internal briefing shape
function mapAnakinToBriefing(generated: any): any {
  const sd = generated?.structured_data || generated || {}
  const events = (sd.events || sd.developments || []).slice(0, 12).map((e: any, i: number) => ({
    pillar: e.pillar || (i % 3 === 0 ? 'policy' : i % 3 === 1 ? 'competitor' : 'sentiment'),
    title: e.title || e.headline || `Event ${i + 1}`,
    summary: e.summary || e.description || '',
    severity: e.severity || Math.round(45 + Math.random() * 50),
    high_impact: (e.severity || 0) >= 70,
    source_url: e.source_url || e.url || '#',
    source_name: e.source_name || e.organization || 'Web',
    detected_at: e.detected_at || new Date().toISOString(),
    tags: e.tags || [],
  }))
  const actions = (sd.actions || []).slice(0, 3).map((a: any) => ({
    title: a.title || a.action || 'Action',
    why_now: a.why_now || a.rationale || '',
    email_draft: a.email_draft || `Hi team,\n\n${a.title || ''}\n\nBest,\n— You`,
    slack_message: a.slack_message || a.title || '',
    impact: a.impact || 'medium',
  }))
  const threat_level = sd.threat_level ??
    Math.min(100, Math.round(events.reduce((s: number, e: any) => s + (e.severity || 0), 0) / Math.max(events.length, 1)))
  return {
    headline: generated?.summary || sd.headline || 'Live briefing generated from Anakin Agentic Search.',
    threat_level,
    events: events.length ? events : DEMO_BRIEFING.events,
    actions: actions.length ? actions : DEMO_BRIEFING.actions,
    generated_at: new Date().toISOString(),
    source: 'anakin-live',
  }
}

async function getLiveBriefing(key: string): Promise<any> {
  const cacheKey = `brief:${key}`
  const hit = cacheGet(cacheKey); if (hit) return hit
  const tenant = DEMO_TENANT
  const prompt = dailyBriefingUserPrompt({
    industry: tenant.industry, region: tenant.region,
    competitor_domains: tenant.competitor_domains, pillars_enabled: tenant.pillars_enabled,
  })
  const jobId = await anakinSubmit(key, prompt)
  const generated = await anakinPoll(key, jobId)
  const data = mapAnakinToBriefing(generated)
  cacheSet(cacheKey, data)
  return data
}

// =============================================================================
// PAGE ROUTES
// =============================================================================
app.get('/', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(landingPage()) })
app.get('/dashboard', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(false)) })
app.get('/threat-index', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(dashboardPage(true)) })
app.get('/onboarding', (_req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.status(200).send(onboardingPage()) })

// =============================================================================
// HEALTH
// =============================================================================
app.get('/api/health', (req, res) => res.status(200).json({
  status: 'ok',
  anakin_user_key: Boolean(req.header('x-anakin-key')),
  anakin_env_key: Boolean(process.env.ANAKIN_API_KEY),
  elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  timestamp: new Date().toISOString(),
}))

// =============================================================================
// COMMAND CENTER ENDPOINTS
// =============================================================================
app.get('/api/tenant/demo', (_req, res) => res.json(DEMO_TENANT))

app.get('/api/briefing/today', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.json(DEMO_BRIEFING)
  try { res.json(await getLiveBriefing(key)) }
  catch (e: any) { res.json({ ...DEMO_BRIEFING, source: 'demo-fallback', error: String(e?.message || e) }) }
})

app.get('/api/timeline', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.json(DEMO_TIMELINE)
  try {
    const brief = await getLiveBriefing(key)
    const today = new Date()
    const timeline = brief.events.map((e: any, i: number) => ({
      date: new Date(today.getTime() - i * 86400000).toISOString().slice(5, 10),
      title: e.title, pillar: e.pillar, severity: e.severity,
    }))
    res.json(timeline)
  } catch { res.json(DEMO_TIMELINE) }
})

app.get('/api/credit-ledger', (_req, res) => res.json(DEMO_CREDIT_LEDGER))

// =============================================================================
// CHART DATA — demo first, can be swapped per-key later
// =============================================================================
app.get('/api/charts/pricing-race', (_req, res) => res.json(DEMO_PRICING_RACE))
app.get('/api/charts/sentiment-volume', (_req, res) => res.json(DEMO_SENTIMENT_VOLUME))
app.get('/api/charts/topic-bubbles', (_req, res) => res.json(DEMO_TOPIC_BUBBLES))
app.get('/api/charts/wordcloud', (_req, res) => res.json(DEMO_WORDCLOUD))
app.get('/api/charts/feature-matrix', (_req, res) => res.json(DEMO_FEATURE_MATRIX))
app.get('/api/charts/policy-regions', (_req, res) => res.json(DEMO_POLICY_REGIONS))
app.get('/api/charts/globe-dots', (_req, res) => res.json(DEMO_GLOBE_DOTS))

// =============================================================================
// PER-TAB LIVE/DEMO ENDPOINTS
// =============================================================================
app.get('/api/policy/active', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'policy'))
  try {
    const brief = await getLiveBriefing(key)
    res.json((brief.events || []).filter((e: any) => e.pillar === 'policy'))
  } catch { res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'policy')) }
})

app.get('/api/competitor/events', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'competitor'))
  try {
    const brief = await getLiveBriefing(key)
    res.json((brief.events || []).filter((e: any) => e.pillar === 'competitor'))
  } catch { res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'competitor')) }
})

app.get('/api/sentiment/events', async (req, res) => {
  const key = anakinKey(req)
  if (!key) return res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'sentiment'))
  try {
    const brief = await getLiveBriefing(key)
    res.json((brief.events || []).filter((e: any) => e.pillar === 'sentiment'))
  } catch { res.json(DEMO_BRIEFING.events.filter(e => e.pillar === 'sentiment')) }
})

// =============================================================================
// UNIFIED SEARCH INDEX (powers ⌘K global search)
// =============================================================================
app.get('/api/search-index', async (req, res) => {
  const key = anakinKey(req)
  let brief: any = DEMO_BRIEFING
  if (key) { try { brief = await getLiveBriefing(key) } catch { brief = DEMO_BRIEFING } }

  const index: any[] = []
  ;(brief.events || []).forEach((e: any) => {
    const section = e.pillar === 'policy' ? 'Policy Radar'
      : e.pillar === 'competitor' ? 'Competitor Pulse'
      : 'Sentiment Storm'
    index.push({
      section, pillar: e.pillar, type: 'event',
      title: e.title, subtitle: e.summary || '',
      severity: e.severity, url: e.source_url, tab: e.pillar,
    })
  })
  ;(brief.actions || []).forEach((a: any, i: number) => {
    index.push({
      section: "Today's Actions", pillar: 'action', type: 'action',
      title: a.title, subtitle: a.why_now || '',
      severity: a.impact === 'high' ? 90 : a.impact === 'medium' ? 60 : 30,
      tab: 'command', actionId: i,
    })
  })
  // Brief overnight headline
  index.push({
    section: 'Overnight Brief', pillar: 'policy', type: 'brief',
    title: brief.headline || 'Daily briefing',
    subtitle: `Threat level ${brief.threat_level}/100`,
    severity: brief.threat_level || 70, tab: 'command',
  })
  res.json({ index, source: brief.source || (key ? 'anakin-live' : 'demo') })
})

// =============================================================================
// ASK SCOUTT (Anakin agentic-search OR mock)
// =============================================================================
app.post('/api/ask', async (req, res) => {
  const { question } = (req.body || {}) as { question: string }
  const key = anakinKey(req)
  const brief: any = key ? await getLiveBriefing(key).catch(() => DEMO_BRIEFING) : DEMO_BRIEFING

  if (key) {
    try {
      const prompt = ASK_FRESH_SEARCH_PROMPT(question, DEMO_TENANT.industry)
      const jobId = await anakinSubmit(key, prompt)
      const generated = await anakinPoll(key, jobId, 60_000)
      const answer = generated?.summary || 'No answer returned.'
      return res.json({
        answer,
        citations: (brief.events || []).slice(0, 3).map((e: any, i: number) => ({
          ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
        })),
        model: 'anakin-agentic-search', credits_used: 3,
      })
    } catch (e: any) {
      return res.json({
        answer: synthesizeMockAnswer(question, brief.threat_level) + `\n\n_Live Anakin call failed: ${e.message}_`,
        citations: (brief.events || []).slice(0, 3).map((e: any, i: number) => ({
          ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
        })),
        model: 'mock-fallback', credits_used: 0,
      })
    }
  }

  res.json({
    answer: synthesizeMockAnswer(question, brief.threat_level),
    citations: (brief.events || []).slice(0, 3).map((e: any, i: number) => ({
      ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
    })),
    model: 'mock (no API key)', credits_used: 0,
  })
})

function synthesizeMockAnswer(question: string, threat: number): string {
  const q = (question || '').toLowerCase()
  if (q.includes('ai act') || q.includes('regulation')) return `The EU AI Act Article 6 enforcement window opened today. Your underwriting models likely fall under Annex III. Audit by end of week [1].`
  if (q.includes('stripe') || q.includes('price')) return `Stripe raised ACH fees from $0.80 to $0.90 — a 12.5% increase detected via our hourly pricing-page check [2].`
  if (q.includes('churn') || q.includes('sentiment')) return `Sentiment around fraud detection dropped 18 points week over week, mostly driven by false-positive complaints [4].`
  return `Threat level ${threat}/100 with 4 high-impact events overnight. Ask about policy, competitor moves, or sentiment.`
}

// =============================================================================
// SCENARIO
// =============================================================================
app.post('/api/scenario', async (req, res) => {
  const { scenario } = (req.body || {}) as { scenario: string }
  const key = anakinKey(req)
  const brief: any = key ? await getLiveBriefing(key).catch(() => DEMO_BRIEFING) : DEMO_BRIEFING
  const matchPolicy = /ai act|gdpr|cfpb|regulation/i.test(scenario)
  const matchCompetitor = /stripe|adyen|checkout|price|fee/i.test(scenario)
  const baseThreat = brief.threat_level || 73
  const newThreat = Math.min(100, baseThreat + (matchPolicy ? 14 : 0) + (matchCompetitor ? 9 : 0))
  res.json({
    scenario,
    threat_level_before: baseThreat, threat_level_after: newThreat,
    delta_threats: matchPolicy ? 4 : 2, delta_actions: matchPolicy ? 2 : 1,
    impacted_events: (brief.events || []).filter((e: any) =>
      matchPolicy ? e.pillar === 'policy' : matchCompetitor ? e.pillar === 'competitor' : true
    ).slice(0, 4),
    credits_used: 0,
  })
})

// =============================================================================
// ACTION DRAFT
// =============================================================================
app.post('/api/action/draft', async (req, res) => {
  const { action_id, kind } = (req.body || {}) as { action_id: number; kind: 'email' | 'slack' }
  const key = anakinKey(req)
  const brief: any = key ? await getLiveBriefing(key).catch(() => DEMO_BRIEFING) : DEMO_BRIEFING
  const action = (brief.actions || [])[action_id]
  if (!action) return res.status(404).json({ error: 'Action not found' })
  res.json({
    kind,
    body: kind === 'email' ? action.email_draft : action.slack_message,
    generated_by: key ? 'anakin agentic-search' : 'demo',
    credits_used: 0,
  })
})

// =============================================================================
// TRANSPARENCY
// =============================================================================
app.get('/api/transparency', (_req, res) => {
  const tenant = DEMO_TENANT
  res.json({
    daily_briefing: {
      endpoint: 'POST https://api.anakin.io/v1/agentic-search',
      system_prompt: DAILY_BRIEFING_SYSTEM_PROMPT,
      user_prompt: dailyBriefingUserPrompt({
        industry: tenant.industry, region: tenant.region,
        competitor_domains: tenant.competitor_domains, pillars_enabled: tenant.pillars_enabled,
      }),
      json_schema: BRIEFING_JSON_SCHEMA,
      poll_endpoint: 'GET https://api.anakin.io/v1/agentic-search/{job_id}',
      poll_interval_ms: 10000,
    },
    competitor_scraper: {
      endpoint: 'POST https://api.anakin.io/v1/url-scraper',
      prompt: COMPETITOR_SCRAPE_PROMPT('https://stripe.com/pricing'),
    },
    ask_realitypulse: {
      endpoint: 'POST https://api.anakin.io/v1/agentic-search',
      prompt_template: ASK_FRESH_SEARCH_PROMPT('{user_question}', '{industry}'),
    },
    raw_response_sample: DEMO_BRIEFING,
  })
})

// =============================================================================
// ELEVENLABS TTS PROXY  (per https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech)
// =============================================================================
app.post('/api/tts', async (req, res) => {
  const { text, voice_id } = (req.body || {}) as { text: string; voice_id?: string }
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not configured. Falling back to browser TTS.' })
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' })

  const voice = voice_id || 'JBFqnCBsd6RMkjVDRZzb' // "George" default

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    })
    if (!r.ok) {
      const err = await r.text()
      return res.status(r.status).json({ error: 'ElevenLabs error', detail: err })
    }
    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(buf)
  } catch (e: any) {
    res.status(500).json({ error: 'TTS request failed', message: e?.message || String(e) })
  }
})

// =============================================================================
// 404 + error
// =============================================================================
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SCOUTT] Unhandled error:', err)
  res.status(500).json({ error: 'Internal Server Error', message: err.message })
})

export default app

// Local dev
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = Number(process.env.PORT) || 3000
  app.listen(PORT, () => console.log(`[SCOUTT] http://localhost:${PORT}`))
}
