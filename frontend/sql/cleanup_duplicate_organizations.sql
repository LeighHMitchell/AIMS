-- Cleanup Script: Merge Duplicate Organizations
-- This script consolidates duplicate organization records created during import
-- and updates all references to point to a single canonical record

DO $$
DECLARE
    v_org_name TEXT := 'The University of British Columbia';
    v_canonical_org_id UUID;
    v_duplicate_ids UUID[];
    v_duplicate_count INT;
    v_updated_transactions INT := 0;
    v_updated_planned_disbursements INT := 0;
    v_updated_participating_orgs INT := 0;
BEGIN
    RAISE NOTICE '=== Starting Organization Cleanup ===';
    RAISE NOTICE 'Organization name: %', v_org_name;
    RAISE NOTICE '';
    
    -- Find all organizations with this name
    SELECT array_agg(id ORDER BY created_at ASC)
    INTO v_duplicate_ids
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    v_duplicate_count := array_length(v_duplicate_ids, 1);
    
    IF v_duplicate_count IS NULL OR v_duplicate_count = 0 THEN
        RAISE NOTICE '✗ No organizations found with name "%"', v_org_name;
        RETURN;
    END IF;
    
    IF v_duplicate_count = 1 THEN
        RAISE NOTICE '✓ Only one organization found with name "%". No cleanup needed.', v_org_name;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % organizations with name "%"', v_duplicate_count, v_org_name;
    RAISE NOTICE 'IDs: %', v_duplicate_ids;
    RAISE NOTICE '';
    
    -- Use the first (oldest) as canonical
    v_canonical_org_id := v_duplicate_ids[1];
    
    RAISE NOTICE '=== Canonical Organization ===';
    RAISE NOTICE 'ID: %', v_canonical_org_id;
    
    -- Show canonical org details
    FOR rec IN 
        SELECT id, name, acronym, iati_org_id, type, created_at
        FROM organizations
        WHERE id = v_canonical_org_id
    LOOP
        RAISE NOTICE 'Name: %', rec.name;
        RAISE NOTICE 'Acronym: %', COALESCE(rec.acronym, 'NULL');
        RAISE NOTICE 'IATI Org ID: %', COALESCE(rec.iati_org_id, 'NULL');
        RAISE NOTICE 'Type: %', COALESCE(rec.type, 'NULL');
        RAISE NOTICE 'Created: %', rec.created_at;
    END LOOP;
    RAISE NOTICE '';
    
    -- Update transactions (provider)
    UPDATE transactions
    SET provider_org_id = v_canonical_org_id
    WHERE provider_org_id = ANY(v_duplicate_ids[2:]);
    
    GET DIAGNOSTICS v_updated_transactions = ROW_COUNT;
    RAISE NOTICE 'Updated % transaction provider_org_id references', v_updated_transactions;
    
    -- Update transactions (receiver)
    UPDATE transactions
    SET receiver_org_id = v_canonical_org_id
    WHERE receiver_org_id = ANY(v_duplicate_ids[2:]);
    
    GET DIAGNOSTICS v_updated_transactions = ROW_COUNT;
    RAISE NOTICE 'Updated % transaction receiver_org_id references', v_updated_transactions;
    
    -- Update planned disbursements (provider)
    UPDATE planned_disbursements
    SET provider_org_id = v_canonical_org_id
    WHERE provider_org_id = ANY(v_duplicate_ids[2:]);
    
    GET DIAGNOSTICS v_updated_planned_disbursements = ROW_COUNT;
    RAISE NOTICE 'Updated % planned_disbursements provider_org_id references', v_updated_planned_disbursements;
    
    -- Update planned disbursements (receiver)
    UPDATE planned_disbursements
    SET receiver_org_id = v_canonical_org_id
    WHERE receiver_org_id = ANY(v_duplicate_ids[2:]);
    
    GET DIAGNOSTICS v_updated_planned_disbursements = ROW_COUNT;
    RAISE NOTICE 'Updated % planned_disbursements receiver_org_id references', v_updated_planned_disbursements;
    
    -- Update activity participating organizations
    UPDATE activity_participating_organizations
    SET organization_id = v_canonical_org_id
    WHERE organization_id = ANY(v_duplicate_ids[2:]);
    
    GET DIAGNOSTICS v_updated_participating_orgs = ROW_COUNT;
    RAISE NOTICE 'Updated % activity_participating_organizations references', v_updated_participating_orgs;
    
    RAISE NOTICE '';
    
    -- Delete duplicate organizations
    DELETE FROM organizations
    WHERE id = ANY(v_duplicate_ids[2:]);
    
    RAISE NOTICE '=== Cleanup Complete ===';
    RAISE NOTICE 'Deleted % duplicate organizations', v_duplicate_count - 1;
    RAISE NOTICE 'Kept canonical organization: %', v_canonical_org_id;
    RAISE NOTICE '';
    
    -- Verify cleanup
    SELECT COUNT(*)
    INTO v_duplicate_count
    FROM organizations
    WHERE name ILIKE v_org_name;
    
    RAISE NOTICE '=== Verification ===';
    RAISE NOTICE 'Organizations remaining with name "%": %', v_org_name, v_duplicate_count;
    
    IF v_duplicate_count = 1 THEN
        RAISE NOTICE '✓ SUCCESS: Only one organization remains';
    ELSE
        RAISE NOTICE '✗ WARNING: Multiple organizations still exist';
    END IF;
    
END $$;

-- Verify planned disbursements are now linked
SELECT 
    pd.id,
    pd.receiver_org_name,
    pd.receiver_org_id,
    o.name as org_name,
    o.acronym as org_acronym
FROM planned_disbursements pd
LEFT JOIN organizations o ON pd.receiver_org_id = o.id
WHERE pd.receiver_org_name ILIKE '%University of British Columbia%'
ORDER BY pd.created_at DESC
LIMIT 10;



