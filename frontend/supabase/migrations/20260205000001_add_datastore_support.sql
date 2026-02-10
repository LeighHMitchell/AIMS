-- Add source_mode to batch tracking (datastore vs xml_upload)
-- Split into two statements for compatibility with ADD COLUMN IF NOT EXISTS
ALTER TABLE iati_import_batches
ADD COLUMN IF NOT EXISTS source_mode VARCHAR(20) DEFAULT 'xml_upload';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'iati_import_batches_source_mode_check'
  ) THEN
    ALTER TABLE iati_import_batches
    ADD CONSTRAINT iati_import_batches_source_mode_check
    CHECK (source_mode IN ('datastore', 'xml_upload'));
  END IF;
END $$;

-- Relax NOT NULL on file-specific fields (datastore imports have no file)
-- These columns were created as nullable (VARCHAR(255) without NOT NULL) in the original migration,
-- but ensure they remain nullable for datastore imports.

-- Cache table to avoid hitting IATI Datastore rate limits (5 calls/min, 100/week on free tier)
CREATE TABLE IF NOT EXISTS iati_datastore_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    query_hash VARCHAR(64) NOT NULL,
    total_activities INTEGER DEFAULT 0,
    response_data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datastore_cache_org ON iati_datastore_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_datastore_cache_hash ON iati_datastore_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_datastore_cache_expires ON iati_datastore_cache(expires_at);

ALTER TABLE iati_datastore_cache ENABLE ROW LEVEL SECURITY;

-- Simple permissive policy — cache operations use the admin client (service role)
-- which bypasses RLS entirely. This policy just ensures authenticated users
-- can also access the cache if needed.
CREATE POLICY "Authenticated users full access" ON iati_datastore_cache
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
