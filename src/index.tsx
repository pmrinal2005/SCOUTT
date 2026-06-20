import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  DEMO_TENANT, DEMO_BRIEFING, DEMO_TIMELINE, DEMO_PRICING_RACE, DEMO_SENTIMENT_VOLUME,
  DEMO_TOPIC_BUBBLES, DEMO_WORDCLOUD, DEMO_FEATURE_MATRIX, DEMO_POLICY_REGIONS, DEMO_GLOBE_DOTS, DEMO_CREDIT_LEDGER,
} from './demo-data.js'
import {
  DAILY_BRIEFING_SYSTEM_PROMPT, dailyBriefingUserPrompt, BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT, COMPETITOR_SCRAPE_PROMPT,
} from './anakin-prompts.js'
import { landingPage } from './pages/landing.js'
import { onboardingPage } from './pages/onboarding.js'
import { dashboardPage } from './pages/dashboard.js'
import {
  supabaseEnabled, getTenant, getTodayBriefing, getTimeline, getCreditLedger, logCredit, seedDemoTenant,
} from './supabase.js'

const app = new Hono()
app.use('/api/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'X-Anakin-Key'] }))

// ===== Helpers — read user-supplied Anakin key (header) or fall back to env =====
function anakinKey(c: any): string | null {
  return c.req.header('x-anakin-key') || process.env.ANAKIN_API_KEY || null
}

// In-memory cache so the same browser key gets the same generated briefing for ~10 min
const briefingCache = new Map<string, { ts: number; data: any }>()
const CACHE_TTL_MS = 10 * 60 * 1000

// ===== Anakin live calls (per docs) =====
async function anakinSubmit(key: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.anakin.io/v1/agentic-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ prompt }),
  })
  const j: any = await r.json()
  if (!r.ok) throw new Error(j?.message || 'Anakin submit failed')
  return j.job_id
}

async function anakinPoll(key: string, jobId: string, timeoutMs = 90_000): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`https://api.anakin.io/v1/agentic-search/${jobId}`, {
      headers: { 'X-API-Key': key },
    })
    const j: any = await r.json()
    if (j.status === 'completed') return j.generatedJson
    if (j.status === 'failed') throw new Error('Anakin job failed')
    await new Promise(res => setTimeout(res, 10_000)) // 10s poll, per docs
  }
  throw new Error('Anakin poll timed out')
}

