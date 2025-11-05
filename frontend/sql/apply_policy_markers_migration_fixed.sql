-- =====================================================
-- Policy Markers Schema Migration - FIXED VERSION
-- =====================================================

-- Step 1: Update marker_type constraint to include 'custom'
ALTER TABLE policy_markers DROP CONSTRAINT IF EXISTS policy_markers_marker_type_check;

ALTER TABLE policy_markers ADD CONSTRAINT policy_markers_marker_type_check 
  CHECK (marker_type IN ('environmental', 'social_governance', 'other', 'custom'));

-- Step 2: Add IATI-compliant columns if they don't exist
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;

-- Step 3: Handle score -> significance column migration
DO $$ 
BEGIN
    -- Check if score column exists and rename it if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'activity_policy_markers' 
               AND column_name = 'score') THEN
        
        -- Check if significance column doesn't exist yet
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'activity_policy_markers' 
                       AND column_name = 'significance') THEN
            
            -- Rename score to significance
            ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;
            
            -- Update constraint
            ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;
            ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_significance_check 
              CHECK (significance IN (0, 1, 2, 3, 4));
              
            RAISE NOTICE 'Renamed score column to significance';
        ELSE
            RAISE NOTICE 'Both score and significance columns exist - manual cleanup may be needed';
        END IF;
    ELSE
        -- Ensure significance column exists with proper constraint
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'activity_policy_markers' 
                       AND column_name = 'significance') THEN
            ALTER TABLE activity_policy_markers ADD COLUMN significance INTEGER;
            ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_significance_check 
              CHECK (significance IN (0, 1, 2, 3, 4));
            RAISE NOTICE 'Created significance column';
        ELSE
            -- Update constraint to support 0-4 range
            ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_significance_check;
            ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_significance_check 
              CHECK (significance IN (0, 1, 2, 3, 4));
            RAISE NOTICE 'Updated significance column constraint';
        END IF;
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_policy_markers_vocabulary ON policy_markers(vocabulary);
CREATE INDEX IF NOT EXISTS idx_policy_markers_iati_code ON policy_markers(iati_code);
CREATE INDEX IF NOT EXISTS idx_policy_markers_is_iati_standard ON policy_markers(is_iati_standard);
CREATE INDEX IF NOT EXISTS idx_policy_markers_marker_type ON policy_markers(marker_type);

-- Step 5: Insert/Update IATI standard policy markers
INSERT INTO policy_markers (code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, is_active, display_order) VALUES
-- IATI Code 1: Gender Equality
('1', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', '1', '1', true, true, 1),

-- IATI Code 2: Aid to Environment  
('2', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', '1', '2', true, true, 2),

-- IATI Code 3: Participatory Development/Good Governance
('3', 'Participatory Development/Good Governance', 'Activities that support democratic governance, civil society and participatory development', 'social_governance', '1', '3', true, true, 3),

-- IATI Code 4: Trade Development
('4', 'Trade Development', 'Activities that support trade development and trade capacity building', 'other', '1', '4', true, true, 4),

-- IATI Code 5: Convention on Biological Diversity
('5', 'Aid Targeting the Objectives of the Convention on Biological Diversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', '1', '5', true, true, 5),

-- IATI Code 6: Climate Change Mitigation
('6', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', '1', '6', true, true, 6),

-- IATI Code 7: Climate Change Adaptation
('7', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', '1', '7', true, true, 7),

-- IATI Code 8: Desertification
('8', 'Aid Targeting the Objectives of the Convention to Combat Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', '1', '8', true, true, 8),

-- IATI Code 9: RMNCH
('9', 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', 'Activities that target reproductive, maternal, newborn and child health objectives', 'other', '1', '9', true, true, 9),

-- IATI Code 10: Disaster Risk Reduction
('10', 'Disaster Risk Reduction (DRR)', 'Activities that reduce disaster risk and build resilience to natural and human-induced hazards', 'other', '1', '10', true, true, 10),

-- IATI Code 11: Disability
('11', 'Disability', 'Activities that promote the rights and inclusion of persons with disabilities', 'social_governance', '1', '11', true, true, 11),

-- IATI Code 12: Nutrition
('12', 'Nutrition', 'Activities that address nutrition objectives and food security', 'social_governance', '1', '12', true, true, 12)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  marker_type = EXCLUDED.marker_type,
  vocabulary = EXCLUDED.vocabulary,
  iati_code = EXCLUDED.iati_code,
  is_iati_standard = EXCLUDED.is_iati_standard,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =====================================================
-- Verification Queries (FIXED)
-- =====================================================

-- Show all IATI standard markers
SELECT 
  'IATI Standard Markers' as section,
  code,
  name,
  marker_type,
  vocabulary,
  iati_code,
  is_iati_standard
FROM policy_markers 
WHERE is_iati_standard = true
ORDER BY CAST(iati_code AS INTEGER);

-- Check table structure
SELECT 
  'Table Structure' as section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'activity_policy_markers'
ORDER BY ordinal_position;

-- Check constraints (FIXED QUERY)
SELECT 
  'Constraints' as section,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('policy_markers', 'activity_policy_markers')
  AND tc.constraint_type = 'CHECK';

-- Show summary
SELECT 
  'Summary' as section,
  COUNT(*) as total_policy_markers,
  COUNT(*) FILTER (WHERE is_iati_standard = true) as iati_standard_markers,
  COUNT(*) FILTER (WHERE is_iati_standard = false) as custom_markers
FROM policy_markers;






































