// src/live-pipeline.ts
// ─────────────────────────────────────────────────────────────────────
// 🔥 REWRITTEN AGAIN — adds three things the old version was missing:
//   1. The Anakin /v1/crawl + /v1/crawl/{id} pair (submit + poll) so the
//      "Competitor Pulse" panel can actually scrape the user's own
//      competitor domains instead of always pretending to scrape
//      stripe.com.
//        Docs:
//          https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//          https://anakin.io/docs/api-reference/crawl/get-crawl-result
//   2. A `groqScenario()` helper that runs the Scenario Simulator
//      through Groq llama-4-scout against the user's CACHED LIVE
//      briefing — so the simulator's narrative and impacted-events
//      list become dynamic instead of regex-matched demo data.
//   3. `buildBriefingPrompt()` now accepts the user-onboarded tenant
//      verbatim (industry, region, competitor_domains, pillars_enabled),
//      which closes the loop on the user's reported bug #1.
//
// Pipeline (unchanged, still Vercel-Hobby-safe):
//   POST /api/anakin/start       → submit Anakin (<3s)
//   GET  /api/anakin/poll/:id    → single 1-shot poll (<2s)
//   POST /api/groq/reshape       → two parallel Groq calls (<15s)
// ─────────────────────────────────────────────────────────────────────
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
// 1. AGENTIC SEARCH — submit + 1-shot poll
//    Docs:
//      https://anakin.io/docs/api-reference/agentic-search/submit-search
//      https://anakin.io/docs/api-reference/agentic-search/get-search-result
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
// 2. 🆕 CRAWL — submit + poll
//    Used by /api/competitor/scrape so we actually read the user's own
//    competitor domains (e.g. their selected stripe.com / acme.com /
//    foo.io pricing page) instead of always rendering the demo diff.
//    Docs:
//      https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//      https://anakin.io/docs/api-reference/crawl/get-crawl-result
// =====================================================================

export interface CrawlOptions {
  maxPages?: number
  includePatterns?: string[]
  excludePatterns?: string[]
  country?: string
  useBrowser?: boolean
}

export async function anakinCrawlSubmit(
  key: string,
  url: string,
  opts: CrawlOptions = {},
): Promise<string> {
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
  results?: Array<{
    url: string
    status: string
    markdown?: string
    html?: string
    error?: string
    durationMs?: number
  }>
  message?: string
}

export async function anakinCrawlPollOnce(key: string, jobId: string): Promise<CrawlResult> {
  const r = await fetch(`https://api.anakin.io/v1/crawl/${jobId}`, {
    headers: { 'X-API-Key': key },
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) return { status: 'unknown', message: `HTTP ${r.status}` }
  return {
    status: (j.status || 'unknown') as any,
    url: j.url,
    totalPages: j.totalPages,
    completedPages: j.completedPages,
    results: j.results,
    message: j.message,
  }
}

/** Convenience: submit + drive the poll loop client-side via a one-shot
 *  server call that ALSO blocks for up to `maxWaitMs` (default 25s, well
 *  inside Vercel's 60s cap). Used by the new /api/competitor/scrape route. */
export async function anakinCrawlAndWait(
  key: string,
  url: string,
  opts: CrawlOptions & { maxWaitMs?: number } = {},
): Promise<CrawlResult & { jobId: string }> {
  const maxWaitMs = opts.maxWaitMs ?? 25_000
  const jobId = await anakinCrawlSubmit(key, url, opts)
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3_000))
    const out = await anakinCrawlPollOnce(key, jobId)
    if (out.status === 'completed' || out.status === 'failed') {
      return { ...out, jobId }
    }
  }
  return { status: 'processing', jobId, message: 'still processing (returned partial)' }
}

