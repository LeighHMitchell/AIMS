-- ============================================================================
-- SQL Migration: Add Missing Organizations Referenced in Transactions
-- ============================================================================
-- This script creates organization records for real entities that are
-- referenced in transaction seed data but don't exist in the database.
--
-- NOTE: Generic placeholders like "Various Contractors", "Service Providers",
-- etc. are intentionally NOT created as organizations - they remain as text
-- fields only since they don't represent actual tracked organizations.
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
BEGIN
    -- ========================================================================
    -- MYANMAR GOVERNMENT MINISTRIES/DEPARTMENTS
    -- ========================================================================

    -- Ministry of Construction
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Construction', 'MOC', '10', 'MM-GOV-MOC', 'Myanmar',
           'Myanmar Government ministry responsible for construction and infrastructure'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MOC' OR code = 'MM-GOV-MOC')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Ministry of Construction (MOC)';
    END IF;

    -- Ministry of Natural Resources and Environmental Conservation
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Ministry of Natural Resources and Environmental Conservation', 'MONREC', '10', 'MM-GOV-MONREC', 'Myanmar',
           'Myanmar Government ministry responsible for natural resources and environment'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'MONREC' OR code = 'MM-GOV-MONREC')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Ministry of Natural Resources and Environmental Conservation (MONREC)';
    END IF;

    -- General Administration Department (under Ministry of Home Affairs)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'General Administration Department', 'GAD', '10', 'MM-GOV-GAD', 'Myanmar',
           'Myanmar Government department responsible for general administration at township and district levels'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'GAD' OR code = 'MM-GOV-GAD')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: General Administration Department (GAD)';
    END IF;

    -- Department of Social Welfare (under Ministry of Social Welfare, Relief and Resettlement)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Department of Social Welfare', 'DSW', '10', 'MM-GOV-DSW', 'Myanmar',
           'Myanmar Government department responsible for social welfare programs and services'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'DSW' OR code = 'MM-GOV-DSW')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Department of Social Welfare (DSW)';
    END IF;

    -- Forest Department (under MONREC)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Forest Department', 'FD', '10', 'MM-GOV-FD', 'Myanmar',
           'Myanmar Government department responsible for forest management and conservation'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'FD' AND country = 'Myanmar')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Forest Department (FD)';
    END IF;

    -- ========================================================================
    -- UNITED NATIONS AGENCIES
    -- ========================================================================

    -- UN OCHA (Office for the Coordination of Humanitarian Affairs)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Office for the Coordination of Humanitarian Affairs', 'UN OCHA', '40', 'XM-DAC-41127', 'International',
           'UN agency coordinating humanitarian response and managing CERF'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UN OCHA' OR code = 'XM-DAC-41127')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: UN OCHA';
    END IF;

    -- WHO (World Health Organization)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'World Health Organization', 'WHO', '40', 'XM-DAC-41119', 'International',
           'UN specialized agency for international public health'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'WHO' OR code = 'XM-DAC-41119')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: World Health Organization (WHO)';
    END IF;

    -- IOM (International Organization for Migration)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'International Organization for Migration', 'IOM', '40', 'XM-DAC-47066', 'International',
           'UN migration agency providing services and advice on migration'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'IOM' OR code = 'XM-DAC-47066')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: International Organization for Migration (IOM)';
    END IF;

    -- UN Women
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'United Nations Entity for Gender Equality and the Empowerment of Women', 'UN Women', '40', 'XM-DAC-41146', 'International',
           'UN entity dedicated to gender equality and women''s empowerment'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'UN Women' OR code = 'XM-DAC-41146')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: UN Women';
    END IF;

    -- ========================================================================
    -- INTERNATIONAL FUNDS AND INSTITUTIONS
    -- ========================================================================

    -- Green Climate Fund
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Green Climate Fund', 'GCF', '40', 'XM-DAC-47134', 'International',
           'Global fund supporting developing countries in climate action'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE acronym = 'GCF' OR code = 'XM-DAC-47134')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Green Climate Fund (GCF)';
    END IF;

    -- Government of Myanmar (as a funding entity for counterpart funding)
    INSERT INTO organizations (name, acronym, type, code, country, description)
    SELECT 'Government of Myanmar', 'GoM', '10', 'MM-GOV', 'Myanmar',
           'Government of Myanmar as a funding entity for counterpart contributions'
    WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'MM-GOV')
    RETURNING id INTO v_org_id;
    IF v_org_id IS NOT NULL THEN
        RAISE NOTICE 'Created: Government of Myanmar (GoM)';
    END IF;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Missing organization creation complete.';
    RAISE NOTICE '============================================';

END $$;

-- ============================================================================
-- SUMMARY OF ORGANIZATIONS CREATED
-- ============================================================================
-- Myanmar Government:
--   1. Ministry of Construction (MOC)
--   2. Ministry of Natural Resources and Environmental Conservation (MONREC)
--   3. General Administration Department (GAD)
--   4. Department of Social Welfare (DSW)
--   5. Forest Department (FD)
--   6. Government of Myanmar (GoM) - for counterpart funding
--
-- UN Agencies:
--   7. UN OCHA
--   8. WHO
--   9. IOM
--   10. UN Women
--
-- International Funds:
--   11. Green Climate Fund (GCF)
--
-- NOT CREATED (generic placeholders - remain as text only):
--   - Various Contractors
--   - Health Service Providers
--   - Contractors and Suppliers
--   - WASH Contractors
--   - Road Construction Firms
--   - Service Providers
--   - Training Providers
--   - VSLA Groups
--   - MFIs and NGO Partners
--   - Environmental NGOs
--   - Mobile Money Operators
-- ============================================================================
