// =====================================================================
// SCOUTT — demo data + unified DashboardPayload builder.
// Backwards-compatible: all previous DEMO_* exports remain.
// =====================================================================

export const DEMO_TENANT = {
  id: 'demo-fintech-001',
  name: 'Acme Fintech',
  industry: 'B2B SaaS Fintech',
  region: 'United States + EU',
  competitor_domains: ['stripe.com', 'adyen.com', 'checkout.com'],
  pillars_enabled: ['policy', 'pricing', 'features', 'sentiment', 'supply_chain', 'hiring'],
}

// ─────────────────────────────────────────────────────────────────────
// Unified DashboardPayload type
// ─────────────────────────────────────────────────────────────────────
export type Event = {
  pillar: 'policy' | 'competitor' | 'sentiment'
  title: string
  summary: string
  severity: number
  high_impact: boolean
  source_url: string
  source_name: string
  detected_at: string
  tags: string[]
}
export type Action = {
  title: string
  why_now: string
  email_draft: string
  slack_message: string
  impact: 'low' | 'medium' | 'high'
}
export interface DashboardPayload {
  generated_at_iso: string
  source: 'anakin-live' | 'demo' | 'demo-fallback'
  briefing: {
    briefing_date: string
    headline: string
    summary: string
    threat_level: number
    high_impact_count: number
    events: Event[]
    actions: Action[]
    kpis: {
      threats_detected: number
      opportunities: number
      action_items: number
      avg_response_time_minutes: number
    }
  }
  timeline: { date: string; pillar: string; title: string; severity: number }[]
  pulse_wheel: {
    pillar: string
    hour: number
    severity: number
    title: string
    source_url: string
  }[]
  threat_meter: { value: number; label: string; sparkline_14d: number[] }
  sentiment_volume_14d: { date: string; positive: number; neutral: number; negative: number }[]
  threats_to_actions: {
    sources: { label: string; count: number }[]
    targets: { label: string; count: number }[]
    links: { from: number; to: number; value: number }[]
  }
  kpi_sparklines: { threats: number[]; opps: number[]; actions: number[]; response: number[] }
  policy: {
    regions: { country: string; code: string; lat: number; lng: number; activity: number; count: number }[]
    qoq: { country: string; q1: number; q2: number }[]
    active_regulations: {
      title: string
      summary: string
      severity: number
      tags: string[]
      source_url: string
      source_name: string
      deadline: string | null
    }[]
  }
  competitor: {
    diff_timeline: { ts_iso: string; kind: 'pricing' | 'product' | 'hiring' }[]
    pricing_diff: {
      url: string
      before_ts: string
      after_ts: string
      before_lines: string[]
      after_lines: string[]
      threat_level: number
      fee_change_pct: number
    }
    pricing_race_30d: { date: string; you: number; stripe: number; adyen: number; checkout: number }[]
    events: Event[]
    feature_matrix: {
      competitors: string[]
      features: { name: string; values: boolean[] }[]
    }
  }
  sentiment: {
    topic_cluster: { topic: string; mentions: number; sentiment: number }[]
    delta_vs_competitors: { name: string; value: number }[]
    word_cloud: { text: string; value: number }[]
    quotes: { text: string; src: string; stars: string }[]
    events: Event[]
  }
  archetype: {
    industry: string
    axes: string[]
    you: number[]
    baseline: number[]
    higher: string[]
    lower: string[]
    neutral: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────
// Legacy DEMO_BRIEFING (kept for compat with imports in api/index.ts)
// ─────────────────────────────────────────────────────────────────────
export const DEMO_BRIEFING = {
  briefing_date: new Date().toISOString().slice(0, 10),
  headline: 'EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.',
  summary_markdown: '4 high-impact events overnight.',
  threat_level: 73,
  events: [
    { pillar: 'policy', title: 'EU AI Act Article 6 enforcement begins today', summary: 'High-risk AI systems used in credit scoring now require conformity assessment + CE marking. Penalties up to 7% of global turnover.', severity: 92, high_impact: true, source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', source_name: 'EUR-Lex Official Journal', detected_at: new Date().toISOString(), tags: ['EU', 'AI Act'] },
    { pillar: 'competitor', title: 'Stripe raises ACH transaction fees 12.5%', summary: 'ACH fees moved from $0.80 → $0.90 per transaction. Detected via pricing-page diff at 03:42 UTC.', severity: 81, high_impact: true, source_url: 'https://stripe.com/pricing', source_name: 'stripe.com/pricing', detected_at: new Date().toISOString(), tags: ['pricing', 'ACH'] },
    { pillar: 'competitor', title: 'Adyen launches Embedded Finance API for SMBs', summary: 'New product page targets <$10M ARR fintechs.', severity: 76, high_impact: true, source_url: 'https://adyen.com/embedded-finance', source_name: 'Adyen', detected_at: new Date().toISOString(), tags: ['product-launch'] },
    { pillar: 'sentiment', title: 'Fraud-detection vendor sentiment drops 18pts', summary: 'Net sentiment around fraud false positives moved +24 → +6 on r/fintech.', severity: 71, high_impact: true, source_url: 'https://reddit.com/r/fintech', source_name: 'Reddit r/fintech', detected_at: new Date().toISOString(), tags: ['sentiment'] },
    { pillar: 'competitor', title: 'Checkout.com posts 4 senior ML eng roles', summary: 'Signals model-team buildout in Berlin. €140-180k.', severity: 54, high_impact: false, source_url: 'https://checkout.com/careers', source_name: 'Checkout.com', detected_at: new Date().toISOString(), tags: ['hiring'] },
    { pillar: 'policy', title: "CFPB issues guidance on 'pay-in-4' products", summary: 'BNPL pay-in-4 now treated as credit under TILA.', severity: 68, high_impact: false, source_url: 'https://consumerfinance.gov/compliance/circulars', source_name: 'CFPB', detected_at: new Date().toISOString(), tags: ['US', 'CFPB'] },
    { pillar: 'sentiment', title: "G2 reviews mention 'onboarding friction' up 31%", summary: 'Direct opportunity for faster-KYC pitch.', severity: 48, high_impact: false, source_url: 'https://g2.com/categories/payment-processing', source_name: 'G2', detected_at: new Date().toISOString(), tags: ['g2'] },
    { pillar: 'policy', title: 'UK FCA opens consultation on stablecoin reserves', summary: 'Comment window closes Aug 14.', severity: 41, high_impact: false, source_url: 'https://fca.org.uk/publications/consultation-papers', source_name: 'UK FCA', detected_at: new Date().toISOString(), tags: ['UK'] },
  ],
  actions: [
    { title: 'Audit underwriting models for EU AI Act compliance', why_now: 'Enforcement began 00:00 CET today; 7% global turnover penalty risk.', email_draft: 'Hi team,\n\nEU AI Act enforcement opened today. By Friday I need a model inventory + gap-list against the conformity-assessment checklist + draft CE-marking timeline.\n\n— You', slack_message: ':rotating_light: EU AI Act enforcement live. Model inventory by EOW. @priya @marco.', impact: 'high' as const },
    { title: "Counter Stripe's ACH fee hike in this week's outreach", why_now: "Stripe just raised ACH 12.5%; cold leads who balked at our price are now within 5%.", email_draft: 'Hi {{first_name}},\n\nStripe raised ACH fees from $0.80 to $0.90. For your volume that\'s an extra $14k/year. Our pricing didn\'t change. 15-min call this week?\n\n— You', slack_message: 'Sales: Stripe ACH $0.80→$0.90. Hit the 23 stalled deals with the comparison email.', impact: 'high' as const },
    { title: "Ship 'instant KYC' landing page before Adyen press cycle", why_now: 'Adyen Embedded Finance launch + 31% rise in onboarding-friction complaints = open window.', email_draft: 'Hi marketing,\n\nAdyen launched Embedded Finance for our ICP. G2 sentiment on onboarding friction is up 31%. Can we ship /instant-kyc by Monday + $5k LinkedIn?\n\n— You', slack_message: 'Marketing: ship /instant-kyc by Mon + $5k LinkedIn boost. Decision by 5pm.', impact: 'medium' as const },
  ],
  kpis: { threats_detected: 12, opportunities: 4, action_items: 3, avg_response_time_minutes: 47 },
}

export const DEMO_TIMELINE = [
  { date: '06-20', pillar: 'policy', title: 'EU AI Act enforcement begins', severity: 92 },
  { date: '06-20', pillar: 'competitor', title: 'Stripe ACH +12.5%', severity: 81 },
  { date: '06-19', pillar: 'sentiment', title: 'G2 onboarding complaints spike', severity: 62 },
  { date: '06-19', pillar: 'competitor', title: 'Adyen hires VP Product', severity: 55 },
  { date: '06-18', pillar: 'policy', title: 'CFPB guidance circular', severity: 68 },
  { date: '06-17', pillar: 'competitor', title: 'Checkout.com Series E rumor', severity: 71 },
  { date: '06-17', pillar: 'sentiment', title: 'Reddit fraud-tool thread viral', severity: 58 },
  { date: '06-16', pillar: 'policy', title: 'UK FCA stablecoin consult', severity: 41 },
  { date: '06-15', pillar: 'competitor', title: 'Stripe Atlas redesign', severity: 33 },
  { date: '06-14', pillar: 'sentiment', title: 'Twitter buzz: AI underwriting', severity: 47 },
]

export const DEMO_PRICING_RACE = (() => {
  const out: { date: string; stripe: number; adyen: number; checkout: number; you: number }[] = []
  for (let i = 30; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    out.push({
      date: d.toISOString().slice(0, 10),
      stripe: i === 0 ? 0.9 : 0.8,
      adyen: +(0.85 + Math.sin(i / 5) * 0.02).toFixed(3),
      checkout: +(0.82 + Math.cos(i / 4) * 0.015).toFixed(3),
      you: 0.78,
    })
  }
  return out
})()

export const DEMO_SENTIMENT_VOLUME = (() => {
  const out: { date: string; positive: number; neutral: number; negative: number }[] = []
  for (let i = 14; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    out.push({
      date: d.toISOString().slice(0, 10),
      positive: 40 + Math.floor(Math.sin(i / 3) * 15) + Math.floor(Math.random() * 8),
      neutral: 55 + Math.floor(Math.cos(i / 4) * 10) + Math.floor(Math.random() * 6),
      negative: 25 + Math.floor(Math.sin(i / 2) * 12) + (i < 4 ? 15 : 0) + Math.floor(Math.random() * 5),
    })
  }
  return out
})()

export const DEMO_TOPIC_BUBBLES = [
  { topic: 'fraud false positives', mentions: 234, sentiment: -0.62 },
  { topic: 'onboarding speed', mentions: 187, sentiment: -0.41 },
  { topic: 'developer docs', mentions: 156, sentiment: 0.48 },
  { topic: 'support response', mentions: 142, sentiment: -0.28 },
  { topic: 'ACH reliability', mentions: 128, sentiment: 0.12 },
  { topic: 'pricing transparency', mentions: 119, sentiment: -0.55 },
  { topic: 'dashboard UX', mentions: 98, sentiment: 0.31 },
  { topic: 'instant settlement', mentions: 87, sentiment: 0.68 },
  { topic: 'international fees', mentions: 76, sentiment: -0.39 },
  { topic: 'webhooks', mentions: 64, sentiment: 0.21 },
  { topic: 'compliance burden', mentions: 58, sentiment: -0.71 },
  { topic: 'AI underwriting', mentions: 49, sentiment: -0.18 },
]

export const DEMO_WORDCLOUD = [
  { text: 'fraud', value: 89 }, { text: 'slow onboarding', value: 71 },
  { text: 'great docs', value: 64 }, { text: 'expensive', value: 58 },
  { text: 'instant payout', value: 52 }, { text: 'false decline', value: 48 },
  { text: 'easy API', value: 44 }, { text: 'compliance', value: 41 },
  { text: 'Stripe', value: 38 }, { text: 'support sucks', value: 34 },
  { text: 'AI Act', value: 31 }, { text: 'embedded finance', value: 29 },
  { text: 'BNPL', value: 26 }, { text: 'KYC delay', value: 23 },
  { text: 'love the API', value: 21 }, { text: 'webhook fails', value: 18 },
]

export const DEMO_FEATURE_MATRIX = {
  competitors: ['You', 'Stripe', 'Adyen', 'Checkout.com'],
  features: [
    { name: 'Instant KYC (<60s)', values: [true, false, false, true] },
    { name: 'ACH transfers', values: [true, true, false, true] },
    { name: 'Embedded Finance API', values: [false, true, true, false] },
    { name: 'EU AI Act compliant', values: [true, true, true, false] },
    { name: 'Stablecoin payouts', values: [true, true, false, false] },
    { name: 'BNPL split', values: [false, true, true, true] },
    { name: '<24h dispute resolution', values: [true, false, true, false] },
    { name: 'On-platform issuing', values: [false, true, true, true] },
    { name: 'Open-source SDK', values: [true, true, false, false] },
    { name: 'SOC 2 Type II', values: [true, true, true, true] },
  ],
}

export const DEMO_POLICY_REGIONS = [
  { country: 'European Union', code: 'EU', lat: 50.85, lng: 4.35, activity: 92, count: 14 },
  { country: 'United States', code: 'US', lat: 38.90, lng: -77.04, activity: 78, count: 9 },
  { country: 'United Kingdom', code: 'UK', lat: 51.50, lng: -0.13, activity: 64, count: 7 },
  { country: 'Singapore', code: 'SG', lat: 1.35, lng: 103.82, activity: 51, count: 5 },
  { country: 'Australia', code: 'AU', lat: -35.28, lng: 149.13, activity: 43, count: 4 },
  { country: 'Canada', code: 'CA', lat: 45.42, lng: -75.70, activity: 38, count: 4 },
  { country: 'Japan', code: 'JP', lat: 35.68, lng: 139.69, activity: 31, count: 3 },
  { country: 'Brazil', code: 'BR', lat: -15.80, lng: -47.92, activity: 28, count: 3 },
  { country: 'India', code: 'IN', lat: 28.61, lng: 77.21, activity: 47, count: 5 },
  { country: 'UAE', code: 'AE', lat: 24.45, lng: 54.39, activity: 36, count: 3 },
]

export const DEMO_GLOBE_DOTS = DEMO_POLICY_REGIONS.map(r => ({
  lat: r.lat, lng: r.lng, size: r.activity / 100,
  color: r.activity > 70 ? '#06b6d4' : r.activity > 45 ? '#f97316' : '#ec4899',
  label: `${r.country}: ${r.count} changes`,
}))

export const DEMO_CREDIT_LEDGER = {
  budget: 150, used: 47,
  breakdown: [
    { endpoint: 'agentic-search (daily brief)', credits: 15, count: 2, ts: new Date().toISOString() },
    { endpoint: 'url-scraper (competitor pricing)', credits: 1, count: 18, ts: new Date().toISOString() },
    { endpoint: 'agentic-search (Ask SCOUTT)', credits: 3, count: 4, ts: new Date().toISOString() },
    { endpoint: 'embeddings (NVIDIA, free tier)', credits: 0, count: 47, ts: new Date().toISOString() },
  ],
}

// =====================================================================
// buildDemoPayload — single source of truth for the whole UI
// =====================================================================
export function buildDemoPayload(tenant: any = DEMO_TENANT): DashboardPayload {
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)

  const events: Event[] = DEMO_BRIEFING.events.map(e => ({ ...e, pillar: e.pillar as any })) as Event[]
  const policyEvents = events.filter(e => e.pillar === 'policy')
  const competitorEvents = events.filter(e => e.pillar === 'competitor')
  const sentimentEvents = events.filter(e => e.pillar === 'sentiment')

  const pulseHours: Record<string, number[]> = {
    policy: [0, 1, 7, 17],
    competitor: [1, 4, 9, 14, 21],
    sentiment: [3, 11, 19],
  }
  const pulse_wheel = events.slice(0, 9).map((e, i) => ({
    pillar: e.pillar,
    hour: (pulseHours[e.pillar]?.[i % (pulseHours[e.pillar]?.length || 1)] ?? (i * 3) % 24) + Math.random() * 0.6,
    severity: e.severity,
    title: e.title,
    source_url: e.source_url,
  }))

  return {
    generated_at_iso: today.toISOString(),
    source: 'demo',
    briefing: {
      briefing_date: iso,
      headline: DEMO_BRIEFING.headline,
      summary: DEMO_BRIEFING.summary_markdown,
      threat_level: DEMO_BRIEFING.threat_level,
      high_impact_count: events.filter(e => e.high_impact).length,
      events,
      actions: DEMO_BRIEFING.actions as Action[],
      kpis: DEMO_BRIEFING.kpis,
    },
    timeline: DEMO_TIMELINE.map(t => ({ ...t })),
    pulse_wheel,
    threat_meter: {
      value: DEMO_BRIEFING.threat_level,
      label: labelForThreat(DEMO_BRIEFING.threat_level),
      sparkline_14d: Array.from({ length: 14 }, (_, i) => 50 + Math.round(Math.sin(i / 2) * 18 + (i > 10 ? 8 : 0))),
    },
    sentiment_volume_14d: DEMO_SENTIMENT_VOLUME,
    threats_to_actions: {
      sources: [
        { label: 'Policy', count: policyEvents.length },
        { label: 'Competitor', count: competitorEvents.length },
        { label: 'Sentiment', count: sentimentEvents.length },
      ],
      targets: [
        { label: 'Audit', count: Math.max(1, Math.round(policyEvents.length * 0.8)) },
        { label: 'Counter-market', count: Math.max(1, Math.round(competitorEvents.length * 0.7)) },
        { label: 'Ship landing', count: Math.max(1, Math.round(sentimentEvents.length * 0.7)) },
      ],
      links: [
        { from: 0, to: 0, value: policyEvents.length },
        { from: 1, to: 1, value: competitorEvents.length },
        { from: 2, to: 2, value: sentimentEvents.length },
        { from: 1, to: 0, value: 1 },
      ],
    },
    kpi_sparklines: {
      threats: spark(12, 0.45, 0.85),
      opps: spark(12, 0.25, 0.65),
      actions: spark(12, 0.30, 0.55),
      response: spark(12, 0.40, 0.75),
    },
    policy: {
      regions: DEMO_POLICY_REGIONS,
      qoq: DEMO_POLICY_REGIONS.map(r => ({ country: r.country, q1: Math.max(1, Math.round(r.count * 0.7)), q2: r.count })),
      active_regulations: policyEvents.map(e => ({
        title: e.title, summary: e.summary, severity: e.severity,
        tags: e.tags || [], source_url: e.source_url, source_name: e.source_name,
        deadline: null,
      })),
    },
    competitor: {
      diff_timeline: Array.from({ length: 7 }, (_, i) => ({
        ts_iso: new Date(Date.now() - (6 - i) * 86_400_000).toISOString(),
        kind: (i % 3 === 0 ? 'pricing' : i % 3 === 1 ? 'product' : 'hiring') as any,
      })),
      pricing_diff: {
        url: 'stripe.com/pricing',
        before_ts: new Date(Date.now() - 14 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '),
        after_ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
        before_lines: ['ACH payments', '- $0.80 per transaction', '+ 0.8% capped at $5', 'Plan: Standard'],
        after_lines: ['ACH payments', '+ $0.90 per transaction', '+ 0.8% capped at $5', 'Plan: Standard'],
        threat_level: 81, fee_change_pct: 12.5,
      },
      pricing_race_30d: DEMO_PRICING_RACE,
      events: competitorEvents,
      feature_matrix: DEMO_FEATURE_MATRIX,
    },
    sentiment: {
      topic_cluster: DEMO_TOPIC_BUBBLES,
      delta_vs_competitors: [
        { name: 'You', value: 24 },
        { name: 'Stripe', value: -8 },
        { name: 'Adyen', value: 6 },
        { name: 'Checkout', value: -14 },
      ],
      word_cloud: DEMO_WORDCLOUD,
      quotes: [
        { text: 'Switched our ACH from Stripe to a competitor after the silent fee hike. $14k a year saved.', src: 'Reddit r/fintech', stars: '★★★★★' },
        { text: 'Fraud false-positives blocking 8% of real transactions. Support is the worst part.', src: 'G2 Crowd', stars: '★★☆☆☆' },
        { text: 'Instant KYC is the killer feature. We onboarded a marketplace in 4 hours.', src: 'Product Hunt', stars: '★★★★★' },
        { text: 'Pricing transparency on their site changed overnight without notice. Not great.', src: 'Trustpilot', stars: '★★☆☆☆' },
        { text: 'Adyen Embedded Finance just dropped. Clean docs but priced for $100M+ companies.', src: 'Hacker News', stars: '★★★★☆' },
      ],
      events: sentimentEvents,
    },
    archetype: {
      industry: tenant.industry || 'B2B SaaS Fintech',
      axes: ['Compliance', 'Pricing', 'Onboarding', 'Sentiment', 'Embedded Finance', 'Innovation Speed'],
      you: [88, 72, 95, 70, 45, 80],
      baseline: [65, 75, 60, 68, 78, 65],
      higher: ['Compliance', 'Onboarding'],
      lower: ['Embedded Finance'],
      neutral: ['Sentiment', 'Pricing'],
    },
  }
}

function spark(n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    +(lo + (hi - lo) * (0.5 + Math.sin(i / 1.7 + Math.random() * 0.3) * 0.45)).toFixed(3))
}
function labelForThreat(v: number) {
  if (v >= 80) return 'Severe'
  if (v >= 60) return 'Elevated'
  if (v >= 40) return 'Moderate'
  return 'Low'
}

// =====================================================================
// ageDownPayload — Time Machine snapshot (no extra Anakin credits)
// =====================================================================
export function ageDownPayload(base: DashboardPayload, daysAgo: number): DashboardPayload {
  if (daysAgo <= 0) return base
  const factor = Math.max(0.45, 1 - daysAgo * 0.07)
  const aged: DashboardPayload = JSON.parse(JSON.stringify(base))
  const shift = (iso: string) => {
    try { const d = new Date(iso); d.setDate(d.getDate() - daysAgo); return d.toISOString() }
    catch { return iso }
  }
  aged.generated_at_iso = shift(base.generated_at_iso)
  aged.briefing.briefing_date = aged.generated_at_iso.slice(0, 10)
  aged.briefing.events = aged.briefing.events
    .filter((_, i) => i % (1 + Math.floor(daysAgo / 3)) === 0)
    .map(e => ({ ...e, severity: Math.max(20, Math.round(e.severity * factor)),
                 high_impact: e.severity * factor >= 70,
                 detected_at: shift(e.detected_at) }))
  aged.briefing.threat_level = Math.max(25, Math.round(base.briefing.threat_level * factor))
  aged.briefing.high_impact_count = aged.briefing.events.filter(e => e.high_impact).length
  aged.briefing.kpis = {
    threats_detected: Math.max(2, Math.round(base.briefing.kpis.threats_detected * factor)),
    opportunities: Math.max(1, Math.round(base.briefing.kpis.opportunities * factor)),
    action_items: Math.max(1, Math.round(base.briefing.kpis.action_items * factor)),
    avg_response_time_minutes: Math.round(base.briefing.kpis.avg_response_time_minutes * (1.2 - factor * 0.2)),
  }
  aged.briefing.actions = base.briefing.actions.slice(0, Math.max(1, 3 - Math.floor(daysAgo / 3)))
  aged.briefing.headline = `[${daysAgo}d ago] ` + base.briefing.headline
  aged.timeline = base.timeline.slice(daysAgo).map(t => ({ ...t, severity: Math.round(t.severity * factor) }))
  aged.pulse_wheel = base.pulse_wheel
    .filter((_, i) => i % (1 + Math.floor(daysAgo / 2)) === 0)
    .map(p => ({ ...p, severity: Math.max(20, Math.round(p.severity * factor)) }))
  aged.threat_meter = {
    value: aged.briefing.threat_level,
    label: labelForThreat(aged.briefing.threat_level),
    sparkline_14d: base.threat_meter.sparkline_14d.map(v => Math.round(v * factor)),
  }
  aged.sentiment_volume_14d = base.sentiment_volume_14d.map((d, i) => ({
    ...d, negative: Math.max(5, Math.round(d.negative * factor + (i < 4 ? -5 : 0))),
  }))
  aged.threats_to_actions = {
    sources: base.threats_to_actions.sources.map(s => ({ ...s, count: Math.max(1, Math.round(s.count * factor)) })),
    targets: base.threats_to_actions.targets.map(t => ({ ...t, count: Math.max(1, Math.round(t.count * factor)) })),
    links: base.threats_to_actions.links.map(l => ({ ...l, value: Math.max(1, Math.round(l.value * factor)) })),
  }
  aged.kpi_sparklines = {
    threats: base.kpi_sparklines.threats.map(v => +(v * factor).toFixed(3)),
    opps: base.kpi_sparklines.opps.map(v => +(v * factor).toFixed(3)),
    actions: base.kpi_sparklines.actions.map(v => +(v * factor).toFixed(3)),
    response: base.kpi_sparklines.response.map(v => +(v * (1.1 - factor * 0.1)).toFixed(3)),
  }
  aged.policy.regions = base.policy.regions.map(r => ({ ...r, activity: Math.round(r.activity * factor), count: Math.max(1, Math.round(r.count * factor)) }))
  aged.policy.qoq = aged.policy.regions.map(r => ({ country: r.country, q1: Math.max(1, Math.round(r.count * 0.7)), q2: r.count }))
  aged.policy.active_regulations = base.policy.active_regulations
    .slice(0, Math.max(1, base.policy.active_regulations.length - daysAgo))
    .map(r => ({ ...r, severity: Math.round(r.severity * factor) }))
  aged.competitor.events = base.competitor.events.filter((_, i) => i < base.competitor.events.length - Math.floor(daysAgo / 2))
  aged.competitor.pricing_race_30d = base.competitor.pricing_race_30d.map(d => ({
    ...d, stripe: +(d.stripe * (1 - daysAgo * 0.005)).toFixed(3),
  }))
  aged.sentiment.delta_vs_competitors = base.sentiment.delta_vs_competitors.map(d => ({
    ...d, value: Math.round(d.value * factor),
  }))
  aged.sentiment.topic_cluster = base.sentiment.topic_cluster.map(t => ({ ...t, mentions: Math.max(8, Math.round(t.mentions * factor)) }))
  aged.sentiment.events = base.sentiment.events.filter((_, i) => i < base.sentiment.events.length - Math.floor(daysAgo / 2))
  aged.archetype.you = base.archetype.you.map(v => Math.round(v * factor))
  return aged
}
