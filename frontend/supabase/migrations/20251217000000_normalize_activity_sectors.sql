-- Normalize Activity Sector Percentages to 100%
-- This script ensures all activities have sector assignments that sum to exactly 100%
-- For activities without sectors, it intelligently assigns sectors based on title keywords

-- ============================================================================
-- STEP 0a: Temporarily disable triggers that sync to transaction_sector_lines
-- ============================================================================
ALTER TABLE activity_sectors DISABLE TRIGGER trg_sync_activity_sectors_insert;
ALTER TABLE activity_sectors DISABLE TRIGGER trg_sync_activity_sectors_update;
ALTER TABLE activity_sectors DISABLE TRIGGER trg_sync_activity_sectors_delete;

-- ============================================================================
-- STEP 0b: Show current state (diagnostic)
-- ============================================================================

DO $$
DECLARE
  v_activities_no_sectors INTEGER;
  v_activities_not_100 INTEGER;
  v_activities_ok INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_activities_no_sectors
  FROM activities a
  WHERE NOT EXISTS (SELECT 1 FROM activity_sectors s WHERE s.activity_id = a.id);

  SELECT COUNT(DISTINCT a.id) INTO v_activities_not_100
  FROM activities a
  JOIN activity_sectors s ON s.activity_id = a.id
  GROUP BY a.id
  HAVING ABS(SUM(s.percentage) - 100) > 0.01;

  SELECT COUNT(DISTINCT a.id) INTO v_activities_ok
  FROM activities a
  JOIN activity_sectors s ON s.activity_id = a.id
  GROUP BY a.id
  HAVING ABS(SUM(s.percentage) - 100) <= 0.01;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENT STATE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activities with no sectors: %', v_activities_no_sectors;
  RAISE NOTICE 'Activities with sectors != 100%%: %', v_activities_not_100;
  RAISE NOTICE 'Activities already at 100%%: %', v_activities_ok;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Create temporary keyword-to-sector mapping table
-- ============================================================================

CREATE TEMP TABLE keyword_sector_map (
  keyword TEXT,
  sector_code TEXT,
  sector_name TEXT,
  category_code TEXT,
  category_name TEXT,
  priority INTEGER  -- Lower = higher priority (more specific matches)
);

-- Education sectors
INSERT INTO keyword_sector_map VALUES
  ('primary education', '11220', 'Primary education', '112', 'Basic Education', 1),
  ('primary school', '11220', 'Primary education', '112', 'Basic Education', 1),
  ('secondary education', '11320', 'Secondary education', '113', 'Secondary Education', 1),
  ('secondary school', '11320', 'Secondary education', '113', 'Secondary Education', 1),
  ('higher education', '11420', 'Higher education', '114', 'Post-Secondary Education', 1),
  ('university', '11420', 'Higher education', '114', 'Post-Secondary Education', 1),
  ('tertiary', '11420', 'Higher education', '114', 'Post-Secondary Education', 1),
  ('vocational', '11330', 'Vocational training', '113', 'Secondary Education', 1),
  ('teacher training', '11130', 'Teacher training', '111', 'Education, Level Unspecified', 1),
  ('early childhood', '11240', 'Early childhood education', '112', 'Basic Education', 1),
  ('preschool', '11240', 'Early childhood education', '112', 'Basic Education', 1),
  ('education', '11110', 'Education policy and administrative management', '111', 'Education, Level Unspecified', 5),
  ('school', '11220', 'Primary education', '112', 'Basic Education', 5),
  ('learning', '11110', 'Education policy and administrative management', '111', 'Education, Level Unspecified', 6);

