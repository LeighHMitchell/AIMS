-- Complete diagnostic and cleanup for duplicate iati_org_id values
-- Run each section in order and check results

-- ============================================
-- SECTION 1: DIAGNOSTIC - See what duplicates exist
-- ============================================
SELECT 
    '=== DUPLICATE iati_org_id VALUES ===' as diagnostic_section;

SELECT 
    iati_org_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as organization_names,
    STRING_AGG(id::text, ', ') as org_ids
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================
-- SECTION 2: CLEANUP - Fix the duplicates
-- ============================================
-- Run this after reviewing Section 1 results

DO $$
DECLARE
    duplicate_iati_id TEXT;
    total_duplicates INTEGER := 0;
    total_cleared INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Starting duplicate iati_org_id cleanup...';
    RAISE NOTICE '============================================';
    
    -- Count total duplicate groups
    SELECT COUNT(DISTINCT iati_org_id) INTO total_duplicates
    FROM (
        SELECT iati_org_id
        FROM organizations
        WHERE iati_org_id IS NOT NULL
        GROUP BY iati_org_id
        HAVING COUNT(*) > 1
    ) dup;
    
    RAISE NOTICE 'Found % groups of duplicate iati_org_ids to fix', total_duplicates;
    RAISE NOTICE '';
    
    IF total_duplicates = 0 THEN
        RAISE NOTICE 'No duplicates found! Database is clean.';
        RETURN;
    END IF;
    
    -- Process each duplicate
    FOR duplicate_iati_id IN 
        SELECT iati_org_id
        FROM organizations
        WHERE iati_org_id IS NOT NULL
        GROUP BY iati_org_id
        HAVING COUNT(*) > 1
        ORDER BY iati_org_id
    LOOP
        DECLARE
            keep_org_id UUID;
            keep_org_name TEXT;
            dup_count INTEGER;
            cleared_count INTEGER;
        BEGIN
            -- Get count of duplicates
            SELECT COUNT(*) INTO dup_count
            FROM organizations
            WHERE iati_org_id = duplicate_iati_id;
            
            RAISE NOTICE '-------------------------------------------';
            RAISE NOTICE 'Processing: %', duplicate_iati_id;
            RAISE NOTICE '  Found % organizations with this IATI ID', dup_count;
            
            -- Find the organization to keep (most recently updated)
            SELECT id, name INTO keep_org_id, keep_org_name
            FROM organizations
            WHERE iati_org_id = duplicate_iati_id
            ORDER BY 
                COALESCE(updated_at, created_at) DESC NULLS LAST,
                created_at DESC,
                id
            LIMIT 1;
            
            RAISE NOTICE '  KEEPING: % (ID: %)', keep_org_name, keep_org_id;
            
            -- Show what will be cleared
            FOR cleared_count IN
                SELECT COUNT(*)
                FROM organizations
                WHERE iati_org_id = duplicate_iati_id
                AND id != keep_org_id
            LOOP
                RAISE NOTICE '  CLEARING: % duplicate organization(s)', cleared_count;
            END LOOP;
            
            -- Clear the duplicates (set iati_org_id to NULL)
            UPDATE organizations
            SET iati_org_id = NULL
            WHERE iati_org_id = duplicate_iati_id
            AND id != keep_org_id;
            
            GET DIAGNOSTICS cleared_count = ROW_COUNT;
            total_cleared := total_cleared + cleared_count;
            
            RAISE NOTICE '  ✓ Cleared % duplicate(s)', cleared_count;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error processing %: %', duplicate_iati_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CLEANUP COMPLETE!';
    RAISE NOTICE 'Total duplicate organizations cleared: %', total_cleared;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run SECTION 3 below to verify cleanup';
    RAISE NOTICE '2. Then run your alias migrations';
    
END $$;

-- ============================================
-- SECTION 3: VERIFICATION - Confirm cleanup worked
-- ============================================
-- Run this after Section 2 to verify

SELECT 
    '=== VERIFICATION: Should show 0 duplicates ===' as verification_section;

SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ NO DUPLICATES - Ready for migrations!'
        ELSE '✗ STILL HAS DUPLICATES - Re-run Section 2'
    END as status,
    COUNT(*) as remaining_duplicate_groups
FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
) remaining_duplicates;

-- Show any remaining duplicates (should be empty)
SELECT 
    iati_org_id,
    COUNT(*) as count,
    STRING_AGG(name, ' | ') as names
FROM organizations
WHERE iati_org_id IS NOT NULL
GROUP BY iati_org_id
HAVING COUNT(*) > 1;

-- ============================================
-- SECTION 4: See what was cleared
-- ============================================
-- Shows organizations that just had their iati_org_id cleared

SELECT 
    '=== ORGANIZATIONS WITH CLEARED iati_org_id ===' as cleared_section;

SELECT 
    id,
    name,
    acronym,
    type,
    country_represented,
    updated_at,
    'iati_org_id was NULL (cleared due to duplicate)' as note
FROM organizations
WHERE iati_org_id IS NULL
AND updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 20;

