-- Fix tied_status_enum to match IATI TiedStatus codelist
-- IATI TiedStatus codes:
-- 1 = Tied
-- 2 = Partially tied
-- 3 = Untied
-- 4 = Not reported

-- Step 1: Create a new enum type with correct values
CREATE TYPE tied_status_enum_new AS ENUM ('1', '2', '3', '4');

-- Step 2: Add a temporary column to transactions table
ALTER TABLE transactions ADD COLUMN tied_status_new tied_status_enum_new;

-- Step 3: Migrate existing data to new enum values
UPDATE transactions 
SET tied_status_new = CASE 
    WHEN tied_status = '3' THEN '3'::tied_status_enum_new  -- Untied stays as Untied
    WHEN tied_status = '4' THEN '1'::tied_status_enum_new  -- Old Tied (4) -> New Tied (1)
    WHEN tied_status = '5' THEN '2'::tied_status_enum_new  -- Old Partially tied (5) -> New Partially tied (2)
    ELSE '4'::tied_status_enum_new  -- Default to Not reported
END
WHERE tied_status IS NOT NULL;

-- Step 4: Drop the old column
ALTER TABLE transactions DROP COLUMN tied_status;

-- Step 5: Rename the new column to the original name
ALTER TABLE transactions RENAME COLUMN tied_status_new TO tied_status;

-- Step 6: Drop the old enum type
DROP TYPE tied_status_enum;

-- Step 7: Rename the new enum type to the original name
ALTER TYPE tied_status_enum_new RENAME TO tied_status_enum;

-- Step 8: Update any existing transaction functions to use the new enum values
-- (This would be done for any stored procedures or functions that reference the enum)

-- Step 9: Add comment for documentation
COMMENT ON COLUMN transactions.tied_status IS 'IATI TiedStatus code: 1=Tied, 2=Partially tied, 3=Untied, 4=Not reported';

-- Verify the changes
SELECT 
    tied_status,
    COUNT(*) as count,
    CASE tied_status
        WHEN '1' THEN 'Tied'
        WHEN '2' THEN 'Partially tied'
        WHEN '3' THEN 'Untied'
        WHEN '4' THEN 'Not reported'
    END as label
FROM transactions
WHERE tied_status IS NOT NULL
GROUP BY tied_status
ORDER BY tied_status; 