-- Add 'revenue' and 'liabilities' classification types to budget_classifications table
-- This enables tracking of revenue sources (grants) and liabilities (loans)

-- Drop the existing constraint and create a new one with 'revenue' and 'liabilities' included
ALTER TABLE budget_classifications
DROP CONSTRAINT IF EXISTS budget_classifications_classification_type_check;

ALTER TABLE budget_classifications
ADD CONSTRAINT budget_classifications_classification_type_check
CHECK (classification_type IN ('administrative', 'functional', 'functional_cofog', 'economic', 'programme', 'revenue', 'liabilities'));

-- Add comment explaining the new types
COMMENT ON COLUMN budget_classifications.classification_type IS 'Type: administrative (ministries), functional (national), functional_cofog (COFOG), economic (expense types), programme, revenue (income sources), liabilities (loans/debt)';

-- ============================================================================
-- Insert Revenue Classification Hierarchy
-- ============================================================================

-- Level 1: 13 GRANTS
INSERT INTO budget_classifications (code, name, description, classification_type, level, is_active, sort_order)
VALUES ('13', 'Grants', 'Grants received from development partners', 'revenue', 1, true, 1)
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 2: 131 From Foreign Governments
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '131', 'From foreign Governments', 'Grants from foreign governments', 'revenue', id, 2, true, 1
FROM budget_classifications WHERE code = '13' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 2: 132 From International Organisations
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '132', 'From International Organisations', 'Grants from international organisations', 'revenue', id, 2, true, 2
FROM budget_classifications WHERE code = '13' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 3: 1311 Current (under 131)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '1311', 'Current', 'Current grants from foreign governments', 'revenue', id, 3, true, 1
FROM budget_classifications WHERE code = '131' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 3: 1312 Capital (under 131)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '1312', 'Capital', 'Capital grants from foreign governments', 'revenue', id, 3, true, 2
FROM budget_classifications WHERE code = '131' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 3: 1321 Current (under 132)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '1321', 'Current', 'Current grants from international organisations', 'revenue', id, 3, true, 1
FROM budget_classifications WHERE code = '132' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 3: 1322 Capital (under 132)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '1322', 'Capital', 'Capital grants from international organisations', 'revenue', id, 3, true, 2
FROM budget_classifications WHERE code = '132' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 131101 Donor Funds - Foreign Governments (under 1311 Current)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '131101', 'Donor Funds - Foreign Governments', 'Current donor funds from foreign governments', 'revenue', id, 4, true, 1
FROM budget_classifications WHERE code = '1311' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 131201 Donor Funds - Foreign Governments (under 1312 Capital)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '131201', 'Donor Funds - Foreign Governments', 'Capital donor funds from foreign governments', 'revenue', id, 4, true, 1
FROM budget_classifications WHERE code = '1312' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 132101 Grants from multi-lateral development partners (under 1321 Current)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '132101', 'Grants from multi-lateral development partners', 'Current grants from multi-lateral development partners', 'revenue', id, 4, true, 1
FROM budget_classifications WHERE code = '1321' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 132102 Grants from bilateral development partners (under 1321 Current)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '132102', 'Grants from bilateral development partners', 'Current grants from bilateral development partners', 'revenue', id, 4, true, 2
FROM budget_classifications WHERE code = '1321' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 132201 Grants from multi-lateral development partners (under 1322 Capital)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '132201', 'Grants from multi-lateral development partners', 'Capital grants from multi-lateral development partners', 'revenue', id, 4, true, 1
FROM budget_classifications WHERE code = '1322' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 4: 132202 Grants from bilateral development partners (under 1322 Capital)
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '132202', 'Grants from bilateral development partners', 'Capital grants from bilateral development partners', 'revenue', id, 4, true, 2
FROM budget_classifications WHERE code = '1322' AND classification_type = 'revenue'
ON CONFLICT (code, classification_type) DO NOTHING;

-- ============================================================================
-- Insert Liabilities Classification Hierarchy
-- ============================================================================

-- Level 1: 4113 Loans
INSERT INTO budget_classifications (code, name, description, classification_type, level, is_active, sort_order)
VALUES ('4113', 'Loans', 'Foreign loan obligations', 'liabilities', 1, true, 1)
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 2: 411351 Multi-lateral
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '411351', 'Multi-lateral', 'Multi-lateral loan obligations', 'liabilities', id, 2, true, 1
FROM budget_classifications WHERE code = '4113' AND classification_type = 'liabilities'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 2: 411352 Bilateral
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '411352', 'Bilateral', 'Bilateral loan obligations', 'liabilities', id, 2, true, 2
FROM budget_classifications WHERE code = '4113' AND classification_type = 'liabilities'
ON CONFLICT (code, classification_type) DO NOTHING;

-- Level 2: 411399 Other foreign loans
INSERT INTO budget_classifications (code, name, description, classification_type, parent_id, level, is_active, sort_order)
SELECT '411399', 'Other foreign loans', 'Other foreign loan obligations', 'liabilities', id, 2, true, 3
FROM budget_classifications WHERE code = '4113' AND classification_type = 'liabilities'
ON CONFLICT (code, classification_type) DO NOTHING;
