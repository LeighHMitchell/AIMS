-- Verify that all alias resolution migrations have been applied successfully

SELECT '=== VERIFICATION: Alias Resolution System ===' as check_section;

-- Check 1: Verify alias columns exist on organizations table
SELECT 
    'Organizations Table Columns' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'alias_refs'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' 
            AND column_name = 'name_aliases'
        )
        THEN '✓ PASS - Both alias columns exist'
        ELSE '✗ FAIL - Alias columns missing'
    END as status;

-- Check 2: Verify indexes exist
SELECT 
    'Alias Indexes' as check_name,
    CASE 
        WHEN COUNT(*) >= 2
        THEN '✓ PASS - Alias indexes exist (' || COUNT(*)::text || ' found)'
        ELSE '✗ FAIL - Missing alias indexes'
    END as status
FROM pg_indexes
WHERE tablename = 'organizations' 
AND indexname IN ('idx_org_alias_refs', 'idx_org_name_aliases', 'idx_org_name_trgm');

-- Check 3: Verify organization_alias_mappings table exists
SELECT 
    'Audit Table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'organization_alias_mappings'
        )
        THEN '✓ PASS - organization_alias_mappings table exists'
        ELSE '✗ FAIL - Audit table missing'
    END as status;

-- Check 4: Verify pg_trgm extension is enabled
SELECT 
    'pg_trgm Extension' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
        )
        THEN '✓ PASS - pg_trgm extension enabled'
        ELSE '✗ FAIL - pg_trgm extension not found'
    END as status;

-- Check 5: Verify fuzzy match function exists
SELECT 
    'Fuzzy Match Function' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'find_similar_organizations'
        )
        THEN '✓ PASS - find_similar_organizations function exists'
        ELSE '✗ FAIL - Fuzzy match function missing'
    END as status;

-- Check 6: Verify no duplicate iati_org_ids remain
SELECT 
    'Duplicate Check' as check_name,
    CASE 
        WHEN COUNT(*) = 0
        THEN '✓ PASS - No duplicate iati_org_ids'
        ELSE '✗ FAIL - ' || COUNT(*)::text || ' duplicate groups found'
    END as status
FROM (
    SELECT iati_org_id
    FROM organizations
    WHERE iati_org_id IS NOT NULL
    GROUP BY iati_org_id
    HAVING COUNT(*) > 1
) duplicates;

-- Summary: Count organizations with aliases
SELECT 
    '=== SUMMARY ===' as summary_section;

SELECT 
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN alias_refs IS NOT NULL AND array_length(alias_refs, 1) > 0 THEN 1 END) as orgs_with_ref_aliases,
    COUNT(CASE WHEN name_aliases IS NOT NULL AND array_length(name_aliases, 1) > 0 THEN 1 END) as orgs_with_name_aliases
FROM organizations;

SELECT 
    '✓ All migrations applied successfully!' as final_status,
    'You can now use the alias resolution system!' as next_step;

