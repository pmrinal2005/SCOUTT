// =====================================================================
// EXACT ANAKIN AGENTIC SEARCH PROMPT STRINGS (per architecture spec)
// Reference: https://anakin.io/docs/api-reference/agentic-search/submit-search
// =====================================================================

export const DAILY_BRIEFING_SYSTEM_PROMPT = `You are RealityPulse — a Bloomberg-Terminal-grade business intelligence
analyst for small and mid-market businesses. You synthesize regulatory
filings, competitor public data, and consumer sentiment into a single
"Daily Battle Brief". Output MUST conform exactly to the JSON schema
provided. Cite every claim with a real URL. Never speculate beyond
sources. Score severity on a 0-100 scale. Tone: terse, decisive,
boardroom-ready.`;

// Templated prompt — variables substituted per tenant at run time.
export const dailyBriefingUserPrompt = (tenant: {
  industry: string;
  region: string;
  competitor_domains: string[];
  pillars_enabled: string[];
}) => `Generate today's Daily Battle Brief for a ${tenant.industry} business
operating in ${tenant.region}.

Competitors to monitor: ${tenant.competitor_domains.join(", ")}.
Pillars enabled: ${tenant.pillars_enabled.join(", ")}.

For the last 24 hours, find and synthesize:

1. POLICY pillar — new regulations, enforcement actions, agency
   guidance, or pending bills in ${tenant.region} that materially
   affect ${tenant.industry}. Cite regulator + URL + effective date.

2. COMPETITOR pillar — public moves by ${tenant.competitor_domains.join(
  ", ",
)}: pricing changes, feature launches, hires, funding, layoffs,
   PR. Cite source URL + observed timestamp.

3. SENTIMENT pillar — review-site, social, and forum signal around
   ${tenant.industry} and the named competitors. Sample 3-5 verbatim
   quotes with URLs. Provide sentiment delta vs prior week.

4. ACTION pillar — Top 3 concrete actions the operator should take
   today. Each action: title (<=8 words), why_now, suggested email
   draft body (<=120 words), suggested Slack message (<=40 words),
   estimated impact (low|medium|high).

Return ONE JSON object matching the schema. Severity 0-100 per event.
Mark each event high_impact=true if severity>=70.`;

// Anakin custom JSON schema sent on POST /v1/agentic-search.
// Forces structured output we can write directly into briefings.generated_json.
export const BRIEFING_JSON_SCHEMA = {
  type: "object",
  required: ["briefing_date", "headline", "events", "actions", "kpis"],
  properties: {
    briefing_date: { type: "string", format: "date" },
    headline: { type: "string", maxLength: 140 },
    summary_markdown: { type: "string" },
    threat_level: { type: "integer", minimum: 0, maximum: 100 },
    events: {
      type: "array",
      items: {
        type: "object",
        required: ["pillar", "title", "severity", "source_url"],
        properties: {
          pillar: {
            type: "string",
            enum: ["policy", "competitor", "sentiment"],
          },
          title: { type: "string" },
          summary: { type: "string" },
          severity: { type: "integer", minimum: 0, maximum: 100 },
          high_impact: { type: "boolean" },
          source_url: { type: "string", format: "uri" },
          source_name: { type: "string" },
          detected_at: { type: "string", format: "date-time" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    actions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        required: ["title", "why_now", "impact"],
        properties: {
          title: { type: "string" },
          why_now: { type: "string" },
          email_draft: { type: "string" },
          slack_message: { type: "string" },
          impact: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    kpis: {
      type: "object",
      properties: {
        threats_detected: { type: "integer" },
        opportunities: { type: "integer" },
        action_items: { type: "integer" },
        avg_response_time_minutes: { type: "integer" },
      },
    },
  },
};

// Cheap pricing-page diff prompt (used by hourly pg_cron job).
export const COMPETITOR_SCRAPE_PROMPT = (url: string) =>
  `Fetch ${url}. Extract: (1) all visible prices and currency, (2)
plan/tier names, (3) any "new", "limited time", or "beta" badges,
(4) any feature list deltas. Return as JSON with fields: prices[],
plans[], badges[], features[]. No prose.`;

// "Ask RealityPulse" fresh-search top-up prompt (3 credits).
export const ASK_FRESH_SEARCH_PROMPT = (question: string, industry: string) =>
  `User question: "${question}". Industry context: ${industry}. Search the
last 7 days only. Return 3-5 evidence snippets with source URLs. No
opinion — just sourced facts the assistant will cite.`;
