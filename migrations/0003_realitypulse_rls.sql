-- =====================================================================
-- RealityPulse — RLS policies.
-- The frontend uses the SUPABASE_ANON_KEY (read-only). Writes go through
-- the SERVICE_ROLE_KEY which bypasses RLS automatically.
-- =====================================================================

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE diffs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger         ENABLE ROW LEVEL SECURITY;

-- Public READ on demo tenant only (judges hit /dashboard?demo=true without auth)
CREATE POLICY "demo tenant read" ON tenants
  FOR SELECT USING (id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "demo briefings read" ON briefings
  FOR SELECT USING (tenant_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "demo events read" ON events
  FOR SELECT USING (tenant_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "demo credit read" ON credit_ledger
  FOR SELECT USING (tenant_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "demo snapshots read" ON competitor_snapshots
  FOR SELECT USING (tenant_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "demo diffs read" ON diffs
  FOR SELECT USING (true); -- diffs are joined via snapshot ids; safe to read

CREATE POLICY "demo embeddings read" ON embeddings
  FOR SELECT USING (true);

CREATE POLICY "demo alerts read" ON alerts
  FOR SELECT USING (tenant_id = '00000000-0000-0000-0000-000000000001');
