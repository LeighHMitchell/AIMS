-- Comprehensive check of transactions table current state

-- 1. Check which columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name IN (
    'financing_classification',
    'fx_differs',
    'created_by',
    'activity_iati_ref',
    'provider_org_type',
    'receiver_org_type',
    'provider_org_ref',
    'receiver_org_ref',
    'value_date',
    'transaction_reference',
    'disbursement_channel',
    'flow_type',
    'finance_type',
    'aid_type',
    'tied_status',
    'is_humanitarian'
)
ORDER BY column_name;

-- 2. Check existing constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
AND conname LIKE '%financing%';

-- 3. Check if trigger exists
SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'transactions'::regclass
AND tgname = 'enforce_value_date_logic';

-- 4. Summary of what needs to be added
WITH existing_cols AS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'transactions'
)
SELECT 
    'financing_classification' as needed_column,
    EXISTS (SELECT 1 FROM existing_cols WHERE column_name = 'financing_classification') as exists
UNION ALL
SELECT 'fx_differs', EXISTS (SELECT 1 FROM existing_cols WHERE column_name = 'fx_differs')
UNION ALL
SELECT 'created_by', EXISTS (SELECT 1 FROM existing_cols WHERE column_name = 'created_by')
UNION ALL
SELECT 'activity_iati_ref', EXISTS (SELECT 1 FROM existing_cols WHERE column_name = 'activity_iati_ref')
ORDER BY needed_column; 