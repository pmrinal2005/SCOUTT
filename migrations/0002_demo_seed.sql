-- =====================================================================
-- RealityPulse — Demo tenant seed (pre-loaded so judges hit ?demo=true
-- and immediately see the Pulse Wheel, timeline, and KPIs).
-- =====================================================================

INSERT INTO tenants (id, name, industry, region, competitor_domains, pillars_enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Fintech',
  'B2B SaaS Fintech',
  'United States + EU',
  ARRAY['stripe.com','adyen.com','checkout.com'],
  ARRAY['policy','competitor','sentiment','pricing','features','hiring']
)
ON CONFLICT (id) DO NOTHING;

-- Today's Daily Battle Brief (matches DEMO_BRIEFING in src/demo-data.ts)
INSERT INTO briefings (tenant_id, briefing_date, anakin_job_id, credits_spent, generated_json)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'demo-job-0001',
  15,
  '{"briefing_date":"2026-06-20","headline":"EU AI Act enforcement begins; Stripe raises ACH fees 12%; sentiment around fraud tools sours.","threat_level":73,"events":[]}'::jsonb
)
ON CONFLICT (tenant_id, briefing_date) DO NOTHING;

-- One credit ledger row to populate the Credit Meter widget
INSERT INTO credit_ledger (tenant_id, endpoint, credits_used, job_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'agentic-search', 15, 'demo-job-0001'),
  ('00000000-0000-0000-0000-000000000001', 'url-scraper', 1, 'demo-scrape-0001'),
  ('00000000-0000-0000-0000-000000000001', 'url-scraper', 1, 'demo-scrape-0002'),
  ('00000000-0000-0000-0000-000000000001', 'agentic-search', 3, 'demo-ask-0001');
