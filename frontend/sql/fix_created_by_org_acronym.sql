-- Fix activities where created_by_org_acronym contains the full name instead of acronym
-- This will update the created_by_org_acronym field to use the actual acronym from the organizations table

-- First, let's see what we're dealing with
SELECT 
    a.id,
    a.created_by_org_name,
    a.created_by_org_acronym,
    o.name as org_name,
    o.acronym as org_acronym
FROM activities a
LEFT JOIN organizations o ON 
    (a.created_by_org_name = o.name OR a.created_by_org_acronym = o.name)
WHERE 
    a.created_by_org_acronym IS NOT NULL 
    AND a.created_by_org_acronym != ''
    AND LENGTH(a.created_by_org_acronym) > 10  -- Likely a full name, not an acronym
LIMIT 10;

-- Update activities to use the correct acronym
UPDATE activities a
SET created_by_org_acronym = o.acronym
FROM organizations o
WHERE 
    (a.created_by_org_name = o.name OR a.created_by_org_acronym = o.name)
    AND o.acronym IS NOT NULL
    AND o.acronym != ''
    AND (
        a.created_by_org_acronym IS NULL 
        OR a.created_by_org_acronym = ''
        OR LENGTH(a.created_by_org_acronym) > 10  -- Likely a full name, not an acronym
    );

-- For activities that still don't have an acronym, clear the field if it contains a full name
UPDATE activities
SET created_by_org_acronym = NULL
WHERE 
    created_by_org_acronym IS NOT NULL 
    AND LENGTH(created_by_org_acronym) > 10  -- Likely a full name, not an acronym
    AND created_by_org_acronym = created_by_org_name;

-- Show the results
SELECT 
    id,
    title_narrative as title,
    created_by_org_name,
    created_by_org_acronym,
    CASE 
        WHEN created_by_org_acronym IS NOT NULL AND created_by_org_acronym != '' THEN created_by_org_acronym
        WHEN created_by_org_name IS NOT NULL THEN created_by_org_name
        ELSE 'Unknown'
    END as display_name
FROM activities
ORDER BY created_at DESC
LIMIT 20; 