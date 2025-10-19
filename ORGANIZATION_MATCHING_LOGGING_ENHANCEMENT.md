# Organization Matching - Logging Enhancement

## Summary

Added comprehensive warning and error logging for organization matching failures during IATI XML import to prevent silent failures.

## Problem

Previously, when importing participating organizations from IATI XML:
- Organizations that couldn't be matched in the database were **silently skipped**
- No warnings or errors were logged
- Users had no visibility into which organizations failed to import
- No way to diagnose why certain organizations weren't appearing

## Solution

### 1. Console Logging (Server-Side)

Added detailed logging at multiple levels:

#### Per-Organization Warnings
When an organization cannot be matched, the following is logged:
```
[IATI Import] ⚠️  Organization not found in database: {identifier}
[IATI Import]     - IATI Ref: {ref or N/A}
[IATI Import]     - Name: {name or N/A}
[IATI Import]     - Role: {role code or N/A}
[IATI Import]     - Type: {type code or N/A}
```

#### Import Statistics
```
[IATI Import] Attempting to import X participating organizations
[IATI Import] Found Y matching organizations in database
[IATI Import] ✅ Successfully imported Z participating organizations
```

#### Summary of Failures
```
[IATI Import] ❌ Failed to match N organizations:
[IATI Import]    1. {identifier} (ref-based lookup)
[IATI Import]    2. {identifier} (name-based lookup)
[IATI Import] 💡 Tip: Ensure these organizations exist in the organizations table with matching iati_org_id or name values
```

### 2. API Response (Client-Side)

Added `warnings` array to the API response:

```json
{
  "success": true,
  "activity_id": "uuid",
  "fields_updated": ["participating_orgs"],
  "warnings": [
    {
      "type": "organization_matching",
      "message": "3 organization(s) could not be matched and were skipped",
      "details": {
        "total_attempted": 5,
        "successfully_matched": 2,
        "unmatched_count": 3,
        "unmatched_organizations": [
          {
            "identifier": "GB-GOV-1",
            "ref": "GB-GOV-1",
            "name": "Example Agency",
            "role": "1",
            "lookup_method": "iati_org_id"
          }
        ]
      }
    }
  ],
  "summary": {
    "total_fields_requested": 5,
    "total_fields_updated": 5,
    "organizations_updated": 5,
    "has_warnings": true
  }
}
```

### 3. Implementation Details

**File Modified**: `frontend/src/app/api/activities/[id]/import-iati/route.ts`

**Changes**:
1. Added `importWarnings` array to track issues throughout import (line 99)
2. Added detailed per-organization logging (lines 260-275)
3. Track unmatched organizations in local array (line 254)
4. Log summary with actionable tips (lines 310-315)
5. Add structured warning to importWarnings array (lines 318-333)
6. Include warnings in API response (line 683)
7. Add `has_warnings` flag to summary (line 693)

## Benefits

### For Developers
- **Visibility**: Can see exactly which organizations failed to match
- **Debugging**: Clear indication of whether lookup was by `iati_org_id` or `name`
- **Actionable**: Console logs include tips for resolution

### For Users/Administrators
- **Transparency**: API response shows warnings that can be displayed in UI
- **Data Quality**: Can identify missing organizations and add them to database
- **Audit Trail**: Know exactly what was imported and what was skipped

### For System Monitoring
- **Silent Failures Eliminated**: No more data silently disappearing
- **Structured Data**: Warnings are machine-readable JSON
- **Comprehensive Details**: Full context for each unmatched organization

## Usage Example

When importing an activity with 5 participating organizations where 2 don't exist in database:

**Console Output**:
```
[IATI Import] Attempting to import 5 participating organizations
[IATI Import] Found 3 matching organizations in database
[IATI Import] ⚠️  Organization not found in database: GB-GOV-1
[IATI Import]     - IATI Ref: GB-GOV-1
[IATI Import]     - Name: UK Department for Example
[IATI Import]     - Role: 1
[IATI Import]     - Type: 10
[IATI Import] ⚠️  Organization not found in database: Example Foundation
[IATI Import]     - IATI Ref: N/A
[IATI Import]     - Name: Example Foundation
[IATI Import]     - Role: 2
[IATI Import]     - Type: 21
[IATI Import] ✅ Successfully imported 3 participating organizations
[IATI Import] ❌ Failed to match 2 organizations:
[IATI Import]    1. GB-GOV-1 (ref-based lookup)
[IATI Import]    2. Example Foundation (name-based lookup)
[IATI Import] 💡 Tip: Ensure these organizations exist in the organizations table with matching iati_org_id or name values
```

**API Response**:
```json
{
  "success": true,
  "warnings": [{
    "type": "organization_matching",
    "message": "2 organization(s) could not be matched and were skipped",
    "details": {
      "total_attempted": 5,
      "successfully_matched": 3,
      "unmatched_count": 2,
      "unmatched_organizations": [...]
    }
  }],
  "summary": {
    "has_warnings": true
  }
}
```

## Future Enhancements

Consider adding similar logging for:
1. **Sector Matching** - Track invalid or unrecognized sector codes
2. **Transaction Duplicates** - Log when transactions are skipped as duplicates
3. **Location Geocoding** - Report geocoding failures
4. **Required Field Validation** - Warn when optional fields are missing

## Testing

To test this enhancement:
1. Import an IATI XML file with participating organizations
2. Ensure some organizations don't exist in your database
3. Check server console logs for detailed warnings
4. Check API response for warnings array
5. Verify that matched organizations are still imported successfully

## Related Files

- API Route: `frontend/src/app/api/activities/[id]/import-iati/route.ts`
- Types: `frontend/src/app/api/activities/[id]/import-iati/route.ts` (IATIOrganization interface)
- Database: `organizations` table with `iati_org_id` and `name` columns

## Impact

- **No Breaking Changes**: Existing functionality preserved
- **Backward Compatible**: API response maintains all existing fields
- **Performance**: Negligible impact (just console logging)
- **Maintainability**: Clear, structured logging aids debugging

---

**Status**: ✅ Implemented and tested
**Date**: January 2025
**Version**: IATI Import v2.03

