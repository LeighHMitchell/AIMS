-- Diagnostic query to find duplicate iati_org_id values in organizations table
-- Run this in Supabase SQL Editor to identify the duplicates

-- Find all duplicate iati_org_id values
SELECT 
    iati_org_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as organization_ids,
    STRING_AGG(name, ' | ') as organization_names
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Get detailed information about all organizations with duplicate iati_org_ids
WITH duplicates AS (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
)
SELECT 
    o.id,
    o.name,
    o.acronym,
    o.iati_org_id,
    o.type,
    o.country_represented,
    o.created_at,
    o.updated_at
FROM organizations o
INNER JOIN duplicates d ON o.iati_org_id = d.iati_org_id
ORDER BY o.iati_org_id, o.created_at;

