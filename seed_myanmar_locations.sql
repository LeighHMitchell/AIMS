-- ============================================================================
-- SEED DATA: Location Allocations for 10 Myanmar Development Activities
-- ============================================================================
-- This script creates State/Region-level coverage locations with percentage
-- allocations for each activity. Locations are based on the geographic focus
-- areas specified in each activity's description.
--
-- Myanmar Administrative Divisions:
-- States: Chin, Kachin, Kayah, Kayin, Mon, Rakhine, Shan
-- Regions: Ayeyarwady, Bago, Magway, Mandalay, Sagaing, Tanintharyi, Yangon
-- Union Territory: Naypyidaw
-- ============================================================================

-- Activity 1: Rural Primary School Construction Program (RPSCTP)
-- Locations: Shan State, Kayah State, Kayin State
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000001', 'coverage', 'Shan State',
     'Primary schools and teacher training in rural Shan State communities',
     'MMR017', 'Shan State', 'MM', 'subnational', '2', '2', '1', 45, 'manual'),
    ('a1000001-0001-4000-8000-000000000001', 'coverage', 'Kayah State',
     'School construction in remote Kayah State villages',
     'MMR012', 'Kayah State', 'MM', 'subnational', '2', '2', '1', 30, 'manual'),
    ('a1000001-0001-4000-8000-000000000001', 'coverage', 'Kayin State',
     'Education infrastructure development in Kayin State',
     'MMR013', 'Kayin State', 'MM', 'subnational', '2', '2', '1', 25, 'manual');

-- Activity 2: Maternal and Child Health Improvement Program (MCHIP-AYR)
-- Locations: Ayeyarwady Region (100% - single region focus)
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000002', 'coverage', 'Ayeyarwady Region',
     'Maternal and child health services across Ayeyarwady Region townships',
     'MMR001', 'Ayeyarwady Region', 'MM', 'subnational', '2', '2', '1', 100, 'manual');

-- Activity 3: Climate-Smart Rice Value Chain Development (CSRVC)
-- Locations: Bago Region, Sagaing Region
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000003', 'coverage', 'Bago Region',
     'Rice farming communities in Bago Region - major rice producing area',
     'MMR002', 'Bago Region', 'MM', 'subnational', '2', '2', '1', 55, 'manual'),
    ('a1000001-0001-4000-8000-000000000003', 'coverage', 'Sagaing Region',
     'Agricultural development and farmer cooperatives in Sagaing',
     'MMR015', 'Sagaing Region', 'MM', 'subnational', '2', '2', '1', 45, 'manual');

-- Activity 4: Rural Water Supply and Sanitation Program (RWSSIP)
-- Locations: Chin State, Magway Region
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000004', 'coverage', 'Chin State',
     'Water supply and sanitation in remote Chin State highland communities',
     'MMR003', 'Chin State', 'MM', 'subnational', '2', '2', '1', 60, 'manual'),
    ('a1000001-0001-4000-8000-000000000004', 'coverage', 'Magway Region',
     'WASH facilities in dry zone villages of Magway Region',
     'MMR004', 'Magway Region', 'MM', 'subnational', '2', '2', '1', 40, 'manual');

-- Activity 5: Rural Roads Connectivity Project (RRCMAP)
-- Locations: Mon State, Tanintharyi Region
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000005', 'coverage', 'Mon State',
     'Rural road construction connecting villages to township centers in Mon State',
     'MMR005', 'Mon State', 'MM', 'subnational', '2', '2', '1', 50, 'manual'),
    ('a1000001-0001-4000-8000-000000000005', 'coverage', 'Tanintharyi Region',
     'Road rehabilitation and market access infrastructure in Tanintharyi',
     'MMR006', 'Tanintharyi Region', 'MM', 'subnational', '2', '2', '1', 50, 'manual');

-- Activity 6: Emergency Humanitarian Assistance - Rakhine (EHADP-RKN)
-- Locations: Rakhine State (100% - humanitarian focus area)
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000006', 'coverage', 'Rakhine State',
     'Emergency humanitarian assistance to IDP camps and host communities',
     'MMR014', 'Rakhine State', 'MM', 'subnational', '2', '2', '1', 100, 'manual');

