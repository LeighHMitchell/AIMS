-- ============================================================================
-- SEED DATA: Policy Markers for 10 Myanmar Development Activities
-- ============================================================================
-- This script adds IATI-compliant policy marker data for the 10 Myanmar activities.
--
-- IATI Significance Codes:It s
--   0 = Not targeted
--   1 = Significant objective
--   2 = Principal objective
--   3 = Principal objective AND in support of an action programme
--   4 = Explicit primary objective
--
-- Policy Marker Codes (from policy_markers table):
-- Environmental: climate_mitigation, climate_adaptation, biodiversity, desertification, environment
-- Social/Governance: gender_equality, good_governance, participatory_dev, human_rights, rule_of_law, trade_development
-- Other: disability, nutrition, peacebuilding, rural_development, urban_development, digitalization, private_sector
-- ============================================================================

-- First, ensure the policy_markers table has the required markers
INSERT INTO policy_markers (code, name, description, marker_type, display_order) VALUES
-- Environmental (Rio Markers)
('climate_mitigation', 'Climate Change Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', 1),
('climate_adaptation', 'Climate Change Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', 2),
('biodiversity', 'Biodiversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', 3),
('desertification', 'Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', 4),
('environment', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', 5),
-- Social & Governance
('gender_equality', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', 6),
('good_governance', 'Good Governance', 'Activities that support democratic governance and civil society', 'social_governance', 7),
('participatory_dev', 'Participatory Development', 'Activities that emphasize stakeholder participation in design and implementation', 'social_governance', 8),
('human_rights', 'Human Rights', 'Activities that support or promote human rights', 'social_governance', 9),
('rule_of_law', 'Rule of Law', 'Activities that strengthen legal and judicial systems', 'social_governance', 10),
('trade_development', 'Trade Development', 'Activities that build trade capacity and support trade facilitation', 'social_governance', 11),
-- Other Cross-Cutting Issues
('disability', 'Disability Inclusion', 'Activities that promote inclusion of persons with disabilities', 'other', 12),
('nutrition', 'Nutrition', 'Activities that address nutrition outcomes', 'other', 13),
('peacebuilding', 'Peacebuilding / Conflict Sensitivity', 'Activities that contribute to peace and conflict prevention', 'other', 14),
('rural_development', 'Rural Development', 'Activities focused on rural areas and communities', 'other', 15),
('urban_development', 'Urban Development', 'Activities focused on urban areas and cities', 'other', 16),
('digitalization', 'Digitalization / Technology', 'Activities that leverage digital technologies', 'other', 17),
('private_sector', 'Private Sector Engagement', 'Activities that engage or strengthen private sector', 'other', 18)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
    pm_climate_mitigation UUID;
    pm_climate_adaptation UUID;
    pm_biodiversity UUID;
    pm_desertification UUID;
    pm_environment UUID;
    pm_gender_equality UUID;
    pm_good_governance UUID;
    pm_participatory_dev UUID;
    pm_human_rights UUID;
    pm_rule_of_law UUID;
    pm_trade_development UUID;
    pm_disability UUID;
    pm_nutrition UUID;
    pm_peacebuilding UUID;
    pm_rural_development UUID;
    pm_urban_development UUID;
    pm_digitalization UUID;
    pm_private_sector UUID;
BEGIN
    -- Get policy marker UUIDs (activity_policy_markers.policy_marker_id references policy_markers.uuid)
    SELECT uuid INTO pm_climate_mitigation FROM policy_markers WHERE code = 'climate_mitigation';
    SELECT uuid INTO pm_climate_adaptation FROM policy_markers WHERE code = 'climate_adaptation';
    SELECT uuid INTO pm_biodiversity FROM policy_markers WHERE code = 'biodiversity';
    SELECT uuid INTO pm_desertification FROM policy_markers WHERE code = 'desertification';
    SELECT uuid INTO pm_environment FROM policy_markers WHERE code = 'environment';
    SELECT uuid INTO pm_gender_equality FROM policy_markers WHERE code = 'gender_equality';
    SELECT uuid INTO pm_good_governance FROM policy_markers WHERE code = 'good_governance';
    SELECT uuid INTO pm_participatory_dev FROM policy_markers WHERE code = 'participatory_dev';
    SELECT uuid INTO pm_human_rights FROM policy_markers WHERE code = 'human_rights';
    SELECT uuid INTO pm_rule_of_law FROM policy_markers WHERE code = 'rule_of_law';
    SELECT uuid INTO pm_trade_development FROM policy_markers WHERE code = 'trade_development';
    SELECT uuid INTO pm_disability FROM policy_markers WHERE code = 'disability';
    SELECT uuid INTO pm_nutrition FROM policy_markers WHERE code = 'nutrition';
    SELECT uuid INTO pm_peacebuilding FROM policy_markers WHERE code = 'peacebuilding';
    SELECT uuid INTO pm_rural_development FROM policy_markers WHERE code = 'rural_development';
    SELECT uuid INTO pm_urban_development FROM policy_markers WHERE code = 'urban_development';
    SELECT uuid INTO pm_digitalization FROM policy_markers WHERE code = 'digitalization';
    SELECT uuid INTO pm_private_sector FROM policy_markers WHERE code = 'private_sector';

    -- Verify we have the policy markers (should always exist now since we insert them above)
    IF pm_gender_equality IS NULL THEN
        RAISE NOTICE 'Warning: Some policy markers may not have been created. Check policy_markers table.';
    END IF;

    -- ========================================================================
    -- ACTIVITY 1: Rural Primary School Construction and Teacher Training Program
    -- Focus: Education, rural development, gender equality in education
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000001'::UUID, pm_gender_equality, 1,
         'Program ensures equal enrollment of girls and boys, with special outreach to families with daughters'),
        ('a1000001-0001-4000-8000-000000000001'::UUID, pm_rural_development, 2,
         'Principal objective is improving rural educational infrastructure and access in remote communities'),
        ('a1000001-0001-4000-8000-000000000001'::UUID, pm_participatory_dev, 1,
         'Establishment of parent-teacher associations ensures community participation in school governance'),
        ('a1000001-0001-4000-8000-000000000001'::UUID, pm_disability, 1,
         'School designs include accessibility features for children with disabilities')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 2: Maternal and Child Health Improvement Program
    -- Focus: Health, gender, nutrition
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000002'::UUID, pm_gender_equality, 2,
         'Principal objective focuses on maternal health outcomes and women''s healthcare access'),
        ('a1000001-0001-4000-8000-000000000002'::UUID, pm_nutrition, 2,
         'Integrated nutrition education and supplementation for mothers and children under 5'),
        ('a1000001-0001-4000-8000-000000000002'::UUID, pm_rural_development, 1,
         'Program specifically targets rural health centers and underserved communities'),
        ('a1000001-0001-4000-8000-000000000002'::UUID, pm_participatory_dev, 1,
         'Community health volunteers and women''s groups actively involved in program delivery')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 3: Climate-Smart Rice Value Chain Development
    -- Focus: Agriculture, climate adaptation, environment
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_climate_adaptation, 2,
         'Principal objective is building farmer resilience through drought-tolerant varieties and water management'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_climate_mitigation, 1,
         'Alternate wetting and drying techniques reduce methane emissions from rice paddies'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_environment, 1,
         'Sustainable farming practices reduce agrochemical use and protect soil health'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_rural_development, 2,
         'Directly supports smallholder farmers and strengthens rural agricultural cooperatives'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_gender_equality, 1,
         'Specific targets for women''s participation in farmer cooperatives and training'),
        ('a1000001-0001-4000-8000-000000000003'::UUID, pm_trade_development, 1,
         'Supports market linkages and export quality certification for rice producers')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 4: Rural Water Supply and Sanitation Program
    -- Focus: WASH, environment, rural development, gender
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000004'::UUID, pm_environment, 1,
         'Sustainable water source protection and waste management components'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, pm_rural_development, 2,
         'Principal focus on improving water and sanitation access in rural Magway and Sagaing'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, pm_gender_equality, 1,
         'Women-led water committees and gender-sensitive latrine designs address women''s needs'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, pm_participatory_dev, 2,
         'Community-based management of water systems with village water committees'),
        ('a1000001-0001-4000-8000-000000000004'::UUID, pm_climate_adaptation, 1,
         'Climate-resilient water sources address increasing water scarcity from climate change')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 5: Rural Roads Connectivity Project
    -- Focus: Infrastructure, rural development, climate resilience
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000005'::UUID, pm_rural_development, 2,
         'Principal objective is connecting isolated rural villages to markets and services'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, pm_climate_adaptation, 1,
         'Climate-resilient road designs with improved drainage and flood-resistant surfaces'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, pm_private_sector, 1,
         'Improved connectivity enables market access for rural enterprises'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, pm_gender_equality, 1,
         'Road improvements particularly benefit women''s economic mobility and healthcare access'),
        ('a1000001-0001-4000-8000-000000000005'::UUID, pm_environment, 0,
         'Environmental impact assessments conducted; mitigation measures in place')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 6: Emergency Humanitarian Assistance - Rakhine
    -- Focus: Humanitarian, protection, peacebuilding
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000006'::UUID, pm_gender_equality, 1,
         'Gender-based violence prevention and response integrated into all assistance'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, pm_peacebuilding, 2,
         'Do-no-harm approaches and conflict sensitivity mainstreamed; supports peaceful coexistence'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, pm_human_rights, 2,
         'Protection monitoring and human rights documentation as core program component'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, pm_nutrition, 1,
         'Emergency food assistance includes nutrition screening and therapeutic feeding'),
        ('a1000001-0001-4000-8000-000000000006'::UUID, pm_disability, 1,
         'Disability-inclusive humanitarian response with targeted support for persons with disabilities')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 7: Local Governance Capacity Building Program
    -- Focus: Governance, participation, gender, rule of law
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000007'::UUID, pm_good_governance, 2,
         'Principal objective is strengthening local government transparency and accountability'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, pm_participatory_dev, 2,
         'Citizens'' participation in local planning and budgeting as core program component'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, pm_rule_of_law, 1,
         'Support for local dispute resolution mechanisms and access to justice'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, pm_gender_equality, 1,
         'Targets 30% women''s representation in local governance bodies'),
        ('a1000001-0001-4000-8000-000000000007'::UUID, pm_digitalization, 1,
         'E-governance tools introduced for service delivery and information access')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 8: Women's Economic Empowerment and Microfinance
    -- Focus: Gender equality, private sector, livelihoods
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000008'::UUID, pm_gender_equality, 2,
         'Principal objective is women''s economic empowerment through financial inclusion'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, pm_private_sector, 1,
         'Support for women-owned micro and small enterprises'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, pm_rural_development, 1,
         'Focus on women entrepreneurs in rural and peri-urban areas'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, pm_participatory_dev, 1,
         'Self-help groups and savings circles as participatory delivery mechanism'),
        ('a1000001-0001-4000-8000-000000000008'::UUID, pm_human_rights, 1,
         'Addresses economic rights and financial autonomy for women')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 9: Coastal Mangrove Restoration and Climate Resilience
    -- Focus: Environment, climate, biodiversity
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_biodiversity, 2,
         'Principal objective is restoring mangrove ecosystems and associated biodiversity'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_climate_adaptation, 2,
         'Mangrove restoration provides natural coastal protection against storms and sea level rise'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_climate_mitigation, 2,
         'Blue carbon sequestration through mangrove restoration contributes to emissions reduction'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_environment, 2,
         'Comprehensive environmental restoration and sustainable resource management'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_participatory_dev, 1,
         'Community-based natural resource management with fishing communities'),
        ('a1000001-0001-4000-8000-000000000009'::UUID, pm_gender_equality, 1,
         'Women''s involvement in nurseries and alternative livelihood activities')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    -- ========================================================================
    -- ACTIVITY 10: Social Protection Cash Transfer Program
    -- Focus: Social protection, gender, nutrition, disability
    -- ========================================================================
    INSERT INTO activity_policy_markers (activity_id, policy_marker_id, significance, rationale)
    VALUES
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_gender_equality, 1,
         'Cash transfers primarily channeled through women; supports women''s financial autonomy'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_rural_development, 2,
         'Principal focus on rural poor households in Chin State and Tanintharyi'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_nutrition, 1,
         'Nutrition-sensitive design with behavior change communication on child nutrition'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_disability, 1,
         'Disability-inclusive targeting with additional support for households with disabled members'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_participatory_dev, 1,
         'Community-based targeting with village committees to identify beneficiaries'),
        ('a1000001-0001-4000-8000-000000000010'::UUID, pm_digitalization, 1,
         'Mobile money transfers and digital beneficiary management system')
    ON CONFLICT (activity_id, policy_marker_id) DO UPDATE SET
        significance = EXCLUDED.significance,
        rationale = EXCLUDED.rationale;

    RAISE NOTICE 'Successfully inserted policy markers for all 10 Myanmar activities';

