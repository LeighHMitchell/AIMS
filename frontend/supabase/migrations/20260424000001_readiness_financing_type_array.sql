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

-- Idempotent type conversion: only convert if still TEXT.
-- Wrapping in DO ... avoids the "malformed array literal" error that
-- ALTER COLUMN ... TYPE TEXT[] USING ... raises when the column is
-- already TEXT[] (Postgres re-types the USING expression's column ref
-- to the target type, which makes "= ''" fail because '' is not a
-- valid array literal).
DO $$
DECLARE
  current_udt text;
BEGIN
  SELECT udt_name
  INTO current_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'activity_readiness_config'
    AND column_name = 'financing_type';

  IF current_udt = 'text' THEN
    -- Currently scalar TEXT — convert to TEXT[] preserving existing values.
    EXECUTE $sql$
      ALTER TABLE activity_readiness_config
        ALTER COLUMN financing_type TYPE TEXT[]
        USING CASE
          WHEN financing_type IS NULL OR financing_type = '' THEN NULL
          ELSE ARRAY[financing_type]
        END
    $sql$;
  ELSIF current_udt IN ('_text', 'text[]') THEN
    -- Already TEXT[] — nothing to do.
    NULL;
  ELSE
    RAISE EXCEPTION
      'Unexpected udt_name % on activity_readiness_config.financing_type — expected text or text[]',
      current_udt;
  END IF;
END
$$;

-- New array-aware CHECK: every element must be a known financing type.
-- Idempotent: drop again in case a previous partial run left an
-- intermediate version.
ALTER TABLE activity_readiness_config
  DROP CONSTRAINT IF EXISTS activity_readiness_config_financing_type_check;

ALTER TABLE activity_readiness_config
  ADD CONSTRAINT activity_readiness_config_financing_type_check
  CHECK (
    financing_type IS NULL
    OR financing_type <@ ARRAY['grant','loan','technical_assistance','reimbursable','investment_guarantee']::text[]
  );

COMMIT;
