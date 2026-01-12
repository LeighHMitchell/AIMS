-- ============================================================================
-- UPDATE: Add Provider and Receiver Organizations to Planned Disbursements
-- ============================================================================
-- This script populates the provider_org_id and receiver_org_id columns for
-- all planned disbursements based on the activity's participating organizations.
--
-- Provider = Organization with 'extending' role (the funder)
-- Receiver = Organization with 'government' or 'implementing' role (first one found)
-- ============================================================================

-- Update planned disbursements for Activity 1: RPSCTP (JICA -> MOE)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'JICA' LIMIT 1),
    provider_org_name = 'Japan International Cooperation Agency',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOE' LIMIT 1),
    receiver_org_name = 'Ministry of Education'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000001'::UUID;

-- Update planned disbursements for Activity 2: MCHIP-AYR (UNICEF -> MOHS)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'UNICEF' LIMIT 1),
    provider_org_name = 'United Nations Children''s Fund',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOHS' LIMIT 1),
    receiver_org_name = 'Ministry of Health and Sports'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000002'::UUID;

-- Update planned disbursements for Activity 3: CSRVC (ADB -> MOALI)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'ADB' LIMIT 1),
    provider_org_name = 'Asian Development Bank',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOALI' LIMIT 1),
    receiver_org_name = 'Ministry of Agriculture, Livestock and Irrigation'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000003'::UUID;

-- Update planned disbursements for Activity 4: RWSSIP (DFAT -> MOPFI)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'DFAT' LIMIT 1),
    provider_org_name = 'Department of Foreign Affairs and Trade',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOPFI' LIMIT 1),
    receiver_org_name = 'Ministry of Planning, Finance and Industry'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000004'::UUID;

-- Update planned disbursements for Activity 5: RRCMAP (WB -> MOPFI)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'WB' LIMIT 1),
    provider_org_name = 'World Bank',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOPFI' LIMIT 1),
    receiver_org_name = 'Ministry of Planning, Finance and Industry'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000005'::UUID;

-- Update planned disbursements for Activity 6: EHADP-RKN (UNHCR -> WFP)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'UNHCR' LIMIT 1),
    provider_org_name = 'United Nations High Commissioner for Refugees',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'WFP' LIMIT 1),
    receiver_org_name = 'World Food Programme'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000006'::UUID;

-- Update planned disbursements for Activity 7: LGPASP (UNDP -> MOPFI)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'UNDP' LIMIT 1),
    provider_org_name = 'United Nations Development Programme',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MOPFI' LIMIT 1),
    receiver_org_name = 'Ministry of Planning, Finance and Industry'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000007'::UUID;

-- Update planned disbursements for Activity 8: WEEMST (USAID -> MDF)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'USAID' LIMIT 1),
    provider_org_name = 'United States Agency for International Development',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'MDF' LIMIT 1),
    receiver_org_name = 'Myanmar Development Foundation'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000008'::UUID;

-- Update planned disbursements for Activity 9: CMRCCR (EU -> UNDP)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'EU' LIMIT 1),
    provider_org_name = 'European Union',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'UNDP' LIMIT 1),
    receiver_org_name = 'United Nations Development Programme'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000009'::UUID;

-- Update planned disbursements for Activity 10: MCCT-NS (WFP -> UNICEF)
UPDATE planned_disbursements pd
SET
    provider_org_id = (SELECT id FROM organizations WHERE acronym = 'WFP' LIMIT 1),
    provider_org_name = 'World Food Programme',
    receiver_org_id = (SELECT id FROM organizations WHERE acronym = 'UNICEF' LIMIT 1),
    receiver_org_name = 'United Nations Children''s Fund'
WHERE pd.activity_id = 'a1000001-0001-4000-8000-000000000010'::UUID;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Activity 1 (RPSCTP): JICA -> MOE (Education project)
-- Activity 2 (MCHIP-AYR): UNICEF -> MOHS (Health project)
-- Activity 3 (CSRVC): ADB -> MOALI (Agriculture project)
-- Activity 4 (RWSSIP): DFAT -> MOPFI (WASH project)
-- Activity 5 (RRCMAP): WB -> MOPFI (Infrastructure project)
-- Activity 6 (EHADP-RKN): UNHCR -> WFP (Humanitarian project)
-- Activity 7 (LGPASP): UNDP -> MOPFI (Governance project)
-- Activity 8 (WEEMST): USAID -> MDF (Livelihoods project)
-- Activity 9 (CMRCCR): EU -> UNDP (Environment project)
-- Activity 10 (MCCT-NS): WFP -> UNICEF (Social protection project)
-- ============================================================================

-- Verify the updates
SELECT
    a.acronym as activity,
    COUNT(pd.id) as disbursement_count,
    po.acronym as provider,
    ro.acronym as receiver
FROM planned_disbursements pd
JOIN activities a ON pd.activity_id = a.id
LEFT JOIN organizations po ON pd.provider_org_id = po.id
LEFT JOIN organizations ro ON pd.receiver_org_id = ro.id
WHERE a.id IN (
    'a1000001-0001-4000-8000-000000000001'::UUID,
    'a1000001-0001-4000-8000-000000000002'::UUID,
    'a1000001-0001-4000-8000-000000000003'::UUID,
    'a1000001-0001-4000-8000-000000000004'::UUID,
    'a1000001-0001-4000-8000-000000000005'::UUID,
    'a1000001-0001-4000-8000-000000000006'::UUID,
    'a1000001-0001-4000-8000-000000000007'::UUID,
    'a1000001-0001-4000-8000-000000000008'::UUID,
    'a1000001-0001-4000-8000-000000000009'::UUID,
    'a1000001-0001-4000-8000-000000000010'::UUID
)
GROUP BY a.acronym, po.acronym, ro.acronym
ORDER BY a.acronym;
