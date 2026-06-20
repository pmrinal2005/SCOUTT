import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'
import {
  DEMO_TENANT,
  DEMO_BRIEFING,
  DEMO_TIMELINE,
  DEMO_PRICING_RACE,
  DEMO_SENTIMENT_VOLUME,
  DEMO_TOPIC_BUBBLES,
  DEMO_WORDCLOUD,
  DEMO_FEATURE_MATRIX,
  DEMO_POLICY_REGIONS,
  DEMO_GLOBE_DOTS,
  DEMO_CREDIT_LEDGER,
} from './demo-data'
import {
  DAILY_BRIEFING_SYSTEM_PROMPT,
  dailyBriefingUserPrompt,
  BRIEFING_JSON_SCHEMA,
  ASK_FRESH_SEARCH_PROMPT,
  COMPETITOR_SCRAPE_PROMPT,
} from './anakin-prompts'
import { landingPage } from './pages/landing'
import { onboardingPage } from './pages/onboarding'
import { dashboardPage } from './pages/dashboard'

type Bindings = {
  NVIDIA_API_KEY?: string
  ANAKIN_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)
app.use('/api/*', cors())

// =====================================================================
// PAGE ROUTES (server-rendered HTML shells; React-like islands via JSX)
// =====================================================================
app.get('/', (c) => c.html(landingPage()))
app.get('/onboarding', (c) => c.html(onboardingPage()))
app.get('/dashboard', (c) => c.html(dashboardPage()))
app.get('/threat-index', (c) => c.html(dashboardPage(true))) // public viral page

// =====================================================================
// API: tenant + briefing
// =====================================================================
app.get('/api/tenant/demo', (c) => c.json(DEMO_TENANT))

app.get('/api/briefing/today', (c) => c.json(DEMO_BRIEFING))

app.get('/api/timeline', (c) => c.json(DEMO_TIMELINE))

app.get('/api/credit-ledger', (c) => c.json(DEMO_CREDIT_LEDGER))

// =====================================================================
// API: charts data
// =====================================================================
app.get('/api/charts/pricing-race', (c) => c.json(DEMO_PRICING_RACE))
app.get('/api/charts/sentiment-volume', (c) => c.json(DEMO_SENTIMENT_VOLUME))
app.get('/api/charts/topic-bubbles', (c) => c.json(DEMO_TOPIC_BUBBLES))
app.get('/api/charts/wordcloud', (c) => c.json(DEMO_WORDCLOUD))
app.get('/api/charts/feature-matrix', (c) => c.json(DEMO_FEATURE_MATRIX))
app.get('/api/charts/policy-regions', (c) => c.json(DEMO_POLICY_REGIONS))
app.get('/api/charts/globe-dots', (c) => c.json(DEMO_GLOBE_DOTS))

// =====================================================================
// API: Anakin Transparency Drawer — show exact prompts + schema
// =====================================================================
app.get('/api/transparency', (c) => {
  return c.json({
    daily_briefing: {
      endpoint: 'POST https://api.anakin.io/v1/agentic-search',
      system_prompt: DAILY_BRIEFING_SYSTEM_PROMPT,
      user_prompt: dailyBriefingUserPrompt({
        industry: DEMO_TENANT.industry,
        region: DEMO_TENANT.region,
        competitor_domains: DEMO_TENANT.competitor_domains,
        pillars_enabled: DEMO_TENANT.pillars_enabled,
      }),
      json_schema: BRIEFING_JSON_SCHEMA,
      anakin_job_id: 'demo-job-0001',
      credits_spent: 15,
      poll_endpoint: 'GET https://api.anakin.io/v1/agentic-search/demo-job-0001',
      poll_interval_ms: 10000,
      cache_hours: 24,
    },
    competitor_scraper: {
      endpoint: 'POST https://api.anakin.io/v1/url-scraper',
      prompt: COMPETITOR_SCRAPE_PROMPT('https://stripe.com/pricing'),
      credits_per_call: 1,
      cron: 'hourly via pg_cron',
    },
    ask_realitypulse: {
      endpoint: 'POST https://api.anakin.io/v1/agentic-search',
      prompt_template: ASK_FRESH_SEARCH_PROMPT('{user_question}', '{industry}'),
      credits_per_call: 3,
      rag_layer: 'pgvector cosine over embeddings table (free, NVIDIA NV-Embed-v2)',
    },
    raw_response_sample: DEMO_BRIEFING,
  })
})

