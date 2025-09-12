-- IATI Policy Markers Migration
-- Migrates existing policy markers to IATI-compliant structure
-- Based on official IATI Policy Marker codelist: https://iatistandard.org/en/iati-standard/203/codelists/policymarker/

-- =====================================================
-- STEP 1: Add IATI-compliant fields to policy_markers
-- =====================================================

-- Add new IATI-required columns
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;
ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;

-- Update activity_policy_markers to support IATI significance range (0-4)
ALTER TABLE activity_policy_markers ALTER COLUMN score TYPE INTEGER;
ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;
ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_score_check 
  CHECK (score IN (0, 1, 2, 3, 4));

-- Rename score to significance for IATI compliance
ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;

-- =====================================================
-- STEP 2: Insert official IATI Policy Markers
-- =====================================================

-- Insert all 12 official OECD DAC Policy Markers
INSERT INTO policy_markers (code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, is_active, display_order) VALUES
-- IATI Code 1: Gender Equality
('iati_gender_equality', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', '1', '1', true, true, 1),

-- IATI Code 2: Aid to Environment  
('iati_aid_environment', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', '1', '2', true, true, 2),

-- IATI Code 3: Participatory Development/Good Governance
('iati_good_governance', 'Participatory Development/Good Governance', 'Activities that support democratic governance, civil society and participatory development', 'social_governance', '1', '3', true, true, 3),

-- IATI Code 4: Trade Development
('iati_trade_development', 'Trade Development', 'Activities that support trade development and trade capacity building', 'other', '1', '4', true, true, 4),

-- IATI Code 5: Convention on Biological Diversity
('iati_biodiversity', 'Aid Targeting the Objectives of the Convention on Biological Diversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', '1', '5', true, true, 5),

-- IATI Code 6: Climate Change Mitigation
('iati_climate_mitigation', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', '1', '6', true, true, 6),

-- IATI Code 7: Climate Change Adaptation
('iati_climate_adaptation', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', '1', '7', true, true, 7),

-- IATI Code 8: Convention to Combat Desertification
('iati_desertification', 'Aid Targeting the Objectives of the Convention to Combat Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', '1', '8', true, true, 8),

-- IATI Code 9: RMNCH
('iati_rmnch', 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', 'Activities that target reproductive, maternal, newborn and child health objectives', 'social_governance', '1', '9', true, true, 9),

-- IATI Code 10: Disaster Risk Reduction
('iati_drr', 'Disaster Risk Reduction (DRR)', 'Activities that reduce disaster risk and build resilience to natural and human-induced hazards', 'other', '1', '10', true, true, 10),

-- IATI Code 11: Disability
('iati_disability', 'Disability', 'Activities that promote the rights and inclusion of persons with disabilities', 'social_governance', '1', '11', true, true, 11),

-- IATI Code 12: Nutrition
('iati_nutrition', 'Nutrition', 'Activities that address nutrition objectives and food security', 'social_governance', '1', '12', true, true, 12)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  vocabulary = EXCLUDED.vocabulary,
  iati_code = EXCLUDED.iati_code,
  is_iati_standard = EXCLUDED.is_iati_standard,
  updated_at = NOW();

-- =====================================================
-- STEP 3: Update existing markers to link to IATI codes
-- =====================================================

-- Map existing custom markers to IATI equivalents where possible
UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '1',
  is_iati_standard = false
WHERE code = 'gender_equality';

UPDATE policy_markers SET 
  vocabulary = '1', 
  iati_code = '2',
  is_iati_standard = false
WHERE code = 'environment';

UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '3', 
  is_iati_standard = false
WHERE code = 'good_governance';

UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '5',
  is_iati_standard = false  
WHERE code = 'biodiversity';

UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '6',
  is_iati_standard = false
WHERE code = 'climate_mitigation';

UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '7', 
  is_iati_standard = false
WHERE code = 'climate_adaptation';

UPDATE policy_markers SET 
  vocabulary = '1',
  iati_code = '8',
  is_iati_standard = false
WHERE code = 'desertification';

-- Mark other existing markers as custom (vocabulary 99)
UPDATE policy_markers SET 
  vocabulary = '99',
  is_iati_standard = false
WHERE vocabulary IS NULL AND iati_code IS NULL;

-- =====================================================
-- STEP 4: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_policy_markers_vocabulary ON policy_markers(vocabulary);
CREATE INDEX IF NOT EXISTS idx_policy_markers_iati_code ON policy_markers(iati_code);
CREATE INDEX IF NOT EXISTS idx_policy_markers_is_iati_standard ON policy_markers(is_iati_standard);

-- =====================================================
-- STEP 5: Update display order for IATI markers
-- =====================================================

-- Ensure IATI standard markers appear first, ordered by IATI code
UPDATE policy_markers SET display_order = CAST(iati_code AS INTEGER) 
WHERE is_iati_standard = true AND iati_code IS NOT NULL;

-- Move custom markers to end
UPDATE policy_markers SET display_order = display_order + 100 
WHERE is_iati_standard = false OR vocabulary = '99';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify IATI markers were created
SELECT 'IATI Standard Markers Created:' as status, COUNT(*) as count 
FROM policy_markers WHERE is_iati_standard = true;

-- Verify existing markers were mapped  
SELECT 'Existing Markers Mapped:' as status, COUNT(*) as count
FROM policy_markers WHERE is_iati_standard = false AND iati_code IS NOT NULL;

-- Show all markers with their IATI mapping
SELECT 
  code,
  name,
  vocabulary,
  iati_code,
  is_iati_standard,
  marker_type,
  display_order
FROM policy_markers 
ORDER BY is_iati_standard DESC, display_order ASC;
