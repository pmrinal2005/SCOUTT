// =====================================================================
// Deterministic demo seed (?demo=true). Mirrors briefings.generated_json
// shape exactly so the same React code renders live + demo identically.
// =====================================================================

export const DEMO_TENANT = {
  id: "demo-fintech-001",
  name: "Acme Fintech",
  industry: "B2B SaaS Fintech",
  region: "United States + EU",
  competitor_domains: ["stripe.com", "adyen.com", "checkout.com"],
  pillars_enabled: ["policy", "pricing", "features", "sentiment", "supply_chain", "hiring"],
};

export const DEMO_BRIEFING = {
  briefing_date: "2026-06-20",
  headline: "EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.",
  summary_markdown: "**4 high-impact events overnight.** The EU AI Act Article 6 enforcement window opened at 00:00 CET, directly impacting any fintech using ML for credit decisions. Stripe quietly increased ACH transaction fees from $0.80 to $0.90 (effective today). Adyen launched a new Embedded Finance API targeting your SMB segment. Reddit r/fintech sentiment around fraud-detection vendors dropped 18 points week-over-week.",
  threat_level: 73,
  events: [
    {
      pillar: "policy",
      title: "EU AI Act Article 6 enforcement begins today",
      summary: "High-risk AI systems used in credit scoring now require conformity assessment + CE marking. Penalties up to 7% of global turnover. Your underwriting models likely fall under Annex III.",
      severity: 92,
      high_impact: true,
      source_url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      source_name: "EUR-Lex Official Journal",
      detected_at: "2026-06-20T00:14:00Z",
      tags: ["EU", "AI Act", "credit-scoring", "compliance"],
    },
    {
      pillar: "competitor",
      title: "Stripe raises ACH transaction fees 12.5%",
      summary: "Stripe quietly updated US pricing page: ACH fees moved from $0.80 → $0.90 per transaction. No public announcement. Detected via pricing-page diff at 03:42 UTC.",
      severity: 81,
      high_impact: true,
      source_url: "https://stripe.com/pricing",
      source_name: "stripe.com/pricing",
      detected_at: "2026-06-20T03:42:00Z",
      tags: ["pricing", "ACH", "stripe"],
    },
    {
      pillar: "competitor",
      title: "Adyen launches Embedded Finance API for SMBs",
      summary: "New product page live. Targets <$10M ARR fintechs — direct overlap with your ICP. Launch tweet from CEO at 06:11 UTC has 2.4k likes.",
      severity: 76,
      high_impact: true,
      source_url: "https://adyen.com/embedded-finance",
      source_name: "Adyen Newsroom",
      detected_at: "2026-06-20T06:11:00Z",
      tags: ["product-launch", "embedded-finance", "adyen"],
    },
    {
      pillar: "sentiment",
      title: "Fraud-detection vendor sentiment drops 18pts on r/fintech",
      summary: "Aggregated 47 Reddit threads over 7 days. Net sentiment around 'fraud false positives' moved from +24 to +6. Top complaint: 'too many legit txns blocked'.",
      severity: 71,
      high_impact: true,
      source_url: "https://reddit.com/r/fintech",
      source_name: "Reddit r/fintech",
      detected_at: "2026-06-20T02:30:00Z",
      tags: ["sentiment", "fraud", "reddit"],
    },
    {
      pillar: "competitor",
      title: "Checkout.com posts 4 senior ML eng roles in Berlin",
      summary: "Job board diff: 4 new 'Staff ML Engineer, Risk' postings in Berlin. Signals model-team buildout. Salary band €140-180k.",
      severity: 54,
      high_impact: false,
      source_url: "https://checkout.com/careers",
      source_name: "Checkout.com Careers",
      detected_at: "2026-06-20T01:20:00Z",
      tags: ["hiring", "ml", "checkout"],
    },
    {
      pillar: "policy",
      title: "CFPB issues guidance on overdraft-style 'pay-in-4' products",
      summary: "Consumer Financial Protection Bureau released circular treating BNPL pay-in-4 as 'credit' under TILA. Affects any partner you use for installment products.",
      severity: 68,
      high_impact: false,
      source_url: "https://consumerfinance.gov/compliance/circulars",
      source_name: "CFPB",
      detected_at: "2026-06-20T04:55:00Z",
      tags: ["US", "CFPB", "BNPL"],
    },
    {
      pillar: "sentiment",
      title: "G2 reviews mention 'onboarding friction' up 31%",
      summary: "Across the payments-platform category on G2, mentions of 'onboarding' with negative sentiment rose 31% MoM. Direct opportunity for your faster-KYC pitch.",
      severity: 48,
      high_impact: false,
      source_url: "https://g2.com/categories/payment-processing",
      source_name: "G2 Crowd",
      detected_at: "2026-06-20T05:02:00Z",
      tags: ["g2", "onboarding", "opportunity"],
    },
    {
      pillar: "policy",
      title: "UK FCA opens consultation on stablecoin reserves",
      summary: "Comment window closes Aug 14. If you touch GBP-pegged stablecoins, file by then.",
      severity: 41,
      high_impact: false,
      source_url: "https://fca.org.uk/publications/consultation-papers",
      source_name: "UK FCA",
      detected_at: "2026-06-20T07:00:00Z",
      tags: ["UK", "stablecoin", "consultation"],
    },
  ],
  actions: [
    {
      title: "Audit underwriting models for EU AI Act compliance",
      why_now: "Enforcement began 00:00 CET today; 7% global turnover penalty risk.",
      email_draft: "Hi team,\n\nThe EU AI Act enforcement window opened today. Article 6 + Annex III directly cover our credit-decision models. By Friday I need: (1) a model inventory marked high-risk vs limited-risk, (2) a gap-list against the conformity-assessment checklist, (3) a draft CE-marking timeline. Looping in legal — pulling Priya on this.\n\nMoving fast,\n— You",
      slack_message: ":rotating_light: EU AI Act enforcement live. We need a model inventory by EOW. Owners: @priya (legal), @marco (ml). Thread inside.",
      impact: "high",
    },
    {
      title: "Counter Stripe's ACH fee hike in this week's outreach",
      why_now: "Stripe just raised ACH 12.5%; cold leads who balked at our price are now within 5%.",
      email_draft: "Hi {{first_name}},\n\nQuick note — Stripe raised ACH fees yesterday from $0.80 to $0.90 per transaction. For your projected volume that's an extra $14k/year you weren't budgeting for. Our pricing didn't change. Worth a 15-min call this week to compare side-by-side?\n\nHere's an open slot Thursday 2pm ET: [link]\n\nBest,\n— You",
      slack_message: "Sales team: Stripe ACH went $0.80→$0.90 today. Hit the 23 stalled deals in the pipeline with the comparison email (template in #sales-plays). GO.",
      impact: "high",
    },
    {
      title: "Ship 'instant KYC' landing page before Adyen press cycle",
      why_now: "Adyen Embedded Finance launch is fresh; G2 shows 31% rise in onboarding-friction complaints. Window is now.",
      email_draft: "Hi marketing,\n\nTwo signals converged: Adyen launched Embedded Finance for our exact ICP this morning, and G2 sentiment on 'onboarding friction' is up 31% MoM. We have a 5-day window where buyers are evaluating. Can we ship the /instant-kyc page (already designed) by Monday and run $5k LinkedIn against fintech founders?\n\nReply with a yes/no by 5pm.\n\n— You",
      slack_message: "Marketing: ship /instant-kyc page by Mon + $5k LinkedIn boost. Adyen news + G2 sentiment = open window. Decision needed by 5pm today.",
      impact: "medium",
    },
  ],
  kpis: {
    threats_detected: 12,
    opportunities: 4,
    action_items: 3,
    avg_response_time_minutes: 47,
  },
};