// Map Anakin generatedJson into our internal briefing shape
function mapAnakinToBriefing(generated: any): any {
  // generatedJson may carry `summary` + `structured_data.{events,actions}` — we attempt several shapes
  const sd = generated?.structured_data || generated || {}
  const events = (sd.events || sd.developments || []).slice(0, 12).map((e: any, i: number) => ({
    pillar: e.pillar || (i % 3 === 0 ? 'policy' : i % 3 === 1 ? 'competitor' : 'sentiment'),
    title: e.title || e.headline || `Event ${i + 1}`,
    summary: e.summary || e.description || '',
    severity: e.severity || Math.round(50 + Math.random() * 45),
    high_impact: (e.severity || 0) > 65,
    source_url: e.source_url || e.url || '#',
    source_name: e.source_name || e.organization || 'Web',
    detected_at: e.detected_at || new Date().toISOString(),
    tags: e.tags || [],
  }))
  const actions = (sd.actions || []).slice(0, 3).map((a: any) => ({
    title: a.title || a.action || 'Action',
    why_now: a.why_now || a.rationale || '',
    email_draft: a.email_draft || `Hi team,\n\n${a.title || ''}\n\n`,
    slack_message: a.slack_message || a.title || '',
    impact: a.impact || 'medium',
  }))
  const threat_level = sd.threat_level ||
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

async function liveBriefingForKey(key: string, tenant: any) {
  const cached = briefingCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  const prompt = dailyBriefingUserPrompt({
    industry: tenant.industry, region: tenant.region,
    competitor_domains: tenant.competitor_domains, pillars_enabled: tenant.pillars_enabled,
  })
  const jobId = await anakinSubmit(key, prompt)
  const generated = await anakinPoll(key, jobId)
  const briefing = mapAnakinToBriefing(generated)
  briefingCache.set(key, { ts: Date.now(), data: briefing })
  return briefing
}

// =====================================================================
// PAGE ROUTES
// =====================================================================
app.get('/', (c) => c.html(landingPage()))
app.get('/onboarding', (c) => c.html(onboardingPage()))
app.get('/dashboard', (c) => c.html(dashboardPage()))
app.get('/threat-index', (c) => c.html(dashboardPage(true)))

app.get('/api/health', (c) => c.json({
  ok: true, supabase: supabaseEnabled,
  nvidia: Boolean(process.env.NVIDIA_API_KEY),
  anakin_env: Boolean(process.env.ANAKIN_API_KEY),
  time: new Date().toISOString(),
}))

// =====================================================================
// Tenant / briefing
// =====================================================================
app.get('/api/tenant/demo', async (c) => c.json(await getTenant()))

app.get('/api/briefing/today', async (c) => {
  const key = anakinKey(c)
  if (!key) return c.json(await getTodayBriefing()) // demo path
  try {
    const tenant = await getTenant()
    const brief = await liveBriefingForKey(key, tenant)
    return c.json(brief)
  } catch (e: any) {
    // graceful fallback
    return c.json({ ...(await getTodayBriefing()), source: 'demo-fallback', error: String(e?.message || e) })
  }
})

app.get('/api/timeline', async (c) => {
  const key = anakinKey(c)
  if (!key) return c.json(await getTimeline())
  try {
    const tenant = await getTenant()
    const brief = await liveBriefingForKey(key, tenant)
    const today = new Date()
    const timeline = brief.events.map((e: any, i: number) => ({
      date: new Date(today.getTime() - i * 86400000).toISOString().slice(5, 10),
      title: e.title, pillar: e.pillar, severity: e.severity,
    }))
    return c.json(timeline)
  } catch { return c.json(await getTimeline()) }
})

app.get('/api/credit-ledger', async (c) => c.json(await getCreditLedger()))

// =====================================================================
// Charts (demo seed). When live key present, key driven generation can hook in later.
// =====================================================================
app.get('/api/charts/pricing-race', (c) => c.json(DEMO_PRICING_RACE))
app.get('/api/charts/sentiment-volume', (c) => c.json(DEMO_SENTIMENT_VOLUME))
app.get('/api/charts/topic-bubbles', (c) => c.json(DEMO_TOPIC_BUBBLES))
app.get('/api/charts/wordcloud', (c) => c.json(DEMO_WORDCLOUD))
app.get('/api/charts/feature-matrix', (c) => c.json(DEMO_FEATURE_MATRIX))
app.get('/api/charts/policy-regions', (c) => c.json(DEMO_POLICY_REGIONS))
app.get('/api/charts/globe-dots', (c) => c.json(DEMO_GLOBE_DOTS))

// =====================================================================
// Transparency drawer
// =====================================================================
app.get('/api/transparency', async (c) => {
  const tenant = await getTenant()
  return c.json({
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

// =====================================================================
// Ask SCOUTT — NVIDIA NIM (unchanged) with citations from current brief
// =====================================================================
app.post('/api/ask', async (c) => {
  const { question } = await c.req.json<{ question: string }>()
  const nvidiaKey = process.env.NVIDIA_API_KEY
  const anakin = anakinKey(c)
  const tenant = await getTenant()
  const briefing = anakin
    ? await liveBriefingForKey(anakin, tenant).catch(() => getTodayBriefing())
    : await getTodayBriefing()
  const briefingResolved: any = await Promise.resolve(briefing)

  const context = (briefingResolved.events || []).map((e: any, i: number) =>
    `[${i + 1}] (${e.pillar}) ${e.title} — ${e.summary} — ${e.source_url}`,
  ).join('\n')

  const systemPrompt = `You are SCOUTT, a Bloomberg-grade business intelligence assistant. Answer using ONLY the EVIDENCE below. Cite sources using bracket numbers [1] [2] that map to the evidence list. Tone: terse, decisive, boardroom-ready.\nEVIDENCE (today's briefing for ${tenant.industry} in ${tenant.region}):\n${context}`

  if (!nvidiaKey) {
    return c.json({
      answer: synthesizeMockAnswer(question, briefingResolved.threat_level),
      citations: (briefingResolved.events || []).slice(0, 3).map((e: any, i: number) => ({
        ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
      })),
      model: 'mock (NVIDIA_API_KEY not configured)', credits_used: 0,
    })
  }
  try {
    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nvidiaKey}` },
      body: JSON.stringify({ model: 'meta/llama-3.2-3b-instruct',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
        temperature: 0.2, top_p: 0.7, max_tokens: 1024, stream: false }),
    })
    const data: any = await resp.json()
    const answer = data?.choices?.[0]?.message?.content ?? 'No response.'
    await logCredit({ endpoint: 'agentic-search (Ask SCOUTT)', creditsUsed: 3, jobId: 'ask-' + Date.now() })
    return c.json({
      answer,
      citations: (briefingResolved.events || []).slice(0, 3).map((e: any, i: number) => ({
        ref: `[${i + 1}]`, title: e.title, url: e.source_url, pillar: e.pillar,
      })),
      model: 'meta/llama-3.2-3b-instruct', credits_used: 3,
    })
  } catch (err: any) {
    return c.json({ error: String(err), answer: 'Error reaching NVIDIA API.' }, 500)
  }
})

// =====================================================================
// Scenario simulator
// =====================================================================
app.post('/api/scenario', async (c) => {
  const { scenario } = await c.req.json<{ scenario: string }>()
  const key = anakinKey(c)
  const tenant = await getTenant()
  const briefing: any = key
    ? await liveBriefingForKey(key, tenant).catch(() => getTodayBriefing())
    : await getTodayBriefing()
  const matchPolicy = /ai act|gdpr|cfpb|regulation/i.test(scenario)
  const matchCompetitor = /stripe|adyen|checkout|price|fee/i.test(scenario)
  const baseThreat = briefing.threat_level
  const newThreat = Math.min(100, baseThreat + (matchPolicy ? 14 : 0) + (matchCompetitor ? 9 : 0))
  return c.json({
    scenario,
    threat_level_before: baseThreat, threat_level_after: newThreat,
    delta_threats: matchPolicy ? 4 : 2, delta_actions: matchPolicy ? 2 : 1,
    impacted_events: (briefing.events || []).filter((e: any) =>
      matchPolicy ? e.pillar === 'policy' : matchCompetitor ? e.pillar === 'competitor' : true,
    ).slice(0, 4),
    credits_used: 0,
  })
})

// =====================================================================
// Action draft
// =====================================================================
app.post('/api/action/draft', async (c) => {
  const { action_id, kind } = await c.req.json<{ action_id: number, kind: 'email' | 'slack' }>()
  const key = anakinKey(c)
  const tenant = await getTenant()
  const briefing: any = key
    ? await liveBriefingForKey(key, tenant).catch(() => getTodayBriefing())
    : await getTodayBriefing()
  const action = (briefing.actions || [])[action_id]
  if (!action) return c.json({ error: 'Action not found' }, 404)
  return c.json({
    kind, body: kind === 'email' ? action.email_draft : action.slack_message,
    generated_by: key ? 'anakin agentic-search' : 'demo (meta/llama-3.2-3b-instruct cached)',
    credits_used: 0,
  })
})

app.post('/api/sync/seed', async (c) => c.json(await seedDemoTenant()))

function synthesizeMockAnswer(question: string, threat: number): string {
  const q = question.toLowerCase()
  if (q.includes('eu ai act') || q.includes('regulation')) return `The EU AI Act Article 6 enforcement window opened today. Your underwriting models likely fall under Annex III. Audit by end of week [1].`
  if (q.includes('stripe') || q.includes('price')) return `Stripe raised ACH fees from $0.80 to $0.90 — a 12.5% increase detected via our hourly pricing-page check [2].`
  if (q.includes('churn') || q.includes('sentiment')) return `Sentiment around fraud detection dropped 18 points week over week, mostly driven by false-positive complaints [4].`
  return `Threat level ${threat}/100 with 4 high-impact events overnight. Ask me something specific about policy, competitor moves, or sentiment.`
}

export default app
