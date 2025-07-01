-- Check Migration Status
-- Run this to see what parts of the migration have already been applied

-- Check if ENUMs exist
SELECT 
    n.nspname as schema,
    t.typname as type_name,
    CASE t.typtype 
        WHEN 'e' THEN 'enum'
        ELSE 'other'
    END as type_type
FROM pg_type t 
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
WHERE n.nspname = 'public'
    AND t.typname IN (
        'transaction_type_enum',
        'transaction_status_enum', 
        'organization_type_enum',
        'disbursement_channel_enum',
        'flow_type_enum',
        'finance_type_enum',
        'aid_type_enum',
        'tied_status_enum'
    )
ORDER BY t.typname;

-- Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename = 'transactions'
    AND indexname LIKE 'idx_transactions_%'
ORDER BY indexname;

-- Check if transactions table exists and show structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Check if backup table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions_backup'
) as backup_table_exists;

-- Check if transactions_iati table exists (in case migration partially ran)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions_iati'
) as transactions_iati_exists;

-- Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table = 'transactions'; 