// 7-day timeline events for left-rail (Daily Brief)
export const DEMO_TIMELINE = [
  { date: "2026-06-20", pillar: "policy", title: "EU AI Act enforcement begins", severity: 92 },
  { date: "2026-06-20", pillar: "competitor", title: "Stripe ACH +12.5%", severity: 81 },
  { date: "2026-06-19", pillar: "sentiment", title: "G2 onboarding complaints spike", severity: 62 },
  { date: "2026-06-19", pillar: "competitor", title: "Adyen hires VP Product", severity: 55 },
  { date: "2026-06-18", pillar: "policy", title: "CFPB guidance circular", severity: 68 },
  { date: "2026-06-17", pillar: "competitor", title: "Checkout.com Series E rumor", severity: 71 },
  { date: "2026-06-17", pillar: "sentiment", title: "Reddit fraud-tool thread viral", severity: 58 },
  { date: "2026-06-16", pillar: "policy", title: "UK FCA stablecoin consult", severity: 41 },
  { date: "2026-06-15", pillar: "competitor", title: "Stripe Atlas redesign", severity: 33 },
  { date: "2026-06-14", pillar: "sentiment", title: "Twitter buzz: AI underwriting", severity: 47 },
];

// Pricing race chart — 30 day daily snapshots
export const DEMO_PRICING_RACE = (() => {
  const days = 30;
  const out: { date: string; stripe: number; adyen: number; checkout: number; you: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const stripe = i === 0 ? 0.9 : 0.8;
    const adyen = 0.85 + Math.sin(i / 5) * 0.02;
    const checkout = 0.82 + Math.cos(i / 4) * 0.015;
    const you = 0.78;
    out.push({ date, stripe: +stripe.toFixed(3), adyen: +adyen.toFixed(3), checkout: +checkout.toFixed(3), you });
  }
  return out;
})();

// Sentiment volume stacked area (14 days)
export const DEMO_SENTIMENT_VOLUME = (() => {
  const out: { date: string; positive: number; neutral: number; negative: number }[] = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      positive: 40 + Math.floor(Math.sin(i / 3) * 15) + Math.floor(Math.random() * 8),
      neutral: 55 + Math.floor(Math.cos(i / 4) * 10) + Math.floor(Math.random() * 6),
      negative: 25 + Math.floor(Math.sin(i / 2) * 12) + (i < 4 ? 15 : 0) + Math.floor(Math.random() * 5),
    });
  }
  return out;
})();

