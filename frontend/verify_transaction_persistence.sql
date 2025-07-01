-- Verify Transaction Persistence
-- Run this in Supabase SQL Editor after creating a test transaction

-- Check the latest transaction
SELECT 
    uuid,
    transaction_type,
    status,
    value,
    currency,
    transaction_date,
    value_date,
    fx_differs,
    transaction_reference,
    description,
    provider_org_name,
    provider_org_ref,
    receiver_org_name,
    receiver_org_ref,
    aid_type,
    flow_type,
    finance_type,
    tied_status,
    disbursement_channel,
    is_humanitarian,
    financing_classification,
    created_by,
    created_at
FROM transactions 
WHERE transaction_reference = 'TEST-PERSIST-001'
ORDER BY created_at DESC
LIMIT 1;

-- Check if all new columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('financing_classification', 'fx_differs', 'created_by', 'activity_iati_ref')
ORDER BY column_name; 