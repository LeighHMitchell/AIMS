-- Fix duplicate iati_org_id values BEFORE running alias migrations
-- Strategy: Keep the most recently updated organization for each duplicate iati_org_id
--           and set the others' iati_org_id to NULL

-- STEP 1: First, let's see what we're dealing with
-- Run this to identify duplicates:
/*
SELECT 
    iati_org_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as organization_names
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
*/

-- STEP 2: If you're okay with the strategy below, run this cleanup
-- Strategy: For each duplicate iati_org_id, keep the most recently updated one
--           and set the rest to NULL (they'll still exist but without the IATI ID)

DO $$
DECLARE
    duplicate_record RECORD;
    org_to_keep_id UUID;
    org_to_keep_name TEXT;
    duplicate_count INTEGER;
BEGIN
    -- Loop through each duplicate iati_org_id
    FOR duplicate_record IN 
        SELECT iati_org_id, COUNT(*) as dup_count
        FROM organizations
        WHERE iati_org_id IS NOT NULL
        GROUP BY iati_org_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'Processing duplicate iati_org_id: %', duplicate_record.iati_org_id;
        RAISE NOTICE 'Found % organizations with this ID', duplicate_record.dup_count;
        
        -- Find the organization to keep (most recently updated)
        SELECT id, name INTO org_to_keep_id, org_to_keep_name
        FROM organizations
        WHERE iati_org_id = duplicate_record.iati_org_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1;
        
        RAISE NOTICE 'Keeping: % (ID: %)', org_to_keep_name, org_to_keep_id;
        
        -- Clear iati_org_id for duplicates (keep them in DB but without IATI ID)
        UPDATE organizations
        SET iati_org_id = NULL
        WHERE iati_org_id = duplicate_record.iati_org_id
        AND id != org_to_keep_id;
        
        GET DIAGNOSTICS duplicate_count = ROW_COUNT;
        RAISE NOTICE 'Cleared iati_org_id for % duplicate organization(s)', duplicate_count;
        
    END LOOP;
    
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Duplicate cleanup complete!';
    RAISE NOTICE 'You can now run the alias migrations.';
END $$;

-- STEP 3: Verify no duplicates remain
SELECT 
    'Verification: Remaining duplicates' as check_type,
    COUNT(*) as duplicate_groups
FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
) sub;
-- Should show 0 duplicate_groups

-- STEP 4: See which organizations had their iati_org_id cleared
SELECT 
    id,
    name,
    acronym,
    type,
    country_represented,
    'IATI ID was cleared due to duplicate' as note
FROM organizations
WHERE iati_org_id IS NULL
AND updated_at > NOW() - INTERVAL '5 minutes'  -- Recently updated
ORDER BY updated_at DESC;

