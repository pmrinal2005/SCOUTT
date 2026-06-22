// =====================================================================
// SCOUTT — Anakin prompts + Groq llama-4-scout reshape prompts
// Docs:
//   https://anakin.io/docs/api-reference
//   https://anakin.io/docs/api-reference/agentic-search/submit-search
//   https://anakin.io/docs/api-reference/agentic-search/get-search-result
//   https://anakin.io/docs/api-reference/crawl/submit-crawl-job
//   https://anakin.io/docs/api-reference/crawl/get-crawl-result
//
// 🔥 EXTENDED: added SCENARIO_SYSTEM_PROMPT + scenarioUserPrompt(...) so
// the Scenario Simulator now runs through Groq llama-4-scout against the
// user's CACHED LIVE briefing instead of the old regex-based demo math.
// Everything else preserved verbatim for backwards compatibility.
// =====================================================================

export const DAILY_BRIEFING_SYSTEM_PROMPT = `You are SCOUTT — a Bloomberg-Terminal-grade business
intelligence analyst for small and mid-market businesses. Synthesize regulatory filings,
competitor public data, and consumer sentiment into a single comprehensive Daily Battle Brief.
Cite every claim with a real URL. Never speculate beyond sources. Score severity 0-100.
Tone: terse, decisive, boardroom-ready.`

export const dailyBriefingUserPrompt = (tenant: {
  industry: string
  region: string
  competitor_domains: string[]
  pillars_enabled: string[]
}) => `Produce TODAY's comprehensive intelligence dossier for a ${tenant.industry} business
operating in ${tenant.region}. Competitors: ${tenant.competitor_domains.join(', ')}.
Pillars: ${tenant.pillars_enabled.join(', ')}.

CRITICAL: every COMPETITOR event MUST be about one of THESE EXACT competitor domains:
${tenant.competitor_domains.map(d => `  • ${d}`).join('\n')}
Do NOT substitute "industry leaders" or "major players" — only these specific companies.
Every source_url for a competitor event MUST live on one of those domains (or directly
reference a news article about that specific company).

In the last 24-72 hours, find and synthesize the following — RETURN ONE JSON OBJECT only:

1. POLICY: regulations, enforcement, agency guidance, bills in ${tenant.region} affecting
   ${tenant.industry}. Include regulator name, effective date, source URL.

2. COMPETITOR: public moves by ${tenant.competitor_domains.join(', ')} — pricing changes
   (with exact before/after values when known), feature launches, hires, funding, layoffs.
   Include source URL and observed timestamp.

3. SENTIMENT: review-site, social, forum signal around ${tenant.industry} and the listed
   competitors. Include 3-5 verbatim quotes with URLs and sentiment delta vs prior week.

4. ACTIONS: exactly 3 concrete actions the operator should take TODAY. Each with title,
   why_now (one sentence), email_draft body (<=120 words), slack_message (<=40 words), impact.

Severity 0-100 per event. high_impact=true if severity>=70. Be comprehensive — aim for
8-12 total events spread across the three pillars.`

export const BRIEFING_JSON_SCHEMA = {
  type: 'object',
  required: ['headline', 'threat_level', 'events', 'actions'],
  properties: {
    briefing_date: { type: 'string' },
    headline: { type: 'string' },
    threat_level: { type: 'integer', minimum: 0, maximum: 100 },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pillar: { type: 'string', enum: ['policy', 'competitor', 'sentiment'] },
          title: { type: 'string' },
          summary: { type: 'string' },
          severity: { type: 'integer' },
          high_impact: { type: 'boolean' },
          source_url: { type: 'string' },
          source_name: { type: 'string' },
          detected_at: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    actions: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          why_now: { type: 'string' },
          email_draft: { type: 'string' },
          slack_message: { type: 'string' },
          impact: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
  },
}

export const COMPETITOR_SCRAPE_PROMPT = (url: string) =>
  `Fetch ${url}. Extract: (1) all visible prices and currency, (2) plan/tier names,
(3) any "new"/"limited time"/"beta" badges, (4) feature list deltas. Return as JSON with
fields: prices[], plans[], badges[], features[]. No prose.`

