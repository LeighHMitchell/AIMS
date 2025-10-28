-- ============================================
-- ULTIMATE FIX - Handle both NULL and empty strings
-- ============================================

BEGIN;

-- Step 1: Check current value on the failing activity
SELECT '========== CURRENT ACTIVITY DATA ===========' AS info;
SELECT 
    id,
    title_narrative,
    default_finance_type,
    CASE 
        WHEN default_finance_type IS NULL THEN 'NULL'
        WHEN default_finance_type = '' THEN 'EMPTY STRING (this is the problem!)'
        ELSE 'VALUE: ' || default_finance_type
    END as finance_type_status,
    length(default_finance_type) as string_length
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

-- Step 2: Force the value to NULL (not empty string)
SELECT '========== CLEARING TO NULL ===========' AS info;
UPDATE activities 
SET default_finance_type = NULL
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

-- Step 3: Drop old constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_finance_type;

-- Step 4: Create new constraint that handles BOTH NULL and empty strings
ALTER TABLE activities ADD CONSTRAINT check_valid_finance_type 
CHECK (
    default_finance_type IS NULL OR 
    default_finance_type = '' OR  -- Allow empty strings (will be converted to NULL)
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

SELECT 'Constraint updated to handle empty strings!' AS result;

-- Step 5: Create a trigger to auto-convert empty strings to NULL
CREATE OR REPLACE FUNCTION clean_finance_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_finance_type = '' THEN
        NEW.default_finance_type = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clean_finance_type_trigger ON activities;
CREATE TRIGGER clean_finance_type_trigger
    BEFORE INSERT OR UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION clean_finance_type();

SELECT 'Trigger created to auto-clean empty strings!' AS result;

COMMIT;

-- Final verification
SELECT '========== FINAL VERIFICATION ===========' AS info;
SELECT 
    id,
    title_narrative,
    default_finance_type,
    CASE 
        WHEN default_finance_type IS NULL THEN '✓ NULL - Ready to publish!'
        ELSE '⚠ VALUE: ' || default_finance_type
    END as status
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

SELECT '========== SUCCESS! ===========' AS final_message;
SELECT 'Activity cleared and constraint updated. Publishing should now work!' AS instructions;

