# XML Import Organization Matching Fix

## Issue

When importing participating organizations from XML, they were showing AFDB's logo and acronym instead of the correct organization data.

## Root Cause

The organization matching logic was using **fuzzy search** and taking the **first result** without verifying it was an exact match. This caused organizations to be incorrectly matched to similar-sounding organizations in the database (e.g., matching to "AFDB" when searching for "Agency B").

## Fix Applied

### 1. Exact Match Requirement

Updated the matching logic in `XmlImportTab.tsx` (line 3213-3231) to require **exact name match** (case-insensitive):

**Before:**
```typescript
const orgs = await searchResponse.json();
if (orgs.length > 0) {
  organizationId = orgs[0].id;  // ❌ Takes first result, even if not exact
}
```

**After:**
```typescript
const orgs = await searchResponse.json();
// Find EXACT match (case-insensitive)
const exactMatch = orgs.find((org: any) => 
  org.name?.toLowerCase() === orgData.narrative?.toLowerCase() ||
  org.acronym?.toLowerCase() === orgData.narrative?.toLowerCase()
);

if (exactMatch) {
  organizationId = exactMatch.id;  // ✅ Only uses exact matches
} else {
  console.log(`No exact match found for "${orgData.narrative}"`);
}
```

### 2. Improved Display Logic

Enhanced the display in `OrganisationsSection.tsx` to better show when narrative differs from organization name:

**New Display Logic:**
- Shows `narrative` from XML as the primary name
- If narrative differs from org name, shows "From: [Org Name] (Acronym)" below
- Only shows acronym in parentheses if there's no narrative override
- Prevents confusion between XML name and database org name

## How It Works Now

### Scenario 1: Exact Match Found
```xml
<participating-org ref="GB-1234" role="1">
  <narrative>DFID</narrative>
</participating-org>
```
✅ Searches for organization with name or acronym exactly matching "DFID"
✅ If found, uses that organization
✅ If not found, creates new organization

### Scenario 2: Fuzzy Match (Not Exact)
```xml
<participating-org ref="XX-9999" role="1">
  <narrative>Agency B</narrative>
</participating-org>
```
❌ Search returns "AFDB" as similar result
✅ **NEW**: Rejects it because "Agency B" ≠ "AFDB" 
✅ Creates new organization instead

### Scenario 3: Display with Custom Narrative
If XML has custom narrative that differs from org name:
```
Name of Agency B
  From: African Development Bank (AFDB)
  [Shows AFDB logo]
```

This makes it clear the narrative is from XML but the org data is from database.

## Resolution Steps

### For Already Imported Data

If you've already imported organizations with incorrect matches:

1. **Delete the incorrect entries:**
   - Go to Participating Organisations tab
   - Delete organizations showing wrong logo/acronym
   - Click the trash icon next to each one

2. **Re-import with fixed logic:**
   - Go back to XML Import tab
   - Import the same XML again
   - Organizations will now either:
     - Match correctly (exact name match), OR
     - Create new organizations (if no exact match)

### For New Imports

The fix is now live, so new imports will:
- ✅ Only match to organizations with exact name/acronym match
- ✅ Create new organizations if no exact match found
- ✅ Display narrative from XML prominently
- ✅ Show source organization info if different

## Files Modified

1. ✅ `frontend/src/components/activities/XmlImportTab.tsx` - Exact matching logic
2. ✅ `frontend/src/components/OrganisationsSection.tsx` - Improved display

## Testing

Test with your example XML:
```xml
<participating-org ref="BB-BBB-123456789" role="1" type="40">
  <narrative>Name of Agency B</narrative>
</participating-org>
```

**Expected Behavior:**
1. Searches for org with name exactly = "Name of Agency B"
2. If not found, creates new organization
3. Displays "Name of Agency B" as the name
4. No AFDB logo/acronym should appear (unless that's the actual org)

## Status

✅ **FIXED** - Organizations will now match correctly or create new entries instead of matching incorrectly.

---

**Note:** You need to delete and re-import any organizations that were imported with the old logic to fix the incorrect matches.


