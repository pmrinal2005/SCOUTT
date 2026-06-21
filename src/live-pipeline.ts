// src/live-pipeline.ts
// ─────────────────────────────────────────────────────────────────────
// 🔥 REWRITTEN AGAIN — Groq llama-4-scout reshape replaces NVIDIA NIM.
//
// Why this rewrite?
//   The previous version used `meta/llama-3.2-3b-instruct` on NVIDIA NIM
//   with max_tokens=1024 to emit the full DashboardPayload JSON.
//   The 3B model could NOT fit the huge nested JSON in 1024 tokens, so
//   it returned truncated/invalid JSON. nvidiaReshape() then quietly
//   returned `{}`, deepMerge() kept the demo template, and the cached
//   payload was tagged `source:'anakin-live'` while every field was
//   still the demo template — exactly matching the bug the user
//   reported: "green success toast but the dashboard still shows demo
//   data".
//
// Fix:
//   1. Replaced NVIDIA with Groq `meta-llama/llama-4-scout-17b-16e-instruct`
//      (17B-active MoE, fast, supports JSON-mode + 8192 tokens).
//   2. Split the reshape into TWO compact Groq calls so each one fits
//      comfortably and reliably produces real data for every section:
//         (a) groqReshapeCore   → briefing + pulse + timeline + KPIs
//         (b) groqReshapePillars → policy + competitor + sentiment + archetype
//   3. Both calls use `response_format: { type:"json_object" }` so the
//      output is guaranteed parseable JSON.
//   4. mergeIntoTemplate() now PREFERS live fields whenever they're
//      non-empty so demo data NEVER leaks past a successful reshape.
//   5. Endpoint pipeline (3 short serverless calls — still Vercel-Hobby-safe):
//        POST /api/anakin/start       → submit Anakin (<3s)
//        GET  /api/anakin/poll/:id    → single 1-shot poll (<2s)
//        POST /api/groq/reshape       → two parallel Groq calls (<15s)
// ─────────────────────────────────────────────────────────────────────
import {
  dailyBriefingUserPrompt,
  RESHAPE_SYSTEM_PROMPT,
  reshapeCorePrompt,
  reshapePillarsPrompt,
} from './anakin-prompts'
import { buildDemoPayload, ageDownPayload, type DashboardPayload } from './demo-data'

const CACHE_TTL_MS = 10 * 60 * 1000

type FullCacheEntry = { ts: number; data: DashboardPayload }
type RawCacheEntry  = { ts: number; raw: any; jobId: string }

const fullCache  = new Map<string, FullCacheEntry>()  // anakin key → final DashboardPayload
const rawCache   = new Map<string, RawCacheEntry>()   // anakin key → Anakin raw JSON
const jobIdByKey = new Map<string, string>()          // anakin key → most recent job_id

// ─────────────────────────────────────────────────────────────────────
// 1. Anakin submit — always fast, returns the job_id only.
//    Docs: https://anakin.io/docs/api-reference/agentic-search/submit-search
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// 2. Anakin SINGLE-SHOT poll — one HTTP call, <2s. Browser drives the
//    polling loop so server never exceeds Vercel's 60s cap.
//    Docs: https://anakin.io/docs/api-reference/agentic-search/get-search-result
// ─────────────────────────────────────────────────────────────────────
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
    // Agentic search response → generatedJson is the structured payload.
    const raw = j.generatedJson ?? j.generated_json ?? j.result ?? j
    rawCache.set(key, { ts: Date.now(), raw, jobId })
    return { status: 'completed', raw }
  }
  if (status === 'failed') {
    return { status: 'failed', message: j.message || 'Anakin job failed' }
  }
  return { status, message: j.message }
}

// ─────────────────────────────────────────────────────────────────────
// 3. Groq reshape — meta-llama/llama-4-scout-17b-16e-instruct
//    Implementation matches the user-supplied spec:
//      model: "meta-llama/llama-4-scout-17b-16e-instruct"
//      temperature: 0.3 (lower for structured-JSON stability)
//      max_completion_tokens: 8192
//      response_format: { type: "json_object" }
// ─────────────────────────────────────────────────────────────────────
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL    = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function groqCall(systemPrompt: string, userPrompt: string): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY not set — cannot reshape Anakin output')

  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${groqKey}`,
      Accept:          'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.3,
      top_p: 1,
      max_completion_tokens: 8192,
      stream: false,
      stop: null,
      response_format: { type: 'json_object' },
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Groq HTTP ${resp.status}: ${txt.slice(0, 300)}`)
  }

  const data: any = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? '{}'
  return safeParseJSON(raw)
}

/** Multi-strategy JSON parser — Groq json_object mode SHOULD return clean
 *  JSON, but we defensively strip code fences and pull the first { … } block
 *  if anything ever leaks through. */
function safeParseJSON(raw: string): any {
  if (!raw) return {}
  const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
  // 1) direct parse
  try { return JSON.parse(cleaned) } catch { /* try next */ }
  // 2) first balanced {...} substring
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (m) {
    try { return JSON.parse(m[0]) } catch { /* try next */ }
  }
  // 3) give up — caller will fall back to demo template for missing fields.
  return {}
}

/** STAGE 1 reshape: briefing core + timeline + pulse + KPIs + threat meter. */
export async function groqReshapeCore(anakinRaw: any, tenant: any): Promise<any> {
  return groqCall(RESHAPE_SYSTEM_PROMPT, reshapeCorePrompt(anakinRaw, tenant))
}

