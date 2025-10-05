-- Fix Activity ID Field Mapping
-- The @activity-id attribute from IATI XML was incorrectly mapped to activity_id_ref
-- It should be mapped to org_activity_id (organization's own activity identifier)

-- Step 1: Show current data before fix
SELECT 
    id,
    narrative,
    iati_role_code,
    activity_id_ref as "OLD: activity_id_ref (wrong field)",
    org_activity_id as "OLD: org_activity_id (should have data)",
    crs_channel_code,
    created_at
FROM activity_participating_organizations
WHERE activity_id_ref IS NOT NULL
ORDER BY created_at DESC;

-- Step 2: Move data from activity_id_ref to org_activity_id
UPDATE activity_participating_organizations
SET 
    org_activity_id = activity_id_ref,
    activity_id_ref = NULL
WHERE activity_id_ref IS NOT NULL
AND org_activity_id IS NULL;

-- Step 3: Verify the fix
SELECT 
    id,
    narrative,
    iati_role_code,
    activity_id_ref as "NEW: activity_id_ref (should be NULL)",
    org_activity_id as "NEW: org_activity_id (should have data)",
    crs_channel_code,
    updated_at
FROM activity_participating_organizations
WHERE org_activity_id IS NOT NULL
ORDER BY updated_at DESC;

-- Step 4: Summary
SELECT 
    COUNT(*) as total_records,
    COUNT(org_activity_id) as records_with_org_activity_id,
    COUNT(activity_id_ref) as records_with_activity_id_ref
FROM activity_participating_organizations;

/*
EXPLANATION:
============

IATI Standard:
--------------
<participating-org @activity-id="XX-XXX-123">
  This is the identifier that the PARTICIPATING organisation uses for this activity
  in their own IATI dataset.

Database Mapping:
-----------------
- org_activity_id: Organization's own activity identifier (@activity-id attribute)
- activity_id_ref: A related activity's IATI identifier (different concept, rarely used)

The Fix:
--------
This script moves values from activity_id_ref to org_activity_id for records that were
imported before the fix was applied.

After running this script, the modal will show:
✅ "Activity ID (Organisation's Own Reference)" = AA-AAA-123456789-1234
✅ "Related Activity IATI Identifier" = (empty, as expected)
*/
