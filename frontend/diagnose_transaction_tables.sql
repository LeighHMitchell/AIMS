-- Diagnostic Script for Transaction Tables
-- Run this to understand the current state of your database

-- 1. Check which transaction-related tables exist
SELECT 
    'transactions' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
    ) as exists
UNION ALL
SELECT 
    'transactions_backup' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_backup'
    ) as exists
UNION ALL
SELECT 
    'transactions_iati' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_iati'
    ) as exists;

-- 2. If transactions table exists, show its structure
SELECT 
    'Current transactions table structure:' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 3. Check if transactions table has old or new structure
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'uuid'
            AND table_schema = 'public'
        ) THEN 'NEW IATI structure (has uuid column)'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'id'
            AND table_schema = 'public'
        ) THEN 'OLD structure (has id column)'
        ELSE 'UNKNOWN structure'
    END as transactions_structure;

-- 4. Count records in each table
SELECT 
    'transactions' as table_name,
    (SELECT COUNT(*) FROM transactions) as record_count
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
);

-- 5. Check which ENUMs exist
SELECT 
    'ENUMs created:' as info;
    
SELECT 
    t.typname as enum_name,
    'EXISTS' as status
FROM pg_type t 
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
WHERE n.nspname = 'public'
    AND t.typtype = 'e'
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