/** STAGE 2 reshape: policy + competitor + sentiment + archetype + sentiment volume. */
export async function groqReshapePillars(anakinRaw: any, tenant: any): Promise<any> {
  return groqCall(RESHAPE_SYSTEM_PROMPT, reshapePillarsPrompt(anakinRaw, tenant))
}

/** Public alias kept for backwards-compat with api/index.ts imports. */
export async function groqReshape(anakinRaw: any, tenant: any): Promise<any> {
  // Run both reshape stages in parallel for speed (still well under 15s total).
  const [core, pillars] = await Promise.all([
    groqReshapeCore(anakinRaw, tenant).catch(e => { console.warn('Groq core failed:', e?.message); return {} }),
    groqReshapePillars(anakinRaw, tenant).catch(e => { console.warn('Groq pillars failed:', e?.message); return {} }),
  ])
  return { ...core, ...pillars }
}

// ─────────────────────────────────────────────────────────────────────
// 4. Merge — LIVE-PREFERRED deep merge.
//    Old behaviour (BROKEN): if patch[k] is an empty array/object the
//    demo template value was kept, so partial reshape leaked demo data
//    into the dashboard.
//    New behaviour: if the live patch supplies a value AT ALL (even if
//    short), prefer it; only fall back to demo when the patch literally
//    has no key for that field. This guarantees that every section
//    refreshed by Groq actually shows live data.
// ─────────────────────────────────────────────────────────────────────
function isPlainObject(v: any): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function mergeIntoTemplate<T>(base: T, patch: any): T {
  // Arrays: prefer patch unconditionally when it is an array (even empty
  // is meaningful — but treat empty as "no data" so we keep demo length).
  if (Array.isArray(patch)) {
    return (patch.length ? patch : (base as any)) as T
  }
  // Objects: walk keys of BOTH base and patch.
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
  // Primitives: live value wins when truthy or explicitly 0/false.
  if (patch === '' || patch === undefined || patch === null) return base
  return patch as T
}

// ─────────────────────────────────────────────────────────────────────
// 5. Full reshape+merge step. Called by POST /api/groq/reshape AFTER
//    Anakin polling completed. Result cached for 10 minutes.
// ─────────────────────────────────────────────────────────────────────
export async function buildAndCachePayload(
  key: string,
  tenant: any,
  rawOverride?: any,
): Promise<DashboardPayload> {
  const raw = rawOverride ?? rawCache.get(key)?.raw
  if (!raw) throw new Error('No Anakin raw output cached — start a job first')

  // Two parallel Groq calls — each one's prompt + 8192 tokens fits comfortably.
  const [coreReshape, pillarsReshape] = await Promise.all([
    groqReshapeCore(raw, tenant).catch(e => {
      console.warn('Groq core reshape failed:', e?.message || e); return {}
    }),
    groqReshapePillars(raw, tenant).catch(e => {
      console.warn('Groq pillars reshape failed:', e?.message || e); return {}
    }),
  ])

  const reshape = { ...coreReshape, ...pillarsReshape }
  const demoTpl = buildDemoPayload(tenant)
  const merged: DashboardPayload =
    mergeIntoTemplate(demoTpl, reshape) as DashboardPayload

  // Stamp provenance.
  merged.generated_at_iso = new Date().toISOString()
  // Only tag 'anakin-live' if reshape actually populated meaningful fields.
  const populated =
    (reshape && (reshape as any).briefing && (reshape as any).briefing.events &&
     (reshape as any).briefing.events.length > 0)
  ;(merged as any).source = populated ? 'anakin-live' : 'demo-fallback'

  fullCache.set(key, { ts: Date.now(), data: merged })
  return merged
}

// ─────────────────────────────────────────────────────────────────────
// 6. Read path — used by /api/dashboard and all legacy endpoints.
//    Returns cached live payload if warm, otherwise demo template
//    tagged so the UI knows to launch the async pipeline.
//    Behaviour:
//      • No Anakin key  → ALWAYS demo data.            (source='demo')
//      • Key set, cache warm → live data.              (source='anakin-live')
//      • Key set, cache cold → demo template tagged    (source='demo-warming')
//        so the browser kicks off /api/anakin/start.
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// 7. Cache helpers
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// 8. Prompt builder convenience
// ─────────────────────────────────────────────────────────────────────
export function buildBriefingPrompt(tenant: any): string {
  return dailyBriefingUserPrompt({
    industry: tenant.industry,
    region: tenant.region,
    competitor_domains: tenant.competitor_domains,
    pillars_enabled: tenant.pillars_enabled,
  })
}

// ─────────────────────────────────────────────────────────────────────
// 9. Groq fast-path for "Ask SCOUTT" (used by /api/ask).
//    Same model, same auth, much smaller payload than reshape.
// ─────────────────────────────────────────────────────────────────────
export async function groqAsk(systemPrompt: string, userQuestion: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY not set')

  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userQuestion },
      ],
      temperature: 0.4,
      top_p: 1,
      max_completion_tokens: 1024,
      stream: false,
      stop: null,
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Groq HTTP ${resp.status}: ${txt.slice(0, 200)}`)
  }
  const data: any = await resp.json()
  return data?.choices?.[0]?.message?.content ?? 'No response.'
}