export const ASK_FRESH_SEARCH_PROMPT = (question: string, industry: string) =>
  `User question: "${question}". Industry context: ${industry}. Search the last 7 days only.
Return 3-5 evidence snippets with source URLs. No opinion — just sourced facts.`

// =====================================================================
// GROQ llama-4-scout-17b RESHAPE PROMPTS (briefing + pillars)
// =====================================================================

export const RESHAPE_SYSTEM_PROMPT = `You are SCOUTT's data normaliser. Take a raw
Anakin Agentic-Search output JSON plus a tenant profile and reshape it into the EXACT
JSON shape requested by the user. Rules:
  • Output ONLY a single valid JSON object — no markdown fences, no commentary.
  • Use real URLs ONLY from the raw source. NEVER invent URLs.
  • EVERY competitor event MUST reference a domain from the tenant's competitor_domains list
    (or news about that specific company). Never substitute generic "industry leaders".
  • If the raw lacks a field, synthesise a plausible value that is consistent with the
    briefing context (industry, region, competitors). Do not leave fields blank.
  • All array lengths must match the requested counts exactly.
  • Numeric ranges must be respected.
  • Every event MUST include pillar, title, summary, severity (0-100), source_url, source_name.`

export const reshapeCorePrompt = (anakinRaw: any, tenant: any) => `TENANT:
${JSON.stringify({ industry: tenant.industry, region: tenant.region, competitors: tenant.competitor_domains, pillars: tenant.pillars_enabled })}

RAW_ANAKIN_OUTPUT (truncated):
${JSON.stringify(anakinRaw).slice(0, 12000)}

Return ONLY this JSON shape (no extra keys, no missing keys, no markdown):
{
 "briefing": {
   "briefing_date": "YYYY-MM-DD",
   "headline": "single-sentence headline summarising today's brief for the tenant",
   "summary": "2-3 sentence summary specific to the tenant's industry & region",
   "threat_level": 0-100,
   "high_impact_count": 0-12,
   "events": [
     { "pillar": "policy|competitor|sentiment", "title": "...", "summary": "...",
       "severity": 0-100, "high_impact": true|false, "source_url": "https://...",
       "source_name": "...", "detected_at": "ISO8601", "tags": ["..."] }
   ],
   "actions": [
     { "title": "...", "why_now": "...", "email_draft": "<=120 words",
       "slack_message": "<=40 words", "impact": "low|medium|high" }
   ],
   "kpis": { "threats_detected": int, "opportunities": int,
             "action_items": int, "avg_response_time_minutes": int }
 },
 "timeline": [
   { "date": "MM-DD", "pillar": "policy|competitor|sentiment", "title": "...", "severity": int }
 ],
 "pulse_wheel": [
   { "pillar": "policy|competitor|sentiment", "hour": 0-23.99,
     "severity": 0-100, "title": "...", "source_url": "https://..." }
 ],
 "threat_meter": { "value": 0-100, "label": "Low|Moderate|Elevated|Severe",
                   "sparkline_14d": [14 ints 0-100] },
 "kpi_sparklines": {
    "threats": [12 floats 0-1], "opps": [12 floats 0-1],
    "actions": [12 floats 0-1], "response": [12 floats 0-1]
 },
 "threats_to_actions": {
    "sources": [
      { "label": "Policy",     "count": int },
      { "label": "Competitor", "count": int },
      { "label": "Sentiment",  "count": int }
    ],
    "targets": [
      { "label": "Email outreach", "count": int },
      { "label": "Slack alert",    "count": int },
      { "label": "Product fix",    "count": int }
    ],
    "links": [{ "from": 0-2, "to": 0-2, "value": int }]
 }
}

REQUIREMENTS:
  • briefing.events: 8-12 items, COMPETITOR events constrained to tenant competitors.
  • briefing.actions: EXACTLY 3.
  • timeline: 7-10 items dated within the last 7 days (MM-DD).
  • pulse_wheel: 10-18 items across the 24h cycle.
  • threat_meter.sparkline_14d: EXACTLY 14 ints 0-100.
  • kpi_sparklines: each array EXACTLY 12 floats 0-1.
  • threats_to_actions.links: 3-6 plausible links.`

