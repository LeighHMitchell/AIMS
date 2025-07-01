-- Check current transactions table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Check if required columns exist
SELECT 
    'financing_classification' as column_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'financing_classification') as exists
UNION ALL
SELECT 
    'fx_differs',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fx_differs')
UNION ALL
SELECT 
    'created_by',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by')
UNION ALL
SELECT 
    'provider_org_type',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'provider_org_type')
UNION ALL
SELECT 
    'receiver_org_type',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'receiver_org_type')
ORDER BY column_name; 