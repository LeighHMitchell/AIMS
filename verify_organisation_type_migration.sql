-- Verification Queries for Organisation Type Migration
-- Run these queries after applying the migration to verify everything worked correctly

-- 1. Check that the new columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations' 
    AND column_name IN ('Organisation_Type_Code', 'Organisation_Type_Name')
ORDER BY column_name;

-- Expected output: Two rows showing both new columns exist

-- 2. Check data distribution across organization types
SELECT 
    "Organisation_Type_Code" as code,
    "Organisation_Type_Name" as name,
    COUNT(*) as organization_count
FROM organizations 
WHERE "Organisation_Type_Code" IS NOT NULL
GROUP BY "Organisation_Type_Code", "Organisation_Type_Name"
ORDER BY "Organisation_Type_Code";

-- Expected output: All codes should have matching names

-- 3. Check for organizations with codes but missing names (should be empty)
SELECT 
    id,
    name,
    "Organisation_Type_Code",
    "Organisation_Type_Name"
FROM organizations 
WHERE "Organisation_Type_Code" IS NOT NULL 
    AND "Organisation_Type_Name" IS NULL
LIMIT 10;

-- Expected output: No rows (or empty result)

-- 4. Check for organizations with names but missing codes (should be empty)
SELECT 
    id,
    name,
    "Organisation_Type_Code",
    "Organisation_Type_Name"
FROM organizations 
WHERE "Organisation_Type_Name" IS NOT NULL 
    AND "Organisation_Type_Code" IS NULL
LIMIT 10;

-- Expected output: No rows (or empty result)

-- 5. Verify organization_types reference table has all IATI codes
SELECT 
    code,
    label as name,
    description,
    category,
    sort_order
FROM organization_types 
WHERE is_active = true
ORDER BY sort_order;

-- Expected output: 16 rows with codes: 10, 11, 15, 21, 22, 23, 24, 30, 40, 60, 70, 71, 72, 73, 80, 90

-- 6. Check that the old column no longer exists
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'organizations' 
    AND column_name = 'organisation_type';

-- Expected output: No rows (column should not exist)

-- 7. Sample data check - View first 10 organizations with their types
SELECT 
    id,
    name,
    acronym,
    "Organisation_Type_Code",
    "Organisation_Type_Name",
    country_represented
FROM organizations 
WHERE "Organisation_Type_Code" IS NOT NULL
ORDER BY name
LIMIT 10;

-- Expected output: Organizations with both code and name populated

-- 8. Check indexes were created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'organizations' 
    AND indexname LIKE '%type%'
ORDER BY indexname;

-- Expected output: Should include idx_organizations_type_code and idx_organizations_type_name

-- 9. Count total organizations vs organizations with type data
SELECT 
    COUNT(*) as total_organizations,
    COUNT("Organisation_Type_Code") as orgs_with_code,
    COUNT("Organisation_Type_Name") as orgs_with_name,
    COUNT(*) - COUNT("Organisation_Type_Code") as orgs_without_type
FROM organizations;

-- Expected output: Should show most/all organizations have type data

-- 10. Test query performance (should use index)
EXPLAIN ANALYZE
SELECT id, name, "Organisation_Type_Code", "Organisation_Type_Name"
FROM organizations
WHERE "Organisation_Type_Code" = '40'
LIMIT 100;

-- Expected output: Should show "Index Scan" or "Bitmap Index Scan" using idx_organizations_type_code

-- SUCCESS CRITERIA:
-- ✓ Both new columns exist (queries 1, 6)
-- ✓ All codes have corresponding names (queries 2, 3, 4)
-- ✓ organization_types table has all 16 IATI codes (query 5)
-- ✓ Old column doesn't exist (query 6)
-- ✓ Sample data looks correct (query 7)
-- ✓ Indexes created (query 8)
-- ✓ Data completeness acceptable (query 9)
-- ✓ Index is being used (query 10)

