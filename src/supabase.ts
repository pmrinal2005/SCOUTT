// =====================================================================
// Supabase data layer. Reads from real DB when SUPABASE_URL is set;
// silently falls back to in-memory DEMO data otherwise (so the judge
// demo never breaks even if no env vars are configured).
// =====================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  DEMO_TENANT,
  DEMO_BRIEFING,
  DEMO_TIMELINE,
  DEMO_CREDIT_LEDGER,
} from './demo-data.js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_TENANT_ID =
  process.env.DEMO_TENANT_ID || '00000000-0000-0000-0000-000000000001'

export const supabaseEnabled = Boolean(URL && (ANON || SERVICE))

// Read client (RLS-safe, anon)
export const supabase: SupabaseClient | null =
  URL && ANON ? createClient(URL, ANON, { auth: { persistSession: false } }) : null

// Write client (bypasses RLS — only used server-side for cron/seed routes)
export const supabaseAdmin: SupabaseClient | null =
  URL && SERVICE
    ? createClient(URL, SERVICE, { auth: { persistSession: false } })
    : null

// ---------------------------------------------------------------------
// TENANT
// ---------------------------------------------------------------------
export async function getTenant(tenantId = DEMO_TENANT_ID) {
  if (!supabase) return DEMO_TENANT
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle()
  if (error || !data) return DEMO_TENANT
  return data
}

// ---------------------------------------------------------------------
// TODAY'S BRIEFING
// ---------------------------------------------------------------------
export async function getTodayBriefing(tenantId = DEMO_TENANT_ID) {
  if (!supabase) return DEMO_BRIEFING
  const { data, error } = await supabase
    .from('briefings')
    .select('generated_json, briefing_date, anakin_job_id, credits_spent')
    .eq('tenant_id', tenantId)
    .order('briefing_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return DEMO_BRIEFING
  // generated_json is a jsonb column that contains the full briefing shape
  return (data.generated_json as typeof DEMO_BRIEFING) || DEMO_BRIEFING
}

// ---------------------------------------------------------------------
// 7-DAY TIMELINE (left rail)
// ---------------------------------------------------------------------
export async function getTimeline(tenantId = DEMO_TENANT_ID) {
  if (!supabase) return DEMO_TIMELINE
  const { data, error } = await supabase
    .from('events')
    .select('pillar, payload, severity, detected_at')
    .eq('tenant_id', tenantId)
    .gte(
      'detected_at',
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    )
    .order('detected_at', { ascending: false })
    .limit(40)
  if (error || !data || data.length === 0) return DEMO_TIMELINE
  return data.map((e) => ({
    date: (e.detected_at as string).slice(0, 10),
    pillar: e.pillar,
    title: (e.payload as any)?.title ?? '(untitled event)',
    severity: e.severity,
  }))
}

// ---------------------------------------------------------------------
// CREDIT LEDGER (top-right Credit Meter widget)
// ---------------------------------------------------------------------
export async function getCreditLedger(tenantId = DEMO_TENANT_ID) {
  if (!supabase) return DEMO_CREDIT_LEDGER
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('endpoint, credits_used, ts')
    .eq('tenant_id', tenantId)
    .order('ts', { ascending: false })
    .limit(100)
  if (error || !data) return DEMO_CREDIT_LEDGER
  const used = data.reduce((s, r) => s + (r.credits_used as number), 0)
  const byEndpoint = new Map<string, { credits: number; count: number; ts: string }>()
  for (const r of data) {
    const k = r.endpoint as string
    const cur = byEndpoint.get(k) || { credits: 0, count: 0, ts: r.ts as string }
    cur.credits += r.credits_used as number
    cur.count += 1
    byEndpoint.set(k, cur)
  }
  return {
    budget: 150,
    used,
    breakdown: Array.from(byEndpoint.entries()).map(([endpoint, v]) => ({
      endpoint,
      credits: v.credits,
      count: v.count,
      ts: v.ts,
    })),
  }
}

// ---------------------------------------------------------------------
// WRITE: log a credit usage row (called whenever we hit Anakin/NVIDIA)
// ---------------------------------------------------------------------
export async function logCredit(opts: {
  tenantId?: string
  endpoint: string
  creditsUsed: number
  jobId?: string
}) {
  if (!supabaseAdmin) return
  await supabaseAdmin.from('credit_ledger').insert({
    tenant_id: opts.tenantId || DEMO_TENANT_ID,
    endpoint: opts.endpoint,
    credits_used: opts.creditsUsed,
    job_id: opts.jobId,
  })
}

// ---------------------------------------------------------------------
// WRITE: insert a fresh briefing (called by daily cron / Anakin worker)
// ---------------------------------------------------------------------
export async function insertBriefing(opts: {
  tenantId?: string
  briefingDate: string // 'YYYY-MM-DD'
  generatedJson: unknown
  anakinJobId?: string
  creditsSpent?: number
}) {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('briefings')
    .upsert(
      {
        tenant_id: opts.tenantId || DEMO_TENANT_ID,
        briefing_date: opts.briefingDate,
        generated_json: opts.generatedJson,
        anakin_job_id: opts.anakinJobId,
        credits_spent: opts.creditsSpent ?? 0,
      },
      { onConflict: 'tenant_id,briefing_date' },
    )
    .select()
    .single()
  if (error) {
    console.error('[supabase] insertBriefing error', error)
    return null
  }
  return data
}

// ---------------------------------------------------------------------
// WRITE: push demo seed into Supabase from the app (one-shot)
// Hit POST /api/sync/seed to populate a freshly-migrated DB.
// ---------------------------------------------------------------------
export async function seedDemoTenant() {
  if (!supabaseAdmin) {
    return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY not set' }
  }

  // 1) Tenant
  await supabaseAdmin.from('tenants').upsert(
    {
      id: DEMO_TENANT_ID,
      name: DEMO_TENANT.name,
      industry: DEMO_TENANT.industry,
      region: DEMO_TENANT.region,
      competitor_domains: DEMO_TENANT.competitor_domains,
      pillars_enabled: DEMO_TENANT.pillars_enabled,
    },
    { onConflict: 'id' },
  )

  // 2) Today's briefing
  const today = new Date().toISOString().slice(0, 10)
  await supabaseAdmin.from('briefings').upsert(
    {
      tenant_id: DEMO_TENANT_ID,
      briefing_date: today,
      generated_json: DEMO_BRIEFING,
      anakin_job_id: 'demo-job-0001',
      credits_spent: 15,
    },
    { onConflict: 'tenant_id,briefing_date' },
  )

  // 3) Events (one row per item in DEMO_BRIEFING.events)
  const eventRows = DEMO_BRIEFING.events.map((e) => ({
    tenant_id: DEMO_TENANT_ID,
    pillar: e.pillar,
    payload: e,
    severity: e.severity,
    source_url: e.source_url,
    detected_at: e.detected_at,
    status: 'new',
  }))
  await supabaseAdmin.from('events').insert(eventRows)

  // 4) Credit ledger
  for (const row of DEMO_CREDIT_LEDGER.breakdown) {
    await supabaseAdmin.from('credit_ledger').insert({
      tenant_id: DEMO_TENANT_ID,
      endpoint: row.endpoint,
      credits_used: row.credits,
      job_id: 'demo-seed',
    })
  }

  return { ok: true, tenant_id: DEMO_TENANT_ID, briefing_date: today }
}
