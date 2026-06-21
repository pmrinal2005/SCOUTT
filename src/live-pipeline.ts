// src/live-pipeline.ts
// ─────────────────────────────────────────────────────────────────────
// Anakin Agentic-Search call  ➜  NVIDIA NIM reshape  ➜  DashboardPayload
// Cached per Anakin-key for 10 minutes. Time-Machine produces aged
// snapshots from the same cached payload — no extra Anakin credits.
// ─────────────────────────────────────────────────────────────────────
import {
  DAILY_BRIEFING_SYSTEM_PROMPT,
  dailyBriefingUserPrompt,
  RESHAPE_SYSTEM_PROMPT,
  reshapeUserPrompt,
} from './anakin-prompts'
import { buildDemoPayload, ageDownPayload, type DashboardPayload } from './demo-data'

const CACHE_TTL_MS = 10 * 60 * 1000
type CacheEntry = { ts: number; data: DashboardPayload }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<DashboardPayload>>()

// ─────────────────────────────────────────────────────────────────────
// 1. Anakin submit + poll (per Anakin docs — POST then GET, status:
//    pending|processing|completed|failed; poll every 10s)
// ─────────────────────────────────────────────────────────────────────
async function anakinSubmit(key: string, prompt: string): Promise<string> {
  const r = await fetch('https://api.anakin.io/v1/agentic-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ prompt }),
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok || !j.job_id) throw new Error(j?.message || `Anakin submit ${r.status}`)
  return j.job_id
}

async function anakinPoll(key: string, jobId: string, timeoutMs = 55_000): Promise<any> {
  const start = Date.now()
  // Vercel Hobby caps serverless at 60s → use a 55s cap with 5s polls.
  while (Date.now() - start < timeoutMs) {
    const r = await fetch(`https://api.anakin.io/v1/agentic-search/${jobId}`, {
      headers: { 'X-API-Key': key },
    })
    const j: any = await r.json().catch(() => ({}))
    if (j.status === 'completed') return j.generatedJson ?? j.result ?? j
    if (j.status === 'failed') throw new Error('Anakin job failed: ' + (j.message || ''))
    await new Promise(res => setTimeout(res, 5_000))
  }
  throw new Error('Anakin poll timeout (Vercel 60s cap)')
}

// ─────────────────────────────────────────────────────────────────────
// 2. NVIDIA NIM reshape — forces the exact UI shape every time
// ─────────────────────────────────────────────────────────────────────
async function nvidiaReshape(anakinRaw: any, tenant: any): Promise<any> {
  const nvKey = process.env.NVIDIA_API_KEY
  if (!nvKey) throw new Error('NVIDIA_API_KEY not set — cannot reshape Anakin output')

  const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${nvKey}` },
    body: JSON.stringify({
      model: 'meta/llama-3.2-3b-instruct',
      messages: [
        { role: 'system', content: RESHAPE_SYSTEM_PROMPT },
        { role: 'user', content: reshapeUserPrompt(anakinRaw, tenant) },
      ],
      temperature: 0.15,
      top_p: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      stream: false,
    }),
  })
  const data: any = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? '{}'
  const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('NVIDIA reshape returned invalid JSON')
  }
}

// ─────────────────────────────────────────────────────────────────────
// 3. Deep merge: reshape output overlays a demo template so missing
//    fields are always filled — UI never breaks.
// ─────────────────────────────────────────────────────────────────────
function deepMerge<T>(base: T, patch: any): T {
  if (Array.isArray(patch)) return (patch.length ? patch : (base as any)) as T
  if (patch && typeof patch === 'object') {
    const out: any = { ...(base as any) }
    for (const k of Object.keys(patch)) {
      if (patch[k] == null) continue
      out[k] = k in (base as any) ? deepMerge((base as any)[k], patch[k]) : patch[k]
    }
    return out
  }
  return (patch ?? base) as T
}

// ─────────────────────────────────────────────────────────────────────
// 4. Public entry — get full dashboard payload (live or demo)
// ─────────────────────────────────────────────────────────────────────
export async function getDashboardPayload(opts: {
  anakinKey: string | null
  tenant: any
  day?: number
}): Promise<DashboardPayload> {
  const { anakinKey, tenant, day = 0 } = opts
  const base = !anakinKey
    ? buildDemoPayload(tenant)
    : await getOrBuildLivePayload(anakinKey, tenant)
  return day > 0 ? ageDownPayload(base, day) : base
}

async function getOrBuildLivePayload(key: string, tenant: any): Promise<DashboardPayload> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  if (inflight.has(key)) return inflight.get(key)!
  const p = (async (): Promise<DashboardPayload> => {
    try {
      const prompt = dailyBriefingUserPrompt({
        industry: tenant.industry,
        region: tenant.region,
        competitor_domains: tenant.competitor_domains,
        pillars_enabled: tenant.pillars_enabled,
      })
      const jobId = await anakinSubmit(key, prompt)
      const anakin = await anakinPoll(key, jobId)
      const reshape = await nvidiaReshape(anakin, tenant)
      const demoTpl = buildDemoPayload(tenant)
      const merged: DashboardPayload = deepMerge(demoTpl, reshape) as DashboardPayload
      merged.generated_at_iso = new Date().toISOString()
      merged.source = 'anakin-live'
      cache.set(key, { ts: Date.now(), data: merged })
      return merged
    } catch (e: any) {
      // Graceful fallback — never break the UI.
      const demo = buildDemoPayload(tenant)
      demo.source = 'demo-fallback'
      ;(demo as any).error = String(e?.message || e)
      return demo
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

export function invalidateCacheFor(key: string) {
  cache.delete(key)
}

export function peekCacheFor(key: string): DashboardPayload | null {
  const v = cache.get(key)
  return v ? v.data : null
}
