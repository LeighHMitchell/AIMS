-- Fix duplicate iati_org_id values in organizations table
-- Strategy: Keep the most recently updated organization for each duplicate iati_org_id
--           and set the others' iati_org_id to NULL (preserving the data as aliases)

-- IMPORTANT: Review the diagnostic query results BEFORE running this!
-- This script will modify your data.

-- Step 1: Identify duplicates and decide which to keep
-- (Keeps the most recently updated one for each duplicate iati_org_id)

DO $$
DECLARE
    duplicate_record RECORD;
    org_to_keep_id UUID;
    orgs_to_update UUID[];
BEGIN
    -- Loop through each duplicate iati_org_id
    FOR duplicate_record IN 
        SELECT iati_org_id
        FROM organizations
        WHERE iati_org_id IS NOT NULL
        GROUP BY iati_org_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicate iati_org_id: %', duplicate_record.iati_org_id;
        
        -- Find the organization to keep (most recently updated)
        SELECT id INTO org_to_keep_id
        FROM organizations
        WHERE iati_org_id = duplicate_record.iati_org_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1;
        
        RAISE NOTICE '  Keeping organization: %', org_to_keep_id;
        
        -- Get IDs of organizations to update
        SELECT ARRAY_AGG(id) INTO orgs_to_update
        FROM organizations
        WHERE iati_org_id = duplicate_record.iati_org_id
        AND id != org_to_keep_id;
        
        -- Set iati_org_id to NULL for duplicates (we'll use aliases instead)
        UPDATE organizations
        SET iati_org_id = NULL
        WHERE id = ANY(orgs_to_update);
        
        RAISE NOTICE '  Cleared iati_org_id for % duplicate organizations', array_length(orgs_to_update, 1);
        
        -- Optional: Add the duplicate iati_org_id as an alias to the kept organization
        -- This ensures the old reference is still recognized
        UPDATE organizations
        SET alias_refs = COALESCE(alias_refs, '{}') || ARRAY[duplicate_record.iati_org_id]
        WHERE id = ANY(orgs_to_update)
        AND NOT (COALESCE(alias_refs, '{}') @> ARRAY[duplicate_record.iati_org_id]);
        
    END LOOP;
    
    RAISE NOTICE 'Duplicate cleanup complete!';
END $$;

-- Verify no duplicates remain
SELECT 
    iati_org_id,
    COUNT(*) as count
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Show organizations that had their iati_org_id cleared
SELECT 
    id,
    name,
    acronym,
    alias_refs,
    created_at,
    updated_at
FROM organizations
WHERE iati_org_id IS NULL
AND alias_refs IS NOT NULL
AND array_length(alias_refs, 1) > 0
ORDER BY updated_at DESC;
