-- Populate missing finance types from activity defaults
-- This script fills in NULL finance_type values with the activity's default_finance_type
-- and marks them as inherited (will show GRAYED OUT in UI)
--
-- LOGIC:
-- - If transaction has NO finance_type but activity has default → Populate and mark inherited (GRAY)
-- - If transaction HAS finance_type at transaction level → Keep as-is, explicit (BLACK)

-- Step 1: Show current state (transactions with NULL finance_type)
SELECT 
  'Before Update - Transactions with NULL finance_type' as status,
  COUNT(*) as total_null_finance_type
FROM transactions t
WHERE t.finance_type IS NULL;

-- Step 2: Show how many will be updated (will show GRAYED in UI)
SELECT 
  'Transactions to populate (will show GRAYED)' as info,
  COUNT(*) as count
FROM transactions t
INNER JOIN activities a ON t.activity_id = a.id
WHERE 
  t.finance_type IS NULL
  AND a.default_finance_type IS NOT NULL;

-- Step 3: Populate missing finance types and mark as inherited
-- These will display GRAYED OUT in the UI
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
  COUNT(CASE WHEN finance_type IS NOT NULL THEN 1 END) as with_finance_type,
  COUNT(CASE WHEN finance_type_inherited = TRUE THEN 1 END) as inherited_grayed,
  COUNT(CASE WHEN finance_type IS NOT NULL AND finance_type_inherited = FALSE THEN 1 END) as explicit_black,
  COUNT(CASE WHEN finance_type IS NULL THEN 1 END) as still_null
FROM transactions;

-- Step 5: Show sample of newly populated transactions (will show GRAYED)
SELECT 
  t.uuid,
  a.title_narrative as activity_title,
  a.default_finance_type as activity_default,
  t.finance_type as transaction_finance_type,
  t.finance_type_inherited,
  'Will show GRAYED in UI' as display_status,
  t.transaction_type,
  t.transaction_date,
  t.value,
  t.currency
FROM transactions t
INNER JOIN activities a ON t.activity_id = a.id
WHERE t.finance_type_inherited = TRUE
ORDER BY t.updated_at DESC
LIMIT 20;



