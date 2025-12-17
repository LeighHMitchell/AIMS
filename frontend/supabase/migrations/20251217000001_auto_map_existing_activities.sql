-- Auto-map existing activities to Functional and Administrative budget classifications
-- Based on their DAC sector codes and existing sector_budget_mappings
--
-- This script:
-- 1. Creates country_budget_items entries (vocabulary='4') for activities that don't have them
-- 2. Creates budget_items linking activity sectors to budget classifications
-- 3. Only processes 'functional' and 'administrative' classification types
-- 4. Supports both 5-digit (specific) and 3-digit (category) sector mappings

-- ============================================================================
-- STEP 1: Create country_budget_items for activities that have sectors but no CBI
-- ============================================================================

INSERT INTO country_budget_items (activity_id, vocabulary, mapping_source, auto_mapped_at)
SELECT DISTINCT
  asec.activity_id,
  '4',  -- Country Budget Classification vocabulary
  'auto',
  NOW()
FROM activity_sectors asec
WHERE asec.activity_id NOT IN (
  SELECT activity_id
  FROM country_budget_items
  WHERE vocabulary = '4'
)
AND EXISTS (
  -- Only create CBI if there are mappings available for the activity's sectors
  SELECT 1
  FROM sector_budget_mappings sbm
  JOIN budget_classifications bc ON sbm.budget_classification_id = bc.id
  WHERE (
    sbm.sector_code = asec.sector_code  -- Exact 5-digit match
    OR (sbm.is_category_level = true AND sbm.sector_code = LEFT(asec.sector_code, 3))  -- 3-digit category match
  )
  AND bc.classification_type IN ('functional', 'administrative')
  AND bc.is_active = true
);

-- ============================================================================
-- STEP 2: Create budget_items for FUNCTIONAL classifications
-- ============================================================================
-- Uses a CTE to aggregate percentages when multiple sectors map to the same budget code

WITH functional_mappings AS (
  -- Get all functional mappings for each activity's sectors
  -- Prefer specific 5-digit mappings over category 3-digit mappings
  SELECT DISTINCT ON (cbi.id, bc.code)
    cbi.id as country_budget_items_id,
    bc.code,
    bc.name as budget_name,
    asec.sector_code,
    asec.sector_name,
    asec.percentage as sector_percentage,
    CASE WHEN sbm.sector_code = asec.sector_code THEN 0 ELSE 1 END as mapping_priority
  FROM country_budget_items cbi
  JOIN activity_sectors asec ON asec.activity_id = cbi.activity_id
  JOIN sector_budget_mappings sbm ON (
    sbm.sector_code = asec.sector_code  -- Exact match
    OR (sbm.is_category_level = true AND sbm.sector_code = LEFT(asec.sector_code, 3))  -- Category match
  )
  JOIN budget_classifications bc ON sbm.budget_classification_id = bc.id
  WHERE cbi.vocabulary = '4'
    AND cbi.mapping_source = 'auto'
    AND bc.classification_type = 'functional'
    AND bc.is_active = true
  ORDER BY cbi.id, bc.code, mapping_priority ASC
),
aggregated_functional AS (
  -- Aggregate when multiple sectors map to the same budget code
  SELECT
    country_budget_items_id,
    code,
    MAX(budget_name) as budget_name,
    SUM(sector_percentage) as total_percentage,
    STRING_AGG(DISTINCT sector_code, ',' ORDER BY sector_code) as source_sector_codes,
    STRING_AGG(DISTINCT sector_name, ', ' ORDER BY sector_name) as source_sector_names
  FROM functional_mappings
  GROUP BY country_budget_items_id, code
)
INSERT INTO budget_items (
  country_budget_items_id,
  code,
  percentage,
  description,
  source_sector_code,
  source_sector_name
)
SELECT
  af.country_budget_items_id,
  af.code,
  LEAST(af.total_percentage, 100),  -- Cap at 100%
  jsonb_build_object('en', af.budget_name),
  af.source_sector_codes,
  af.source_sector_names
FROM aggregated_functional af
WHERE NOT EXISTS (
  -- Don't duplicate existing budget items
  SELECT 1
  FROM budget_items bi
  WHERE bi.country_budget_items_id = af.country_budget_items_id
    AND bi.code = af.code
);

