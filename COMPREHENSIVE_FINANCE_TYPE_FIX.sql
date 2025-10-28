-- ============================================
-- COMPREHENSIVE FINANCE TYPE FIX
-- Fix ALL activities with empty string default_finance_type
-- ============================================

BEGIN;

-- Step 1: Check current state - find all affected activities
SELECT '========== SCANNING ALL ACTIVITIES ===========' AS info;
SELECT 
    COUNT(*) as total_activities,
    COUNT(CASE WHEN default_finance_type = '' THEN 1 END) as empty_string_count,
    COUNT(CASE WHEN default_finance_type IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN default_finance_type IS NOT NULL AND default_finance_type != '' THEN 1 END) as valid_value_count
FROM activities;

-- Step 2: Show affected activities
SELECT '========== AFFECTED ACTIVITIES ===========' AS info;
SELECT 
    id,
    title_narrative,
    default_finance_type,
    CASE 
        WHEN default_finance_type = '' THEN '⚠ EMPTY STRING (will be fixed)'
        WHEN default_finance_type IS NULL THEN 'NULL (OK)'
        ELSE 'VALUE: ' || default_finance_type
    END as status
FROM activities 
WHERE default_finance_type = ''
ORDER BY updated_at DESC
LIMIT 20;

-- Step 3: Convert ALL empty strings to NULL
SELECT '========== CLEANING EMPTY STRINGS ===========' AS info;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE activities 
  SET default_finance_type = NULL
  WHERE default_finance_type = '';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✓ Updated % activities', updated_count;
END $$;

-- Step 4: Drop old constraint if exists
SELECT '========== UPDATING CONSTRAINT ===========' AS info;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_finance_type;

-- Step 5: Create new constraint that allows both NULL and empty strings
-- (empty strings will be auto-converted by trigger)
ALTER TABLE activities ADD CONSTRAINT check_valid_finance_type 
CHECK (
    default_finance_type IS NULL OR 
    default_finance_type = '' OR  -- Allow empty strings (will be converted to NULL by trigger)
    default_finance_type IN (
        '1', '2', '3', '4',
        '110', '111', '210', '211', '310', '311',
        '410', '411', '412', '413', '414',
        '421', '422', '423', '424', '425',
        '431', '432', '433',
        '451', '452', '453',
        '510', '511', '512', '520', '530',
        '610', '611', '612', '613', '614', '615', '616', '617', '618',
        '620', '621', '622', '623', '624', '625', '626', '627',
        '630', '631', '632', '633', '634', '635', '636', '637', '638', '639',
        '710', '711', '712',
        '810', '811',
        '910', '911', '912', '913',
        '1100'
    )
);

SELECT '✓ Constraint updated to handle empty strings' AS result;

-- Step 6: Create trigger to auto-convert empty strings to NULL
SELECT '========== CREATING TRIGGER ===========' AS info;

CREATE OR REPLACE FUNCTION clean_finance_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-convert empty strings to NULL
    IF NEW.default_finance_type = '' THEN
        NEW.default_finance_type = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS clean_finance_type_trigger ON activities;

-- Create new trigger
CREATE TRIGGER clean_finance_type_trigger
    BEFORE INSERT OR UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION clean_finance_type();

SELECT '✓ Trigger created to auto-clean empty strings on INSERT/UPDATE' AS result;

-- Step 7: Final verification
SELECT '========== FINAL VERIFICATION ===========' AS info;
SELECT 
    COUNT(*) as total_activities,
    COUNT(CASE WHEN default_finance_type = '' THEN 1 END) as empty_string_count,
    COUNT(CASE WHEN default_finance_type IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN default_finance_type IS NOT NULL AND default_finance_type != '' THEN 1 END) as valid_value_count
FROM activities;

-- Verify no empty strings remain
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ SUCCESS! No empty strings found - all activities are clean!'
        ELSE '⚠ WARNING: ' || COUNT(*) || ' activities still have empty strings'
    END as verification_result
FROM activities
WHERE default_finance_type = '';

COMMIT;

-- Final Summary
SELECT '========== FIX COMPLETED ===========' AS final_message;
SELECT 'All empty string finance types converted to NULL' AS step1;
SELECT 'Database constraint updated to allow temporary empty strings' AS step2;
SELECT 'Trigger created to prevent future empty strings' AS step3;
SELECT 'API endpoints should now work correctly!' AS step4;

