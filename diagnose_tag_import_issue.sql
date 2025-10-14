-- ========================================
-- IATI Tag Import Diagnostic Script
-- Run this in your Supabase SQL Editor
-- ========================================

-- === STEP 1: Check Tags Table Schema ===
SELECT 
    'Tags Table Schema' as diagnostic_section,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tags'
ORDER BY ordinal_position;

-- === STEP 2: Check Constraints ===
SELECT 
    'Tags Table Constraints' as diagnostic_section,
    conname as constraint_name, 
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
    END as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.tags'::regclass
ORDER BY contype;

-- === STEP 3: Check Indexes ===
SELECT 
    'Tags Table Indexes' as diagnostic_section,
    indexname, 
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'tags'
ORDER BY indexname;

-- === STEP 4: Check Recent Tags ===
SELECT 
    'Recent Tags (Last 10)' as diagnostic_section,
    id, 
    name, 
    vocabulary, 
    code, 
    vocabulary_uri,
    created_at::timestamp(0) as created
FROM tags 
ORDER BY created_at DESC 
LIMIT 10;

-- === STEP 5: Check Activity Tags Links ===
-- Replace YOUR_ACTIVITY_ID with your actual activity ID
/*
SELECT 
    'Activity Tags Links' as diagnostic_section,
    at.activity_id,
    at.tag_id,
    t.name,
    t.vocabulary,
    t.code,
    at.created_at::timestamp(0) as linked_at
FROM activity_tags at
JOIN tags t ON t.id = at.tag_id
WHERE at.activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY at.created_at DESC;
*/

-- === STEP 6: Test Tag Creation ===
-- Try to create a test tag to see what error occurs
-- This will help identify the exact issue

BEGIN;

DO $$
DECLARE
    test_tag_id UUID;
BEGIN
    -- Attempt to insert a test tag with all IATI fields
    INSERT INTO tags (name, vocabulary, code, vocabulary_uri)
    VALUES ('diagnostic-test-tag', '99', 'DIAG-1', 'http://example.com/test')
    RETURNING id INTO test_tag_id;
    
    RAISE NOTICE 'SUCCESS: Test tag created with ID: %', test_tag_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Failed to create test tag';
    RAISE NOTICE 'Error Code: %', SQLSTATE;
    RAISE NOTICE 'Error Message: %', SQLERRM;
END $$;

-- Rollback the test
ROLLBACK;

-- === STEP 7: Check for Missing Columns ===
SELECT 
    'Column Existence Check' as diagnostic_section,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'vocabulary'
    ) THEN 'EXISTS' ELSE 'MISSING' END as vocabulary_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'code'
    ) THEN 'EXISTS' ELSE 'MISSING' END as code_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' AND column_name = 'vocabulary_uri'
    ) THEN 'EXISTS' ELSE 'MISSING' END as vocabulary_uri_column;

-- === STEP 8: Summary ===
SELECT 
    'Summary' as diagnostic_section,
    (SELECT COUNT(*) FROM tags) as total_tags,
    (SELECT COUNT(*) FROM tags WHERE vocabulary IS NOT NULL) as tags_with_vocabulary,
    (SELECT COUNT(*) FROM tags WHERE code IS NOT NULL) as tags_with_code,
    (SELECT COUNT(*) FROM tags WHERE vocabulary_uri IS NOT NULL) as tags_with_uri,
    (SELECT COUNT(DISTINCT vocabulary) FROM tags WHERE vocabulary IS NOT NULL) as unique_vocabularies;

