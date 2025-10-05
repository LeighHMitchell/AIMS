-- Check Multilingual Narratives Data
-- This query helps debug why French narratives aren't showing in the modal

-- Step 1: Check what's actually in the database
SELECT 
    id,
    narrative as "Primary Narrative (English)",
    narrative_lang as "Primary Language",
    narratives as "Multilingual Narratives (JSONB)",
    pg_typeof(narratives) as "Column Type",
    CASE 
        WHEN narratives IS NULL THEN 'NULL'
        WHEN narratives::text = '[]' THEN 'Empty Array'
        WHEN narratives::text = '{}' THEN 'Empty Object'
        ELSE 'Has Data'
    END as "Data Status",
    iati_org_ref as "IATI Ref",
    created_at
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency A%'
   OR narrative LIKE '%Agency B%'
   OR narrative LIKE '%Agency C%'
ORDER BY created_at DESC;

-- Step 2: Check if narratives can be parsed as JSON
SELECT 
    narrative,
    narratives,
    jsonb_array_length(narratives) as "Array Length",
    narratives->0 as "First Narrative",
    narratives->0->>'lang' as "First Lang",
    narratives->0->>'text' as "First Text"
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency A%'
AND narratives IS NOT NULL
AND narratives != 'null'::jsonb;

-- Step 3: Show all narratives in readable format
SELECT 
    narrative as "Organization",
    iati_role_code as "Role",
    narrative as "Primary (English)",
    jsonb_pretty(narratives) as "Multilingual Names (Formatted)"
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency%'
ORDER BY narrative;

-- Step 4: Check for common issues
SELECT 
    'Total participating orgs' as "Check",
    COUNT(*) as "Count"
FROM activity_participating_organizations
UNION ALL
SELECT 
    'Orgs with narratives column populated',
    COUNT(*)
FROM activity_participating_organizations
WHERE narratives IS NOT NULL
UNION ALL
SELECT 
    'Orgs with non-empty narratives array',
    COUNT(*)
FROM activity_participating_organizations
WHERE narratives IS NOT NULL 
AND jsonb_array_length(narratives) > 0
UNION ALL
SELECT 
    'Agency A records',
    COUNT(*)
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency A%';

-- Step 5: If narratives is stored as TEXT instead of JSONB, this will show it
SELECT 
    narrative,
    narratives,
    narratives::text as "As Text",
    length(narratives::text) as "Text Length"
FROM activity_participating_organizations
WHERE narrative LIKE '%Agency A%'
LIMIT 1;

/*
EXPECTED RESULTS FOR AGENCY A:
==============================

Primary Narrative: "Name of Agency A"
Primary Language: "en"
Multilingual Narratives: [{"lang":"fr","text":"Nom de l'agence A"}]
Data Status: "Has Data"
Array Length: 1
First Lang: "fr"
First Text: "Nom de l'agence A"

COMMON ISSUES:
==============

1. narratives = NULL
   → Not imported at all
   → Check snippet parser and import logic

2. narratives = '[]' (empty array)
   → Imported but empty
   → Check snippet parser extraction logic

3. narratives = '{}' (empty object)
   → Wrong data structure
   → Should be array, not object

4. narratives is TEXT not JSONB
   → Wrong column type
   → Need to alter table column type

5. narratives = '"[{\"lang\":\"fr\"...}]"' (double-encoded)
   → JSON.stringify called twice
   → Check API POST handler
*/
