-- =====================================================================
-- RealityPulse — Supabase / Postgres schema migration 0001
-- Tables: tenants, briefings, events, competitor_snapshots, diffs,
--         embeddings, alerts, credit_ledger
-- Extensions required: pgvector (for embeddings), pg_cron (hourly scrape)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------- 1. tenants ------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  industry            TEXT NOT NULL,
  region              TEXT NOT NULL,
  competitor_domains  TEXT[] NOT NULL DEFAULT '{}',
  pillars_enabled     TEXT[] NOT NULL DEFAULT ARRAY['policy','competitor','sentiment'],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_industry ON tenants(industry);

-- ---------- 2. briefings (Daily Battle Brief) -------------------------
CREATE TABLE IF NOT EXISTS briefings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  briefing_date   DATE NOT NULL,
  generated_json  JSONB NOT NULL,
  anakin_job_id   TEXT,
  credits_spent   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, briefing_date)
);
CREATE INDEX IF NOT EXISTS idx_briefings_tenant_date ON briefings(tenant_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_json_gin ON briefings USING GIN (generated_json);

-- ---------- 3. events (unified feed) ----------------------------------
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  briefing_id  UUID REFERENCES briefings(id) ON DELETE SET NULL,
  pillar       TEXT NOT NULL CHECK (pillar IN ('policy','competitor','sentiment','action')),
  payload      JSONB NOT NULL,
  severity     INTEGER NOT NULL CHECK (severity BETWEEN 0 AND 100),
  source_url   TEXT,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','seen','dismissed','actioned'))
);
CREATE INDEX IF NOT EXISTS idx_events_tenant_detected ON events(tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_pillar ON events(pillar);

-- ---------- 4. competitor_snapshots (HTML diff source) ----------------
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  competitor_domain  TEXT NOT NULL,
  page_url           TEXT NOT NULL,
  html_hash          TEXT NOT NULL,
  content_md         TEXT NOT NULL,
  scraped_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snap_tenant_url ON competitor_snapshots(tenant_id, page_url, scraped_at DESC);

-- ---------- 5. diffs (detected changes) -------------------------------
CREATE TABLE IF NOT EXISTS diffs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_old  UUID NOT NULL REFERENCES competitor_snapshots(id),
  snapshot_new  UUID NOT NULL REFERENCES competitor_snapshots(id),
  diff_summary  TEXT,
  threat_level  INTEGER CHECK (threat_level BETWEEN 0 AND 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 6. embeddings (pgvector RAG for Ask RealityPulse) ---------
CREATE TABLE IF NOT EXISTS embeddings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  briefing_id  UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  chunk_text   TEXT NOT NULL,
  embedding    vector(768) NOT NULL,        -- NVIDIA NV-Embed-v2 = 768 dims
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- IVFFlat index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_cosine
  ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------- 7. alerts (Slack / email log) -----------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('slack','email','sms','in_app')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- 8. credit_ledger (Anakin spend tracking) ------------------
CREATE TABLE IF NOT EXISTS credit_ledger (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  credits_used  INTEGER NOT NULL,
  job_id        TEXT,
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_tenant_ts ON credit_ledger(tenant_id, ts DESC);

-- ---------- Realtime: enable replication for live dashboard -----------
-- (Supabase Realtime broadcasts INSERTs on these tables to the dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE briefings;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE diffs;
