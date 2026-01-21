-- =====================================================
-- Fix Policy Markers Schema for IATI v2.03 Compliance
-- =====================================================
-- This migration ensures the policy_markers and activity_policy_markers tables
-- have all required fields for IATI XML import/export functionality
--
-- Issues addressed:
-- 1. Missing uuid, iati_code, vocabulary, vocabulary_uri, is_iati_standard columns
-- 2. Column name mismatch: 'score' should be 'significance'
-- 3. FK referencing policy_markers(id) instead of policy_markers(uuid)
-- 4. Missing standard IATI policy markers (codes 1-12)

-- Step 1: Add missing columns to policy_markers table
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS default_visibility TEXT DEFAULT 'public';

-- Step 1.5: Populate UUID column for existing rows that don't have UUIDs
UPDATE policy_markers SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Step 1.6: Make UUID column NOT NULL
ALTER TABLE policy_markers ALTER COLUMN uuid SET NOT NULL;

-- Step 1.7: Add unique constraint on UUID column (required for foreign key reference)
-- Check if constraint exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policy_markers_uuid_unique'
  ) THEN
    ALTER TABLE policy_markers ADD CONSTRAINT policy_markers_uuid_unique UNIQUE (uuid);
  END IF;
END $$;

-- Step 2: Handle activity_policy_markers column - add significance if it doesn't exist
DO $$
BEGIN
  -- Check if 'significance' column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_policy_markers' AND column_name = 'significance'
  ) THEN
    -- Check if 'score' column exists (old schema)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'activity_policy_markers' AND column_name = 'score'
    ) THEN
      -- Rename score to significance
      ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;
    ELSE
      -- Add significance column
      ALTER TABLE activity_policy_markers ADD COLUMN significance INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Step 2.5: Add visibility column to activity_policy_markers if not exists
ALTER TABLE activity_policy_markers ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Step 3: Drop the incorrect foreign key constraint
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS activity_policy_markers_policy_marker_id_fkey;

-- Step 3.5: Handle existing activity_policy_markers data
-- Clear records that have invalid policy_marker_id references
DO $$
BEGIN
  -- Delete records where policy_marker_id doesn't match any uuid in policy_markers
  DELETE FROM activity_policy_markers
  WHERE policy_marker_id IS NOT NULL
    AND policy_marker_id::text NOT IN (SELECT uuid::text FROM policy_markers);

  IF FOUND THEN
    RAISE NOTICE 'Cleaned up activity_policy_markers records with invalid policy_marker_id references';
  END IF;
END $$;

-- Step 4: Add the correct foreign key constraint to policy_markers(uuid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_policy_markers_policy_marker_uuid_fkey'
  ) THEN
    ALTER TABLE activity_policy_markers
      ADD CONSTRAINT activity_policy_markers_policy_marker_uuid_fkey
      FOREIGN KEY (policy_marker_id)
      REFERENCES public.policy_markers (uuid)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Add unique constraint to prevent duplicate marker links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_policy_markers_unique'
  ) THEN
    ALTER TABLE activity_policy_markers
      ADD CONSTRAINT activity_policy_markers_unique
      UNIQUE (activity_id, policy_marker_id);
  END IF;
EXCEPTION WHEN unique_violation THEN
  -- If there are duplicates, clean them up first
  DELETE FROM activity_policy_markers a
  USING activity_policy_markers b
  WHERE a.id > b.id
    AND a.activity_id = b.activity_id
    AND a.policy_marker_id = b.policy_marker_id;

  -- Then add the constraint
  ALTER TABLE activity_policy_markers
    ADD CONSTRAINT activity_policy_markers_unique
    UNIQUE (activity_id, policy_marker_id);
END $$;

-- Step 6: Add check constraint for significance range (0-4 per IATI spec)
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS chk_apm_significance_range;

ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;

ALTER TABLE activity_policy_markers
  ADD CONSTRAINT chk_apm_significance_range
  CHECK (significance BETWEEN 0 AND 4);

-- Step 7: Update marker_type constraint to include 'custom' type
ALTER TABLE policy_markers
  DROP CONSTRAINT IF EXISTS policy_markers_marker_type_check;

ALTER TABLE policy_markers
  ADD CONSTRAINT policy_markers_marker_type_check
  CHECK (marker_type IN ('environmental', 'social_governance', 'other', 'custom'));

-- Step 8: Clean up any duplicate (vocabulary, iati_code) combinations BEFORE inserting
-- Keep the one with the most recently updated timestamp or the one with the lowest id
DO $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete duplicate standard markers, keeping only one per (vocabulary, iati_code)
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY lower(vocabulary), lower(iati_code)
             ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
           ) as rn
    FROM policy_markers
    WHERE is_iati_standard = true AND iati_code IS NOT NULL
  )
  DELETE FROM policy_markers
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % duplicate policy markers with same (vocabulary, iati_code)', deleted_count;
  END IF;
END $$;

-- Step 9: Insert or update the 12 standard IATI policy markers
-- Use a smarter approach: update existing by iati_code first, then insert missing ones
DO $$
DECLARE
  marker RECORD;
  existing_id UUID;
