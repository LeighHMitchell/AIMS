-- Populate missing finance types from activity defaults
-- 
-- LOGIC:
-- - If transaction has NO finance_type but activity has default → Populate and mark inherited (shows GRAY)
-- - If transaction HAS finance_type at transaction level → Keep as-is, explicit (shows BLACK)

BEGIN;

-- Populate missing finance types from activity defaults and mark as inherited
-- These will display GRAYED OUT in the UI to indicate they're inherited
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

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled finance_type_inherited flag for % transactions', updated_count;
END $$;

COMMIT;

-- Create a comment to document this migration
COMMENT ON COLUMN transactions.finance_type_inherited IS 
'Indicates whether the finance_type was inherited from the activity default_finance_type (TRUE) or explicitly set at the transaction level (FALSE). Backfilled on 2025-01-28.';
