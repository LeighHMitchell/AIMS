-- ============================================================================
-- UPDATE: Set Humanitarian Flags for Myanmar Activities
-- ============================================================================
-- This script sets humanitarian = true for 3 out of 10 activities (30%)
-- ============================================================================

-- Activity 2: MCHIP-AYR (Maternal and Child Health)
-- Health programs in vulnerable areas often have humanitarian components
UPDATE activities
SET humanitarian = true
WHERE id = 'a1000001-0001-4000-8000-000000000002';

-- Activity 6: EHADP-RKN (Emergency Humanitarian Assistance)
-- Already set to true in the original seed, but ensuring it's set
UPDATE activities
SET humanitarian = true
WHERE id = 'a1000001-0001-4000-8000-000000000006';

-- Activity 10: MCCT-NS (Cash Transfer Program)
-- Cash transfers in food-insecure areas have humanitarian objectives
UPDATE activities
SET humanitarian = true
WHERE id = 'a1000001-0001-4000-8000-000000000010';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Humanitarian activities (3 of 10 = 30%):
--   2. MCHIP-AYR - Maternal and Child Health Improvement Program
--   6. EHADP-RKN - Emergency Humanitarian Assistance - Rakhine
--   10. MCCT-NS - Maternal and Child Cash Transfer Program
--
-- Non-humanitarian activities (7 of 10 = 70%):
--   1. RPSCTP - Rural Primary School Construction (Education)
--   3. CSRVC - Climate-Smart Rice Value Chain (Agriculture)
--   4. RWSSIP - Rural Water Supply and Sanitation (WASH)
--   5. RRCMAP - Rural Roads Connectivity (Infrastructure)
--   7. LGPASP - Local Governance Capacity Building (Governance)
--   8. WEEMST - Women's Economic Empowerment (Livelihoods)
--   9. CMRCCR - Coastal Mangrove Restoration (Environment)
-- ============================================================================
