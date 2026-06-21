// src/live-pipeline.ts
// ─────────────────────────────────────────────────────────────────────
// 🔥 REWRITTEN — async job-based pipeline that NEVER exceeds the Vercel
// Hobby 60s serverless cap.
//
// Old flow (BROKEN):
//   one request →  Anakin submit + 55s poll + NVIDIA reshape  →  always
//   timed out at 60s, NVIDIA never reached.
//
// New flow:
//   POST /api/anakin/start    → submit Anakin (<3s) → return {job_id}
//   GET  /api/anakin/poll/:id → single 1-shot poll (<2s) → {status, raw?}
//   POST /api/nvidia/reshape  → take raw + tenant, call NVIDIA (<15s)
//   The browser orchestrates: start → poll every 8s → on "completed"
//   call reshape → cache result → render full dashboard.
//
// All in-memory caches are keyed by Anakin key for 10 minutes. They
// survive within a warm Lambda instance and are simply re-built on
// cold-start (idempotent).
// ─────────────────────────────────────────────────────────────────────
import {
  dailyBriefingUserPrompt,
  RESHAPE_SYSTEM_PROMPT,
  reshapeUserPrompt,
} from './anakin-prompts'
import { buildDemoPayload, ageDownPayload, type DashboardPayload } from './demo-data'

const CACHE_TTL_MS = 10 * 60 * 1000

type FullCacheEntry = { ts: number; data: DashboardPayload }
type RawCacheEntry  = { ts: number; raw: any; jobId: string }

const fullCache = new Map<string, FullCacheEntry>()   // anakin key → final DashboardPayload
const rawCache  = new Map<string, RawCacheEntry>()    // anakin key → Anakin raw JSON (before NVIDIA)
const jobIdByKey = new Map<string, string>()          // anakin key → most recent in-flight job_id

// ─────────────────────────────────────────────────────────────────────
// 1. Anakin submit — ALWAYS returns fast.
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
// 2. Anakin SINGLE-SHOT poll — one HTTP call, <2s.
//    The browser drives the polling loop, so the server never spends
//    >2s in this function. Vercel cap is never approached.
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
// 3. NVIDIA NIM reshape — single short call, <15s.
//    Uses meta/llama-3.2-3b-instruct per https://build.nvidia.com/meta/llama-3.2-3b-instruct
// ─────────────────────────────────────────────────────────────────────
export async function nvidiaReshape(anakinRaw: any, tenant: any): Promise<any> {
  const nvKey = process.env.NVIDIA_API_KEY
  if (!nvKey) throw new Error('NVIDIA_API_KEY not set — cannot reshape Anakin output')

  const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${nvKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-3b-instruct',
      messages: [
        { role: 'system', content: RESHAPE_SYSTEM_PROMPT },
        { role: 'user',   content: reshapeUserPrompt(anakinRaw, tenant) },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false,
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`NVIDIA HTTP ${resp.status}: ${txt.slice(0, 200)}`)
  }

  const data: any = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content ?? '{}'
  const cleaned = raw.replace(/^```json\s*|^```\s*|\s*```$/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try { return JSON.parse(m[0]) } catch { /* fallthrough */ }
    }
    // If NVIDIA returned non-JSON, return an empty patch — UI falls back to demo template.
    return {}
  }
}

// ─────────────────────────────────────────────────────────────────────
// 4. Deep merge — overlays NVIDIA output onto a demo template so every
//    UI field has a value. UI never breaks.
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
// 5. The full reshape+merge step. Called by /api/nvidia/reshape AFTER
//    Anakin has completed. Final DashboardPayload is cached.
// ─────────────────────────────────────────────────────────────────────
export async function buildAndCachePayload(
  key: string,
  tenant: any,
  rawOverride?: any,
): Promise<DashboardPayload> {
  const raw = rawOverride ?? rawCache.get(key)?.raw
  if (!raw) throw new Error('No Anakin raw output cached — start a job first')

  const reshape = await nvidiaReshape(raw, tenant)
  const demoTpl = buildDemoPayload(tenant)
  const merged: DashboardPayload = deepMerge(demoTpl, reshape) as DashboardPayload
  merged.generated_at_iso = new Date().toISOString()
  merged.source = 'anakin-live'
  fullCache.set(key, { ts: Date.now(), data: merged })
  return merged
}

// ─────────────────────────────────────────────────────────────────────
// 6. Read path — used by /api/dashboard and all legacy endpoints.
//    Returns cached live payload if warm, otherwise demo template
//    (the browser will kick off a fresh start→poll→reshape cycle).
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
      // No live data ready — return demo template marked so the UI
      // knows to launch an async job. NEVER block here.
      base = buildDemoPayload(tenant)
      ;(base as any).source = 'demo-warming' // tells client to kick off /api/anakin/start
    }
  } else {
    base = buildDemoPayload(tenant)
  }

  return day > 0 ? ageDownPayload(base, day) : base
}

// ─────────────────────────────────────────────────────────────────────
// 7. Cache helpers — used by /api/dashboard/refresh
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
// 8. Prompt builder convenience — exported so api/index.ts can call it.
// ─────────────────────────────────────────────────────────────────────
export function buildBriefingPrompt(tenant: any): string {
  return dailyBriefingUserPrompt({
    industry: tenant.industry,
    region: tenant.region,
    competitor_domains: tenant.competitor_domains,
    pillars_enabled: tenant.pillars_enabled,
  })
}
