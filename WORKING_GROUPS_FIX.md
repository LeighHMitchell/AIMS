# Working Groups Save Issue - Root Cause and Fix

## Problem
When saving a Working Group in the Working Group tab, it would not reappear on refresh. The data appeared to be lost.

## Root Causes
There were **TWO separate issues** causing the working groups to not persist:

### Issue 1: Save Logic Missing Auto-Creation
The save logic in both API endpoints:
1. `/api/activities/field` (for updating existing activities)
2. `/api/activities` (for creating new activities)

### What was happening:
1. When a user selected a working group (e.g., "TWG-Health"), the frontend sent the code and label to the backend
2. The backend tried to look up the working group in the `working_groups` database table using the code
3. **If the working group didn't exist in the database** (because the SQL migration hadn't been run), the lookup returned an empty array
4. The code then checked `if (dbWorkingGroups && dbWorkingGroups.length > 0)` - this was FALSE
5. **Nothing was inserted into `activity_working_groups`** - the data was silently lost
6. On refresh, no working groups appeared because none were ever saved

### Why the working_groups table might be empty:
The `working_groups` table requires a SQL migration to be populated with the predefined working groups. If this migration hasn't been run, the table is empty, causing all working group saves to fail silently.

---

### Issue 2: Basic Endpoint Missing Working Groups
The `/api/activities/[id]/basic` endpoint (used on page refresh) did NOT include `activity_working_groups` in its database query.

**What was happening:**
1. Working groups were being saved successfully to the database
2. BUT on refresh, the page called `/api/activities/634c2682-a81a-4b66-aca2-eb229c0e9581/basic`
3. This endpoint's SELECT query included sectors, tags, sdgMappings, and policyMarkers
4. **BUT it was missing the `activity_working_groups` JOIN**
5. So the working groups data was never loaded from the database
6. The frontend displayed an empty working groups list

The full endpoint at `/api/activities/[id]` DID include working groups, but the basic endpoint (optimized for performance) was missing it.

## Solutions

### Solution 1: Auto-Create Working Groups
Modified both API endpoints to **auto-create working groups** if they don't exist in the database:

### Changes in `/api/activities/field/route.ts` (lines 725-843):
1. After querying for existing working groups by code
2. Check if any codes were not found in the database
3. If missing codes exist, automatically create them in the `working_groups` table
4. Merge the newly created working groups with the found ones
5. Proceed with inserting into `activity_working_groups` as before

### Changes in `/api/activities/route.ts` (lines 1405-1475):
Applied the same fix for the POST route when creating new activities.

**Key improvements:**
- **Automatic creation**: Working groups are now created on-demand if missing
- **Better logging**: Added console logs to track what's being found and created
- **Graceful handling**: No silent failures - data is preserved
- **Migration-independent**: Works whether or not the SQL migration has been run

---

### Solution 2: Add Working Groups to Basic Endpoint
Modified `/api/activities/[id]/basic/route.ts` to include working groups in both the query and the response transformation.

**Changes:**
1. **Added to SELECT query** (lines 109-113):
```typescript
activity_working_groups (
  working_group_id,
  vocabulary,
  working_groups (id, code, label, description)
),
```

2. **Added to response transformation** (lines 314-318):
```typescript
workingGroups: activity.activity_working_groups?.map((wgRelation: any) => ({
  code: wgRelation.working_groups.code,
  label: wgRelation.working_groups.label,
  vocabulary: wgRelation.vocabulary
})) || [],
```

3. **Also added to the retry query** (lines 183-187) for fallback cases

**Key improvement:**
- The basic endpoint now returns working groups data just like the full endpoint
- Working groups will persist across page refreshes

## Testing
To verify the fix:
1. Go to the Activity Editor
2. Navigate to the Working Groups tab
3. Select a working group (e.g., "Health Technical Working Group")
4. The success toast should appear
5. Refresh the page
6. **The working group should now persist and reappear**

## Console Logs to Watch
When saving a working group, you should now see:
```
[Field API] Processing working groups update
[Field API] Looking up working groups with codes: ["TWG-Health"]
[Field API] Found 0 working groups in database
[Field API] Creating missing working groups: ["TWG-Health"]
[Field API] Successfully created 1 working groups
[Field API] Inserting 1 working group associations
[Field API] Successfully saved 1 working groups
```

On subsequent saves (when the working group already exists):
```
[Field API] Processing working groups update
[Field API] Looking up working groups with codes: ["TWG-Health"]
[Field API] Found 1 working groups in database
[Field API] Inserting 1 working group associations
[Field API] Successfully saved 1 working groups
```

## Related Files
- `/frontend/src/app/api/activities/field/route.ts` - Field update API (✅ Fixed - auto-create)
- `/frontend/src/app/api/activities/route.ts` - Activity creation API (✅ Fixed - auto-create)
- `/frontend/src/app/api/activities/[id]/basic/route.ts` - Basic activity endpoint (✅ Fixed - added working groups)
- `/frontend/sql/create_working_groups_tables.sql` - SQL migration for working_groups table
- `/frontend/src/lib/workingGroups.ts` - Frontend working groups constant
- `/frontend/src/components/WorkingGroupsSection.tsx` - UI component

## Additional Notes
The same pattern could be applied to other similar features (tags, policy markers, etc.) to ensure data persistence even if database migrations haven't been run in the expected order.

