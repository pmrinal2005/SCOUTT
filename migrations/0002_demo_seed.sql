-- =====================================================================
-- SCOUTT — Demo tenant seed.
-- Run AFTER 0001_initial_schema.sql.
-- Idempotent — safe to re-run.
-- =====================================================================

-- 1) Tenant
INSERT INTO tenants (id, name, industry, region, competitor_domains, pillars_enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Fintech',
  'B2B SaaS Fintech',
  'United States + EU',
  ARRAY['stripe.com','adyen.com','checkout.com'],
  ARRAY['policy','competitor','sentiment','pricing','features','hiring']
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      industry = EXCLUDED.industry,
      region = EXCLUDED.region,
      competitor_domains = EXCLUDED.competitor_domains,
      pillars_enabled = EXCLUDED.pillars_enabled,
      updated_at = NOW();

-- 2) Today's Daily Battle Brief (full JSONB matching src/demo-data.ts)
INSERT INTO briefings (tenant_id, briefing_date, anakin_job_id, credits_spent, generated_json)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'demo-job-0001',
  15,
  $json${
    "briefing_date": "2026-06-20",
    "headline": "EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.",
    "summary_markdown": "**4 high-impact events overnight.** The EU AI Act Article 6 enforcement window opened at 00:00 CET, directly impacting any fintech using ML for credit decisions. Stripe quietly increased ACH transaction fees from $0.80 to $0.90 (effective today). Adyen launched a new Embedded Finance API targeting your SMB segment. Reddit r/fintech sentiment around fraud-detection vendors dropped 18 points week-over-week.",
    "threat_level": 73,
    "events": [
      {"pillar":"policy","title":"EU AI Act Article 6 enforcement begins today","summary":"High-risk AI systems used in credit scoring now require conformity assessment + CE marking. Penalties up to 7% of global turnover. Your underwriting models likely fall under Annex III.","severity":92,"high_impact":true,"source_url":"https://eur-lex.europa.eu/eli/reg/2024/1689/oj","source_name":"EUR-Lex Official Journal","detected_at":"2026-06-20T00:14:00Z","tags":["EU","AI Act","credit-scoring","compliance"]},
      {"pillar":"competitor","title":"Stripe raises ACH transaction fees 12.5%","summary":"Stripe quietly updated US pricing page: ACH fees moved from $0.80 → $0.90 per transaction. No public announcement. Detected via pricing-page diff at 03:42 UTC.","severity":81,"high_impact":true,"source_url":"https://stripe.com/pricing","source_name":"stripe.com/pricing","detected_at":"2026-06-20T03:42:00Z","tags":["pricing","ACH","stripe"]},
      {"pillar":"competitor","title":"Adyen launches Embedded Finance API for SMBs","summary":"New product page live. Targets <$10M ARR fintechs — direct overlap with your ICP. Launch tweet from CEO at 06:11 UTC has 2.4k likes.","severity":76,"high_impact":true,"source_url":"https://adyen.com/embedded-finance","source_name":"Adyen Newsroom","detected_at":"2026-06-20T06:11:00Z","tags":["product-launch","embedded-finance","adyen"]},
      {"pillar":"sentiment","title":"Fraud-detection vendor sentiment drops 18pts on r/fintech","summary":"Aggregated 47 Reddit threads over 7 days. Net sentiment around 'fraud false positives' moved from +24 to +6. Top complaint: 'too many legit txns blocked'.","severity":71,"high_impact":true,"source_url":"https://reddit.com/r/fintech","source_name":"Reddit r/fintech","detected_at":"2026-06-20T02:30:00Z","tags":["sentiment","fraud","reddit"]},
      {"pillar":"competitor","title":"Checkout.com posts 4 senior ML eng roles in Berlin","summary":"Job board diff: 4 new 'Staff ML Engineer, Risk' postings in Berlin. Signals model-team buildout. Salary band €140-180k.","severity":54,"high_impact":false,"source_url":"https://checkout.com/careers","source_name":"Checkout.com Careers","detected_at":"2026-06-20T01:20:00Z","tags":["hiring","ml","checkout"]},
      {"pillar":"policy","title":"CFPB issues guidance on overdraft-style 'pay-in-4' products","summary":"Consumer Financial Protection Bureau released circular treating BNPL pay-in-4 as 'credit' under TILA. Affects any partner you use for installment products.","severity":68,"high_impact":false,"source_url":"https://consumerfinance.gov/compliance/circulars","source_name":"CFPB","detected_at":"2026-06-20T04:55:00Z","tags":["US","CFPB","BNPL"]},
      {"pillar":"sentiment","title":"G2 reviews mention 'onboarding friction' up 31%","summary":"Across the payments-platform category on G2, mentions of 'onboarding' with negative sentiment rose 31% MoM. Direct opportunity for your faster-KYC pitch.","severity":48,"high_impact":false,"source_url":"https://g2.com/categories/payment-processing","source_name":"G2 Crowd","detected_at":"2026-06-20T05:02:00Z","tags":["g2","onboarding","opportunity"]},
      {"pillar":"policy","title":"UK FCA opens consultation on stablecoin reserves","summary":"Comment window closes Aug 14. If you touch GBP-pegged stablecoins, file by then.","severity":41,"high_impact":false,"source_url":"https://fca.org.uk/publications/consultation-papers","source_name":"UK FCA","detected_at":"2026-06-20T07:00:00Z","tags":["UK","stablecoin","consultation"]}
    ],
    "actions": [
      {"title":"Audit underwriting models for EU AI Act compliance","why_now":"Enforcement began 00:00 CET today; 7% global turnover penalty risk.","email_draft":"Hi team,\n\nThe EU AI Act enforcement window opened today. Article 6 + Annex III directly cover our credit-decision models. By Friday I need: (1) a model inventory marked high-risk vs limited-risk, (2) a gap-list against the conformity-assessment checklist, (3) a draft CE-marking timeline. Looping in legal — pulling Priya on this.\n\nMoving fast,\n— You","slack_message":":rotating_light: EU AI Act enforcement live. We need a model inventory by EOW. Owners: @priya (legal), @marco (ml). Thread inside.","impact":"high"},
      {"title":"Counter Stripe's ACH fee hike in this week's outreach","why_now":"Stripe just raised ACH 12.5%; cold leads who balked at our price are now within 5%.","email_draft":"Hi {{first_name}},\n\nQuick note — Stripe raised ACH fees yesterday from $0.80 to $0.90 per transaction. For your projected volume that's an extra $14k/year you weren't budgeting for. Our pricing didn't change. Worth a 15-min call this week to compare side-by-side?\n\nHere's an open slot Thursday 2pm ET: [link]\n\nBest,\n— You","slack_message":"Sales team: Stripe ACH went $0.80→$0.90 today. Hit the 23 stalled deals in the pipeline with the comparison email (template in #sales-plays). GO.","impact":"high"},
      {"title":"Ship 'instant KYC' landing page before Adyen press cycle","why_now":"Adyen Embedded Finance launch is fresh; G2 shows 31% rise in onboarding-friction complaints. Window is now.","email_draft":"Hi marketing,\n\nTwo signals converged: Adyen launched Embedded Finance for our exact ICP this morning, and G2 sentiment on 'onboarding friction' is up 31% MoM. We have a 5-day window where buyers are evaluating. Can we ship the /instant-kyc page (already designed) by Monday and run $5k LinkedIn against fintech founders?\n\nReply with a yes/no by 5pm.\n\n— You","slack_message":"Marketing: ship /instant-kyc page by Mon + $5k LinkedIn boost. Adyen news + G2 sentiment = open window. Decision needed by 5pm today.","impact":"medium"}
    ],
    "kpis": {"threats_detected":12,"opportunities":4,"action_items":3,"avg_response_time_minutes":47}
  }$json$::jsonb
)
ON CONFLICT (tenant_id, briefing_date) DO UPDATE
  SET generated_json = EXCLUDED.generated_json,
      anakin_job_id = EXCLUDED.anakin_job_id,
      credits_spent = EXCLUDED.credits_spent;

