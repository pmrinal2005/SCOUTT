// =====================================================================
// SCOUTT — Anakin prompts + NVIDIA NIM reshape prompt
// Docs: https://anakin.io/docs/api-reference/agentic-search/submit-search
//       https://anakin.io/docs/api-reference/agentic-search/get-search-result
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

// ─────────────────────────────────────────────────────────────────────
// NVIDIA NIM reshape prompts. Takes raw Anakin generatedJson + tenant
// info and forces the full DashboardPayload shape required by the UI.
// This is what makes EVERY card dynamic.
// ─────────────────────────────────────────────────────────────────────
export const RESHAPE_SYSTEM_PROMPT = `You are SCOUTT's data normaliser. You are given a raw
Agentic-Search output JSON and a tenant profile. Reshape into THE EXACT JSON SHAPE below.
Output ONLY a single JSON object, no markdown, no commentary. Never invent URLs — copy them
from the source. If the source lacks a field, synthesise a plausible value consistent with
the briefing context. All numeric arrays must have the stated lengths. All "values" arrays
in feature_matrix must align with the "competitors" array length.`

export const reshapeUserPrompt = (anakinRaw: any, tenant: any) => `TENANT:
${JSON.stringify({ industry: tenant.industry, region: tenant.region, competitors: tenant.competitor_domains })}

RAW_ANAKIN_OUTPUT:
${JSON.stringify(anakinRaw).slice(0, 16000)}

PRODUCE THIS EXACT JSON SHAPE (no extra keys, no missing keys):
{
 "briefing": {
   "briefing_date": "YYYY-MM-DD",
   "headline": "...",
   "summary": "...",
   "threat_level": 0-100,
   "high_impact_count": int,
   "events": [
     { "pillar": "policy|competitor|sentiment", "title": "...", "summary": "...",
       "severity": 0-100, "high_impact": bool, "source_url": "...", "source_name": "...",
       "detected_at": "ISO8601", "tags": ["..."] }
   ],
   "actions": [
     { "title": "...", "why_now": "...", "email_draft": "...",
       "slack_message": "...", "impact": "low|medium|high" }
   ],
   "kpis": { "threats_detected": int, "opportunities": int,
             "action_items": int, "avg_response_time_minutes": int }
 },
 "timeline": [{ "date": "MM-DD", "pillar": "...", "title": "...", "severity": int }],
 "pulse_wheel": [{ "pillar": "policy|competitor|sentiment", "hour": 0-23.99,
                   "severity": int, "title": "...", "source_url": "..." }],
 "threat_meter": { "value": int, "label": "Low|Moderate|Elevated|Severe",
                   "sparkline_14d": [14 ints 0-100] },
 "sentiment_volume_14d": [{ "date": "YYYY-MM-DD", "positive": int, "neutral": int, "negative": int }],
 "threats_to_actions": {
    "sources": [{ "label": "Policy|Competitor|Sentiment", "count": int }],
    "targets": [{ "label": "...", "count": int }],
    "links":   [{ "from": int, "to": int, "value": int }]
 },
 "kpi_sparklines": {
    "threats":[12 floats 0-1],"opps":[12 floats 0-1],
    "actions":[12 floats 0-1],"response":[12 floats 0-1]
 },
 "policy": {
   "regions": [{ "country": "...", "code": "...", "lat": -90 to 90, "lng": -180 to 180,
                 "activity": int, "count": int }],
   "qoq":     [{ "country": "...", "q1": int, "q2": int }],
   "active_regulations": [
     { "title": "...", "summary": "...", "severity": int, "tags": ["..."],
       "source_url": "...", "source_name": "...", "deadline": "YYYY-MM-DD or null" }
   ]
 },
 "competitor": {
   "diff_timeline": [{ "ts_iso": "...", "kind": "pricing|product|hiring" }],
   "pricing_diff": {
     "url": "...", "before_ts": "...", "after_ts": "...",
     "before_lines": ["..."], "after_lines": ["..."],
     "threat_level": int, "fee_change_pct": number
   },
   "pricing_race_30d": [{ "date": "YYYY-MM-DD", "you": number, "stripe": number,
                          "adyen": number, "checkout": number }],
   "events": [{ "title":"...","summary":"...","severity":int,"source_url":"...",
                "source_name":"...","tags":["..."],"detected_at":"..."}],
   "feature_matrix": {
     "competitors": ["You","Stripe","Adyen","Checkout.com"],
     "features": [{ "name": "...", "values": [bool, bool, bool, bool] }]
   }
 },
 "sentiment": {
   "topic_cluster": [{ "topic": "...", "mentions": int, "sentiment": -1 to 1 }],
   "delta_vs_competitors": [{ "name": "...", "value": -30 to 30 }],
   "word_cloud": [{ "text": "...", "value": int }],
   "quotes": [{ "text": "...", "src": "...", "stars": "★★★★★" }],
   "events": [{ "title":"...","summary":"...","severity":int,"source_url":"...",
                "source_name":"...","tags":["..."],"detected_at":"..."}]
 },
 "archetype": {
   "industry": "...",
   "axes": [6 strings],
   "you":      [6 ints 0-100],
   "baseline": [6 ints 0-100],
   "higher":  ["2 axis names"],
   "lower":   ["1-2 axis names"],
   "neutral": ["1-2 axis names"]
 }
}`