// Topic bubble cluster (sentiment)
export const DEMO_TOPIC_BUBBLES = [
  { topic: "fraud false positives", mentions: 234, sentiment: -0.62 },
  { topic: "onboarding speed", mentions: 187, sentiment: -0.41 },
  { topic: "developer docs", mentions: 156, sentiment: 0.48 },
  { topic: "support response", mentions: 142, sentiment: -0.28 },
  { topic: "ACH reliability", mentions: 128, sentiment: 0.12 },
  { topic: "pricing transparency", mentions: 119, sentiment: -0.55 },
  { topic: "dashboard UX", mentions: 98, sentiment: 0.31 },
  { topic: "instant settlement", mentions: 87, sentiment: 0.68 },
  { topic: "international fees", mentions: 76, sentiment: -0.39 },
  { topic: "webhooks", mentions: 64, sentiment: 0.21 },
  { topic: "compliance burden", mentions: 58, sentiment: -0.71 },
  { topic: "AI underwriting", mentions: 49, sentiment: -0.18 },
];

// Word cloud phrases
export const DEMO_WORDCLOUD = [
  { text: "fraud", value: 89 },
  { text: "slow onboarding", value: 71 },
  { text: "great docs", value: 64 },
  { text: "expensive", value: 58 },
  { text: "instant payout", value: 52 },
  { text: "false decline", value: 48 },
  { text: "easy API", value: 44 },
  { text: "compliance", value: 41 },
  { text: "Stripe", value: 38 },
  { text: "support sucks", value: 34 },
  { text: "AI Act", value: 31 },
  { text: "embedded finance", value: 29 },
  { text: "BNPL", value: 26 },
  { text: "KYC delay", value: 23 },
  { text: "love the API", value: 21 },
  { text: "webhook fails", value: 18 },
];

// Feature parity matrix
export const DEMO_FEATURE_MATRIX = {
  competitors: ["You", "Stripe", "Adyen", "Checkout.com"],
  features: [
    { name: "Instant KYC (<60s)", values: [true, false, false, true] },
    { name: "ACH transfers", values: [true, true, false, true] },
    { name: "Embedded Finance API", values: [false, true, true, false] },
    { name: "EU AI Act compliant", values: [true, true, true, false] },
    { name: "Stablecoin payouts", values: [true, true, false, false] },
    { name: "BNPL split", values: [false, true, true, true] },
    { name: "<24h dispute resolution", values: [true, false, true, false] },
    { name: "On-platform issuing", values: [false, true, true, true] },
    { name: "Open-source SDK", values: [true, true, false, false] },
    { name: "SOC 2 Type II", values: [true, true, true, true] },
  ],
};

// Policy heatmap regions (lat/lng + activity)
export const DEMO_POLICY_REGIONS = [
  { country: "European Union", lat: 50.85, lng: 4.35, activity: 92, count: 14 },
  { country: "United States", lat: 38.9, lng: -77.04, activity: 78, count: 9 },
  { country: "United Kingdom", lat: 51.5, lng: -0.13, activity: 64, count: 7 },
  { country: "Singapore", lat: 1.35, lng: 103.82, activity: 51, count: 5 },
  { country: "Australia", lat: -35.28, lng: 149.13, activity: 43, count: 4 },
  { country: "Canada", lat: 45.42, lng: -75.7, activity: 38, count: 4 },
  { country: "Japan", lat: 35.68, lng: 139.69, activity: 31, count: 3 },
  { country: "Brazil", lat: -15.8, lng: -47.92, activity: 28, count: 3 },
  { country: "India", lat: 28.61, lng: 77.21, activity: 47, count: 5 },
  { country: "UAE", lat: 24.45, lng: 54.39, activity: 36, count: 3 },
];

// Globe pulse dots (worldwide regulation deltas)
export const DEMO_GLOBE_DOTS = DEMO_POLICY_REGIONS.map((r) => ({
  lat: r.lat,
  lng: r.lng,
  size: r.activity / 100,
  color: r.activity > 70 ? "#06b6d4" : r.activity > 45 ? "#f97316" : "#ec4899",
  label: `${r.country}: ${r.count} changes`,
}));

// Credit usage ledger for Credit Meter widget
export const DEMO_CREDIT_LEDGER = {
  budget: 150,
  used: 47,
  breakdown: [
    { endpoint: "agentic-search (daily brief)", credits: 15, count: 2, ts: "2026-06-20T06:00:00Z" },
    { endpoint: "url-scraper (competitor pricing)", credits: 1, count: 18, ts: "2026-06-20T07:00:00Z" },
    { endpoint: "agentic-search (Ask RealityPulse)", credits: 3, count: 4, ts: "2026-06-20T08:14:00Z" },
    { endpoint: "embeddings (NVIDIA, free tier)", credits: 0, count: 47, ts: "2026-06-20T06:02:00Z" },
  ],
};