-- 3) Unified events feed (one row per event in the briefing above)
INSERT INTO events (tenant_id, pillar, payload, severity, source_url, detected_at, status)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (e->>'pillar')::text,
  e,
  (e->>'severity')::int,
  e->>'source_url',
  (e->>'detected_at')::timestamptz,
  'new'
FROM jsonb_array_elements(
  (SELECT generated_json->'events' FROM briefings
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
    AND briefing_date = CURRENT_DATE)
) AS e
ON CONFLICT DO NOTHING;

-- 4) Credit ledger (matches DEMO_CREDIT_LEDGER in src/demo-data.ts)
INSERT INTO credit_ledger (tenant_id, endpoint, credits_used, job_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'agentic-search (daily brief)', 15, 'demo-job-0001'),
  ('00000000-0000-0000-0000-000000000001', 'agentic-search (daily brief)', 15, 'demo-job-0002'),
  ('00000000-0000-0000-0000-000000000001', 'url-scraper (competitor pricing)', 1, 'demo-scrape-001'),
  ('00000000-0000-0000-0000-000000000001', 'url-scraper (competitor pricing)', 1, 'demo-scrape-002'),
  ('00000000-0000-0000-0000-000000000001', 'url-scraper (competitor pricing)', 1, 'demo-scrape-003'),
  ('00000000-0000-0000-0000-000000000001', 'agentic-search (Ask RealityPulse)', 3, 'demo-ask-001'),
  ('00000000-0000-0000-0000-000000000001', 'agentic-search (Ask RealityPulse)', 3, 'demo-ask-002')
ON CONFLICT DO NOTHING;