// =====================================================================
// API: Ask RealityPulse chat — NVIDIA meta/llama-3.2-3b-instruct
// =====================================================================
app.post('/api/ask', async (c) => {
  const { question } = await c.req.json<{ question: string }>()
  const apiKey = c.env?.NVIDIA_API_KEY

  // Build a deterministic RAG context from today's briefing
  const context = DEMO_BRIEFING.events
    .map((e, i) => `[${i + 1}] (${e.pillar}) ${e.title} — ${e.summary} — ${e.source_url}`)
    .join('\n')

  const systemPrompt = `You are RealityPulse, a Bloomberg-grade business
intelligence assistant. Answer using ONLY the EVIDENCE below. Cite sources
using bracket numbers [1] [2] that map to the evidence list. Tone: terse,
decisive, boardroom-ready. If evidence is insufficient, say so plainly.

EVIDENCE (today's briefing for ${DEMO_TENANT.industry} in ${DEMO_TENANT.region}):
${context}`

  // If no NVIDIA key available, fall back to a deterministic mock so the
  // demo always works for judges (even with flaky WiFi / no secret set).
  if (!apiKey) {
    const mockAnswer = synthesizeMockAnswer(question)
    return c.json({
      answer: mockAnswer,
      citations: DEMO_BRIEFING.events.slice(0, 3).map((e, i) => ({
        ref: `[${i + 1}]`,
        title: e.title,
        url: e.source_url,
        pillar: e.pillar,
      })),
      model: 'mock (NVIDIA_API_KEY not configured)',
      credits_used: 0,
    })
  }

  // Real NVIDIA call — meta/llama-3.2-3b-instruct
  try {
    const resp = await fetch(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'meta/llama-3.2-3b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: false,
        }),
      },
    )
    const data = (await resp.json()) as any
    const answer = data?.choices?.[0]?.message?.content ?? 'No response.'
    return c.json({
      answer,
      citations: DEMO_BRIEFING.events.slice(0, 3).map((e, i) => ({
        ref: `[${i + 1}]`,
        title: e.title,
        url: e.source_url,
        pillar: e.pillar,
      })),
      model: 'meta/llama-3.2-3b-instruct',
      credits_used: 3,
    })
  } catch (err: any) {
    return c.json({ error: String(err), answer: 'Error reaching NVIDIA API.' }, 500)
  }
})

// =====================================================================
// API: Scenario Simulator — "What if EU AI Act passes?"
// Re-uses cached briefings (zero new Anakin credits).
// =====================================================================
app.post('/api/scenario', async (c) => {
  const { scenario } = await c.req.json<{ scenario: string }>()
  // Deterministic delta calc — multiplies severities of matching pillars
  const matchPolicy = /ai act|gdpr|cfpb|regulation/i.test(scenario)
  const matchCompetitor = /stripe|adyen|checkout|price|fee/i.test(scenario)
  const baseThreat = DEMO_BRIEFING.threat_level
  const newThreat = Math.min(
    100,
    baseThreat + (matchPolicy ? 14 : 0) + (matchCompetitor ? 9 : 0),
  )
  return c.json({
    scenario,
    threat_level_before: baseThreat,
    threat_level_after: newThreat,
    delta_threats: matchPolicy ? 4 : 2,
    delta_actions: matchPolicy ? 2 : 1,
    impacted_events: DEMO_BRIEFING.events
      .filter((e) =>
        matchPolicy
          ? e.pillar === 'policy'
          : matchCompetitor
          ? e.pillar === 'competitor'
          : true,
      )
      .slice(0, 4),
    credits_used: 0,
  })
})

// =====================================================================
// API: Generate email/Slack draft for an action
// =====================================================================
app.post('/api/action/draft', async (c) => {
  const { action_id, kind } = await c.req.json<{
    action_id: number
    kind: 'email' | 'slack'
  }>()
  const action = DEMO_BRIEFING.actions[action_id]
  if (!action) return c.json({ error: 'Action not found' }, 404)
  return c.json({
    kind,
    body: kind === 'email' ? action.email_draft : action.slack_message,
    generated_by: 'meta/llama-3.2-3b-instruct (cached)',
    credits_used: 0,
  })
})

// =====================================================================
// Helpers
// =====================================================================
function synthesizeMockAnswer(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('eu ai act') || q.includes('regulation')) {
    return `The EU AI Act Article 6 enforcement window opened today (00:00 CET). Your underwriting models likely fall under Annex III high-risk classification — conformity assessment and CE marking are now required. Penalties reach 7% of global turnover [1]. Recommended action: audit model inventory by end of week and loop legal in immediately. The CFPB also issued a related circular on BNPL pay-in-4 products [6] which may stack with this.`
  }
  if (q.includes('stripe') || q.includes('competitor') || q.includes('price')) {
    return `Stripe raised ACH transaction fees from $0.80 to $0.90 effective today — a 12.5% hike with no public announcement, detected via our hourly pricing-page diff [2]. For a typical $5M-volume customer this is ~$14k/year incremental cost. Meanwhile Adyen launched their Embedded Finance API targeting your exact SMB segment [3]. The window to counter-market is roughly 5 days while buyers are actively evaluating.`
  }
  if (q.includes('churn') || q.includes('sentiment')) {
    return `Sentiment around fraud-detection in r/fintech dropped 18 points week-over-week, with "false positives" leading complaint volume [4]. Separately, G2 reviews mention "onboarding friction" up 31% MoM [7] — this is an opportunity, not a threat, given your instant-KYC capability. The churn signal aligns with the fraud-false-positive narrative more than with pricing.`
  }
  return `Based on today's briefing for ${DEMO_TENANT.industry}: threat level is ${DEMO_BRIEFING.threat_level}/100 with 4 high-impact events overnight. The standout signals are (a) EU AI Act enforcement going live [1], (b) Stripe's silent ACH fee increase [2], and (c) Adyen's Embedded Finance launch targeting your ICP [3]. Ask me anything more specific — pricing, regulation, sentiment, or competitor moves.`
}

export default app
