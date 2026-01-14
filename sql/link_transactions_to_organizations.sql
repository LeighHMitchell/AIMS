-- ============================================================================
-- SQL Migration: Link Transactions to Organizations
-- ============================================================================
-- This script populates provider_org_id and receiver_org_id fields in the
-- transactions table based on matching provider_org_name and receiver_org_name
-- text fields to actual organization records.
--
-- IMPORTANT: Run add_missing_transaction_organizations.sql FIRST to ensure
-- all referenced organizations exist in the database.
--
-- This script handles:
--   1. Exact name matches
--   2. Variant name matches (e.g., "World Bank - IDA" → WB)
--   3. Sets provider_org_inferred and receiver_org_inferred to FALSE
--      when we explicitly link to an org (since it's now a confirmed link)
-- ============================================================================

DO $$
DECLARE
    v_updated_count INTEGER;
    v_total_updated INTEGER := 0;
BEGIN

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Linking transactions to organizations...';
    RAISE NOTICE '============================================';

    -- ========================================================================
    -- PROVIDER ORGANIZATION MAPPINGS
    -- ========================================================================

    -- World Bank variants → WB
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'WB'
    AND t.provider_org_name IN ('World Bank - IDA', 'World Bank - IBRD', 'World Bank')
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: World Bank variants → WB (provider)', v_updated_count;

    -- Asian Development Bank → ADB
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'ADB'
    AND t.provider_org_name = 'Asian Development Bank'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Asian Development Bank → ADB (provider)', v_updated_count;

    -- USAID
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'USAID'
    AND t.provider_org_name = 'USAID'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: USAID (provider)', v_updated_count;

    -- UNDP
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'UNDP'
    AND t.provider_org_name = 'UNDP'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: UNDP (provider)', v_updated_count;

    -- DFAT Australia → DFAT
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'DFAT'
    AND t.provider_org_name IN ('DFAT Australia', 'DFAT')
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: DFAT (provider)', v_updated_count;

    -- European Union → EU
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'EU'
    AND t.provider_org_name = 'European Union'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: European Union → EU (provider)', v_updated_count;

    -- UN OCHA - CERF → UN OCHA
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'UN OCHA'
    AND t.provider_org_name LIKE 'UN OCHA%'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: UN OCHA - CERF → UN OCHA (provider)', v_updated_count;

    -- UN Women
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'UN Women'
    AND t.provider_org_name = 'UN Women'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: UN Women (provider)', v_updated_count;

    -- Green Climate Fund → GCF
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'GCF'
    AND t.provider_org_name = 'Green Climate Fund'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Green Climate Fund → GCF (provider)', v_updated_count;

    -- Government of Myanmar → GoM
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.code = 'MM-GOV'
    AND t.provider_org_name = 'Government of Myanmar'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Government of Myanmar → GoM (provider)', v_updated_count;

    -- Ministry of Finance → MOPFI
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOPFI'
    AND t.provider_org_name = 'Ministry of Finance'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Finance → MOPFI (provider)', v_updated_count;

    -- Ministry of Education → MOE
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOE'
    AND t.provider_org_name = 'Ministry of Education'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Education → MOE (provider)', v_updated_count;

    -- Ministry of Health → MOHS
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOHS'
    AND t.provider_org_name = 'Ministry of Health'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Health → MOHS (provider)', v_updated_count;

    -- Ministry of Agriculture → MOALI
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOALI'
    AND t.provider_org_name = 'Ministry of Agriculture'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Agriculture → MOALI (provider)', v_updated_count;

    -- Ministry of Construction → MOC
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOC'
    AND t.provider_org_name = 'Ministry of Construction'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Construction → MOC (provider)', v_updated_count;

    -- Ministry of Natural Resources → MONREC
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MONREC'
    AND t.provider_org_name = 'Ministry of Natural Resources'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Natural Resources → MONREC (provider)', v_updated_count;

    -- General Administration Department → GAD
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'GAD'
    AND t.provider_org_name = 'General Administration Department'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: General Administration Department → GAD (provider)', v_updated_count;

    -- Department of Social Welfare → DSW
    UPDATE transactions t
    SET provider_org_id = o.id,
        provider_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'DSW'
    AND t.provider_org_name = 'Department of Social Welfare'
    AND t.provider_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Department of Social Welfare → DSW (provider)', v_updated_count;

    -- UN Agencies (generic - map to first matching if possible, skip for now)
    -- These are generic placeholders and won't be linked

    RAISE NOTICE '--------------------------------------------';

    -- ========================================================================
    -- RECEIVER ORGANIZATION MAPPINGS
    -- ========================================================================

    -- Ministry of Education → MOE
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOE'
    AND t.receiver_org_name = 'Ministry of Education'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Education → MOE (receiver)', v_updated_count;

    -- Ministry of Health → MOHS
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOHS'
    AND t.receiver_org_name = 'Ministry of Health'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Health → MOHS (receiver)', v_updated_count;

    -- Ministry of Finance → MOPFI
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOPFI'
    AND t.receiver_org_name = 'Ministry of Finance'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Finance → MOPFI (receiver)', v_updated_count;

    -- Ministry of Agriculture → MOALI
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOALI'
    AND t.receiver_org_name = 'Ministry of Agriculture'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Agriculture → MOALI (receiver)', v_updated_count;

    -- Ministry of Construction → MOC
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MOC'
    AND t.receiver_org_name = 'Ministry of Construction'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Construction → MOC (receiver)', v_updated_count;

    -- Ministry of Natural Resources → MONREC
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'MONREC'
    AND t.receiver_org_name = 'Ministry of Natural Resources'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Ministry of Natural Resources → MONREC (receiver)', v_updated_count;

    -- General Administration Department → GAD
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'GAD'
    AND t.receiver_org_name = 'General Administration Department'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: General Administration Department → GAD (receiver)', v_updated_count;

    -- Department of Social Welfare → DSW
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'DSW'
    AND t.receiver_org_name = 'Department of Social Welfare'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Department of Social Welfare → DSW (receiver)', v_updated_count;

    -- Forest Department → FD
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'FD' AND o.country = 'Myanmar'
    AND t.receiver_org_name = 'Forest Department'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: Forest Department → FD (receiver)', v_updated_count;

    -- UNHCR Myanmar → UNHCR
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'UNHCR'
    AND t.receiver_org_name LIKE 'UNHCR%'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: UNHCR Myanmar → UNHCR (receiver)', v_updated_count;

    -- WFP Myanmar → WFP
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'WFP'
    AND t.receiver_org_name LIKE 'WFP%'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: WFP Myanmar → WFP (receiver)', v_updated_count;

    -- UNICEF Myanmar → UNICEF
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'UNICEF'
    AND t.receiver_org_name LIKE 'UNICEF%'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: UNICEF Myanmar → UNICEF (receiver)', v_updated_count;

    -- WHO Myanmar → WHO
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'WHO'
    AND t.receiver_org_name LIKE 'WHO%'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: WHO Myanmar → WHO (receiver)', v_updated_count;

    -- IOM Myanmar → IOM
    UPDATE transactions t
    SET receiver_org_id = o.id,
        receiver_org_inferred = FALSE
    FROM organizations o
    WHERE o.acronym = 'IOM'
    AND t.receiver_org_name LIKE 'IOM%'
    AND t.receiver_org_id IS NULL;
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    v_total_updated := v_total_updated + v_updated_count;
    RAISE NOTICE 'Updated % transactions: IOM Myanmar → IOM (receiver)', v_updated_count;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Transaction linking complete.';
    RAISE NOTICE 'Total updates: %', v_total_updated;
    RAISE NOTICE '============================================';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run these after the migration to verify results)
