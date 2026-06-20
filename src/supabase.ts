// src/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  DEMO_TENANT,
  DEMO_BRIEFING,
  DEMO_TIMELINE,
  DEMO_CREDIT_LEDGER,
} from './demo-data'   // ✅ FIXED: removed .js extension (invalid in TS with moduleResolution:node)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_TENANT_ID =
  process.env.DEMO_TENANT_ID ?? '00000000-0000-0000-0000-000000000001'

export const supabaseEnabled: boolean = Boolean(
  SUPABASE_URL && (SUPABASE_ANON || SUPABASE_SERVICE),
)

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false },
      })
    : null

export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE, {
        auth: { persistSession: false },
      })
    : null

export type TenantRow = typeof DEMO_TENANT
export type BriefingShape = typeof DEMO_BRIEFING
export type TimelineRow = (typeof DEMO_TIMELINE)[number]
export type CreditLedger = typeof DEMO_CREDIT_LEDGER

interface CreditLedgerDBRow {
  endpoint: string
  credits_used: number
  ts: string
}

interface EventDBRow {
  pillar: string
  payload: { title?: string } | null
  severity: number
  detected_at: string
}

export async function getTenant(
  tenantId: string = DEMO_TENANT_ID,
): Promise<TenantRow> {
  if (!supabase) return DEMO_TENANT
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle()
  if (error || !data) return DEMO_TENANT
  return data as unknown as TenantRow
}

export async function getTodayBriefing(
  tenantId: string = DEMO_TENANT_ID,
): Promise<BriefingShape> {
  if (!supabase) return DEMO_BRIEFING
  const { data, error } = await supabase
    .from('briefings')
    .select('generated_json, briefing_date, anakin_job_id, credits_spent')
    .eq('tenant_id', tenantId)
    .order('briefing_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return DEMO_BRIEFING
  return (
    (data as { generated_json: BriefingShape | null }).generated_json ??
    DEMO_BRIEFING
  ) as BriefingShape
}

export async function getTimeline(
  tenantId: string = DEMO_TENANT_ID,
): Promise<TimelineRow[]> {
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
  const rows = data as unknown as EventDBRow[]
  return rows.map(
    (e): TimelineRow => ({
      date: e.detected_at.slice(0, 10),
      pillar: e.pillar,
      title: e.payload?.title ?? '(untitled event)',
      severity: e.severity,
    }),
  )
}

export async function getCreditLedger(
  tenantId: string = DEMO_TENANT_ID,
): Promise<CreditLedger> {
  if (!supabase) return DEMO_CREDIT_LEDGER
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('endpoint, credits_used, ts')
    .eq('tenant_id', tenantId)
    .order('ts', { ascending: false })
    .limit(100)
  if (error || !data) return DEMO_CREDIT_LEDGER

  const rows = data as unknown as CreditLedgerDBRow[]
  const used: number = rows.reduce<number>(
    (s, r) => s + (r.credits_used ?? 0),
    0,
  )

  const byEndpoint = new Map<
    string,
    { credits: number; count: number; ts: string }
  >()
  for (const r of rows) {
    const k: string = r.endpoint
    const cur = byEndpoint.get(k) ?? { credits: 0, count: 0, ts: r.ts }
    cur.credits += r.credits_used ?? 0
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

export async function logCredit(opts: {
  tenantId?: string
  endpoint: string
  creditsUsed: number
  jobId?: string
}): Promise<void> {
  if (!supabaseAdmin) return
  await supabaseAdmin.from('credit_ledger').insert({
    tenant_id: opts.tenantId ?? DEMO_TENANT_ID,
    endpoint: opts.endpoint,
    credits_used: opts.creditsUsed,
    job_id: opts.jobId,
  })
}

export async function insertBriefing(opts: {
  tenantId?: string
  briefingDate: string
  generatedJson: unknown
  anakinJobId?: string
  creditsSpent?: number
}) {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('briefings')
    .upsert(
      {
        tenant_id: opts.tenantId ?? DEMO_TENANT_ID,
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

export async function seedDemoTenant(): Promise<{
  ok: boolean
  reason?: string
  tenant_id?: string
  briefing_date?: string
}> {
  if (!supabaseAdmin) {
    return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY not set' }
  }

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

  const today: string = new Date().toISOString().slice(0, 10)
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