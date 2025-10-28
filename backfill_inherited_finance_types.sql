-- Standalone script to populate missing finance types from activity defaults
-- Run this immediately to see inherited finance types greyed out in the UI
--
-- LOGIC:
-- - If transaction has NO finance_type but activity has default → Populate and mark inherited (GRAY)
-- - If transaction HAS finance_type at transaction level → Keep as-is, explicit (BLACK)

-- Step 1: Show current state
SELECT 
  'Before Update' as status,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN finance_type IS NULL THEN 1 END) as null_finance_type,
  COUNT(CASE WHEN finance_type IS NOT NULL THEN 1 END) as with_finance_type,
  COUNT(CASE WHEN finance_type_inherited = TRUE THEN 1 END) as currently_inherited
FROM transactions;

-- Step 2: Show transactions with NULL finance_type that will be populated (will show GRAYED)
SELECT 
  'Transactions to populate (will show GRAYED)' as info,
  COUNT(*) as count
FROM transactions t
INNER JOIN activities a ON t.activity_id = a.id
WHERE 
  t.finance_type IS NULL
  AND a.default_finance_type IS NOT NULL;

-- Step 3: Populate missing finance types from activity defaults and mark as inherited
-- These will show GRAYED OUT in the UI
UPDATE transactions t
SET 
  finance_type = a.default_finance_type::finance_type_enum,
  finance_type_inherited = TRUE,
  updated_at = CURRENT_TIMESTAMP
FROM activities a
WHERE 
  t.activity_id = a.id
  AND t.finance_type IS NULL
  AND a.default_finance_type IS NOT NULL;

-- Step 4: Show updated state
SELECT 
  'After Update' as status,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN finance_type_inherited = TRUE THEN 1 END) as now_inherited,
  COUNT(CASE WHEN finance_type IS NOT NULL AND finance_type_inherited = TRUE THEN 1 END) as inherited_with_finance_type
FROM transactions;

-- Step 5: Show sample of updated transactions
SELECT 
  t.uuid,
  a.title_narrative as activity_title,
  t.finance_type,
  a.default_finance_type,
  t.finance_type_inherited,
  t.transaction_date,
  t.value,
  t.currency
FROM transactions t
INNER JOIN activities a ON t.activity_id = a.id
WHERE t.finance_type_inherited = TRUE
ORDER BY t.transaction_date DESC
LIMIT 20;

