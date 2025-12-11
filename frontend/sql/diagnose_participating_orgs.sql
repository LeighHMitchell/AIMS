-- SQL Queries to Diagnose Participating Organisations Display Issue
-- Run these in Supabase SQL Editor to verify database state
-- Activity: AA-AAA-123456789-ABC123

-- ========================================
-- 1. Check if iati_role_code is populated
-- ========================================
SELECT 
  COUNT(*) as total,
  COUNT(iati_role_code) as with_role_code,
  COUNT(CASE WHEN iati_role_code IS NULL THEN 1 END) as missing_role_code,
  COUNT(CASE WHEN iati_role_code NOT BETWEEN 1 AND 4 THEN 1 END) as invalid_role_code
FROM activity_participating_organizations;

-- ========================================
-- 2. Check role code distribution
-- ========================================
SELECT 
  iati_role_code,
  role_type,
  CASE 
    WHEN iati_role_code = 1 THEN 'Funding'
    WHEN iati_role_code = 2 THEN 'Accountable/Government'
    WHEN iati_role_code = 3 THEN 'Extending'
    WHEN iati_role_code = 4 THEN 'Implementing'
    ELSE 'Invalid/NULL'
  END as role_name,
  COUNT(*) as count
FROM activity_participating_organizations
GROUP BY iati_role_code, role_type
ORDER BY iati_role_code;

-- ========================================
-- 3. Find the test activity
-- ========================================
SELECT 
  id,
  iati_identifier,
  title_narrative,
  activity_status,
  publication_status
FROM activities
WHERE iati_identifier = 'AA-AAA-123456789-ABC123';

-- ========================================
-- 4. Check participating orgs for specific activity
-- Replace 'YOUR_ACTIVITY_ID' with the actual UUID from query #3
-- ========================================
SELECT 
  apo.id,
  apo.activity_id,
  apo.organization_id,
  apo.iati_role_code,
  apo.role_type,
  apo.narrative,
  apo.display_order,
  o.name as org_name,
  o.acronym as org_acronym,
  o.iati_org_id as org_iati_id
FROM activity_participating_organizations apo
LEFT JOIN organizations o ON apo.organization_id = o.id
WHERE apo.activity_id IN (
  SELECT id FROM activities WHERE iati_identifier = 'AA-AAA-123456789-ABC123'
)
ORDER BY apo.display_order, apo.iati_role_code;

-- ========================================
-- 5. Check for NULL organization_id issues
-- ========================================
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as null_org_id,
  COUNT(CASE WHEN organization_id IS NULL AND narrative IS NOT NULL THEN 1 END) as null_org_id_with_narrative
FROM activity_participating_organizations;

-- ========================================
-- 6. Check organizations that exist but have no name
-- ========================================
SELECT 
  apo.id,
  apo.activity_id,
  apo.organization_id,
  apo.iati_role_code,
  apo.narrative,
  o.name as org_name,
  o.acronym as org_acronym,
  CASE 
    WHEN o.id IS NULL THEN 'Organization record missing'
    WHEN o.name IS NULL AND o.acronym IS NULL THEN 'Organization has no name/acronym'
    ELSE 'OK'
  END as issue
FROM activity_participating_organizations apo
LEFT JOIN organizations o ON apo.organization_id = o.id
WHERE o.id IS NULL OR (o.name IS NULL AND o.acronym IS NULL)
LIMIT 20;

-- ========================================
-- 7. Get sample of all participating orgs with their data quality
-- ========================================
SELECT 
  a.iati_identifier,
  a.title_narrative,
  apo.iati_role_code,
  apo.role_type,
  apo.narrative,
  o.name as org_name,
  o.acronym as org_acronym,
  CASE 
    WHEN apo.narrative IS NOT NULL THEN 'Has narrative'
    WHEN o.name IS NOT NULL THEN 'Has org name'
    WHEN o.acronym IS NOT NULL THEN 'Has org acronym only'
    ELSE 'NO NAME DATA'
  END as name_source
FROM activity_participating_organizations apo
LEFT JOIN organizations o ON apo.organization_id = o.id
LEFT JOIN activities a ON apo.activity_id = a.id
ORDER BY a.iati_identifier
LIMIT 50;

-- ========================================
-- 8. Check RLS policies (if they might be blocking)
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'activity_participating_organizations';









