// src/onboarding-store.ts
// =====================================================================
// 🆕 NEW FILE — Per-API-key tenant override store.
//
// Why this exists
// ───────────────
// The original codebase pulled `DEMO_TENANT` from src/demo-data.ts every
// time it built an Anakin prompt or hydrated the dashboard. That meant
// the onboarding wizard's industry / region / competitor / pillar choices
// were thrown away the moment the user navigated to /dashboard, so the
// agentic-search query (and therefore every section of the dashboard,
// every chart, every event, every action) was permanently asking about
// "B2B SaaS Fintech in US+EU, competitors=stripe.com,adyen.com,checkout.com".
//
// What it does
// ───────────────
// Maintains an in-memory `Map<anakinKey, TenantOverride>` keyed by the
// X-Anakin-Key header. The dashboard front-end POSTs the onboarding
// answers to /api/onboarding/save, which writes here. After that, every
// `payloadFor(req)` call resolves to THIS tenant for that user instead
// of DEMO_TENANT — so the Anakin prompt, the cached briefing, and every
// downstream legacy endpoint all become user-specific.
//
// This is the keystone of fix #1 in the user's bug report.
// =====================================================================

import { DEMO_TENANT } from './demo-data'

export interface TenantOverride {
  id: string
  name: string
  industry: string
  region: string
  competitor_domains: string[]
  pillars_enabled: string[]
  /** ISO timestamp written by the API when the row was last saved. */
  saved_at?: string
}

// 30-minute soft TTL — long enough for a normal session, short enough
// that abandoned keys don't pile up forever in serverless RAM.
const TENANT_TTL_MS = 30 * 60 * 1000
type Row = { ts: number; tenant: TenantOverride }
const store = new Map<string, Row>()

// ─── public API ──────────────────────────────────────────────────────

/** Persist (or replace) the tenant profile for a given Anakin API key. */
export function setTenantFor(key: string, tenant: Partial<TenantOverride>): TenantOverride {
  const merged: TenantOverride = {
    id: tenant.id || `live-${hashKey(key)}`,
    name: tenant.name || 'My Workspace',
    industry: (tenant.industry || DEMO_TENANT.industry).toString().slice(0, 80),
    region: (tenant.region || DEMO_TENANT.region).toString().slice(0, 40),
    competitor_domains: sanitizeDomains(tenant.competitor_domains),
    pillars_enabled: sanitizePillars(tenant.pillars_enabled),
    saved_at: new Date().toISOString(),
  }
  store.set(key, { ts: Date.now(), tenant: merged })
  return merged
}

/** Fetch the user's tenant override, or null if none / expired. */
export function getTenantFor(key: string | null | undefined): TenantOverride | null {
  if (!key) return null
  const row = store.get(key)
  if (!row) return null
  if (Date.now() - row.ts > TENANT_TTL_MS) {
    store.delete(key)
    return null
  }
  return row.tenant
}

/** Effective tenant: user's override if present, else DEMO_TENANT. */
export function effectiveTenant(key: string | null | undefined): TenantOverride {
  return getTenantFor(key) || (DEMO_TENANT as unknown as TenantOverride)
}

/** Drop the override (used on /api/dashboard/refresh + key clear). */
export function clearTenantFor(key: string): void {
  store.delete(key)
}

// ─── helpers ─────────────────────────────────────────────────────────

function sanitizeDomains(input: unknown): string[] {
  if (!Array.isArray(input)) return [...DEMO_TENANT.competitor_domains]
  const out: string[] = []
  for (const raw of input) {
    const s = String(raw || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .replace(/\s+/g, '')
    if (!s) continue
    // bare-minimum domain sanity check
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) continue
    if (!out.includes(s)) out.push(s)
    if (out.length >= 10) break
  }
  return out.length ? out : [...DEMO_TENANT.competitor_domains]
}

function sanitizePillars(input: unknown): string[] {
  const allowed = new Set([
    'policy', 'pricing', 'features', 'sentiment', 'supply_chain', 'hiring',
  ])
  if (!Array.isArray(input)) return [...DEMO_TENANT.pillars_enabled]
  const out = Array.from(new Set(
    input.map(p => String(p || '').toLowerCase().trim()).filter(p => allowed.has(p)),
  ))
  return out.length ? out : [...DEMO_TENANT.pillars_enabled]
}

function hashKey(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h) + key.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36).slice(0, 8)
}