-- Health sectors
INSERT INTO keyword_sector_map VALUES
  ('malaria', '12262', 'Malaria control', '122', 'Basic Health', 1),
  ('tuberculosis', '12263', 'Tuberculosis control', '122', 'Basic Health', 1),
  ('tb control', '12263', 'Tuberculosis control', '122', 'Basic Health', 1),
  ('hiv', '13040', 'STD control including HIV/AIDS', '130', 'Population Policies/Programmes & Reproductive Health', 1),
  ('aids', '13040', 'STD control including HIV/AIDS', '130', 'Population Policies/Programmes & Reproductive Health', 1),
  ('immunization', '12250', 'Infectious disease control', '122', 'Basic Health', 1),
  ('vaccination', '12250', 'Infectious disease control', '122', 'Basic Health', 1),
  ('vaccine', '12250', 'Infectious disease control', '122', 'Basic Health', 1),
  ('maternal', '13020', 'Reproductive health care', '130', 'Population Policies/Programmes & Reproductive Health', 1),
  ('reproductive health', '13020', 'Reproductive health care', '130', 'Population Policies/Programmes & Reproductive Health', 1),
  ('family planning', '13030', 'Family planning', '130', 'Population Policies/Programmes & Reproductive Health', 1),
  ('nutrition', '12240', 'Basic nutrition', '122', 'Basic Health', 1),
  ('hospital', '12191', 'Medical services', '121', 'Health, General', 2),
  ('clinic', '12220', 'Basic health care', '122', 'Basic Health', 2),
  ('health care', '12220', 'Basic health care', '122', 'Basic Health', 2),
  ('healthcare', '12220', 'Basic health care', '122', 'Basic Health', 2),
  ('medical', '12191', 'Medical services', '121', 'Health, General', 3),
  ('health', '12110', 'Health policy and administrative management', '121', 'Health, General', 5);

-- Water and Sanitation
INSERT INTO keyword_sector_map VALUES
  ('water supply', '14021', 'Water supply - large systems', '140', 'Water Supply & Sanitation', 1),
  ('drinking water', '14031', 'Basic drinking water supply', '140', 'Water Supply & Sanitation', 1),
  ('sanitation', '14032', 'Basic sanitation', '140', 'Water Supply & Sanitation', 1),
  ('wash', '14030', 'Basic drinking water supply and basic sanitation', '140', 'Water Supply & Sanitation', 2),
  ('sewage', '14022', 'Sanitation - large systems', '140', 'Water Supply & Sanitation', 2),
  ('water', '14010', 'Water sector policy and administrative management', '140', 'Water Supply & Sanitation', 5);

-- Agriculture
INSERT INTO keyword_sector_map VALUES
  ('agriculture', '31110', 'Agricultural policy and administrative management', '311', 'Agriculture', 3),
  ('agricultural', '31110', 'Agricultural policy and administrative management', '311', 'Agriculture', 3),
  ('farming', '31120', 'Agricultural development', '311', 'Agriculture', 2),
  ('livestock', '31163', 'Livestock', '311', 'Agriculture', 1),
  ('fisheries', '31310', 'Fishing policy and administrative management', '313', 'Fishing', 1),
  ('fishing', '31310', 'Fishing policy and administrative management', '313', 'Fishing', 2),
  ('forestry', '31210', 'Forestry policy and administrative management', '312', 'Forestry', 1),
  ('food security', '52010', 'Food assistance', '520', 'Developmental Food Aid/Food Security Assistance', 1),
  ('irrigation', '31140', 'Agricultural water resources', '311', 'Agriculture', 1),
  ('crop', '31161', 'Food crop production', '311', 'Agriculture', 2);

-- Infrastructure and Transport
INSERT INTO keyword_sector_map VALUES
  ('road', '21020', 'Road transport', '210', 'Transport & Storage', 1),
  ('roads', '21020', 'Road transport', '210', 'Transport & Storage', 1),
  ('highway', '21020', 'Road transport', '210', 'Transport & Storage', 1),
  ('bridge', '21020', 'Road transport', '210', 'Transport & Storage', 2),
  ('transport', '21010', 'Transport policy and administrative management', '210', 'Transport & Storage', 3),
  ('transportation', '21010', 'Transport policy and administrative management', '210', 'Transport & Storage', 3),
  ('railway', '21030', 'Rail transport', '210', 'Transport & Storage', 1),
  ('rail', '21030', 'Rail transport', '210', 'Transport & Storage', 2),
  ('airport', '21050', 'Air transport', '210', 'Transport & Storage', 1),
  ('aviation', '21050', 'Air transport', '210', 'Transport & Storage', 1),
  ('port', '21040', 'Water transport', '210', 'Transport & Storage', 2),
  ('infrastructure', '21010', 'Transport policy and administrative management', '210', 'Transport & Storage', 6);