BEGIN
  -- Define the 12 standard markers
  FOR marker IN
    SELECT * FROM (VALUES
      ('gender_equality', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', '1', '1', true, 1),
      ('aid_to_environment', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', '1', '2', true, 2),
      ('participatory_development', 'Participatory Development/Good Governance', 'Activities that support democratic governance and civil society', 'social_governance', '1', '3', true, 3),
      ('trade_development', 'Trade Development', 'Activities that build trade capacity and support trade facilitation', 'social_governance', '1', '4', true, 4),
      ('biodiversity', 'Aid Targeting the Objectives of the Convention on Biological Diversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', '1', '5', true, 5),
      ('climate_mitigation', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', '1', '6', true, 6),
      ('climate_adaptation', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', '1', '7', true, 7),
      ('desertification', 'Aid Targeting the Objectives of the Convention to Combat Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', '1', '8', true, 8),
      ('rmnch', 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', 'Activities targeting reproductive, maternal, newborn and child health', 'other', '1', '9', true, 9),
      ('disaster_risk_reduction', 'Disaster Risk Reduction', 'Activities aimed at disaster risk reduction', 'other', '1', '10', true, 10),
      ('disability_inclusion', 'Disability', 'Activities that promote inclusion of persons with disabilities', 'other', '1', '11', true, 11),
      ('nutrition', 'Nutrition', 'Activities that address nutrition outcomes', 'other', '1', '12', true, 12)
    ) AS t(code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, display_order)
  LOOP
    -- Check if marker exists by iati_code (primary lookup for IATI standard markers)
    SELECT id INTO existing_id
    FROM policy_markers
    WHERE iati_code = marker.iati_code AND vocabulary = marker.vocabulary
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      -- Update existing marker
      UPDATE policy_markers
      SET
        is_iati_standard = marker.is_iati_standard,
        display_order = COALESCE(marker.display_order, display_order),
        name = COALESCE(name, marker.name),
        description = COALESCE(description, marker.description),
        marker_type = COALESCE(marker_type, marker.marker_type)
      WHERE id = existing_id;
    ELSE
      -- Check if marker exists by code
      SELECT id INTO existing_id
      FROM policy_markers
      WHERE code = marker.code
      LIMIT 1;

      IF existing_id IS NOT NULL THEN
        -- Update existing marker by code
        UPDATE policy_markers
        SET
          iati_code = marker.iati_code,
          vocabulary = marker.vocabulary,
          is_iati_standard = marker.is_iati_standard,
          display_order = COALESCE(marker.display_order, display_order),
          name = COALESCE(name, marker.name),
          description = COALESCE(description, marker.description),
          marker_type = COALESCE(marker_type, marker.marker_type)
        WHERE id = existing_id;
      ELSE
        -- Insert new marker
        INSERT INTO policy_markers (code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, display_order)
        VALUES (marker.code, marker.name, marker.description, marker.marker_type, marker.vocabulary, marker.iati_code, marker.is_iati_standard, marker.display_order);
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Standard IATI policy markers have been seeded/updated';
END $$;

-- Step 10: Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_policy_markers_uuid ON policy_markers(uuid);
CREATE INDEX IF NOT EXISTS idx_policy_markers_iati_code ON policy_markers(iati_code);
CREATE INDEX IF NOT EXISTS idx_policy_markers_vocabulary ON policy_markers(vocabulary);
CREATE INDEX IF NOT EXISTS idx_policy_markers_is_iati_standard ON policy_markers(is_iati_standard);

-- Step 11: Create unique index for standard marker lookup by vocabulary+iati_code
-- First verify no duplicates remain
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT lower(vocabulary), lower(iati_code), COUNT(*)
    FROM policy_markers
    WHERE is_iati_standard = true AND iati_code IS NOT NULL
    GROUP BY lower(vocabulary), lower(iati_code)
    HAVING COUNT(*) > 1
  ) AS dups;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate (vocabulary, iati_code) combinations. Cannot create unique index.', dup_count;
  END IF;
END $$;

DROP INDEX IF EXISTS ux_policy_markers_std_vocab_iati;
CREATE UNIQUE INDEX ux_policy_markers_std_vocab_iati
  ON policy_markers (lower(vocabulary), lower(iati_code))
  WHERE is_iati_standard = true AND iati_code IS NOT NULL;

-- Index for custom marker lookups
DROP INDEX IF EXISTS ix_policy_markers_custom_lookup;
CREATE INDEX ix_policy_markers_custom_lookup
  ON policy_markers (lower(vocabulary), lower(code), coalesce(lower(vocabulary_uri), ''))
  WHERE is_iati_standard = false;

-- Step 11: Verification
DO $$
DECLARE
  marker_count INTEGER;
BEGIN
  RAISE NOTICE 'Policy markers IATI schema migration completed. Running verification...';

  -- Check if FK constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_policy_markers_policy_marker_uuid_fkey'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint created successfully';
  ELSE
    RAISE WARNING '✗ Foreign key constraint not found';
  END IF;

  -- Count standard markers with IATI codes
  SELECT COUNT(*) INTO marker_count
  FROM policy_markers
  WHERE is_iati_standard = true AND iati_code IS NOT NULL;

  RAISE NOTICE '✓ Found % standard policy markers with IATI codes', marker_count;
END $$;

-- Add helpful comments
COMMENT ON COLUMN policy_markers.uuid IS 'Unique identifier for FK references from activity_policy_markers';
COMMENT ON COLUMN policy_markers.iati_code IS 'IATI standard policy marker code (1-12 for vocabulary 1)';
COMMENT ON COLUMN policy_markers.vocabulary IS 'IATI policy marker vocabulary: 1=OECD DAC CRS, 99=Reporting Organisation';
COMMENT ON COLUMN policy_markers.vocabulary_uri IS 'URI for custom vocabulary (when vocabulary=99)';
COMMENT ON COLUMN policy_markers.is_iati_standard IS 'True for standard IATI policy markers (vocabulary=1, codes 1-12)';
COMMENT ON COLUMN activity_policy_markers.significance IS 'IATI significance code: 0=not targeted, 1=significant objective, 2=principal objective, 3=principal objective AND fundamental to design, 4=explicit primary objective';
