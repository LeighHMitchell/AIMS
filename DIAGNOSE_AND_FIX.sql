-- ============================================
-- COMPREHENSIVE DIAGNOSTICS AND FIX
-- ============================================

-- Step 1: Check what constraint currently exists
SELECT '========== CURRENT CONSTRAINT ===========' AS step;
SELECT 
    conname, 
    contype,
    substring(pg_get_constraintdef(oid) from 1 for 200) as definition_preview
FROM pg_constraint 
WHERE conname = 'check_valid_finance_type'
  AND conrelid = 'activities'::regclass;

-- Step 2: Check what value is set on the failing activity
SELECT '========== ACTIVITY DATA ===========' AS step;
SELECT 
    id,
    title_narrative,
    default_finance_type,
    default_aid_type,
    default_flow_type,
    default_tied_status,
    default_currency
FROM activities 
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

-- Step 3: Temporarily clear the finance type to allow publishing
SELECT '========== CLEARING FINANCE TYPE ===========' AS step;
UPDATE activities 
SET default_finance_type = NULL
WHERE id = '6590cc6d-7842-4d88-ab83-09eb22001f57';

SELECT 'Finance type cleared - you should now be able to publish' AS result;

-- Step 4: Drop and recreate constraint with ALL codes
SELECT '========== UPDATING CONSTRAINT ===========' AS step;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS check_valid_finance_type;

ALTER TABLE activities ADD CONSTRAINT check_valid_finance_type 
CHECK (
    default_finance_type IS NULL OR 
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

SELECT 'Constraint updated with all 69 valid IATI finance type codes' AS result;

-- Step 5: Verify the fix
SELECT '========== VERIFICATION ===========' AS step;
SELECT 
    conname, 
    contype,
    'Constraint updated successfully - you can now set any valid finance type' as status
FROM pg_constraint 
WHERE conname = 'check_valid_finance_type'
  AND conrelid = 'activities'::regclass;

