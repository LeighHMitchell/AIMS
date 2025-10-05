-- Migration: Add IATI-compliant fields to activity_participating_organizations
-- Run this in your Supabase SQL Editor
-- IATI Standard Reference: https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/participating-org/

-- Step 1: Add IATI-compliant fields to activity_participating_organizations table
ALTER TABLE activity_participating_organizations 
ADD COLUMN IF NOT EXISTS iati_org_ref VARCHAR(200),           -- @ref attribute: Organization's IATI identifier
ADD COLUMN IF NOT EXISTS org_type VARCHAR(10),                -- @type attribute: Organization type code
ADD COLUMN IF NOT EXISTS activity_id_ref VARCHAR(200),        -- @activity-id attribute: Related activity IATI ID
ADD COLUMN IF NOT EXISTS crs_channel_code VARCHAR(10),        -- @crs-channel-code attribute: OECD-DAC channel code
ADD COLUMN IF NOT EXISTS narrative TEXT,                      -- <narrative> element content
ADD COLUMN IF NOT EXISTS narrative_lang VARCHAR(10);          -- xml:lang attribute for narrative

-- Step 2: Add comments for documentation
COMMENT ON COLUMN activity_participating_organizations.iati_org_ref IS 
'IATI organization identifier (e.g., GB-COH-1234567). Corresponds to @ref attribute in IATI XML.';

COMMENT ON COLUMN activity_participating_organizations.org_type IS 
'IATI organization type code (e.g., 10 = Government, 21 = International NGO). Corresponds to @type attribute.';

COMMENT ON COLUMN activity_participating_organizations.activity_id_ref IS 
'IATI identifier of related activity if the organization also reports it. Corresponds to @activity-id attribute.';

COMMENT ON COLUMN activity_participating_organizations.crs_channel_code IS 
'OECD-DAC CRS channel code, used mainly by bilateral donors. Corresponds to @crs-channel-code attribute.';

COMMENT ON COLUMN activity_participating_organizations.narrative IS 
'Organization name as it appears in IATI XML <narrative> element.';

COMMENT ON COLUMN activity_participating_organizations.narrative_lang IS 
'Language code for the narrative (e.g., en, fr, es). Defaults to "en" if not specified.';

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participating_orgs_iati_ref 
ON activity_participating_organizations(iati_org_ref);

CREATE INDEX IF NOT EXISTS idx_participating_orgs_org_type 
ON activity_participating_organizations(org_type);

-- Step 4: Set default language to 'en' for existing records
UPDATE activity_participating_organizations 
SET narrative_lang = 'en'
WHERE narrative_lang IS NULL;

-- Step 5: Auto-populate IATI fields from organizations table for existing records
UPDATE activity_participating_organizations apo
SET 
    iati_org_ref = o.iati_org_id,
    org_type = o.organisation_type,
    narrative = o.name
FROM organizations o
WHERE apo.organization_id = o.id
AND (apo.iati_org_ref IS NULL OR apo.narrative IS NULL);

-- Step 6: Verify the changes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_participating_organizations'
AND column_name IN ('iati_org_ref', 'org_type', 'activity_id_ref', 'crs_channel_code', 'narrative', 'narrative_lang')
ORDER BY column_name;

-- Step 7: Check sample data
SELECT 
    apo.id,
    o.name as organization_name,
    apo.role_type,
    apo.iati_role_code,
    apo.iati_org_ref,
    apo.org_type,
    apo.narrative
FROM activity_participating_organizations apo
LEFT JOIN organizations o ON apo.organization_id = o.id
LIMIT 5;