-- Energy
INSERT INTO keyword_sector_map VALUES
  ('renewable energy', '23210', 'Energy generation, renewable sources', '232', 'Energy Generation and Supply', 1),
  ('solar', '23230', 'Solar energy', '232', 'Energy Generation and Supply', 1),
  ('wind energy', '23240', 'Wind energy', '232', 'Energy Generation and Supply', 1),
  ('hydropower', '23220', 'Hydro-electric power plants', '232', 'Energy Generation and Supply', 1),
  ('electricity', '23110', 'Energy policy and administrative management', '231', 'Energy Policy', 2),
  ('power', '23110', 'Energy policy and administrative management', '231', 'Energy Policy', 4),
  ('energy', '23110', 'Energy policy and administrative management', '231', 'Energy Policy', 5);

-- Governance and Civil Society
INSERT INTO keyword_sector_map VALUES
  ('governance', '15110', 'Public sector policy and administrative management', '151', 'Government & Civil Society-General', 2),
  ('public sector', '15110', 'Public sector policy and administrative management', '151', 'Government & Civil Society-General', 1),
  ('public financial management', '15111', 'Public finance management', '151', 'Government & Civil Society-General', 1),
  ('pfm', '15111', 'Public finance management', '151', 'Government & Civil Society-General', 1),
  ('decentralisation', '15112', 'Decentralisation and support to subnational government', '151', 'Government & Civil Society-General', 1),
  ('decentralization', '15112', 'Decentralisation and support to subnational government', '151', 'Government & Civil Society-General', 1),
  ('anti-corruption', '15113', 'Anti-corruption organisations and institutions', '151', 'Government & Civil Society-General', 1),
  ('corruption', '15113', 'Anti-corruption organisations and institutions', '151', 'Government & Civil Society-General', 2),
  ('tax', '15114', 'Domestic revenue mobilisation', '151', 'Government & Civil Society-General', 2),
  ('revenue', '15114', 'Domestic revenue mobilisation', '151', 'Government & Civil Society-General', 3),
  ('legal', '15130', 'Legal and judicial development', '151', 'Government & Civil Society-General', 2),
  ('judicial', '15130', 'Legal and judicial development', '151', 'Government & Civil Society-General', 1),
  ('justice', '15130', 'Legal and judicial development', '151', 'Government & Civil Society-General', 2),
  ('police', '15132', 'Police', '151', 'Government & Civil Society-General', 1),
  ('election', '15151', 'Elections', '151', 'Government & Civil Society-General', 1),
  ('parliament', '15152', 'Legislatures and political parties', '151', 'Government & Civil Society-General', 1),
  ('human rights', '15160', 'Human rights', '151', 'Government & Civil Society-General', 1),
  ('gender', '15170', 'Women''s equality organisations and institutions', '151', 'Government & Civil Society-General', 2),
  ('women', '15170', 'Women''s equality organisations and institutions', '151', 'Government & Civil Society-General', 3),
  ('civil society', '15150', 'Democratic participation and civil society', '151', 'Government & Civil Society-General', 2);

-- Environment
INSERT INTO keyword_sector_map VALUES
  ('climate change', '41010', 'Environmental policy and administrative management', '410', 'General Environment Protection', 1),
  ('climate', '41010', 'Environmental policy and administrative management', '410', 'General Environment Protection', 2),
  ('environment', '41010', 'Environmental policy and administrative management', '410', 'General Environment Protection', 3),
  ('environmental', '41010', 'Environmental policy and administrative management', '410', 'General Environment Protection', 3),
  ('biodiversity', '41030', 'Bio-diversity', '410', 'General Environment Protection', 1),
  ('conservation', '41030', 'Bio-diversity', '410', 'General Environment Protection', 2),
  ('flood', '41050', 'Flood prevention/control', '410', 'General Environment Protection', 1),
  ('disaster', '74010', 'Disaster prevention and preparedness', '740', 'Disaster Prevention & Preparedness', 1),
  ('emergency', '72010', 'Material relief assistance and services', '720', 'Emergency Response', 2);

