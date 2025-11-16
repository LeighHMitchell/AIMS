-- Robust Cleanup Script: Merge Duplicate "The University of British Columbia" Organizations
-- This version uses a more reliable approach with explicit loops

DO $$
DECLARE
    v_org_name TEXT := 'The University of British Columbia';
    v_canonical_org_id UUID;
    v_duplicate_id UUID;
    v_total_orgs INT;
    v_deleted_count INT := 0;
    v_updated_transactions_provider INT := 0;
    v_updated_transactions_receiver INT := 0;
    v_updated_pd_provider INT := 0;
    v_updated_pd_receiver INT := 0;
    v_updated_participating INT := 0;
BEGIN
    RAISE NOTICE '=== Starting Robust Organization Cleanup ===';
    RAISE NOTICE 'Target organization name: "%"', v_org_name;
    RAISE NOTICE '';
    
    -- Count total organizations with this name
    SELECT COUNT(*)
    INTO v_total_orgs
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    RAISE NOTICE 'Found % organizations with this name', v_total_orgs;
    
    IF v_total_orgs = 0 THEN
        RAISE NOTICE '✗ No organizations found. Nothing to clean up.';
        RETURN;
    END IF;
    
    IF v_total_orgs = 1 THEN
        RAISE NOTICE '✓ Only one organization exists. No cleanup needed.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Will merge % duplicates into one canonical organization', v_total_orgs - 1;
    RAISE NOTICE '';
    
    -- Select the canonical organization (oldest one by created_at)
    SELECT id
    INTO v_canonical_org_id
    FROM organizations
    WHERE name ILIKE v_org_name
    ORDER BY created_at ASC
    LIMIT 1;
    
    RAISE NOTICE '=== Canonical Organization (keeping this one) ===';
    RAISE NOTICE 'ID: %', v_canonical_org_id;
    
    -- Show details of canonical org
    FOR rec IN 
        SELECT id, name, acronym, iati_org_id, type, Organisation_Type_Code, created_at
        FROM organizations
        WHERE id = v_canonical_org_id
    LOOP
        RAISE NOTICE 'Name: %', rec.name;
        RAISE NOTICE 'Acronym: %', COALESCE(rec.acronym, '(none)');
        RAISE NOTICE 'IATI Org ID: %', COALESCE(rec.iati_org_id, '(none)');
        RAISE NOTICE 'Type: %', COALESCE(rec.type, '(none)');
        RAISE NOTICE 'Type Code: %', COALESCE(rec."Organisation_Type_Code", '(none)');
        RAISE NOTICE 'Created: %', rec.created_at;
    END LOOP;
    RAISE NOTICE '';
    
    RAISE NOTICE '=== Updating References to Duplicates ===';
    
    -- Loop through each duplicate organization and update references
    FOR v_duplicate_id IN 
        SELECT id
        FROM organizations
        WHERE name ILIKE v_org_name
        AND id != v_canonical_org_id
    LOOP
        RAISE NOTICE 'Processing duplicate ID: %', v_duplicate_id;
        
        -- Update transactions (provider_org_id)
        UPDATE transactions
        SET provider_org_id = v_canonical_org_id
        WHERE provider_org_id = v_duplicate_id;
        
        GET DIAGNOSTICS v_updated_transactions_provider = ROW_COUNT;
        IF v_updated_transactions_provider > 0 THEN
            RAISE NOTICE '  Updated % transactions (provider_org_id)', v_updated_transactions_provider;
        END IF;
        
        -- Update transactions (receiver_org_id)
        UPDATE transactions
        SET receiver_org_id = v_canonical_org_id
        WHERE receiver_org_id = v_duplicate_id;
        
        GET DIAGNOSTICS v_updated_transactions_receiver = ROW_COUNT;
        IF v_updated_transactions_receiver > 0 THEN
            RAISE NOTICE '  Updated % transactions (receiver_org_id)', v_updated_transactions_receiver;
        END IF;
        
        -- Update planned_disbursements (provider_org_id)
        UPDATE planned_disbursements
        SET provider_org_id = v_canonical_org_id
        WHERE provider_org_id = v_duplicate_id;
        
        GET DIAGNOSTICS v_updated_pd_provider = ROW_COUNT;
        IF v_updated_pd_provider > 0 THEN
            RAISE NOTICE '  Updated % planned_disbursements (provider_org_id)', v_updated_pd_provider;
        END IF;
        
        -- Update planned_disbursements (receiver_org_id)
        UPDATE planned_disbursements
        SET receiver_org_id = v_canonical_org_id
        WHERE receiver_org_id = v_duplicate_id;
        
        GET DIAGNOSTICS v_updated_pd_receiver = ROW_COUNT;
        IF v_updated_pd_receiver > 0 THEN
            RAISE NOTICE '  Updated % planned_disbursements (receiver_org_id)', v_updated_pd_receiver;
        END IF;
        
        -- Update activity_participating_organizations
        UPDATE activity_participating_organizations
        SET organization_id = v_canonical_org_id
        WHERE organization_id = v_duplicate_id;
        
        GET DIAGNOSTICS v_updated_participating = ROW_COUNT;
        IF v_updated_participating > 0 THEN
            RAISE NOTICE '  Updated % participating_organizations', v_updated_participating;
        END IF;
        
        -- Delete the duplicate organization
        DELETE FROM organizations WHERE id = v_duplicate_id;
        v_deleted_count := v_deleted_count + 1;
        RAISE NOTICE '  Deleted duplicate organization';
        RAISE NOTICE '';
        
    END LOOP;
    
    RAISE NOTICE '=== Cleanup Summary ===';
    RAISE NOTICE 'Total duplicates deleted: %', v_deleted_count;
    RAISE NOTICE 'Canonical organization retained: %', v_canonical_org_id;
    RAISE NOTICE '';
    
    -- Final verification
    SELECT COUNT(*)
    INTO v_total_orgs
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    RAISE NOTICE '=== Final Verification ===';
    RAISE NOTICE 'Organizations remaining with name "%": %', v_org_name, v_total_orgs;
    
    IF v_total_orgs = 1 THEN
        RAISE NOTICE '✓ SUCCESS: Cleanup complete. Only one organization remains.';
    ELSE
        RAISE NOTICE '✗ ERROR: Still have % organizations. Manual intervention needed.', v_total_orgs;
    END IF;
    
END $$;

-- Show final state of planned disbursements
SELECT 
    COUNT(*) as total_planned_disbursements,
    COUNT(DISTINCT receiver_org_id) as unique_receiver_orgs,
    CASE 
        WHEN COUNT(DISTINCT receiver_org_id) = 1 THEN '✓ All linked to same org'
        ELSE '✗ Still have multiple orgs'
    END as status
FROM planned_disbursements
WHERE receiver_org_name ILIKE '%University of British Columbia%';

-- Show final state of transactions
SELECT 
    COUNT(*) as total_transactions,
    COUNT(DISTINCT receiver_org_id) as unique_receiver_orgs,
    CASE 
        WHEN COUNT(DISTINCT receiver_org_id) = 1 THEN '✓ All linked to same org'
        ELSE '✗ Still have multiple orgs'
    END as status
FROM transactions
WHERE receiver_org_name ILIKE '%University of British Columbia%';

-- Show the final canonical organization
SELECT 
    id,
    name,
    acronym,
    iati_org_id,
    type,
    "Organisation_Type_Code",
    created_at
FROM organizations
WHERE name ILIKE 'The University of British Columbia';



