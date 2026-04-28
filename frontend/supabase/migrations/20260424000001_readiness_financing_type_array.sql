-- =============================================================================
-- Convert activity_readiness_config.financing_type from TEXT to TEXT[]
-- =============================================================================
-- Allows a project to be tagged with multiple financing types at once
-- (e.g. blended loan + grant). Existing scalar values are preserved by
-- wrapping them in a single-element array.
-- =============================================================================

BEGIN;

-- Drop the legacy CHECK constraint (values were stale anyway)
ALTER TABLE activity_readiness_config
  DROP CONSTRAINT IF EXISTS activity_readiness_config_financing_type_check;

-- Convert column type: TEXT -> TEXT[]; existing non-null scalars become single-element arrays
ALTER TABLE activity_readiness_config
  ALTER COLUMN financing_type TYPE TEXT[]
  USING CASE
    WHEN financing_type IS NULL OR financing_type = '' THEN NULL
    ELSE ARRAY[financing_type]
  END;

-- New array-aware CHECK: every element must be a known financing type
ALTER TABLE activity_readiness_config
  ADD CONSTRAINT activity_readiness_config_financing_type_check
  CHECK (
    financing_type IS NULL
    OR financing_type <@ ARRAY['grant','loan','technical_assistance','reimbursable','investment_guarantee']::text[]
  );

COMMIT;