-- Social Protection
INSERT INTO keyword_sector_map VALUES
  ('social protection', '16010', 'Social Protection', '160', 'Other Social Infrastructure & Services', 1),
  ('social security', '16010', 'Social Protection', '160', 'Other Social Infrastructure & Services', 2),
  ('pension', '16010', 'Social Protection', '160', 'Other Social Infrastructure & Services', 2),
  ('cash transfer', '16010', 'Social Protection', '160', 'Other Social Infrastructure & Services', 1),
  ('employment', '16020', 'Employment creation', '160', 'Other Social Infrastructure & Services', 2),
  ('job', '16020', 'Employment creation', '160', 'Other Social Infrastructure & Services', 3),
  ('housing', '16030', 'Housing policy and administrative management', '160', 'Other Social Infrastructure & Services', 2),
  ('refugee', '72010', 'Material relief assistance and services', '720', 'Emergency Response', 1);

-- Economic sectors
INSERT INTO keyword_sector_map VALUES
  ('trade', '33110', 'Trade policy and administrative management', '331', 'Trade Policies & Regulations', 2),
  ('export', '33120', 'Trade facilitation', '331', 'Trade Policies & Regulations', 2),
  ('import', '33120', 'Trade facilitation', '331', 'Trade Policies & Regulations', 2),
  ('sme', '32130', 'Small and medium-sized enterprises (SME) development', '321', 'Industry', 1),
  ('small business', '32130', 'Small and medium-sized enterprises (SME) development', '321', 'Industry', 1),
  ('enterprise', '32130', 'Small and medium-sized enterprises (SME) development', '321', 'Industry', 3),
  ('private sector', '25010', 'Business support services and institutions', '250', 'Business & Other Services', 2),
  ('banking', '24010', 'Financial policy and administrative management', '240', 'Banking & Financial Services', 2),
  ('financial', '24010', 'Financial policy and administrative management', '240', 'Banking & Financial Services', 3),
  ('microfinance', '24040', 'Informal/semi-formal financial intermediaries', '240', 'Banking & Financial Services', 1),
  ('tourism', '33210', 'Tourism policy and administrative management', '332', 'Tourism', 2),
  ('mining', '32220', 'Mineral/mining policy and administrative management', '322', 'Mineral Resources & Mining', 2);

-- Budget Support
INSERT INTO keyword_sector_map VALUES
  ('budget support', '51010', 'General budget support-related aid', '510', 'General Budget Support', 1),
  ('general budget', '51010', 'General budget support-related aid', '510', 'General Budget Support', 1);

-- ============================================================================
-- STEP 2: Normalize existing sectors to sum to 100%
-- ============================================================================

WITH activity_totals AS (
  SELECT activity_id, SUM(percentage) as current_total
  FROM activity_sectors
  GROUP BY activity_id
  HAVING ABS(SUM(percentage) - 100) > 0.01
),
normalized_sectors AS (
  SELECT
    s.id,
    s.activity_id,
    s.percentage as old_percentage,
    CASE
      WHEN t.current_total > 0 THEN ROUND((s.percentage / t.current_total) * 100, 2)
      ELSE s.percentage
    END as new_percentage
  FROM activity_sectors s
  JOIN activity_totals t ON t.activity_id = s.activity_id
)
UPDATE activity_sectors
SET percentage = ns.new_percentage, updated_at = NOW()
FROM normalized_sectors ns
WHERE activity_sectors.id = ns.id AND activity_sectors.percentage != ns.new_percentage;

-- ============================================================================
-- STEP 3: Fix rounding errors
-- ============================================================================

WITH activity_sums AS (
  SELECT activity_id, SUM(percentage) as total
  FROM activity_sectors
  GROUP BY activity_id
  HAVING ABS(SUM(percentage) - 100) > 0.001 AND ABS(SUM(percentage) - 100) < 1
),
largest_sectors AS (
  SELECT DISTINCT ON (s.activity_id)
    s.id, s.activity_id, s.percentage, a.total
  FROM activity_sectors s
  JOIN activity_sums a ON a.activity_id = s.activity_id
  ORDER BY s.activity_id, s.percentage DESC
)
UPDATE activity_sectors
SET percentage = ls.percentage + (100 - ls.total), updated_at = NOW()
FROM largest_sectors ls
WHERE activity_sectors.id = ls.id;

