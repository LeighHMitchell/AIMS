-- Test Queries for Organization Data Integrity
-- These queries verify that all activities' created_by_org references exist in the organizations table

-- Test Query 1: Find activities with created_by_org that don't exist in organizations table
-- If this returns any rows, those created_by_org values do not exist in the organizations table
SELECT DISTINCT a.created_by_org, a.id AS activity_id, a.title
FROM activities a
LEFT JOIN organizations o ON a.created_by_org = o.id
WHERE a.created_by_org IS NOT NULL 
  AND o.id IS NULL
ORDER BY a.created_at DESC;

-- Test Query 2: Sample linkage check - Show activities with their creator organization acronyms
-- This helps confirm whether acronyms are correctly being drawn from the organizations table
SELECT 
  a.id,
  a.title,
  o.acronym AS created_by_acronym,
  o.name AS created_by_full_name,
  a.created_at
FROM activities a
JOIN organizations o ON a.created_by_org = o.id
LIMIT 20;

-- Test Query 3: Count activities by organization (showing acronyms)
-- Shows which organizations have created the most activities
SELECT 
  o.acronym,
  o.name,
  COUNT(a.id) AS activity_count
FROM organizations o
LEFT JOIN activities a ON a.created_by_org = o.id
GROUP BY o.id, o.acronym, o.name
HAVING COUNT(a.id) > 0
ORDER BY activity_count DESC
LIMIT 20;

-- Test Query 4: Check for organizations without acronyms
-- These organizations will fall back to showing their full name
SELECT id, name, acronym
FROM organizations
WHERE acronym IS NULL OR acronym = ''
ORDER BY name;

-- Test Query 5: Verify all activity-organization relationships
-- Shows a summary of the data integrity
SELECT 
  COUNT(DISTINCT a.id) AS total_activities,
  COUNT(DISTINCT CASE WHEN a.created_by_org IS NOT NULL THEN a.id END) AS activities_with_org,
  COUNT(DISTINCT CASE WHEN a.created_by_org IS NULL THEN a.id END) AS activities_without_org,
  COUNT(DISTINCT o.id) AS total_organizations_linked,
  COUNT(DISTINCT CASE WHEN o.acronym IS NOT NULL AND o.acronym != '' THEN o.id END) AS orgs_with_acronym
FROM activities a
LEFT JOIN organizations o ON a.created_by_org = o.id; 