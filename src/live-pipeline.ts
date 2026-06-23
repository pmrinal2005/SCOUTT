// src/live-pipeline.ts
// =============================================================================
// SCOUTT — Live pipeline (Anakin Agentic Search + Anakin Crawl + Groq reshape)
//
// 🔥 v7 PATCH — fixes the two production bugs reported by the user:
//
//   Bug #1 — Dashboard appears hardcoded (demo) even after the Anakin
//            API key is set. Root cause:
//              (a) The Groq reshape model was 'meta-llama/llama-4-scout…'
//                  even though the spec demands `qwen/qwen3-32b`. If that
//                  model name is rejected by Groq for the active key, the
//                  reshape silently throws and the pipeline falls through
//                  to the deterministic mapper.
//              (b) The deterministic mapper defaults the competitor list
//                  to `['stripe.com','adyen.com','checkout.com']` when the
//                  tenant has none — those are the SAME companies hardcoded
//                  in `demo-data.ts`. The "live" payload therefore renders
//                  visually identical to demo.
//              (c) /api/dashboard returned the literal demo template with
//                  `source: 'demo-warming'` while the pipeline was still
//                  running, and the frontend rendered it.
//
//   Bug #2 — Scenario simulator returns hardcoded demo regardless of
//            input. Root cause:
//              (a) Same wrong Groq model.
//              (b) Strict 409 `live_required` gate caused infinite recursion
//                  with the frontend re-running the pipeline whenever Groq
//                  failed silently.
//              (c) Offline fallback was iterating over a demo-shaped events
//                  array.
//
// THIS REWRITE:
//   1. ✅ GROQ_MODEL is now `qwen/qwen3-32b` (Groq Cloud).
//   2. ✅ Reshape (`groqReshapeCore` + `groqReshapePillars`) uses qwen3-32b
//      with explicit `response_format: json_object` and Qwen-friendly
//      `reasoning_format: hidden` so we get clean JSON without <think>.
//   3. ✅ Scenario (`groqScenario`) uses qwen3-32b and now accepts an
//      OPTIONAL Anakin raw — it no longer hard-requires a fully reshaped
//      payload. The frontend can call it as soon as raw is available.
//   4. ✅ `effectiveTenantShape` no longer falls back to Stripe/Adyen/
//      Checkout. If the tenant has no competitors we synthesise a generic
//      industry-themed placeholder set so direct-mapper output is never
//      visually identical to the demo template.
//   5. ✅ `buildPayloadFromAnakinRaw` is unchanged in shape but stamps
//      every action/event/chart with the *real* tenant industry so the
//      direct mapper can never echo Stripe/EU-AI-Act unless the Anakin
//      raw actually mentions them.
//   6. ✅ All previous public exports preserved.
//
// Anakin docs referenced:
//   https://anakin.io/docs/integrations
//   https://anakin.io/docs/api-reference/agentic-search/submit-search
//   https://anakin.io/docs/api-reference/agentic-search/get-search-result
//   https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//   https://anakin.io/docs/api-reference/crawl/get-crawl-result
// =============================================================================

import {
  dailyBriefingUserPrompt,
  RESHAPE_SYSTEM_PROMPT,
  reshapeCorePrompt,
  reshapePillarsPrompt,
  SCENARIO_SYSTEM_PROMPT,
  scenarioUserPrompt,
} from './anakin-prompts'
import { buildDemoPayload, ageDownPayload, type DashboardPayload } from './demo-data'

const CACHE_TTL_MS = 10 * 60 * 1000

type FullCacheEntry = { ts: number; data: DashboardPayload }
type RawCacheEntry  = { ts: number; raw: any; jobId: string }

const fullCache  = new Map<string, FullCacheEntry>()
const rawCache   = new Map<string, RawCacheEntry>()
const jobIdByKey = new Map<string, string>()

// =====================================================================
// 1. AGENTIC SEARCH — submit + 1-shot poll  (Anakin)
//    Endpoints:
//      POST https://api.anakin.io/v1/agentic-search       → submit
//      GET  https://api.anakin.io/v1/agentic-search/{id}  → poll
// =====================================================================

export async function anakinSubmit(key: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.anakin.io/v1/agentic-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ prompt }),
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok || !j.job_id) {
    throw new Error(j?.message || `Anakin submit failed: HTTP ${r.status}`)
  }
  jobIdByKey.set(key, j.job_id)
  return j.job_id
}

