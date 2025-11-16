-- Comprehensive Cleanup for "The University of British Columbia" Duplicates
-- This handles ALL foreign key references before deletion

DO $$
DECLARE
    v_org_name TEXT := 'The University of British Columbia';
    v_canonical_org_id UUID;
    v_duplicate_id UUID;
    v_total_orgs INT;
    v_deleted_count INT := 0;
    v_row_count INT;
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE Organization Cleanup ===';
    RAISE NOTICE 'Target: "%"', v_org_name;
    RAISE NOTICE '';
    
    -- Count total organizations
    SELECT COUNT(*) INTO v_total_orgs
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    RAISE NOTICE 'Found % organizations', v_total_orgs;
    
    IF v_total_orgs <= 1 THEN
        RAISE NOTICE '✓ No duplicates to clean up';
        RETURN;
    END IF;
    
    -- Get canonical org (oldest)
    SELECT id INTO v_canonical_org_id
    FROM organizations
    WHERE name ILIKE v_org_name
    ORDER BY created_at ASC
    LIMIT 1;
    
    RAISE NOTICE '=== Canonical Organization ===';
    RAISE NOTICE 'ID: %', v_canonical_org_id;
    RAISE NOTICE '';
    
    -- Process each duplicate
    FOR v_duplicate_id IN 
        SELECT id
        FROM organizations
        WHERE name ILIKE v_org_name
        AND id != v_canonical_org_id
    LOOP
        RAISE NOTICE 'Processing duplicate: %', v_duplicate_id;
        
        -- 1. transactions (provider_org_id)
        UPDATE transactions SET provider_org_id = v_canonical_org_id WHERE provider_org_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ transactions.provider_org_id: %', v_row_count; END IF;
        
        -- 2. transactions (receiver_org_id)
        UPDATE transactions SET receiver_org_id = v_canonical_org_id WHERE receiver_org_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ transactions.receiver_org_id: %', v_row_count; END IF;
        
        -- 3. planned_disbursements (provider_org_id)
        UPDATE planned_disbursements SET provider_org_id = v_canonical_org_id WHERE provider_org_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ planned_disbursements.provider_org_id: %', v_row_count; END IF;
        
        -- 4. planned_disbursements (receiver_org_id)
        UPDATE planned_disbursements SET receiver_org_id = v_canonical_org_id WHERE receiver_org_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ planned_disbursements.receiver_org_id: %', v_row_count; END IF;
        
        -- 5. activity_participating_organizations
        UPDATE activity_participating_organizations SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ activity_participating_organizations: %', v_row_count; END IF;
        
        -- 6. projects
        UPDATE projects SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ projects: %', v_row_count; END IF;
        
        -- 7. organization_group_members
        UPDATE organization_group_members SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ organization_group_members: %', v_row_count; END IF;
        
        -- 8. user_organizations
        UPDATE user_organizations SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ user_organizations: %', v_row_count; END IF;
        
        -- 9. development_strategies
        UPDATE development_strategies SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ development_strategies: %', v_row_count; END IF;
        
        -- 10. custom_group_organizations
        UPDATE custom_group_organizations SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ custom_group_organizations: %', v_row_count; END IF;
        
        -- 11. users
        UPDATE users SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ users: %', v_row_count; END IF;
        
        -- 12. custom_group_memberships
        UPDATE custom_group_memberships SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ custom_group_memberships: %', v_row_count; END IF;
        
        -- 13. activity_contributors
        UPDATE activity_contributors SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ activity_contributors: %', v_row_count; END IF;
        
        -- 14. organization_names
        UPDATE organization_names SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ organization_names: %', v_row_count; END IF;
        
        -- 15. organization_budgets
        UPDATE organization_budgets SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ organization_budgets: %', v_row_count; END IF;
        
        -- 16. organization_expenditures
        UPDATE organization_expenditures SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ organization_expenditures: %', v_row_count; END IF;
        
        -- 17. organization_document_links
        UPDATE organization_document_links SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count > 0 THEN RAISE NOTICE '  ✓ organization_document_links: %', v_row_count; END IF;
        
        -- 18. transactions_backup (if exists)
        BEGIN
            UPDATE transactions_backup SET organization_id = v_canonical_org_id WHERE organization_id = v_duplicate_id;
            GET DIAGNOSTICS v_row_count = ROW_COUNT;
            IF v_row_count > 0 THEN RAISE NOTICE '  ✓ transactions_backup: %', v_row_count; END IF;
        EXCEPTION WHEN undefined_table THEN
            -- Table doesn't exist, skip it
            NULL;
        END;
        
        -- Now delete the duplicate
        DELETE FROM organizations WHERE id = v_duplicate_id;
        v_deleted_count := v_deleted_count + 1;
        RAISE NOTICE '  ✓ Deleted duplicate organization';
        RAISE NOTICE '';
        
    END LOOP;
    
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    RAISE NOTICE 'Duplicates deleted: %', v_deleted_count;
    RAISE NOTICE 'Canonical org ID: %', v_canonical_org_id;
    RAISE NOTICE '';
    
    -- Final verification
    SELECT COUNT(*) INTO v_total_orgs
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    RAISE NOTICE '=== VERIFICATION ===';
    IF v_total_orgs = 1 THEN
        RAISE NOTICE '✓✓✓ SUCCESS! Only 1 organization remains';
    ELSE
        RAISE NOTICE '✗✗✗ ERROR: Still have % organizations', v_total_orgs;
    END IF;
    
END $$;

-- Verification Queries (run after the DO block completes)

-- 1. Show the remaining organization
SELECT 
    'REMAINING ORGANIZATION' as info,
    id,
    name,
    acronym,
    iati_org_id,
    type,
    created_at
FROM organizations
WHERE name ILIKE 'The University of British Columbia';

-- 2. Check planned disbursements
SELECT 
    'PLANNED DISBURSEMENTS' as info,
    COUNT(*) as total,
    COUNT(DISTINCT receiver_org_id) as unique_orgs,
    CASE 
        WHEN COUNT(DISTINCT receiver_org_id) = 1 THEN '✓ All linked to same org'
        WHEN COUNT(DISTINCT receiver_org_id) > 1 THEN '✗ Multiple orgs found'
        ELSE '✗ No org linked'
    END as status
FROM planned_disbursements
WHERE receiver_org_name ILIKE '%University of British Columbia%';

-- 3. Check transactions  
SELECT 
    'TRANSACTIONS' as info,
    COUNT(*) as total,
    COUNT(DISTINCT receiver_org_id) as unique_orgs,
    CASE 
        WHEN COUNT(DISTINCT receiver_org_id) = 1 THEN '✓ All linked to same org'
        WHEN COUNT(DISTINCT receiver_org_id) > 1 THEN '✗ Multiple orgs found'
        ELSE '✗ No org linked'
    END as status
FROM transactions
WHERE receiver_org_name ILIKE '%University of British Columbia%';

-- 4. Sample planned disbursements to verify they're linked
SELECT 
    pd.id,
    pd.receiver_org_name,
    pd.receiver_org_id,
    o.name as linked_org_name,
    CASE 
        WHEN pd.receiver_org_id IS NOT NULL THEN '✓ Linked'
        ELSE '✗ Not linked'
    END as status
FROM planned_disbursements pd
LEFT JOIN organizations o ON pd.receiver_org_id = o.id
WHERE pd.receiver_org_name ILIKE '%University of British Columbia%'
LIMIT 5;