-- ============================================================================

-- Show transactions still missing provider_org_id (excluding generic placeholders)
-- SELECT DISTINCT provider_org_name, COUNT(*) as count
-- FROM transactions
-- WHERE provider_org_id IS NULL
--   AND provider_org_name IS NOT NULL
--   AND provider_org_name NOT IN (
--       'Various Contractors', 'Service Providers', 'UN Agencies',
--       'VSLA Groups', 'Training Providers'
--   )
-- GROUP BY provider_org_name
-- ORDER BY count DESC;

-- Show transactions still missing receiver_org_id (excluding generic placeholders)
-- SELECT DISTINCT receiver_org_name, COUNT(*) as count
-- FROM transactions
-- WHERE receiver_org_id IS NULL
--   AND receiver_org_name IS NOT NULL
--   AND receiver_org_name NOT IN (
--       'Various Contractors', 'Service Providers', 'Health Service Providers',
--       'Contractors and Suppliers', 'WASH Contractors', 'Road Construction Firms',
--       'Training Providers', 'MFIs and NGO Partners', 'Environmental NGOs',
--       'Mobile Money Operators'
--   )
-- GROUP BY receiver_org_name
-- ORDER BY count DESC;

-- Show summary of linked vs unlinked transactions
-- SELECT
--     COUNT(*) as total_transactions,
--     COUNT(provider_org_id) as linked_provider,
--     COUNT(*) - COUNT(provider_org_id) as unlinked_provider,
--     COUNT(receiver_org_id) as linked_receiver,
--     COUNT(*) - COUNT(receiver_org_id) as unlinked_receiver
-- FROM transactions;

-- ============================================================================
-- NOTES ON UNLINKED TRANSACTIONS
-- ============================================================================
-- Some transactions will intentionally remain unlinked because their
-- provider/receiver names are generic placeholders:
--
-- Provider side (will remain NULL):
--   - UN Agencies
--   - VSLA Groups
--
-- Receiver side (will remain NULL):
--   - Various Contractors
--   - Health Service Providers
--   - Contractors and Suppliers
--   - WASH Contractors
--   - Road Construction Firms
--   - Service Providers
--   - Training Providers
--   - MFIs and NGO Partners
--   - Environmental NGOs
--   - Mobile Money Operators
--
-- These are generic categories, not specific organizations, and represent
-- multiple unspecified entities. They remain as text descriptions only.
-- ============================================================================
