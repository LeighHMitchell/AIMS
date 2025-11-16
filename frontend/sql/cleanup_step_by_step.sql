-- Step-by-Step Cleanup for "The University of British Columbia" Duplicates
-- Run each section one at a time and verify the results

-- ============================================
-- STEP 1: Check current state
-- ============================================
SELECT 
    'Current State' as step,
    COUNT(*) as org_count
FROM organizations
WHERE name ILIKE 'The University of British Columbia';

-- Show all duplicates
SELECT 
    id,
    name,
    acronym,
    iati_org_id,
    type,
    "Organisation_Type_Code",
    created_at,
    'Keep this one (oldest)' as note
FROM organizations
WHERE name ILIKE 'The University of British Columbia'
ORDER BY created_at ASC
LIMIT 1

UNION ALL

SELECT 
    id,
    name,
    acronym,
    iati_org_id,
    type,
    "Organisation_Type_Code",
    created_at,
    'DELETE' as note
FROM organizations
WHERE name ILIKE 'The University of British Columbia'
ORDER BY created_at ASC
OFFSET 1;


-- ============================================
-- STEP 2: Identify the canonical organization (oldest)
-- ============================================
-- Copy this ID - you'll use it in the next steps
SELECT 
    id as canonical_org_id,
    name,
    created_at
FROM organizations
WHERE name ILIKE 'The University of British Columbia'
ORDER BY created_at ASC
LIMIT 1;


-- ============================================
-- STEP 3: Update all references to point to canonical org
-- REPLACE 'YOUR_CANONICAL_ID_HERE' with the ID from Step 2
-- ============================================

-- First, let's see what will be updated (dry run)
SELECT 
    'transactions.provider_org_id' as table_column,
    COUNT(*) as records_to_update
FROM transactions
WHERE provider_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
)

UNION ALL

SELECT 
    'transactions.receiver_org_id' as table_column,
    COUNT(*) as records_to_update
FROM transactions
WHERE receiver_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
)

UNION ALL

SELECT 
    'planned_disbursements.provider_org_id' as table_column,
    COUNT(*) as records_to_update
FROM planned_disbursements
WHERE provider_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
)

UNION ALL

SELECT 
    'planned_disbursements.receiver_org_id' as table_column,
    COUNT(*) as records_to_update
FROM planned_disbursements
WHERE receiver_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);


-- ============================================
-- STEP 4: Perform the actual updates
-- REPLACE 'YOUR_CANONICAL_ID_HERE' with the ID from Step 2
-- ============================================

-- Update transactions provider_org_id
UPDATE transactions
SET provider_org_id = 'YOUR_CANONICAL_ID_HERE'::uuid
WHERE provider_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);

-- Update transactions receiver_org_id
UPDATE transactions
SET receiver_org_id = 'YOUR_CANONICAL_ID_HERE'::uuid
WHERE receiver_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);

-- Update planned_disbursements provider_org_id
UPDATE planned_disbursements
SET provider_org_id = 'YOUR_CANONICAL_ID_HERE'::uuid
WHERE provider_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);

-- Update planned_disbursements receiver_org_id
UPDATE planned_disbursements
SET receiver_org_id = 'YOUR_CANONICAL_ID_HERE'::uuid
WHERE receiver_org_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);

-- Update activity_participating_organizations
UPDATE activity_participating_organizations
SET organization_id = 'YOUR_CANONICAL_ID_HERE'::uuid
WHERE organization_id IN (
    SELECT id 
    FROM organizations 
    WHERE name ILIKE 'The University of British Columbia'
    AND id != 'YOUR_CANONICAL_ID_HERE'::uuid
);


-- ============================================
-- STEP 5: Delete duplicate organizations
-- REPLACE 'YOUR_CANONICAL_ID_HERE' with the ID from Step 2
-- ============================================

DELETE FROM organizations
WHERE name ILIKE 'The University of British Columbia'
AND id != 'YOUR_CANONICAL_ID_HERE'::uuid;


-- ============================================
-- STEP 6: Verify cleanup was successful
-- ============================================

-- Should show only 1 organization
SELECT 
    COUNT(*) as remaining_orgs,
    CASE 
        WHEN COUNT(*) = 1 THEN '✓ SUCCESS'
        ELSE '✗ FAILED - still have duplicates'
    END as status
FROM organizations
WHERE name ILIKE 'The University of British Columbia';

-- Show the final organization
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

-- Verify planned disbursements are linked
SELECT 
    COUNT(*) as total_planned_disbursements,
    COUNT(DISTINCT receiver_org_id) as unique_receiver_orgs,
    MIN(receiver_org_id) as the_org_id
FROM planned_disbursements
WHERE receiver_org_name ILIKE '%University of British Columbia%';

-- Show some sample planned disbursements
SELECT 
    pd.id,
    pd.receiver_org_name,
    pd.receiver_org_id,
    o.name as linked_org_name
FROM planned_disbursements pd
LEFT JOIN organizations o ON pd.receiver_org_id = o.id
WHERE pd.receiver_org_name ILIKE '%University of British Columbia%'
LIMIT 5;