// =====================================================================
// 3. GROQ — reshape (Stage 1 + Stage 2) + scenario + ask
// =====================================================================

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL    = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function groqCall(systemPrompt: string, userPrompt: string, opts: {
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
} = {}): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY not set — cannot call Groq')

  const body: any = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.3,
    top_p: 1,
    max_completion_tokens: opts.maxTokens ?? 8192,
    stream: false,
    stop: null,
  }
  if (opts.jsonMode !== false) body.response_format = { type: 'json_object' }

  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Groq HTTP ${resp.status}: ${txt.slice(0, 300)}`)
  }
  const data: any = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? ''
  return opts.jsonMode === false ? raw : safeParseJSON(raw)
}

function safeParseJSON(raw: string): any {
  if (!raw) return {}
  const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
  try { return JSON.parse(cleaned) } catch { /* try next */ }
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (m) {
    try { return JSON.parse(m[0]) } catch { /* try next */ }
  }
  return {}
}

export async function groqReshapeCore(anakinRaw: any, tenant: any): Promise<any> {
  return groqCall(RESHAPE_SYSTEM_PROMPT, reshapeCorePrompt(anakinRaw, tenant))
}

export async function groqReshapePillars(anakinRaw: any, tenant: any): Promise<any> {
  return groqCall(RESHAPE_SYSTEM_PROMPT, reshapePillarsPrompt(anakinRaw, tenant))
}

export async function groqReshape(anakinRaw: any, tenant: any): Promise<any> {
  const [core, pillars] = await Promise.all([
    groqReshapeCore(anakinRaw, tenant).catch(e => { console.warn('Groq core failed:', e?.message); return {} }),
    groqReshapePillars(anakinRaw, tenant).catch(e => { console.warn('Groq pillars failed:', e?.message); return {} }),
  ])
  return { ...core, ...pillars }
}

/** 🆕 Scenario reshape — runs the user's hypothetical against the
 *  CACHED LIVE briefing + tenant context. Always returns the exact
 *  JSON shape the /api/scenario endpoint promises. */
export async function groqScenario(opts: {
  scenario: string
  tenant: any
  payload: DashboardPayload
}): Promise<{
  threat_level_before: number
  threat_level_after: number
  delta_threats: number
  delta_actions: number
  narrative: string
  impacted_events: Array<{ title: string; pillar: string; severity: number; source_url?: string }>
}> {
  const out = await groqCall(SCENARIO_SYSTEM_PROMPT, scenarioUserPrompt(opts), {
    temperature: 0.4, maxTokens: 2048, jsonMode: true,
  })

  // Normalise/sanity-check whatever Groq returned so the UI never crashes.
  const before = clamp(out.threat_level_before, 0, 100, opts.payload.briefing.threat_level)
  const after  = clamp(out.threat_level_after,  0, 100, before)
  const dt = Math.round(Number(out.delta_threats ?? Math.abs(after - before) / 8) || 1)
  const da = Math.round(Number(out.delta_actions ?? 1) || 1)
  const events = Array.isArray(out.impacted_events) ? out.impacted_events.slice(0, 8).map((e: any) => ({
    title: String(e.title || 'Untitled event').slice(0, 160),
    pillar: ['policy', 'competitor', 'sentiment'].includes(String(e.pillar)) ? String(e.pillar) : 'competitor',
    severity: clamp(e.severity, 0, 100, 60),
    source_url: typeof e.source_url === 'string' ? e.source_url : undefined,
  })) : []
  const narrative = String(out.narrative || `Under scenario "${opts.scenario}", projected threat moves ${before}→${after}.`).slice(0, 800)

  return {
    threat_level_before: before,
    threat_level_after:  after,
    delta_threats: dt,
    delta_actions: da,
    narrative,
    impacted_events: events,
  }
}

function clamp(n: any, lo: number, hi: number, dflt: number): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return dflt
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export async function groqAsk(systemPrompt: string, userQuestion: string): Promise<string> {
  return groqCall(systemPrompt, userQuestion, {
    temperature: 0.4, maxTokens: 1024, jsonMode: false,
  })
}

// =====================================================================
// 4. Merge — live-preferred deep merge (unchanged)
// =====================================================================

function isPlainObject(v: any): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function mergeIntoTemplate<T>(base: T, patch: any): T {
  if (Array.isArray(patch)) return (patch.length ? patch : (base as any)) as T
  if (isPlainObject(patch) && isPlainObject(base)) {
    const out: any = { ...(base as any) }
    for (const k of Object.keys(patch)) {
      const pv = (patch as any)[k]
      if (pv == null) continue
      out[k] = (k in (base as any))
        ? mergeIntoTemplate((base as any)[k], pv)
        : pv
    }
    return out
  }
  if (patch === '' || patch === undefined || patch === null) return base
  return patch as T
}

// =====================================================================
// 5. Build + cache the full live payload
// =====================================================================

export async function buildAndCachePayload(
  key: string,
  tenant: any,
  rawOverride?: any,
): Promise<DashboardPayload> {
  const raw = rawOverride ?? rawCache.get(key)?.raw
  if (!raw) throw new Error('No Anakin raw output cached — start a job first')

  const [coreReshape, pillarsReshape] = await Promise.all([
    groqReshapeCore(raw, tenant).catch(e => {
      console.warn('Groq core reshape failed:', e?.message || e); return {}
    }),
    groqReshapePillars(raw, tenant).catch(e => {
      console.warn('Groq pillars failed:', e?.message || e); return {}
    }),
  ])

  const reshape = { ...coreReshape, ...pillarsReshape }
  const demoTpl = buildDemoPayload(tenant)
  const merged: DashboardPayload =
    mergeIntoTemplate(demoTpl, reshape) as DashboardPayload

  merged.generated_at_iso = new Date().toISOString()
  const populated =
    (reshape && (reshape as any).briefing && (reshape as any).briefing.events &&
     (reshape as any).briefing.events.length > 0)
  ;(merged as any).source = populated ? 'anakin-live' : 'demo-fallback'

  fullCache.set(key, { ts: Date.now(), data: merged })
  return merged
}

// =====================================================================
// 6. Read path
// =====================================================================

export async function getDashboardPayload(opts: {
  anakinKey: string | null
  tenant: any
  day?: number
}): Promise<DashboardPayload> {
  const { anakinKey, tenant, day = 0 } = opts
  let base: DashboardPayload

  if (anakinKey) {
    const cached = fullCache.get(anakinKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      base = cached.data
    } else {
      base = buildDemoPayload(tenant)
      ;(base as any).source = 'demo-warming'
    }
  } else {
    base = buildDemoPayload(tenant)
    ;(base as any).source = 'demo'
  }

  return day > 0 ? ageDownPayload(base, day) : base
}

// =====================================================================
// 7. Cache helpers
// =====================================================================

export function invalidateCacheFor(key: string) {
  fullCache.delete(key)
  rawCache.delete(key)
  jobIdByKey.delete(key)
}
export function peekCacheFor(key: string): DashboardPayload | null {
  return fullCache.get(key)?.data ?? null
}
export function peekRawFor(key: string): any | null {
  return rawCache.get(key)?.raw ?? null
}
export function lastJobIdFor(key: string): string | null {
  return jobIdByKey.get(key) ?? null
}

// =====================================================================
// 8. Prompt builder convenience — now FULLY tenant-driven.
// =====================================================================

export function buildBriefingPrompt(tenant: any): string {
  return dailyBriefingUserPrompt({
    industry: tenant.industry,
    region: tenant.region,
    competitor_domains: tenant.competitor_domains,
    pillars_enabled: tenant.pillars_enabled,
  })
}