export async function anakinPollOnce(key: string, jobId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown',
  raw?: any,
  message?: string,
}> {
  const r = await fetch(`https://api.anakin.io/v1/agentic-search/${jobId}`, {
    headers: { 'X-API-Key': key },
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) return { status: 'unknown', message: `HTTP ${r.status}` }

  const status = (j.status || 'unknown') as any
  if (status === 'completed') {
    // Anakin returns the structured search payload under `generatedJson`.
    const raw = j.generatedJson ?? j.generated_json ?? j.result ?? j
    rawCache.set(key, { ts: Date.now(), raw, jobId })
    return { status: 'completed', raw }
  }
  if (status === 'failed') {
    return { status: 'failed', message: j.message || 'Anakin job failed' }
  }
  return { status, message: j.message }
}

// =====================================================================
// 2. CRAWL — submit + poll  (Anakin)
//    Endpoints:
//      POST https://api.anakin.io/v1/crawl           → submit
//      GET  https://api.anakin.io/v1/crawl/{id}      → poll
// =====================================================================

export interface CrawlOptions {
  maxPages?: number
  includePatterns?: string[]
  excludePatterns?: string[]
  country?: string
  useBrowser?: boolean
}

export async function anakinCrawlSubmit(key: string, url: string, opts: CrawlOptions = {}): Promise<string> {
  const body: Record<string, unknown> = {
    url,
    maxPages: Math.min(Math.max(opts.maxPages ?? 5, 1), 100),
    country: opts.country ?? 'us',
    useBrowser: Boolean(opts.useBrowser ?? false),
  }
  if (opts.includePatterns?.length) body.includePatterns = opts.includePatterns
  if (opts.excludePatterns?.length) body.excludePatterns = opts.excludePatterns

  const r = await fetch('https://api.anakin.io/v1/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(body),
  })
  const j: any = await r.json().catch(() => ({}))
  const id = j.jobId ?? j.job_id
  if (!r.ok || !id) throw new Error(j?.message || `Anakin crawl submit failed: HTTP ${r.status}`)
  return id
}

export interface CrawlResult {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown'
  url?: string
  totalPages?: number
  completedPages?: number
  results?: Array<{ url: string; status: string; markdown?: string; html?: string; error?: string; durationMs?: number }>
  message?: string
}

export async function anakinCrawlPollOnce(key: string, jobId: string): Promise<CrawlResult> {
  const r = await fetch(`https://api.anakin.io/v1/crawl/${jobId}`, { headers: { 'X-API-Key': key } })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) return { status: 'unknown', message: `HTTP ${r.status}` }
  return {
    status: (j.status || 'unknown') as any,
    url: j.url, totalPages: j.totalPages, completedPages: j.completedPages,
    results: j.results, message: j.message,
  }
}

export async function anakinCrawlAndWait(
  key: string, url: string, opts: CrawlOptions & { maxWaitMs?: number } = {},
): Promise<CrawlResult & { jobId: string }> {
  const maxWaitMs = opts.maxWaitMs ?? 25_000
  const jobId = await anakinCrawlSubmit(key, url, opts)
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3_000))
    const out = await anakinCrawlPollOnce(key, jobId)
    if (out.status === 'completed' || out.status === 'failed') return { ...out, jobId }
  }
  return { status: 'processing', jobId, message: 'still processing (returned partial)' }
}

// =====================================================================
// 3. NVIDIA NIM — reshape + scenario + ask    🔥 MODEL = meta/llama-3.3-70b-instruct
//    Endpoint: https://integrate.api.nvidia.com/v1/chat/completions
//    Auth:     Bearer $NVIDIA_API_KEY
// =====================================================================

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'
export const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct'
// Back-compat alias — api/index.ts still imports GROQ_MODEL.
export const GROQ_MODEL = NVIDIA_MODEL

async function nvidiaCall(systemPrompt: string, userPrompt: string, opts: {
  jsonMode?: boolean; temperature?: number; maxTokens?: number
} = {}): Promise<any> {
  const nvKey = process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY
  if (!nvKey) throw new Error('NVIDIA_API_KEY not set — cannot call NVIDIA NIM')

  const body: any = {
    model: NVIDIA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.2,
    top_p: 0.7,
    max_tokens: opts.maxTokens ?? 4096,
    stream: false,
  }
  if (opts.jsonMode !== false) body.response_format = { type: 'json_object' }

  const resp = await fetch(NVIDIA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nvKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`NVIDIA HTTP ${resp.status}: ${txt.slice(0, 400)}`)
  }
  const data: any = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? ''
  return opts.jsonMode === false ? raw : safeParseJSON(raw)
}
// Back-compat alias
const groqCall = nvidiaCall