export const reshapePillarsPrompt = (anakinRaw: any, tenant: any) => {
  const comps: string[] = tenant.competitor_domains || []
  const compsCsv = comps.join(', ')
  const fmHeader = ['You', ...comps.slice(0, 3).map(c => prettyDomain(c))]
  return `TENANT:
${JSON.stringify({ industry: tenant.industry, region: tenant.region, competitors: comps, pillars: tenant.pillars_enabled })}

RAW_ANAKIN_OUTPUT (truncated):
${JSON.stringify(anakinRaw).slice(0, 12000)}

Return ONLY this JSON shape (no markdown, no extra keys):
{
 "sentiment_volume_14d": [
   { "date": "YYYY-MM-DD", "positive": int, "neutral": int, "negative": int }
 ],
 "policy": {
   "regions": [
     { "country": "...", "code": "US|EU|UK|...", "lat": -90 to 90,
       "lng": -180 to 180, "activity": 0-100, "count": int }
   ],
   "qoq": [{ "country": "...", "q1": int, "q2": int }],
   "active_regulations": [
     { "title": "...", "summary": "...", "severity": 0-100, "tags": ["..."],
       "source_url": "https://...", "source_name": "...",
       "deadline": "YYYY-MM-DD or null" }
   ]
 },
 "competitor": {
   "diff_timeline": [{ "ts_iso": "ISO8601", "kind": "pricing|product|hiring" }],
   "pricing_diff": {
     "url": "https://${comps[0] || 'example.com'}/pricing",
     "before_ts": "YYYY-MM-DD HH:MM",
     "after_ts":  "YYYY-MM-DD HH:MM",
     "before_lines": ["3-6 lines of old pricing, start removed lines with -"],
     "after_lines":  ["3-6 lines of new pricing, start added lines with +"],
     "threat_level": 0-100,
     "fee_change_pct": -50 to 50
   },
   "pricing_race_30d": [{ "date": "YYYY-MM-DD", "you": float${comps.slice(0, 3).map(c => `, "${slug(c)}": float`).join('')} }],
   "events": [{ "title":"...","summary":"...","severity":0-100,
                "source_url":"https://...","source_name":"...","tags":["..."],
                "detected_at":"ISO8601", "pillar":"competitor", "high_impact": bool }],
   "feature_matrix": {
     "competitors": ${JSON.stringify(fmHeader)},
     "features": [{ "name": "...", "values": [bool, bool, bool, bool] }]
   }
 },
 "sentiment": {
   "topic_cluster": [{ "topic": "...", "mentions": int, "sentiment": -1.0 to 1.0 }],
   "delta_vs_competitors": [{ "name": "...", "value": -30 to 30 }],
   "word_cloud": [{ "text": "...", "value": int }],
   "quotes": [{ "text": "verbatim quote", "src": "site/handle", "stars": "★★★★★" }],
   "events": [{ "title":"...","summary":"...","severity":0-100,
                "source_url":"https://...","source_name":"...","tags":["..."],
                "detected_at":"ISO8601", "pillar":"sentiment", "high_impact": bool }]
 },
 "archetype": {
   "industry": "${tenant.industry}",
   "axes": [6 short axis names specific to ${tenant.industry}],
   "you":      [6 ints 0-100],
   "baseline": [6 ints 0-100],
   "higher":   ["1-2 axis names"],
   "lower":    ["1-2 axis names"],
   "neutral":  ["1-2 axis names"]
 }
}

REQUIREMENTS:
  • Every competitor event/quote/topic MUST reference one of: ${compsCsv}.
  • sentiment_volume_14d: EXACTLY 14 daily items.
  • policy.regions: 6-10 items, lat/lng must be real-world coordinates for ${tenant.region}.
  • policy.qoq: one item per region above.
  • policy.active_regulations: 4-8 items relevant to ${tenant.industry} in ${tenant.region}.
  • competitor.diff_timeline: 7-12 items spread over last 7 days.
  • competitor.pricing_race_30d: EXACTLY 31 daily items.
  • competitor.events: 4-8 items, each tied to one of ${compsCsv}.
  • competitor.feature_matrix.features: 5-8 rows, each with EXACTLY ${fmHeader.length} booleans.
  • sentiment.topic_cluster: 8-14 items.
  • sentiment.delta_vs_competitors: must include "You" + each of ${compsCsv}.
  • sentiment.word_cloud: 12-22 items.
  • sentiment.quotes: 4-6 verbatim items.
  • sentiment.events: 4-8 items.
  • archetype.axes / you / baseline: EXACTLY 6 elements each.`
}