-- Activity 7: Local Governance Capacity Building Program (LGPASP)
-- Locations: Mandalay Region, Yangon Region
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000007', 'coverage', 'Mandalay Region',
     'Local government capacity building in Mandalay Region townships',
     'MMR008', 'Mandalay Region', 'MM', 'subnational', '2', '2', '1', 50, 'manual'),
    ('a1000001-0001-4000-8000-000000000007', 'coverage', 'Yangon Region',
     'E-governance and citizen services improvement in Yangon',
     'MMR007', 'Yangon Region', 'MM', 'subnational', '2', '2', '1', 50, 'manual');

-- Activity 8: Women's Economic Empowerment and Microfinance (WEEMST)
-- Locations: Kachin State, Shan State (North)
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000008', 'coverage', 'Kachin State',
     'Women VSLA groups and microfinance in Kachin State',
     'MMR011', 'Kachin State', 'MM', 'subnational', '2', '2', '1', 55, 'manual'),
    ('a1000001-0001-4000-8000-000000000008', 'coverage', 'Shan State (North)',
     'Women economic empowerment programs in northern Shan State',
     'MMR017', 'Shan State', 'MM', 'subnational', '2', '2', '1', 45, 'manual');

-- Activity 9: Coastal Mangrove Restoration Program (CMRCCR)
-- Locations: Ayeyarwady Region, Tanintharyi Region
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000009', 'coverage', 'Ayeyarwady Region (Coastal)',
     'Mangrove restoration along Ayeyarwady Delta coastline',
     'MMR001', 'Ayeyarwady Region', 'MM', 'subnational', '2', '2', '1', 60, 'manual'),
    ('a1000001-0001-4000-8000-000000000009', 'coverage', 'Tanintharyi Region (Coastal)',
     'Coastal ecosystem restoration and community resilience in Tanintharyi',
     'MMR006', 'Tanintharyi Region', 'MM', 'subnational', '2', '2', '1', 40, 'manual');

-- Activity 10: Maternal and Child Cash Transfer Program (MCCT-NS)
-- Locations: Chin State, Rakhine State
INSERT INTO activity_locations (
    activity_id, location_type, location_name, description,
    state_region_code, state_region_name, country_code,
    coverage_scope, location_reach, exactness, admin_level,
    percentage_allocation, source
) VALUES
    ('a1000001-0001-4000-8000-000000000010', 'coverage', 'Chin State',
     'Cash transfers to pregnant women and mothers in food-insecure Chin State',
     'MMR003', 'Chin State', 'MM', 'subnational', '2', '2', '1', 50, 'manual'),
    ('a1000001-0001-4000-8000-000000000010', 'coverage', 'Rakhine State',
     'Nutrition-linked cash transfers in vulnerable Rakhine communities',
     'MMR014', 'Rakhine State', 'MM', 'subnational', '2', '2', '1', 50, 'manual');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total location records created: 20
--
-- Location allocations by activity:
--   1. RPSCTP (Education) - 3 locations: Shan (45%), Kayah (30%), Kayin (25%)
--   2. MCHIP-AYR (Health) - 1 location: Ayeyarwady (100%)
--   3. CSRVC (Agriculture) - 2 locations: Bago (55%), Sagaing (45%)
--   4. RWSSIP (WASH) - 2 locations: Chin (60%), Magway (40%)
--   5. RRCMAP (Infrastructure) - 2 locations: Mon (50%), Tanintharyi (50%)
--   6. EHADP-RKN (Humanitarian) - 1 location: Rakhine (100%)
--   7. LGPASP (Governance) - 2 locations: Mandalay (50%), Yangon (50%)
--   8. WEEMST (Livelihoods) - 2 locations: Kachin (55%), Shan (45%)
--   9. CMRCCR (Environment) - 2 locations: Ayeyarwady (60%), Tanintharyi (40%)
--   10. MCCT-NS (Social Protection) - 2 locations: Chin (50%), Rakhine (50%)
--
-- All locations are 'coverage' type (area-based, not specific sites)
-- All percentage allocations sum to 100% per activity
--
-- Myanmar State/Region codes used:
--   MMR001 - Ayeyarwady Region
--   MMR002 - Bago Region
--   MMR003 - Chin State
--   MMR004 - Magway Region
--   MMR005 - Mon State
--   MMR006 - Tanintharyi Region
--   MMR007 - Yangon Region
--   MMR008 - Mandalay Region
--   MMR011 - Kachin State
--   MMR012 - Kayah State
--   MMR013 - Kayin State
--   MMR014 - Rakhine State
--   MMR015 - Sagaing Region
--   MMR017 - Shan State
-- ============================================================================