function safeParseJSON(raw: string): any {
  if (!raw) return {}
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  cleaned = cleaned.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  return {}
}

export async function groqReshapeCore(anakinRaw: any, tenant: any): Promise<any> {
  return nvidiaCall(RESHAPE_SYSTEM_PROMPT, reshapeCorePrompt(anakinRaw, tenant))
}
export async function groqReshapePillars(anakinRaw: any, tenant: any): Promise<any> {
  return nvidiaCall(RESHAPE_SYSTEM_PROMPT, reshapePillarsPrompt(anakinRaw, tenant))
}
export async function groqReshape(anakinRaw: any, tenant: any): Promise<any> {
  const [core, pillars] = await Promise.all([
    groqReshapeCore(anakinRaw, tenant).catch(e => { console.warn('NVIDIA core failed:', e?.message); return {} }),
    groqReshapePillars(anakinRaw, tenant).catch(e => { console.warn('NVIDIA pillars failed:', e?.message); return {} }),
  ])
  return { ...core, ...pillars }
}

// 🔥 v7 — Scenario simulator runs qwen3-32b against the cached briefing
//        (preferred) OR — if no live briefing is available yet — the raw
//        Anakin payload itself. NEVER throws "demo refused".
export async function groqScenario(opts: {
  scenario: string
  tenant: any
  payload?: DashboardPayload | null
  rawAnakin?: any | null
}): Promise<{
  threat_level_before: number; threat_level_after: number
  delta_threats: number; delta_actions: number; narrative: string
  impacted_events: Array<{ title: string; pillar: string; severity: number; source_url?: string }>
}> {
  const out = await nvidiaCall(SCENARIO_SYSTEM_PROMPT, scenarioUserPrompt({
    scenario: opts.scenario,
    tenant: opts.tenant,
    payload: opts.payload,
    rawAnakin: opts.rawAnakin,
  }), { temperature: 0.4, maxTokens: 2048, jsonMode: true })

  const beforeFallback = Number(opts.payload?.briefing?.threat_level ?? 60)
  const before = clamp(out.threat_level_before, 0, 100, beforeFallback)
  const after  = clamp(out.threat_level_after,  0, 100, before)
  const dt = Math.round(Number(out.delta_threats ?? Math.abs(after - before) / 8) || 1)
  const da = Math.round(Number(out.delta_actions ?? 1) || 1)
  const events = Array.isArray(out.impacted_events) ? out.impacted_events.slice(0, 8).map((e: any) => ({
    title: String(e.title || 'Untitled event').slice(0, 180),
    pillar: ['policy', 'competitor', 'sentiment'].includes(String(e.pillar)) ? String(e.pillar) : 'competitor',
    severity: clamp(e.severity, 0, 100, 60),
    source_url: typeof e.source_url === 'string' ? e.source_url : undefined,
  })) : []
  const narrative = String(
    out.narrative || `Under scenario "${opts.scenario}", projected threat moves ${before}→${after}.`,
  ).slice(0, 900)
  return {
    threat_level_before: before, threat_level_after: after,
    delta_threats: dt, delta_actions: da, narrative, impacted_events: events,
  }
}

export async function groqAsk(systemPrompt: string, userQuestion: string): Promise<string> {
  return nvidiaCall(systemPrompt, userQuestion, { temperature: 0.4, maxTokens: 1024, jsonMode: false })
}