-- ============================================================================
-- STEP 3: Create budget_items for ADMINISTRATIVE classifications
-- ============================================================================

WITH admin_mappings AS (
  -- Get all administrative mappings for each activity's sectors
  SELECT DISTINCT ON (cbi.id, bc.code)
    cbi.id as country_budget_items_id,
    bc.code,
    bc.name as budget_name,
    asec.sector_code,
    asec.sector_name,
    asec.percentage as sector_percentage,
    CASE WHEN sbm.sector_code = asec.sector_code THEN 0 ELSE 1 END as mapping_priority
  FROM country_budget_items cbi
  JOIN activity_sectors asec ON asec.activity_id = cbi.activity_id
  JOIN sector_budget_mappings sbm ON (
    sbm.sector_code = asec.sector_code  -- Exact match
    OR (sbm.is_category_level = true AND sbm.sector_code = LEFT(asec.sector_code, 3))  -- Category match
  )
  JOIN budget_classifications bc ON sbm.budget_classification_id = bc.id
  WHERE cbi.vocabulary = '4'
    AND cbi.mapping_source = 'auto'
    AND bc.classification_type = 'administrative'
    AND bc.is_active = true
  ORDER BY cbi.id, bc.code, mapping_priority ASC
),
aggregated_admin AS (
  -- Aggregate when multiple sectors map to the same budget code
  SELECT
    country_budget_items_id,
    code,
    MAX(budget_name) as budget_name,
    SUM(sector_percentage) as total_percentage,
    STRING_AGG(DISTINCT sector_code, ',' ORDER BY sector_code) as source_sector_codes,
    STRING_AGG(DISTINCT sector_name, ', ' ORDER BY sector_name) as source_sector_names
  FROM admin_mappings
  GROUP BY country_budget_items_id, code
)
INSERT INTO budget_items (
  country_budget_items_id,
  code,
  percentage,
  description,
  source_sector_code,
  source_sector_name
)
SELECT
  aa.country_budget_items_id,
  aa.code,
  LEAST(aa.total_percentage, 100),  -- Cap at 100%
  jsonb_build_object('en', aa.budget_name),
  aa.source_sector_codes,
  aa.source_sector_names
FROM aggregated_admin aa
WHERE NOT EXISTS (
  -- Don't duplicate existing budget items
  SELECT 1
  FROM budget_items bi
  WHERE bi.country_budget_items_id = aa.country_budget_items_id
    AND bi.code = aa.code
);

-- ============================================================================
-- STEP 4: Report results
-- ============================================================================

DO $$
DECLARE
  v_activities_mapped INTEGER;
  v_functional_items INTEGER;
  v_admin_items INTEGER;
BEGIN
  -- Count activities that were mapped
  SELECT COUNT(DISTINCT activity_id) INTO v_activities_mapped
  FROM country_budget_items
  WHERE vocabulary = '4' AND mapping_source = 'auto';

  -- Count functional budget items created
  SELECT COUNT(*) INTO v_functional_items
  FROM budget_items bi
  JOIN country_budget_items cbi ON bi.country_budget_items_id = cbi.id
  JOIN budget_classifications bc ON bi.code = bc.code
  WHERE cbi.vocabulary = '4'
    AND cbi.mapping_source = 'auto'
    AND bc.classification_type = 'functional'
    AND bi.source_sector_code IS NOT NULL;

  -- Count administrative budget items created
  SELECT COUNT(*) INTO v_admin_items
  FROM budget_items bi
  JOIN country_budget_items cbi ON bi.country_budget_items_id = cbi.id
  JOIN budget_classifications bc ON bi.code = bc.code
  WHERE cbi.vocabulary = '4'
    AND cbi.mapping_source = 'auto'
    AND bc.classification_type = 'administrative'
    AND bi.source_sector_code IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTO-MAPPING COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Activities mapped: %', v_activities_mapped;
  RAISE NOTICE 'Functional items created: %', v_functional_items;
  RAISE NOTICE 'Administrative items created: %', v_admin_items;
  RAISE NOTICE '========================================';
END $$;
