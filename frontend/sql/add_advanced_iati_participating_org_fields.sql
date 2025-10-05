-- Migration: Add advanced IATI fields to activity_participating_organizations
-- Run this in your Supabase SQL Editor
-- IATI Standard Reference: https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/

-- Step 1: Add advanced IATI fields to activity_participating_organizations table
ALTER TABLE activity_participating_organizations 
ADD COLUMN IF NOT EXISTS narratives JSONB,                    -- Array of multilingual names with language codes
ADD COLUMN IF NOT EXISTS org_activity_id VARCHAR(200),        -- Organisation's own activity reference
ADD COLUMN IF NOT EXISTS reporting_org_ref VARCHAR(200),      -- Reporting organisation reference
ADD COLUMN IF NOT EXISTS secondary_reporter BOOLEAN DEFAULT false; -- Secondary reporter flag

-- Step 2: Add comments for documentation
COMMENT ON COLUMN activity_participating_organizations.narratives IS 
'JSONB array of multilingual organization names. Format: [{"lang": "fr", "text": "Nom de l''agence"}, {"lang": "es", "text": "Nombre de la agencia"}]';

COMMENT ON COLUMN activity_participating_organizations.org_activity_id IS 
'Identifier used by this participating organisation for the same activity in their own IATI dataset. Corresponds to @activity-id attribute.';

COMMENT ON COLUMN activity_participating_organizations.reporting_org_ref IS 
'The IATI organisation identifier for the organisation publishing this activity. Corresponds to @ref attribute in reporting-org.';

COMMENT ON COLUMN activity_participating_organizations.secondary_reporter IS 
'Flag indicating if this organisation is reporting on behalf of another entity. Corresponds to @secondary-reporter attribute.';

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participating_orgs_org_activity_id 
ON activity_participating_organizations(org_activity_id);

CREATE INDEX IF NOT EXISTS idx_participating_orgs_reporting_org_ref 
ON activity_participating_organizations(reporting_org_ref);

CREATE INDEX IF NOT EXISTS idx_participating_orgs_secondary_reporter 
ON activity_participating_organizations(secondary_reporter);

-- Step 4: Add constraints for data validation
-- IATI ID format: ^[A-Z]{2}-[A-Z0-9]{3,}-[A-Z0-9-]+$
-- Drop constraints first if they exist to avoid errors
ALTER TABLE activity_participating_organizations 
DROP CONSTRAINT IF EXISTS check_org_activity_id_format;

ALTER TABLE activity_participating_organizations 
DROP CONSTRAINT IF EXISTS check_reporting_org_ref_format;

-- Add the constraints
ALTER TABLE activity_participating_organizations 
ADD CONSTRAINT check_org_activity_id_format 
CHECK (org_activity_id IS NULL OR org_activity_id ~ '^[A-Z]{2}-[A-Z0-9]{3,}-[A-Z0-9-]+$');

ALTER TABLE activity_participating_organizations 
ADD CONSTRAINT check_reporting_org_ref_format 
CHECK (reporting_org_ref IS NULL OR reporting_org_ref ~ '^[A-Z]{2}-[A-Z0-9]{3,}-[A-Z0-9-]+$');

-- Step 5: Verify the changes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'activity_participating_organizations'
AND column_name IN ('narratives', 'org_activity_id', 'reporting_org_ref', 'secondary_reporter')
ORDER BY column_name;

-- Step 6: Check constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
AND constraint_name IN ('check_org_activity_id_format', 'check_reporting_org_ref_format');