-- ============================================================================
-- STEP 4: Assign sectors to activities with NO sectors based on title keywords
-- ============================================================================

WITH activities_no_sectors AS (
  -- Get activities that have no sectors assigned
  SELECT a.id as activity_id, LOWER(COALESCE(a.title_narrative, '')) as title_lower
  FROM activities a
  WHERE NOT EXISTS (SELECT 1 FROM activity_sectors s WHERE s.activity_id = a.id)
),
matched_sectors AS (
  -- Match keywords to sectors, taking the best (lowest priority) match for each activity
  SELECT DISTINCT ON (ans.activity_id)
    ans.activity_id,
    ksm.sector_code,
    ksm.sector_name,
    ksm.category_code,
    ksm.category_name,
    ksm.priority
  FROM activities_no_sectors ans
  JOIN keyword_sector_map ksm ON ans.title_lower LIKE '%' || ksm.keyword || '%'
  ORDER BY ans.activity_id, ksm.priority ASC
),
unmatched_activities AS (
  -- Activities that didn't match any keyword - assign default
  SELECT ans.activity_id
  FROM activities_no_sectors ans
  WHERE NOT EXISTS (SELECT 1 FROM matched_sectors ms WHERE ms.activity_id = ans.activity_id)
)
-- Insert matched sectors
INSERT INTO activity_sectors (
  activity_id, sector_code, sector_name, percentage, level,
  category_code, category_name, type, created_at, updated_at
)
SELECT
  ms.activity_id,
  ms.sector_code,
  ms.sector_name,
  100,
  'sector',
  ms.category_code,
  ms.category_name,
  'primary',
  NOW(),
  NOW()
FROM matched_sectors ms;

-- Insert default sector for activities that couldn't be matched
INSERT INTO activity_sectors (
  activity_id, sector_code, sector_name, percentage, level,
  category_code, category_name, type, created_at, updated_at
)
SELECT
  ua.activity_id,
  '99810',
  'Sectors not specified',
  100,
  'sector',
  '998',
  'Unallocated / Unspecified',
  'primary',
  NOW(),
  NOW()
FROM (
  SELECT a.id as activity_id
  FROM activities a
  WHERE NOT EXISTS (SELECT 1 FROM activity_sectors s WHERE s.activity_id = a.id)
) ua;

-- ============================================================================
-- STEP 5: Report results
-- ============================================================================

DO $$
DECLARE
  v_total_activities INTEGER;
  v_activities_at_100 INTEGER;
  v_default_added INTEGER;
  v_keyword_matched INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_activities FROM activities;

  SELECT COUNT(DISTINCT a.id) INTO v_activities_at_100
  FROM activities a
  JOIN activity_sectors s ON s.activity_id = a.id
  GROUP BY a.id
  HAVING ABS(SUM(s.percentage) - 100) <= 0.01;

  SELECT COUNT(DISTINCT activity_id) INTO v_default_added
  FROM activity_sectors
  WHERE sector_code = '99810' AND created_at > NOW() - INTERVAL '5 minutes';

  SELECT COUNT(DISTINCT activity_id) INTO v_keyword_matched
  FROM activity_sectors
  WHERE sector_code != '99810' AND created_at > NOW() - INTERVAL '5 minutes';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'NORMALIZATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total activities: %', v_total_activities;
  RAISE NOTICE 'Activities now at 100%%: %', v_activities_at_100;
  RAISE NOTICE 'Activities matched by keyword: %', v_keyword_matched;
  RAISE NOTICE 'Activities given default sector: %', v_default_added;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 6: Re-enable triggers
-- ============================================================================

ALTER TABLE activity_sectors ENABLE TRIGGER trg_sync_activity_sectors_insert;
ALTER TABLE activity_sectors ENABLE TRIGGER trg_sync_activity_sectors_update;
ALTER TABLE activity_sectors ENABLE TRIGGER trg_sync_activity_sectors_delete;

-- Clean up temp table
DROP TABLE IF EXISTS keyword_sector_map;