END $$;

-- ============================================================================
-- Summary of Policy Markers by Activity
-- ============================================================================
-- Activity 1 (Education):      gender(1), rural(2), participatory(1), disability(1)
-- Activity 2 (Health):         gender(2), nutrition(2), rural(1), participatory(1)
-- Activity 3 (Agriculture):    climate_adapt(2), climate_mitig(1), environment(1), rural(2), gender(1), trade(1)
-- Activity 4 (WASH):           environment(1), rural(2), gender(1), participatory(2), climate_adapt(1)
-- Activity 5 (Infrastructure): rural(2), climate_adapt(1), private_sector(1), gender(1), environment(0)
-- Activity 6 (Humanitarian):   gender(1), peacebuilding(2), human_rights(2), nutrition(1), disability(1)
-- Activity 7 (Governance):     governance(2), participatory(2), rule_of_law(1), gender(1), digital(1)
-- Activity 8 (Women's Econ):   gender(2), private_sector(1), rural(1), participatory(1), human_rights(1)
-- Activity 9 (Environment):    biodiversity(2), climate_adapt(2), climate_mitig(2), environment(2), participatory(1), gender(1)
-- Activity 10 (Social Prot):   gender(1), rural(2), nutrition(1), disability(1), participatory(1), digital(1)
-- ============================================================================
