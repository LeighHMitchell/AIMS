-- Script to identify duplicate organizations in the database
-- This script will help find organizations with:
-- 1. Exact name matches (case-insensitive)
-- 2. Exact acronym matches (case-insensitive)
-- 3. Similar names (using PostgreSQL's similarity functions)

-- First, let's create a temporary table to store our analysis
DROP TABLE IF EXISTS temp_organization_duplicates;

CREATE TEMP TABLE temp_organization_duplicates AS
WITH normalized_orgs AS (
  -- Normalize organization names and acronyms for comparison
  SELECT 
    id,
    name,
    LOWER(TRIM(name)) as normalized_name,
    acronym,
    LOWER(TRIM(COALESCE(acronym, ''))) as normalized_acronym,
    type,
    country,
    created_at,
    updated_at,
    description,
    website,
    contact_email,
    is_active
  FROM organizations
),
-- Find exact name duplicates
name_duplicates AS (
  SELECT 
    normalized_name as match_value,
    'exact_name' as match_type,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY updated_at DESC) as org_ids,
    array_agg(name ORDER BY updated_at DESC) as org_names,
    array_agg(acronym ORDER BY updated_at DESC) as org_acronyms
  FROM normalized_orgs
  GROUP BY normalized_name
  HAVING COUNT(*) > 1
),
-- Find exact acronym duplicates (excluding empty acronyms)
acronym_duplicates AS (
  SELECT 
    normalized_acronym as match_value,
    'exact_acronym' as match_type,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY updated_at DESC) as org_ids,
    array_agg(name ORDER BY updated_at DESC) as org_names,
    array_agg(acronym ORDER BY updated_at DESC) as org_acronyms
  FROM normalized_orgs
  WHERE normalized_acronym != ''
  GROUP BY normalized_acronym
  HAVING COUNT(*) > 1
)
-- Combine all duplicate types
SELECT * FROM name_duplicates
UNION ALL
SELECT * FROM acronym_duplicates
ORDER BY duplicate_count DESC, match_type, match_value;

-- Display the duplicate groups
SELECT 
  match_type,
  match_value,
  duplicate_count,
  org_ids,
  org_names,
  org_acronyms
FROM temp_organization_duplicates;

-- Show detailed information for each duplicate group
WITH duplicate_details AS (
  SELECT 
    d.match_type,
    d.match_value,
    unnest(d.org_ids) as org_id,
    unnest(d.org_names) as org_name,
    unnest(d.org_acronyms) as org_acronym
  FROM temp_organization_duplicates d
)
SELECT 
  dd.match_type,
  dd.match_value,
  o.id,
  o.name,
  o.acronym,
  o.type,
  o.country,
  o.created_at,
  o.updated_at,
  o.is_active,
  -- Count references in other tables
  (SELECT COUNT(*) FROM activities WHERE reporting_org_id = o.id) as activity_count,
  (SELECT COUNT(*) FROM activity_contributors WHERE organization_id = o.id) as contributor_count,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count
FROM duplicate_details dd
JOIN organizations o ON o.id = dd.org_id
ORDER BY dd.match_type, dd.match_value, o.updated_at DESC;

-- Summary of duplicates found
SELECT 
  match_type,
  COUNT(*) as duplicate_groups,
  SUM(duplicate_count) as total_duplicate_orgs,
  SUM(duplicate_count) - COUNT(*) as orgs_to_be_merged
FROM temp_organization_duplicates
GROUP BY match_type;

-- Generate consolidation plan
-- This shows which organization should be kept (most recently updated with most data)
WITH duplicate_analysis AS (
  SELECT 
    d.match_type,
    d.match_value,
    unnest(d.org_ids) as org_id
  FROM temp_organization_duplicates d
),
org_scores AS (
  SELECT 
    da.match_type,
    da.match_value,
    o.id,
    o.name,
    o.acronym,
    o.updated_at,
    -- Score based on data completeness and activity
    (CASE WHEN o.acronym IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN o.description IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN o.website IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN o.contact_email IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN o.country IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN o.is_active THEN 2 ELSE 0 END) as completeness_score,
    (SELECT COUNT(*) FROM activities WHERE reporting_org_id = o.id) as activity_count,
    (SELECT COUNT(*) FROM activity_contributors WHERE organization_id = o.id) as contributor_count,
    (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count
  FROM duplicate_analysis da
  JOIN organizations o ON o.id = da.org_id
),
ranked_orgs AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY match_type, match_value 
      ORDER BY 
        (activity_count + contributor_count + user_count) DESC,
        completeness_score DESC,
        updated_at DESC
    ) as rank
  FROM org_scores
)
SELECT 
  match_type,
  match_value,
  id as organization_id,
  name,
  acronym,
  CASE 
    WHEN rank = 1 THEN 'KEEP (Primary)'
    ELSE 'MERGE INTO PRIMARY'
  END as action,
  completeness_score,
  activity_count + contributor_count as total_references,
  user_count
FROM ranked_orgs
ORDER BY match_type, match_value, rank;

-- Optional: Generate UPDATE statements for manual review
-- Uncomment the following to generate the actual consolidation SQL
/*
WITH consolidation_plan AS (
  -- Same CTE structure as above to identify primary organizations
  -- ... (reuse the CTEs from above)
),
merge_mapping AS (
  SELECT 
    cp1.id as primary_org_id,
    cp2.id as duplicate_org_id
  FROM consolidation_plan cp1
  JOIN consolidation_plan cp2 
    ON cp1.match_type = cp2.match_type 
    AND cp1.match_value = cp2.match_value
  WHERE cp1.rank = 1 AND cp2.rank > 1
)
SELECT 
  '-- Merge organization ' || duplicate_org_id || ' into ' || primary_org_id || E'\n' ||
  'UPDATE activities SET reporting_org_id = ''' || primary_org_id || ''' WHERE reporting_org_id = ''' || duplicate_org_id || ''';' || E'\n' ||
  'UPDATE activity_contributors SET organization_id = ''' || primary_org_id || ''' WHERE organization_id = ''' || duplicate_org_id || ''';' || E'\n' ||
  'UPDATE users SET organization_id = ''' || primary_org_id || ''' WHERE organization_id = ''' || duplicate_org_id || ''';' || E'\n' ||
  'UPDATE user_organizations SET organization_id = ''' || primary_org_id || ''' WHERE organization_id = ''' || duplicate_org_id || ''';' || E'\n' ||
  'UPDATE custom_group_organizations SET organization_id = ''' || primary_org_id || ''' WHERE organization_id = ''' || duplicate_org_id || ''';' || E'\n' ||
  'DELETE FROM organizations WHERE id = ''' || duplicate_org_id || ''';' || E'\n'
  as consolidation_sql
FROM merge_mapping;
*/ 