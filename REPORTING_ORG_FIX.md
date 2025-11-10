# Reporting Organization Import Fix - COMPLETE

## Issue
When importing IATI activities using "Import as Reporting Org", the "Reported by" column in the activities list was showing "Unknown" instead of the reporting organization name (e.g., "United Nations Office for the Coordination of Humanitarian Affairs").

The user was logging in as AFD but importing activities reported by OCHA. The system was setting `created_by_org` to AFD (the logged-in user's org) instead of OCHA (the reporting org from the IATI XML).

## Root Cause
There were TWO issues:

1. **Regular Activity Update Endpoint** (`/api/activities/[id]`) - When updating an existing activity:
   - Was NOT checking for reporting org fields in the request
   - Was NOT finding/creating the reporting organization
   - Was NOT updating the activity's `reporting_org_id` and related fields

2. **Frontend Import Processing** (`IatiImportTab.tsx`):
   - Was NOT sending reporting org fields to the backend during import
   - Missing case in the switch statement for "Reporting Organization" field

**Note**: The `created_by_org` column does not exist in the activities table. The system uses `reporting_org_id` along with `created_by_org_name` and `created_by_org_acronym` text fields.

## Solution Implemented

### 1. Regular Activity Update Endpoint Fix (Backend)
Added reporting org handling to the PATCH endpoint used for updating activities:

**File:** `frontend/src/app/api/activities/[id]/route.ts`

**Changes:**
- Check if `reporting_org_name` or `reporting_org_ref` are provided in the request body
- Search for existing organization by IATI org ID, name, or alias
- Create the organization if it doesn't exist
- Update activity with `created_by_org`, `reporting_org_id`, and related fields

**Code location:** Lines 39-90, 145-159

**Key Logic:**
```javascript
// Check if reporting org fields are provided
if (body.reporting_org_name || body.reportingOrgName) {
  const reportingOrgName = body.reporting_org_name || body.reportingOrgName;
  const reportingOrgRef = body.reporting_org_ref || body.reportingOrgRef;

  // Try to find existing org
  const { data: existingOrgs } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name, iati_org_id, aliases, acronym')
    .or(`iati_org_id.eq.${reportingOrgRef},name.ilike.${reportingOrgName}...`);

  // If found, use it; otherwise create it
  if (matchingOrg) {
    reportingOrgId = matchingOrg.id;
  } else {
    // Create new org...
  }

  // Add to activity update
  activityFields.reporting_org_id = reportingOrgId;
  activityFields.created_by_org_name = reportingOrgName;
  activityFields.created_by_org_acronym = reportingOrgAcronym;
  // etc...
}
```

### 2. Frontend Import Processing Fix
Added reporting organization field processing to send data to backend:

**File:** `frontend/src/components/activities/IatiImportTab.tsx`

**Changes:**
- Added case for "Reporting Organization" in the field processing switch statement
- Extracts `name`, `narrative`, and `ref` from the importValue object
- Adds `reporting_org_name` and `reporting_org_ref` to the updateData sent to backend

**Code location:** Lines 5122-5132

**Key Logic:**
```javascript
case 'Reporting Organization':
  // Handle reporting organization import
  if (field.importValue && typeof field.importValue === 'object') {
    updateData.reporting_org_name = field.importValue.name || field.importValue.narrative;
    updateData.reporting_org_ref = field.importValue.ref;
    console.log(`[IATI Import] Setting reporting org:`, {
      name: updateData.reporting_org_name,
      ref: updateData.reporting_org_ref
    });
  }
  break;
```

### 3. Organization Check and Creation (Import-as-Reporting-Org Endpoint)
Added logic to check if the reporting organization exists before importing activities via the dedicated endpoint:

**File:** `frontend/src/app/api/iati/import-as-reporting-org/route.ts`

**Changes:**
- Check for existing organization by IATI org ID, name, or alias
- Create the organization if it doesn't exist
- Store the organization ID and acronym for use in activity records

**Code location:** Lines 270-318

```javascript
// Check if reporting organization exists, create if it doesn't
let reportingOrgId: string | null = null;
let reportingOrgAcronym: string | null = null;
const reportingOrgName = meta.reportingOrgName || reportingOrgRef;

// Try to find the org by IATI org ID, name, or alias
const { data: existingOrgs } = await supabase
  .from('organizations')
  .select('id, name, iati_org_id, aliases, acronym')
  .or(`iati_org_id.eq.${reportingOrgRef},name.ilike.${reportingOrgName},aliases.cs.{${reportingOrgRef}}`);

const matchingOrg = existingOrgs?.find(org =>
  org.iati_org_id === reportingOrgRef ||
  org.name?.toLowerCase() === reportingOrgName?.toLowerCase() ||
  org.aliases?.includes(reportingOrgRef)
);

if (matchingOrg) {
  reportingOrgId = matchingOrg.id;
  reportingOrgAcronym = matchingOrg.acronym;
} else {
  // Create the reporting organization
  const { data: newOrg, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: reportingOrgName,
      iati_org_id: reportingOrgRef,
      type: 'other',
      country: 'MM',
      aliases: [reportingOrgRef]
    })
    .select('id, name, acronym')
    .single();

  if (!orgError) {
    reportingOrgId = newOrg.id;
    reportingOrgAcronym = newOrg.acronym;
  }
}
```

### 2. Activity Record Updates (Backend)
Updated the activity insert to include proper organization references:

**File:** `frontend/src/app/api/iati/import-as-reporting-org/route.ts`

**Changes:**
- Set `created_by_org` to the organization ID
- Set `reporting_org_id` to the organization ID
- Set `created_by_org_acronym` to the organization acronym
- Keep `created_by_org_name` for backward compatibility

**Code location:** Lines 343-357

### 3. Organization Check and Creation (Import-as-Reporting-Org Endpoint)
The dedicated import endpoint was also updated for consistency:

**File:** `frontend/src/app/api/iati/import-as-reporting-org/route.ts`

**Changes:**
- Removed reference to non-existent `created_by_org` column
- Updated to only set `reporting_org_id`, `created_by_org_name`, and `created_by_org_acronym`

```javascript
let activityInsert: any = {
  iati_identifier: iatiIdentifier,
  reporting_org_ref: reportingOrgRef,
  reporting_org_name: meta.reportingOrgName || null,
  created_by_org_name: meta.reportingOrgName || null,
  created_by_org_acronym: reportingOrgAcronym || null,
  reporting_org_id: reportingOrgId, // Set reporting_org_id for consistency
  source_type: 'external',
  import_mode: 'reporting_org',
  created_by: userId,
  last_edited_by: userId,
  publication_status: 'draft',
  submission_status: 'not_submitted'
};
```

## How It Works

### Organization Matching Logic
The system now checks for organizations using multiple criteria:
1. **IATI Org ID:** Exact match on `iati_org_id` field
2. **Name:** Case-insensitive match on organization `name`
3. **Aliases:** Check if the IATI ref exists in the `aliases` array

This ensures that even if the organization is already in the system under a different name or alias, it will be found and linked correctly.

### Organization Creation
If no matching organization is found, a new one is created with:
- `name`: From the IATI XML reporting-org name
- `iati_org_id`: The reporting-org ref from the XML
- `type`: 'other' (default, can be updated manually later)
- `country`: 'MM' (default)
- `aliases`: Array containing the IATI org ref for future matching

## Activities List Display

The activities list page (`frontend/src/app/activities/page.tsx`) uses the following logic to display the "Reported by" column:

**Function:** `getCreatorOrganization` (lines 411-432)

**Display priority:**
1. `created_by_org_acronym` (if available)
2. Organization acronym (looked up by `createdByOrg` ID)
3. Organization name (looked up by `createdByOrg` ID)
4. `created_by_org_name` (if no org ID lookup succeeds)
5. "Unknown" (if none of the above are available)

With this fix, imported IATI activities will now have `reporting_org_id`, `created_by_org_name`, and `created_by_org_acronym` properly set, ensuring the "Reported by" column displays the correct organization information.

## Testing

To verify the fix works for the imported activity:

### 1. Check the Activity Record
```sql
SELECT
  id,
  iati_identifier,
  title_narrative,
  reporting_org_id,
  created_by_org_name,
  created_by_org_acronym,
  reporting_org_ref,
  reporting_org_name
FROM activities
WHERE iati_identifier = 'XM-OCHA-CBPF-CBPF-MM-24-S-NGO-32666';
```

Expected result:
- `reporting_org_id`: Should contain the organization UUID
- `created_by_org_name`: Should be "United Nations Office for the Coordination of Humanitarian Affairs"
- `created_by_org_acronym`: Should be the acronym (if set in the org record)

### 2. Check the Organization Record
```sql
SELECT
  id,
  name,
  acronym,
  iati_org_id,
  aliases
FROM organizations
WHERE iati_org_id LIKE '%OCHA%'
  OR name ILIKE '%United Nations Office%Humanitarian%';
```

Expected result:
- Should show the organization created during import
- `iati_org_id` should match the reporting-org ref from the XML
- `aliases` should include the IATI org ref

## Next Import
The next time an activity is imported from the same reporting organization:
1. The system will find the existing organization
2. No duplicate organization will be created
3. The activity will be linked to the same organization
4. The "Reported by" column will display correctly immediately

## Migration for Existing Data
If you want to fix activities that were already imported before this fix, you would need to:
1. Query for activities with `created_by_org_name` but no `reporting_org_id`
2. Look up the organization by name or IATI ref
3. Update the activity record with the organization ID

Example SQL:
```sql
UPDATE activities a
SET
  reporting_org_id = o.id,
  created_by_org_acronym = o.acronym
FROM organizations o
WHERE
  a.reporting_org_id IS NULL
  AND a.reporting_org_name IS NOT NULL
  AND (
    o.name = a.reporting_org_name
    OR o.iati_org_id = a.reporting_org_ref
  );
```
