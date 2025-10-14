-- Migration: Rename organisation_type to Organisation_Type_Code and add Organisation_Type_Name
-- This migration aligns the organizations table with IATI standard organization type codes and names
-- Run this in your Supabase SQL Editor

-- Step 1: Add the new Organisation_Type_Name column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS "Organisation_Type_Name" TEXT;

-- Step 2: Populate the Organisation_Type_Name column based on existing organisation_type codes
-- Using the IATI standard organization type names
UPDATE organizations
SET "Organisation_Type_Name" = CASE organisation_type
    WHEN '10' THEN 'Government'
    WHEN '11' THEN 'Local Government'
    WHEN '15' THEN 'Other Public Sector'
    WHEN '21' THEN 'International NGO'
    WHEN '22' THEN 'National NGO'
    WHEN '23' THEN 'Regional NGO'
    WHEN '24' THEN 'Partner Country based NGO'
    WHEN '30' THEN 'Public Private Partnership'
    WHEN '40' THEN 'Multilateral'
    WHEN '60' THEN 'Foundation'
    WHEN '70' THEN 'Private Sector'
    WHEN '71' THEN 'Private Sector in Provider Country'
    WHEN '72' THEN 'Private Sector in Aid Recipient Country'
    WHEN '73' THEN 'Private Sector in Third Country'
    WHEN '80' THEN 'Academic, Training and Research'
    WHEN '90' THEN 'Other'
    ELSE NULL
END
WHERE organisation_type IS NOT NULL;

-- Step 3: Rename the organisation_type column to Organisation_Type_Code
ALTER TABLE organizations 
RENAME COLUMN organisation_type TO "Organisation_Type_Code";

-- Step 4: Add comment documentation for the new columns
COMMENT ON COLUMN organizations."Organisation_Type_Code" IS 'IATI organization type code (e.g., 10, 11, 21, etc.)';
COMMENT ON COLUMN organizations."Organisation_Type_Name" IS 'IATI organization type name (e.g., Government, Multilateral, etc.)';

-- Step 5: Create index on Organisation_Type_Code for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_type_code ON organizations("Organisation_Type_Code");

-- Step 6: Create index on Organisation_Type_Name for filtering
CREATE INDEX IF NOT EXISTS idx_organizations_type_name ON organizations("Organisation_Type_Name");

-- Verification queries (uncomment to run after migration)
-- SELECT "Organisation_Type_Code", "Organisation_Type_Name", COUNT(*) 
-- FROM organizations 
-- WHERE "Organisation_Type_Code" IS NOT NULL
-- GROUP BY "Organisation_Type_Code", "Organisation_Type_Name"
-- ORDER BY "Organisation_Type_Code";

-- Check for any NULL values that might need attention
-- SELECT id, name, "Organisation_Type_Code", "Organisation_Type_Name"
-- FROM organizations 
-- WHERE "Organisation_Type_Code" IS NOT NULL AND "Organisation_Type_Name" IS NULL;

