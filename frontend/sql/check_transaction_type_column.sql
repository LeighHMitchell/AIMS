-- Check transaction_type column details
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'transaction_type';

-- Check if transaction_type_enum exists
SELECT 
    typname, 
    typtype,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'transaction_type_enum'
GROUP BY typname, typtype;

-- Check constraints on transaction_type column
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'transactions'
AND c.contype = 'c'
AND pg_get_constraintdef(c.oid) LIKE '%transaction_type%'; 