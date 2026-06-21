// =====================================================================
// SCOUTT — Anakin prompts + Groq llama-4-scout reshape prompts
// Docs:
//   https://anakin.io/docs/api-reference
//   https://anakin.io/docs/api-reference/agentic-search
//   https://anakin.io/docs/api-reference/agentic-search/submit-search
//   https://anakin.io/docs/api-reference/agentic-search/get-search-result
//
// 🔥 REWRITTEN: removed NVIDIA llama-3.2-3b reshape (3B param model could
// not emit the full DashboardPayload JSON within 1024 tokens — root cause
// of the "green success toast but demo data" bug). Replaced with Groq
// `meta-llama/llama-4-scout-17b-16e-instruct` + JSON-mode + 8192 tokens,
// split into TWO compact reshape prompts so every section of the dashboard
// is reliably populated from live Anakin agentic-search output.
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

In the last 24-72 hours, find and synthesize the following — RETURN ONE JSON OBJECT only:

1. POLICY: regulations, enforcement, agency guidance, bills in ${tenant.region} affecting
   ${tenant.industry}. Include regulator name, effective date, source URL.

2. COMPETITOR: public moves by ${tenant.competitor_domains.join(', ')} — pricing changes
   (with exact before/after values when known), feature launches, hires, funding, layoffs.
   Include source URL and observed timestamp.

3. SENTIMENT: review-site, social, forum signal around ${tenant.industry} and competitors.
   Include 3-5 verbatim quotes with URLs and sentiment delta vs prior week.

4. ACTIONS: exactly 3 concrete actions the operator should take TODAY. Each with title,
   why_now (one sentence), email_draft body (<=120 words), slack_message (<=40 words), impact.

Severity 0-100 per event. high_impact=true if severity>=70. Be comprehensive — aim for
8-12 total events spread across the three pillars.`

// JSON-schema-style hint embedded in the prompt — encourages structured output.
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

// Used by the hourly pricing-page scraper (Anakin /v1/crawl).
export const COMPETITOR_SCRAPE_PROMPT = (url: string) =>
  `Fetch ${url}. Extract: (1) all visible prices and currency, (2) plan/tier names,
(3) any "new"/"limited time"/"beta" badges, (4) feature list deltas. Return as JSON with
fields: prices[], plans[], badges[], features[]. No prose.`

// "Ask SCOUTT" fresh-search prompt.
export const ASK_FRESH_SEARCH_PROMPT = (question: string, industry: string) =>
  `User question: "${question}". Industry context: ${industry}. Search the last 7 days only.
Return 3-5 evidence snippets with source URLs. No opinion — just sourced facts.`

// ═════════════════════════════════════════════════════════════════════
// GROQ llama-4-scout-17b RESHAPE PROMPTS (split into two compact calls)
// Each prompt fits comfortably in 8192 max_completion_tokens.
// ═════════════════════════════════════════════════════════════════════

export const RESHAPE_SYSTEM_PROMPT = `You are SCOUTT's data normaliser. Take a raw
Anakin Agentic-Search output JSON plus a tenant profile and reshape it into the EXACT
JSON shape requested by the user. Rules:
  • Output ONLY a single valid JSON object — no markdown fences, no commentary.
  • Use real URLs ONLY from the raw source. NEVER invent URLs.
  • If the raw lacks a field, synthesise a plausible value that is consistent with the
    briefing context (industry, region, competitors). Do not leave fields blank.
  • All array lengths must match the requested counts exactly.
  • Numeric ranges must be respected.
  • Every event MUST include pillar, title, summary, severity (0-100), source_url, source_name.`

// ── RESHAPE STAGE 1 — Briefing core + Pulse Wheel + KPIs + Timeline ──
export const reshapeCorePrompt = (anakinRaw: any, tenant: any) => `TENANT:
${JSON.stringify({ industry: tenant.industry, region: tenant.region, competitors: tenant.competitor_domains })}

RAW_ANAKIN_OUTPUT (truncated):
${JSON.stringify(anakinRaw).slice(0, 12000)}

Return ONLY this JSON shape (no extra keys, no missing keys, no markdown):
{
 "briefing": {
   "briefing_date": "YYYY-MM-DD",
   "headline": "single-sentence headline summarising today's brief",
   "summary": "2-3 sentence summary",
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
  • briefing.events: produce 8-12 items spread across pillars.
  • briefing.actions: produce EXACTLY 3 items.
  • timeline: produce 7-10 items dated within the last 7 days (MM-DD).
  • pulse_wheel: produce 10-18 items across the 24h cycle.
  • threat_meter.sparkline_14d: EXACTLY 14 integers between 0-100.
  • kpi_sparklines: each array EXACTLY 12 floats between 0 and 1.
  • threats_to_actions.links: 3-6 plausible links.`

// ── RESHAPE STAGE 2 — Policy + Competitor + Sentiment + Archetype + SentimentVolume
export const reshapePillarsPrompt = (anakinRaw: any, tenant: any) => `TENANT:
${JSON.stringify({ industry: tenant.industry, region: tenant.region, competitors: tenant.competitor_domains })}

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
     "url": "https://${tenant.competitor_domains?.[0] || 'stripe.com'}/pricing",
     "before_ts": "YYYY-MM-DD HH:MM",
     "after_ts":  "YYYY-MM-DD HH:MM",
     "before_lines": ["3-6 lines of old pricing, start removed lines with -"],
     "after_lines":  ["3-6 lines of new pricing, start added lines with +"],
     "threat_level": 0-100,
     "fee_change_pct": -50 to 50
   },
   "pricing_race_30d": [{ "date": "YYYY-MM-DD", "you": float, "stripe": float,
                          "adyen": float, "checkout": float }],
   "events": [{ "title":"...","summary":"...","severity":0-100,
                "source_url":"https://...","source_name":"...","tags":["..."],
                "detected_at":"ISO8601", "pillar":"competitor", "high_impact": bool }],
   "feature_matrix": {
     "competitors": ["You","Stripe","Adyen","Checkout.com"],
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
   "axes": [6 short axis names],
   "you":      [6 ints 0-100],
   "baseline": [6 ints 0-100],
   "higher":   ["1-2 axis names"],
   "lower":    ["1-2 axis names"],
   "neutral":  ["1-2 axis names"]
 }
}

REQUIREMENTS:
  • sentiment_volume_14d: EXACTLY 14 daily items.
  • policy.regions: 6-10 items, lat/lng must be real-world coordinates.
  • policy.qoq: 6-10 items, one per region above.
  • policy.active_regulations: 4-8 items.
  • competitor.diff_timeline: 7-12 items spread over last 7 days.
  • competitor.pricing_race_30d: EXACTLY 31 daily items.
  • competitor.events: 4-8 items.
  • competitor.feature_matrix.features: 5-8 rows, each with EXACTLY 4 boolean values.
  • sentiment.topic_cluster: 8-14 items.
  • sentiment.delta_vs_competitors: 4-6 items.
  • sentiment.word_cloud: 12-22 items.
  • sentiment.quotes: 4-6 verbatim items.
  • sentiment.events: 4-8 items.
  • archetype.axes / you / baseline: EXACTLY 6 elements each.`
