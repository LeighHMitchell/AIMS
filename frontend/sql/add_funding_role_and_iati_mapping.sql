-- Migration: Add funding role and IATI role code mapping
-- Run this in your Supabase SQL Editor

-- Step 1: Update the check constraint to include 'funding'
ALTER TABLE activity_participating_organizations 
DROP CONSTRAINT IF EXISTS activity_participating_organizations_role_type_check;

ALTER TABLE activity_participating_organizations 
ADD CONSTRAINT activity_participating_organizations_role_type_check 
CHECK (role_type IN ('extending', 'implementing', 'government', 'funding'));

-- Step 2: Add IATI role code column
ALTER TABLE activity_participating_organizations 
ADD COLUMN IF NOT EXISTS iati_role_code INTEGER;

-- Step 3: Add constraint for IATI role codes (drop first if exists)
ALTER TABLE activity_participating_organizations 
DROP CONSTRAINT IF EXISTS check_iati_role_code;

ALTER TABLE activity_participating_organizations 
ADD CONSTRAINT check_iati_role_code 
CHECK (iati_role_code IS NULL OR (iati_role_code >= 1 AND iati_role_code <= 4));

-- Step 4: Auto-populate IATI role codes from existing role_type
UPDATE activity_participating_organizations 
SET iati_role_code = CASE 
    WHEN role_type = 'funding' THEN 1
    WHEN role_type = 'government' THEN 2
    WHEN role_type = 'extending' THEN 3
    WHEN role_type = 'implementing' THEN 4
    ELSE 4
END
WHERE iati_role_code IS NULL;

-- Step 5: Add index for performance (drop first if exists)
DROP INDEX IF EXISTS idx_activity_participating_orgs_iati_role_code;
CREATE INDEX IF NOT EXISTS idx_activity_participating_orgs_iati_role_code 
ON activity_participating_organizations(iati_role_code);

-- Step 6: Verify the changes
SELECT 
    role_type,
    iati_role_code,
    COUNT(*) as count
FROM activity_participating_organizations 
GROUP BY role_type, iati_role_code
ORDER BY role_type;
