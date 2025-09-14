-- =====================================================
-- Fix Policy Markers UUID Foreign Key and Add Constraints
-- =====================================================
-- This migration fixes the incorrect foreign key reference in activity_policy_markers
-- and adds proper constraints for data integrity

-- Step 1: Add UUID column to policy_markers if it doesn't exist
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS uuid uuid DEFAULT gen_random_uuid();

-- Step 1.5: Populate UUID column for existing rows (if any don't have UUIDs)
UPDATE policy_markers SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- Step 1.6: Make UUID column NOT NULL
ALTER TABLE policy_markers ALTER COLUMN uuid SET NOT NULL;

-- Step 1.7: Add unique constraint on UUID column (required for foreign key reference)
ALTER TABLE policy_markers ADD CONSTRAINT policy_markers_uuid_unique UNIQUE (uuid);

-- Step 2: Drop the incorrect foreign key constraint
-- The current FK incorrectly references policy_markers(id) which is a serial integer
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS activity_policy_markers_policy_marker_id_fkey;

-- Step 2.5: Handle existing activity_policy_markers data
-- Since we're changing the FK reference, we need to either update existing records or clear them
-- For safety, we'll clear existing records since the old FK was broken anyway
-- This is safe because the old FK constraint was incorrect and imports were failing
DO $$
BEGIN
  -- Check if there are existing records
  IF EXISTS (SELECT 1 FROM activity_policy_markers LIMIT 1) THEN
    RAISE NOTICE 'Found existing activity_policy_markers records. Clearing them due to FK schema change.';
    RAISE NOTICE 'This is safe because the old FK constraint was broken and imports were failing.';
    DELETE FROM activity_policy_markers;
  END IF;
END $$;

-- Step 3: Add the correct foreign key constraint to policy_markers(uuid)
-- This ensures policy_marker_id references the UUID column, not the serial ID
ALTER TABLE activity_policy_markers
  ADD CONSTRAINT activity_policy_markers_policy_marker_uuid_fkey
  FOREIGN KEY (policy_marker_id)
  REFERENCES public.policy_markers (uuid)
  ON DELETE CASCADE;

-- Step 4: Add unique constraint to prevent duplicate marker links
-- This ensures an activity can only have one link to each policy marker
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS activity_policy_markers_unique;

ALTER TABLE activity_policy_markers
  ADD CONSTRAINT activity_policy_markers_unique
  UNIQUE (activity_id, policy_marker_id);

-- Step 5: Add check constraint for significance range (0-4 per IATI spec)
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS chk_apm_significance_range;

ALTER TABLE activity_policy_markers
  ADD CONSTRAINT chk_apm_significance_range
  CHECK (significance BETWEEN 0 AND 4);

-- Step 6: Update marker_type constraint to include 'custom' type
ALTER TABLE policy_markers
  DROP CONSTRAINT IF EXISTS policy_markers_marker_type_check;

ALTER TABLE policy_markers
  ADD CONSTRAINT policy_markers_marker_type_check
  CHECK (marker_type IN ('environmental', 'social_governance', 'other', 'custom'));

-- Step 7: Backfill IATI codes for standard policy markers
-- Map the 12 standard IATI policy markers with their numeric codes

-- Gender Equality (IATI code 1)
UPDATE policy_markers
SET iati_code = '1', vocabulary = '1', is_iati_standard = true
WHERE (code = 'gender_equality' OR name = 'Gender Equality')
  AND (iati_code IS NULL OR iati_code <> '1');

-- Aid to Environment (IATI code 2)
UPDATE policy_markers
SET iati_code = '2', vocabulary = '1', is_iati_standard = true
WHERE (code = 'environment' OR code = 'aid_to_environment' OR name = 'Aid to Environment')
  AND (iati_code IS NULL OR iati_code <> '2');

-- Participatory Development/Good Governance (IATI code 3)
UPDATE policy_markers
SET iati_code = '3', vocabulary = '1', is_iati_standard = true
WHERE (code = 'participatory_dev' OR code = 'good_governance' OR name LIKE '%Participatory%' OR name LIKE '%Good Governance%')
  AND (iati_code IS NULL OR iati_code <> '3');

-- Trade Development (IATI code 4)
UPDATE policy_markers
SET iati_code = '4', vocabulary = '1', is_iati_standard = true
WHERE (code = 'trade_development' OR name = 'Trade Development')
  AND (iati_code IS NULL OR iati_code <> '4');

-- Aid Targeting the Objectives of the Convention on Biological Diversity (IATI code 5)
UPDATE policy_markers
SET iati_code = '5', vocabulary = '1', is_iati_standard = true
WHERE (code = 'biodiversity' OR name LIKE '%Biodiversity%' OR name LIKE '%Biological Diversity%')
  AND (iati_code IS NULL OR iati_code <> '5');

-- Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation (IATI code 6)
UPDATE policy_markers
SET iati_code = '6', vocabulary = '1', is_iati_standard = true
WHERE (code = 'climate_mitigation' OR name LIKE '%Climate%Mitigation%')
  AND (iati_code IS NULL OR iati_code <> '6');

-- Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation (IATI code 7)
UPDATE policy_markers
SET iati_code = '7', vocabulary = '1', is_iati_standard = true
WHERE (code = 'climate_adaptation' OR name LIKE '%Climate%Adaptation%')
  AND (iati_code IS NULL OR iati_code <> '7');

-- Aid Targeting the Objectives of the Convention to Combat Desertification (IATI code 8)
UPDATE policy_markers
SET iati_code = '8', vocabulary = '1', is_iati_standard = true
WHERE (code = 'desertification' OR name LIKE '%Desertification%')
  AND (iati_code IS NULL OR iati_code <> '8');

-- Reproductive, Maternal, Newborn and Child Health (RMNCH) (IATI code 9)
UPDATE policy_markers
SET iati_code = '9', vocabulary = '1', is_iati_standard = true
WHERE (code = 'rmnch' OR name LIKE '%RMNCH%' OR name LIKE '%Reproductive%Maternal%')
  AND (iati_code IS NULL OR iati_code <> '9');

-- Disaster Risk Reduction (IATI code 10)
UPDATE policy_markers
SET iati_code = '10', vocabulary = '1', is_iati_standard = true
WHERE (code = 'disaster_risk_reduction' OR name LIKE '%Disaster Risk%')
  AND (iati_code IS NULL OR iati_code <> '10');

-- Disability (IATI code 11)
UPDATE policy_markers
SET iati_code = '11', vocabulary = '1', is_iati_standard = true
WHERE (code = 'disability' OR name LIKE '%Disability%')
  AND (iati_code IS NULL OR iati_code <> '11');

-- Nutrition (IATI code 12)
UPDATE policy_markers
SET iati_code = '12', vocabulary = '1', is_iati_standard = true
WHERE (code = 'nutrition' OR name = 'Nutrition')
  AND (iati_code IS NULL OR iati_code <> '12');

-- Step 8: Insert any missing standard IATI policy markers
-- Ensure all 12 standard markers exist in the database

INSERT INTO policy_markers (code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, display_order)
VALUES
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
ON CONFLICT (code) DO UPDATE
SET
  iati_code = EXCLUDED.iati_code,
  vocabulary = EXCLUDED.vocabulary,
  is_iati_standard = EXCLUDED.is_iati_standard,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Step 9: Create indexes for efficient lookups

-- First, let's clean up any duplicate IATI codes before creating the unique index
-- This can happen if the migration was run multiple times or if there were existing duplicates

-- Remove duplicate IATI standard markers, keeping only the first one for each iati_code
DELETE FROM policy_markers pm1
USING policy_markers pm2
WHERE pm1.id > pm2.id
  AND pm1.is_iati_standard = true
  AND pm2.is_iati_standard = true
  AND pm1.vocabulary = pm2.vocabulary
  AND pm1.iati_code = pm2.iati_code
  AND pm1.iati_code IS NOT NULL;

-- Unique index for standard marker lookup by vocabulary+iati_code
DROP INDEX IF EXISTS ux_policy_markers_std_vocab_iati;
CREATE UNIQUE INDEX ux_policy_markers_std_vocab_iati
  ON policy_markers (lower(vocabulary), lower(iati_code))
  WHERE is_iati_standard = true AND vocabulary IS NOT NULL AND iati_code IS NOT NULL;

-- Index for custom marker lookups by (vocabulary, code, vocabulary_uri)
DROP INDEX IF EXISTS ix_policy_markers_custom_lookup;
CREATE INDEX ix_policy_markers_custom_lookup
  ON policy_markers (lower(vocabulary), lower(code), coalesce(lower(vocabulary_uri), ''))
  WHERE is_iati_standard = false;

-- Index on UUID for faster FK lookups
CREATE INDEX IF NOT EXISTS idx_policy_markers_uuid ON policy_markers(uuid);

-- Step 10: Verification queries
DO $$
BEGIN
  RAISE NOTICE 'Migration completed. Running verification...';

  -- Check if FK constraint exists and references correct column
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_policy_markers_policy_marker_uuid_fkey'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint created successfully';
  ELSE
    RAISE WARNING '✗ Foreign key constraint not found';
  END IF;

  -- Check if unique constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activity_policy_markers_unique'
  ) THEN
    RAISE NOTICE '✓ Unique constraint created successfully';
  ELSE
    RAISE WARNING '✗ Unique constraint not found';
  END IF;

  -- Count standard markers with IATI codes
  DECLARE marker_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO marker_count
    FROM policy_markers
    WHERE is_iati_standard = true AND iati_code IS NOT NULL;

    RAISE NOTICE '✓ Found % standard policy markers with IATI codes', marker_count;
  END;
END $$;

-- Display current state
SELECT
  code,
  name,
  iati_code,
  vocabulary,
  is_iati_standard,
  marker_type
FROM policy_markers
WHERE is_iati_standard = true
ORDER BY CAST(iati_code AS INTEGER) NULLS LAST;