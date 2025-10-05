# XML Import Current Value Matching Fix

## Issue

When importing the same IATI XML multiple times, the XML Import tool was showing "Empty" as the current value for participating organizations that had already been imported, instead of showing them as matches.

## Root Cause

The XML import tool was not:
1. Fetching current participating organizations from the activity
2. Matching them with the imported XML data
3. Showing them in the "Current Value" column

This made it appear as if nothing had been imported, even though the organizations were successfully saved.

## Fix Applied

### 1. Fetch Current Participating Organizations

**File:** `frontend/src/components/activities/XmlImportTab.tsx`

Added API call to fetch current participating organizations when loading activity data:

```typescript
// Fetch current participating organizations
console.log('[XmlImportTab] Fetching current participating organizations...');

const participatingOrgsResponse = await fetch(`/api/activities/${activityId}/participating-organizations`);

const currentParticipatingOrgs = participatingOrgsResponse.ok ? await participatingOrgsResponse.json() : [];

console.log('[XmlImportTab] Current participating organizations:', currentParticipatingOrgs);
```

### 2. Store in Activity Data

Added participating organizations to the current activity data state:

```typescript
setCurrentActivityData({
  // ... other fields
  participatingOrgs: currentParticipatingOrgs || [],
});
```

### 3. Match Imported with Current

Enhanced the parsing logic to match imported organizations with existing ones:

```typescript
// Try to find matching current participating organization
const currentParticipatingOrgs = currentActivityData?.participatingOrgs || [];
let currentValue = null;
let hasConflict = false;

// Match by IATI ref first, then by narrative/name and role
const matchedOrg = currentParticipatingOrgs.find((current: any) => {
  const refMatch = org.ref && (
    current.iati_org_ref === org.ref || 
    current.organization?.iati_org_id === org.ref
  );
  const nameMatch = org.narrative && (
    current.narrative === org.narrative ||
    current.organization?.name === org.narrative
  );
  const roleMatch = org.role && String(current.iati_role_code) === String(org.role);
  
  return (refMatch || nameMatch) && roleMatch;
});

if (matchedOrg) {
  currentValue = {
    name: matchedOrg.narrative || matchedOrg.organization?.name || 'Unknown',
    ref: matchedOrg.iati_org_ref || matchedOrg.organization?.iati_org_id || null,
    role: matchedOrg.iati_role_code,
    narrative: matchedOrg.narrative,
    type: matchedOrg.org_type
  };

  // Check for conflicts
  hasConflict = (
    (org.ref && matchedOrg.iati_org_ref && org.ref !== matchedOrg.iati_org_ref) ||
    (org.type && matchedOrg.org_type && org.type !== matchedOrg.org_type) ||
    (org.activityId && matchedOrg.activity_id_ref && org.activityId !== matchedOrg.activity_id_ref)
  );
}
```

## Matching Logic

The system now uses smart matching with priority:

### Priority 1: IATI Reference Match
Matches if the XML `@ref` equals:
- `current.iati_org_ref` (stored IATI ref), OR
- `current.organization.iati_org_id` (organization's IATI ID)

### Priority 2: Name Match
Matches if the XML `<narrative>` equals:
- `current.narrative` (stored narrative), OR
- `current.organization.name` (organization name)

### Priority 3: Role Match (Required)
Both must have the same role code (e.g., both are "1" for Funding)

### All Conditions
A match is found when: **(Ref Match OR Name Match) AND Role Match**

## Display Behavior

### Before Import (No Match)
```
CURRENT VALUE: Empty
IMPORT VALUE: Participating Org - Name of Agency B
                1 - Funding
                BB-BBB-123456789
                40 - Multilateral
STATUS: 🔵 New
```

### After Import (Match Found)
```
CURRENT VALUE: Name of Agency B
                Funding
                BB-BBB-123456789
IMPORT VALUE:  Participating Org - Name of Agency B
                1 - Funding
                BB-BBB-123456789
                40 - Multilateral
STATUS: ✓ Match
```

### Conflict Detected
If data differs (e.g., different type codes):
```
CURRENT VALUE: Name of Agency B (Type: 21)
IMPORT VALUE:  Name of Agency B (Type: 40)
STATUS: ⚠️ Conflict
```

## Benefits

1. ✅ **Visual Confirmation** - Users can see what's already imported
2. ✅ **Avoid Duplicates** - Shows matches instead of "New" status
3. ✅ **Conflict Detection** - Highlights when XML differs from database
4. ✅ **Better UX** - Clear understanding of what will change
5. ✅ **Selective Import** - Can choose to re-import or skip matched items

## Testing

### Test Scenario 1: First Import
1. Import XML with 3 participating organizations
2. Should show all as "New" with "Empty" current value
3. Import successfully

### Test Scenario 2: Re-import Same XML
1. Import the same XML again
2. Should show all 3 as **matched** with current values displayed
3. Status should show "Match" (not "New")
4. Can choose to skip or re-import

### Test Scenario 3: Import Modified XML
1. Import XML with same organizations but different types
2. Should show as matched but with "Conflict" status
3. Highlights which fields differ

## Example Output

When you import your example XML the second time:

```
✓ Name of Agency B (Role: Funding) - MATCHED
✓ Name of Agency C (Role: Accountable) - MATCHED  
✓ Name of Agency A (Role: Extending) - MATCHED
```

Instead of:
```
⊕ Name of Agency B (Role: Funding) - NEW
⊕ Name of Agency C (Role: Accountable) - NEW
⊕ Name of Agency A (Role: Extending) - NEW
```

## Files Modified

1. ✅ `frontend/src/components/activities/XmlImportTab.tsx` - Added fetching and matching logic

## Status

✅ **COMPLETE** - XML Import now properly fetches and matches existing participating organizations, showing them in the Current Value column with appropriate match/conflict detection.

---

**Try it now:** Import the same XML again and you should see the organizations show as matched with their current values displayed!


