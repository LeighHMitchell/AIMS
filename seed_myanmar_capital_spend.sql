-- Update capital spend percentages for Myanmar activities
-- Capital spend = percentage of budget going to capital expenditure (infrastructure, equipment, buildings)
-- vs. recurrent costs (salaries, operational expenses, consumables)

-- Activity 1: RPSCTP - Rural Primary School Construction (Education)
-- High capital spend - building schools and purchasing equipment
UPDATE activities SET capital_spend_percentage = 72.50
WHERE id = 'a1000001-0001-4000-8000-000000000001';

-- Activity 2: MCHIP-AYR - Maternal and Child Health (Health - Humanitarian)
-- Moderate capital spend - some medical equipment, but mostly operational (staff, medicines)
UPDATE activities SET capital_spend_percentage = 28.00
WHERE id = 'a1000001-0001-4000-8000-000000000002';

-- Activity 3: CSRVC - Climate-Smart Rice Value Chain (Agriculture)
-- Moderate capital spend - irrigation systems, storage facilities, farm equipment
UPDATE activities SET capital_spend_percentage = 45.25
WHERE id = 'a1000001-0001-4000-8000-000000000003';

-- Activity 4: RWSSIP - Rural Water Supply and Sanitation (WASH)
-- High capital spend - water systems, latrines, pumps, pipelines
UPDATE activities SET capital_spend_percentage = 78.00
WHERE id = 'a1000001-0001-4000-8000-000000000004';

-- Activity 5: RRCMAP - Rural Roads Construction (Infrastructure)
-- Very high capital spend - road construction is almost entirely capital expenditure
UPDATE activities SET capital_spend_percentage = 88.50
WHERE id = 'a1000001-0001-4000-8000-000000000005';

-- Activity 6: EHADP-RKN - Emergency Humanitarian Assistance (Humanitarian)
-- Low capital spend - mostly emergency supplies, food, temporary shelters
UPDATE activities SET capital_spend_percentage = 12.00
WHERE id = 'a1000001-0001-4000-8000-000000000006';

-- Activity 7: LGPASP - Local Governance Strengthening (Governance)
-- Low capital spend - mostly training, technical assistance, staff costs
UPDATE activities SET capital_spend_percentage = 18.75
WHERE id = 'a1000001-0001-4000-8000-000000000007';

-- Activity 8: WEEMST - Women's Economic Empowerment (Livelihoods)
-- Low-moderate capital spend - some equipment for enterprises, mostly training/operational
UPDATE activities SET capital_spend_percentage = 32.00
WHERE id = 'a1000001-0001-4000-8000-000000000008';

-- Activity 9: CMRCCR - Coastal Mangrove Restoration (Environment)
-- Moderate capital spend - nurseries, planting equipment, monitoring infrastructure
UPDATE activities SET capital_spend_percentage = 42.50
WHERE id = 'a1000001-0001-4000-8000-000000000009';

-- Activity 10: MCCT-NS - Maternal and Child Cash Transfer (Social Protection - Humanitarian)
-- Very low capital spend - cash transfers are recurrent, minimal infrastructure needed
UPDATE activities SET capital_spend_percentage = 8.25
WHERE id = 'a1000001-0001-4000-8000-000000000010';
