-- Migration: Add 'funding' role_type to activity_participating_organizations CHECK constraint
-- This allows IATI role="1" (Funding) organizations to be imported
-- IATI Standard Reference: https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/

-- Step 1: Drop existing CHECK constraint
ALTER TABLE activity_participating_organizations 
DROP CONSTRAINT IF EXISTS activity_participating_organizations_role_type_check;

-- Step 2: Add new constraint including 'funding'
ALTER TABLE activity_participating_organizations 
ADD CONSTRAINT activity_participating_organizations_role_type_check 
CHECK (role_type IN ('extending', 'implementing', 'government', 'funding'));

-- Step 3: Add comment for documentation
COMMENT ON CONSTRAINT activity_participating_organizations_role_type_check 
ON activity_participating_organizations IS 
'Ensures role_type is one of: extending, implementing, government, or funding. Maps to IATI role codes: 1=funding, 2=government, 3=extending, 4=implementing';

-- Step 4: Verify the constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'activity_participating_organizations_role_type_check'
        AND contype = 'c'
    ) THEN
        RAISE EXCEPTION 'Constraint was not created successfully';
    END IF;
END $$;