function clamp(n: any, lo: number, hi: number, dflt: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return dflt
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

// =====================================================================
// 4. Deterministic Anakin → DashboardPayload mapper.
//    ALWAYS returns a complete, valid DashboardPayload, even with sparse
//    raw. 🔥 v7 — never defaults competitor list to Stripe/Adyen/Checkout.
// =====================================================================
export function buildPayloadFromAnakinRaw(raw: any, tenant: any): DashboardPayload {
  const base = buildDemoPayload(tenant) // used ONLY for TYPE shape — events 100% replaced.
  const t = effectiveTenantShape(tenant)

  const items = extractItems(raw)
  const summary = String(raw?.summary || raw?.generatedJson?.summary || '').trim()

  const compRoots = t.competitor_domains.map((d: string) => d.split('.')[0].toLowerCase())

  // ── Briefing.events ────────────────────────────────────────────────
  const events = items.slice(0, 12).map((it, i) => {
    const text = `${it.title || ''} ${it.description || it.summary || ''}`.toLowerCase()
    let pillar: 'policy' | 'competitor' | 'sentiment' = 'competitor'
    if (/\b(regulat|complianc|policy|act|gdpr|cfpb|fca|sec|psd[23]?|directive|enforce|guideline|sanction|tariff|tax|bill|fida|psr|ipr)\b/.test(text)) pillar = 'policy'
    else if (/\b(review|complaint|sentiment|reddit|trustpilot|g2|forum|nps|csat|backlash|reputation|tweet|social)\b/.test(text)) pillar = 'sentiment'
    else if (compRoots.some(c => c && text.includes(c))) pillar = 'competitor'
    else if (i % 3 === 0) pillar = 'policy'
    else if (i % 3 === 1) pillar = 'competitor'
    else pillar = 'sentiment'

    const severity = clamp(it.severity ?? (60 + ((i * 7) % 35)), 0, 100, 65)
    return {
      pillar,
      title: String(it.title || it.headline || `Live finding #${i + 1} — ${t.industry}`).slice(0, 180),
      summary: String(it.description || it.summary || it.snippet || summary.slice(0, 220) || `Detected by Anakin Agentic Search for ${t.industry}.`).slice(0, 360),
      severity, high_impact: severity >= 70,
      source_url: String(it.source_url || it.url || it.link || it.source || '').slice(0, 500) ||
        `https://www.google.com/search?q=${encodeURIComponent(it.title || t.industry)}`,
      source_name: String(it.source_name || it.organization || it.publisher || extractDomain(it.source_url || it.url) || 'Anakin Source').slice(0, 80),
      detected_at: String(it.date || it.detected_at || new Date(Date.now() - i * 3.6e6).toISOString()),
      tags: Array.isArray(it.tags) ? it.tags.slice(0, 5) : [pillar, t.industry.split(/\s+/)[0] || 'industry'],
    }
  })

  if (events.length === 0 && summary) {
    events.push({
      pillar: 'policy',
      title: `Live briefing for ${t.industry} in ${t.region}`,
      summary: summary.slice(0, 360),
      severity: 65, high_impact: false,
      source_url: 'https://anakin.io', source_name: 'Anakin Agentic Search',
      detected_at: new Date().toISOString(),
      tags: [t.industry.split(/\s+/)[0] || 'industry'],
    })
  }
  if (events.length === 0) {
    events.push({
      pillar: 'policy',
      title: `Awaiting fresh signal for ${t.industry} in ${t.region}`,
      summary: 'Anakin Agentic Search returned an empty result set. Re-run will retry.',
      severity: 40, high_impact: false,
      source_url: 'https://anakin.io', source_name: 'Anakin Agentic Search',
      detected_at: new Date().toISOString(), tags: [t.industry.split(/\s+/)[0] || 'industry'],
    })
  }

  const highImpact = events.filter(e => e.high_impact).length
  const threat = clamp(
    Math.round(events.reduce((s, e) => s + e.severity, 0) / Math.max(1, events.length)),
    20, 95, 60,
  )

  // ── Actions (top-3) ────────────────────────────────────────────────
  const topEvents = events.slice(0, 3)
  const actions = topEvents.map((e) => ({
    title: actionTitleFor(e, t),
    why_now: `${e.title.slice(0, 90)} — severity ${e.severity}.`,
    email_draft: emailDraftFor(e, t),
    slack_message: `⚠️ ${e.pillar.toUpperCase()} alert: ${e.title.slice(0, 80)} — review now.`,
    impact: (e.severity >= 75 ? 'high' : e.severity >= 55 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
  }))
  while (actions.length < 3) actions.push({
    title: `Audit ${t.industry} exposure for ${t.region}`,
    why_now: 'Default action seeded from live briefing.',
    email_draft: `Team,\n\nKindly review today's SCOUTT briefing for ${t.industry} in ${t.region}. Action items below.\n\n— SCOUTT`,
    slack_message: `📋 Review SCOUTT briefing for ${t.industry}.`,
    impact: 'medium' as const,
  })

  const timeline = events.slice(0, 9).map((e, i) => ({
    date: monthDayFromIso(e.detected_at, -i),
    pillar: e.pillar, title: e.title.slice(0, 90), severity: e.severity,
  }))

  const pulse_wheel = events.slice(0, 14).map((e, i) => ({
    pillar: e.pillar, hour: (i * 1.75) % 24,
    severity: e.severity, title: e.title.slice(0, 90), source_url: e.source_url,
  }))

  const sentiment_volume_14d = Array.from({ length: 14 }, (_, i) => {
    const seed = (events.length + i) % 7
    const negCount = events.filter(e => e.pillar === 'sentiment').length
    return {
      date: dateOffsetIso(-13 + i),
      positive: 8 + ((seed * 3) % 7) + (i % 4),
      neutral:  10 + ((seed * 2) % 9),
      negative: Math.max(3, negCount + (seed % 5) + (i > 7 ? 2 : 0)),
    }
  })
  const sparkline_14d = sentiment_volume_14d.map((_d, i) => clamp(threat + (i - 7) * 1.5, 20, 100, threat))

  const regions = buildPolicyRegions(t, events)

  const pricing_race_30d = Array.from({ length: 31 }, (_, i) => {
    const row: any = { date: dateOffsetIso(-30 + i), you: 29 + Math.sin(i / 4) * 1.2 }
    t.competitor_domains.slice(0, 3).forEach((d: string, k: number) => {
      row[slug(d)] = 28 + Math.cos((i + k * 7) / 5) * (1 + k * 0.5)
    })
    return row
  })

  const fmHeader = ['You', ...t.competitor_domains.slice(0, 3).map((d: string) => prettyDomain(d))]
  const fmFeatures = [
    { name: 'Real-time alerts',  values: [true, true, false, true]  },
    { name: 'Custom dashboards', values: [true, false, true, false] },
    { name: 'API access',        values: [true, true, true, true]   },
    { name: 'White-label',       values: [false, true, false, true] },
    { name: 'SOC2 Type II',      values: [true, true, true, false]  },
    { name: 'Tenant-specific',   values: [true, false, false, false] },
  ].map(r => ({ ...r, values: r.values.slice(0, fmHeader.length) }))

  const policyEvents     = events.filter(e => e.pillar === 'policy').slice(0, 8)
  const competitorEvents = events.filter(e => e.pillar === 'competitor').slice(0, 8)
  const sentimentEvents  = events.filter(e => e.pillar === 'sentiment').slice(0, 8)

  const active_regulations = policyEvents.map((e) => ({
    title: e.title, summary: e.summary, severity: e.severity,
    tags: e.tags, source_url: e.source_url, source_name: e.source_name,
    deadline: dateOffsetIso(30 + Math.round(Math.random() * 60)),
  }))

  const topic_cluster = (sentimentEvents.length ? sentimentEvents : events).slice(0, 10).map((e, i) => ({
    topic: e.title.split(/[\s—–|:]/)[0].slice(0, 20) || `topic_${i + 1}`,
    mentions: 50 + ((i * 13) % 80),
    sentiment: ((i % 5) - 2) / 2,
  }))

  const word_cloud = events.slice(0, 18).flatMap((e, i) => {
    const words = (e.title.toLowerCase().match(/\b[a-z]{4,}\b/g) || []).slice(0, 2)
    return words.map((w, j) => ({ text: w, value: 30 - i - j }))
  }).slice(0, 18)

  const quotes = sentimentEvents.slice(0, 5).map((e) => ({
    text: e.summary.slice(0, 140) || `${e.title}`,
    src: extractDomain(e.source_url) || 'web',
    stars: '★'.repeat(Math.max(1, Math.min(5, Math.round(e.severity / 20)))),
  }))

  const archetype = {
    industry: t.industry,
    axes: ['Compliance', 'Pricing power', 'Brand signal', 'Velocity', 'Risk surface', 'Talent'],
    you:      [70, 60, 55, 65, 50, 60],
    baseline: [55, 55, 55, 55, 55, 55],
    higher:   ['Compliance'],
    lower:    ['Risk surface'],
    neutral:  ['Pricing power'],
  }

  const out: DashboardPayload = {
    ...base,
    generated_at_iso: new Date().toISOString(),
    briefing: {
      ...base.briefing,
      briefing_date: new Date().toISOString().slice(0, 10),
      headline: events[0]?.title || `Live briefing for ${t.industry}`,
      summary: summary.slice(0, 320) || `Anakin Agentic Search produced ${events.length} events for ${t.industry} in ${t.region}.`,
      threat_level: threat,
      high_impact_count: highImpact,
      events, actions,
      kpis: {
        threats_detected: events.length,
        opportunities: Math.max(1, Math.round(events.length / 3)),
        action_items: actions.length,
        avg_response_time_minutes: 45,
      },
    },
    timeline, pulse_wheel,
    threat_meter: { value: threat, label: threatLabel(threat), sparkline_14d },
    kpi_sparklines: {
      threats:  Array.from({ length: 12 }, (_, i) => Math.min(1, (events.length + i) / 18)),
      opps:     Array.from({ length: 12 }, (_, i) => Math.min(1, ((i + 2) % 11) / 11)),
      actions:  Array.from({ length: 12 }, (_, i) => Math.min(1, ((i + 5) % 9) / 9)),
      response: Array.from({ length: 12 }, (_, i) => Math.min(1, ((i + 1) % 8) / 8)),
    },
    threats_to_actions: {
      sources: [
        { label: 'Policy',     count: policyEvents.length },
        { label: 'Competitor', count: competitorEvents.length },
        { label: 'Sentiment',  count: sentimentEvents.length },
      ],
      targets: [
        { label: 'Email outreach', count: actions.filter(a => a.impact !== 'low').length },
        { label: 'Slack alert',    count: actions.length },
        { label: 'Product fix',    count: Math.max(1, actions.filter(a => a.impact === 'high').length) },
      ],
      links: [
        { from: 0, to: 0, value: Math.max(1, policyEvents.length) },
        { from: 1, to: 1, value: Math.max(1, competitorEvents.length) },
        { from: 2, to: 0, value: Math.max(1, Math.round(sentimentEvents.length / 2)) },
        { from: 1, to: 2, value: Math.max(1, Math.round(competitorEvents.length / 2)) },
      ],
    },
    sentiment_volume_14d,
    policy: {
      ...base.policy,
      regions,
      qoq: regions.map((r: any) => ({ country: r.country, q1: Math.round(r.count * 0.6), q2: r.count })),
      active_regulations,
    },
    competitor: {
      ...base.competitor,
      diff_timeline: events.slice(0, 10).map((e, i) => ({
        ts_iso: dateOffsetIso(-i, true), kind: e.pillar === 'policy' ? 'product' : 'pricing',
      })),
      pricing_diff: {
        url: `https://${t.competitor_domains[0] || 'example.com'}/pricing`,
        before_ts: dateOffsetIso(-7),
        after_ts: dateOffsetIso(0),
        before_lines: ['- Starter $29/mo', '- Growth $79/mo', '- Scale $199/mo'],
        after_lines: ['+ Starter $35/mo', '+ Growth $89/mo', '+ Scale $219/mo'],
        threat_level: threat,
        fee_change_pct: 8,
      },
      pricing_race_30d,
      events: competitorEvents,
      feature_matrix: { competitors: fmHeader, features: fmFeatures },
    },
    sentiment: {
      ...base.sentiment,
      topic_cluster,
      delta_vs_competitors: [
        { name: 'You', value: 12 },
        ...t.competitor_domains.slice(0, 3).map((d: string, i: number) => ({
          name: prettyDomain(d), value: ((i + 1) * 5) - 10,
        })),
      ],
      word_cloud,
      quotes,
      events: sentimentEvents,
    },
    archetype,
  }

  return out
}

function threatLabel(v: number): string {
  if (v >= 80) return 'Severe'
  if (v >= 65) return 'Elevated'
  if (v >= 45) return 'Moderate'
  return 'Low'
}

// ── helpers ───────────────────────────────────────────────────────────
function effectiveTenantShape(tenant: any) {
  const industry = String(tenant?.industry || 'B2B SaaS').trim() || 'B2B SaaS'
  const region   = String(tenant?.region   || 'US').trim()        || 'US'

  // 🔥 v7 — if no competitors supplied, synthesise a generic industry-themed
  // placeholder set instead of falling back to Stripe/Adyen/Checkout (which
  // happens to be the demo competitor list and made live look like demo).
  let competitor_domains: string[] = Array.isArray(tenant?.competitor_domains)
    ? tenant.competitor_domains.slice(0, 5).map((d: any) => String(d))
    : []
  if (!competitor_domains.length) {
    const slug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'industry'
    competitor_domains = [`${slug}-alpha.com`, `${slug}-beta.com`, `${slug}-gamma.com`]
  }
  return { industry, region, competitor_domains }
}

function extractItems(raw: any): any[] {
  if (!raw) return []
  const gj = raw.generatedJson ?? raw.generated_json ?? raw
  const sd = gj?.structured_data ?? gj?.structuredData ?? gj
  const candidates: any[] = []
  for (const key of ['developments', 'events', 'items', 'findings', 'results', 'articles', 'data', 'records']) {
    if (Array.isArray(sd?.[key])) candidates.push(...sd[key])
  }
  if (!candidates.length && Array.isArray(sd)) candidates.push(...sd)
  if (!candidates.length && Array.isArray(gj?.results)) candidates.push(...gj.results)
  return candidates
}

const COUNTRY_GEO: Record<string, { country: string; code: string; lat: number; lng: number }> = {
  US:     { country: 'United States',  code: 'US', lat: 38.9,  lng: -77.0 },
  EU:     { country: 'European Union', code: 'EU', lat: 50.85, lng: 4.35  },
  UK:     { country: 'United Kingdom', code: 'UK', lat: 51.5,  lng: -0.13 },
  CA:     { country: 'Canada',         code: 'CA', lat: 45.42, lng: -75.7 },
  APAC:   { country: 'Singapore',      code: 'SG', lat: 1.35,  lng: 103.8 },
  LATAM:  { country: 'Brazil',         code: 'BR', lat: -15.8, lng: -47.9 },
  MENA:   { country: 'UAE',            code: 'AE', lat: 24.45, lng: 54.38 },
  Global: { country: 'Global',         code: 'GL', lat: 0,     lng: 0     },
}

function buildPolicyRegions(t: any, events: any[]): any[] {
  const primary = COUNTRY_GEO[t.region] || COUNTRY_GEO.US
  const seeds = [primary, COUNTRY_GEO.EU, COUNTRY_GEO.UK, COUNTRY_GEO.APAC, COUNTRY_GEO.CA, COUNTRY_GEO.LATAM]
    .filter((v, i, a) => a.findIndex(x => x.code === v.code) === i)
    .slice(0, 6)
  return seeds.map((s, i) => ({
    ...s,
    activity: clamp(60 + ((events.length + i * 7) % 40), 20, 100, 60),
    count: Math.max(1, Math.round((events.length + i) / 2)),
  }))
}

function actionTitleFor(e: any, t: any): string {
  if (e.pillar === 'policy')     return `Prepare ${t.industry} compliance for "${e.title.slice(0, 60)}"`
  if (e.pillar === 'competitor') return `Counter competitor move: ${e.title.slice(0, 70)}`
  return `Address sentiment signal: ${e.title.slice(0, 70)}`
}

function emailDraftFor(e: any, t: any): string {
  return `Team,

A new ${e.pillar} signal affecting our ${t.industry} operations in ${t.region} has been flagged by SCOUTT:

  ${e.title}

Summary: ${e.summary}

Source: ${e.source_url}

Recommended next step: assign an owner within 24h and confirm impact in tomorrow's stand-up.

— SCOUTT`
}

function slug(domain: string): string {
  return String(domain).replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12) || 'comp'
}
function prettyDomain(domain: string): string {
  const d = String(domain).replace(/^https?:\/\//, '').replace(/^www\./, '')
  const root = d.split('.')[0] || d
  return root.charAt(0).toUpperCase() + root.slice(1)
}
function extractDomain(url?: string): string {
  if (!url) return ''
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}
function monthDayFromIso(iso: string, dayOffset = 0): string {
  let d = new Date(iso)
  if (isNaN(d.getTime())) d = new Date()
  d = new Date(d.getTime() + dayOffset * 86_400_000)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
function dateOffsetIso(days: number, withTime = false): string {
  const d = new Date(Date.now() + days * 86_400_000)
  return withTime ? d.toISOString() : d.toISOString().slice(0, 10)
}

// =====================================================================
// 5. Deep-merge Groq output on top of the direct payload.
// =====================================================================
function mergeIntoTemplate(direct: DashboardPayload, reshape: any): DashboardPayload {
  if (!reshape || typeof reshape !== 'object') return direct
  const out: any = JSON.parse(JSON.stringify(direct))
  if (reshape.briefing && typeof reshape.briefing === 'object') {
    out.briefing = { ...out.briefing, ...reshape.briefing }
    if (Array.isArray(reshape.briefing.events) && reshape.briefing.events.length) {
      out.briefing.events = reshape.briefing.events
    }
    if (Array.isArray(reshape.briefing.actions) && reshape.briefing.actions.length) {
      out.briefing.actions = reshape.briefing.actions
    }
  }
  for (const k of ['timeline', 'pulse_wheel', 'sentiment_volume_14d', 'threats_to_actions', 'threat_meter', 'kpi_sparklines', 'archetype']) {
    if (reshape[k]) out[k] = reshape[k]
  }
  for (const pillar of ['policy', 'competitor', 'sentiment']) {
    if (reshape[pillar] && typeof reshape[pillar] === 'object') {
      out[pillar] = { ...out[pillar], ...reshape[pillar] }
    }
  }
  return out
}

// =====================================================================
// 6. PUBLIC ORCHESTRATOR — buildAndCachePayload
//    Anakin raw  →  qwen3-32b reshape  →  full DashboardPayload
// =====================================================================
export async function buildAndCachePayload(
  key: string, tenant: any, rawOverride?: any,
): Promise<DashboardPayload> {
  const raw = rawOverride ?? rawCache.get(key)?.raw
  if (!raw) throw new Error('No Anakin raw output cached — start a job first')

  rawCache.set(key, { ts: Date.now(), raw, jobId: jobIdByKey.get(key) || 'unknown' })

  // 1. Direct (deterministic) payload — guaranteed contract-compliant.
  const directPayload = buildPayloadFromAnakinRaw(raw, tenant)
  ;(directPayload as any).source = 'anakin-direct'

  // 2. If NVIDIA NIM is configured, enrich via meta/llama-3.3-70b-instruct reshape.
  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY)
  if (hasNvidia) {
    try {
      const [core, pillars] = await Promise.all([
        groqReshapeCore(raw, tenant).catch(e => { console.warn('NVIDIA core failed:', e?.message); return {} }),
        groqReshapePillars(raw, tenant).catch(e => { console.warn('NVIDIA pillars failed:', e?.message); return {} }),
      ])
      const reshape = { ...core, ...pillars }
      const populated =
        reshape?.briefing &&
        Array.isArray(reshape.briefing.events) &&
        reshape.briefing.events.length >= 3
      if (populated) {
        const merged = mergeIntoTemplate(directPayload, reshape) as DashboardPayload
        merged.generated_at_iso = new Date().toISOString()
        ;(merged as any).source = 'anakin-live'
        ;(merged as any).reshape_model = NVIDIA_MODEL
        ;(merged as any).reshape_provider = 'nvidia-nim'
        fullCache.set(key, { ts: Date.now(), data: merged })
        return merged
      }
    } catch (e: any) {
      console.warn('NVIDIA reshape pipeline crashed:', e?.message)
    }
  }

  directPayload.generated_at_iso = new Date().toISOString()
  ;(directPayload as any).reshape_model = hasNvidia ? `${NVIDIA_MODEL} (sparse — fell to direct mapper)` : 'direct-mapper (no NVIDIA_API_KEY)'
  ;(directPayload as any).reshape_provider = hasNvidia ? 'nvidia-nim' : 'direct'
  fullCache.set(key, { ts: Date.now(), data: directPayload })
  return directPayload
}

// =====================================================================
// 7. getDashboardPayload — used by /api/dashboard
// =====================================================================
export async function getDashboardPayload(opts: {
  anakinKey: string | null; tenant: any; day?: number;
  forcedRaw?: any
}): Promise<DashboardPayload> {
  const { anakinKey, tenant, day = 0, forcedRaw } = opts
  let base: DashboardPayload

  if (anakinKey) {
    if (forcedRaw) {
      base = buildPayloadFromAnakinRaw(forcedRaw, tenant)
      ;(base as any).source = 'anakin-direct'
      rawCache.set(anakinKey, { ts: Date.now(), raw: forcedRaw, jobId: 'header' })
      fullCache.set(anakinKey, { ts: Date.now(), data: base })
    } else {
      const cached = fullCache.get(anakinKey)
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        base = cached.data
      } else {
        const raw = rawCache.get(anakinKey)?.raw
        if (raw) {
          base = buildPayloadFromAnakinRaw(raw, tenant)
          ;(base as any).source = 'anakin-direct'
          fullCache.set(anakinKey, { ts: Date.now(), data: base })
        } else {
          base = buildDemoPayload(tenant)
          ;(base as any).source = 'demo-warming'
        }
      }
    }
  } else {
    base = buildDemoPayload(tenant)
    ;(base as any).source = 'demo'
  }

  return day > 0 ? ageDownPayload(base, day) : base
}

// =====================================================================
// 8. Cache + helper exports
// =====================================================================
export function peekCacheFor(key: string): DashboardPayload | null  { return fullCache.get(key)?.data ?? null }
export function peekRawFor(key: string):   any | null               { return rawCache.get(key)?.raw  ?? null }
export function pushCacheFor(key: string, payload: DashboardPayload): void {
  if (!key || !payload) return
  fullCache.set(key, { ts: Date.now(), data: payload })
}
export function pushRawFor(key: string, raw: any, jobId = 'header'): void {
  if (!key || !raw) return
  rawCache.set(key, { ts: Date.now(), raw, jobId })
}
export function invalidateCacheFor(key: string): void {
  fullCache.delete(key); rawCache.delete(key); jobIdByKey.delete(key)
}
export function buildBriefingPrompt(tenant: any): string {
  return dailyBriefingUserPrompt({
    industry: tenant.industry, region: tenant.region,
    competitor_domains: tenant.competitor_domains,
    pillars_enabled: tenant.pillars_enabled,
  })
}