// =====================================================================
// 🆕 SCENARIO SIMULATOR PROMPTS (Groq llama-4-scout)
// Runs the user's free-text "what if…" against their cached briefing.
// =====================================================================

export const SCENARIO_SYSTEM_PROMPT = `You are SCOUTT's Scenario Simulator. Given:
  • the tenant's industry / region / competitors,
  • today's full cached briefing (events, threat level, actions),
  • a free-text hypothetical from the operator,
your job is to project how today's intelligence changes UNDER THAT HYPOTHETICAL.
Rules:
  • Output ONLY a single valid JSON object — no markdown fences, no commentary.
  • Re-score severity for every event you mark as impacted (0-100).
  • Re-compute the projected threat level (0-100) — both before AND after.
  • Pick 3-6 of the briefing's REAL events that this scenario actually moves.
    Use the SAME titles and source URLs from the briefing — do NOT invent new ones.
  • Write a 1-2 sentence boardroom-ready narrative.
  • Be decisive: ambiguous scenarios still get a directional projection.`

export const scenarioUserPrompt = (opts: {
  scenario: string
  tenant: any
  payload: any
}) => {
  const events = (opts.payload?.briefing?.events || []).slice(0, 12).map((e: any, i: number) => ({
    idx: i,
    pillar: e.pillar,
    title: e.title,
    summary: e.summary,
    severity: e.severity,
    source_url: e.source_url,
  }))
  return `TENANT:
${JSON.stringify({ industry: opts.tenant?.industry, region: opts.tenant?.region, competitors: opts.tenant?.competitor_domains })}

CURRENT_BRIEFING:
  threat_level: ${opts.payload?.briefing?.threat_level ?? 60}
  headline: ${opts.payload?.briefing?.headline ?? ''}
  events: ${JSON.stringify(events)}

USER_HYPOTHETICAL:
  "${String(opts.scenario).slice(0, 600)}"

Return ONLY this JSON (no other keys, no markdown):
{
  "threat_level_before": ${opts.payload?.briefing?.threat_level ?? 60},
  "threat_level_after":  0-100,
  "delta_threats": int (count of events whose severity moved meaningfully),
  "delta_actions": int (count of operator actions that would need re-prioritising, 0-5),
  "narrative": "1-2 sentence boardroom-grade analysis tying the scenario to specific events",
  "impacted_events": [
    { "title": "exact title from briefing", "pillar": "policy|competitor|sentiment",
      "severity": 0-100, "source_url": "https://..." }
  ]
}

REQUIREMENTS:
  • impacted_events: 3-6 items, every title MUST exist verbatim in the briefing events above.
  • If the scenario is benign or unrelated, threat_level_after should drift toward
    threat_level_before but never be identical (operators want a clear directional read).
  • narrative MUST mention at least one specific competitor or regulator from the tenant context.`
}

// ─── helpers ──────────────────────────────────────────────────────────

function slug(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12) || 'comp'
}
function prettyDomain(domain: string): string {
  const d = domain.replace(/^https?:\/\//, '').replace(/^www\./, '')
  const root = d.split('.')[0] || d
  return root.charAt(0).toUpperCase() + root.slice(1)
}
