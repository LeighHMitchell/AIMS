# Participating Organization Delete Fix

## Issue

Users were unable to delete participating organizations from the Participating Organisations tab, receiving a "Failed to remove organization" error.

## Root Cause Investigation

The delete functionality could fail for several reasons:
1. Missing or invalid `activityId` or `org.id` parameters
2. Database-level errors or constraints
3. RLS (Row Level Security) policies blocking deletion
4. Silent failures with no detailed error messages

## Fixes Applied

### 1. Enhanced Frontend Error Handling

**File:** `frontend/src/components/OrganisationsSection.tsx`

Added comprehensive validation and logging:

```typescript
const handleDelete = async (org: any) => {
  // Validate required data before attempting delete
  if (!activityId) {
    toast.error('Activity ID is missing. Cannot delete organization.');
    console.error('[Delete] Missing activityId');
    return;
  }

  if (!org.id) {
    toast.error('Organization ID is missing. Cannot delete organization.');
    console.error('[Delete] Missing org.id. Org data:', org);
    return;
  }

  console.log('[Delete] Deleting participating organization:', {
    activityId,
    participatingOrgId: org.id,
    organizationName: org.organization?.name || org.narrative
  });

  // Attempt delete with detailed error reporting
  try {
    const response = await fetch(
      `/api/activities/${activityId}/participating-organizations?id=${org.id}`,
      { method: 'DELETE' }
    );

    console.log('[Delete] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Delete] Error response:', errorData);
      throw new Error(errorData.error || `Failed to remove organization (${response.status})`);
    }

    toast.success('Organization removed successfully');
    await refetch(); // Refresh the list
  } catch (error) {
    console.error('[Delete] Error removing organization:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to remove organization');
  }
};
```

**Improvements:**
- ✅ Validates `activityId` and `org.id` before attempting delete
- ✅ Logs detailed information about what's being deleted
- ✅ Catches and displays specific error messages
- ✅ Shows HTTP status codes in error messages
- ✅ Refreshes the list after successful deletion

### 2. Enhanced API Error Handling

**File:** `frontend/src/app/api/activities/[id]/participating-organizations/route.ts`

Added detailed error logging and response handling:

```typescript
if (participatingOrgId) {
  console.log('[AIMS] Attempting to delete by ID:', participatingOrgId, 'from activity:', activityId);
  
  const { data, error } = await supabaseAdmin
    .from('activity_participating_organizations')
    .delete()
    .eq('id', participatingOrgId)
    .eq('activity_id', activityId)
    .select(); // Returns deleted row for verification

  if (error) {
    console.error('[AIMS] Error deleting participating organization:', error);
    console.error('[AIMS] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint 
    }, { status: 500 });
  }

  // Check if anything was actually deleted
  if (!data || data.length === 0) {
    console.warn('[AIMS] No participating organization found to delete');
    return NextResponse.json({ 
      error: 'Participating organization not found or already deleted' 
    }, { status: 404 });
  }

  console.log('[AIMS] Successfully deleted participating organization:', data);
}
```

**Improvements:**
- ✅ Logs the exact IDs being used for deletion
- ✅ Returns the deleted row to verify success
- ✅ Checks if deletion actually happened (data.length > 0)
- ✅ Returns 404 if record not found
- ✅ Includes Supabase error details (code, details, hint)
- ✅ Logs success with deleted record details

## How to Diagnose Issues

If deletion still fails, check the browser console for these log messages:

### Frontend Logs
```
[Delete] Deleting participating organization: { activityId: '...', participatingOrgId: '...', organizationName: '...' }
[Delete] Response status: 200
```

### API Logs (Check Vercel/Supabase logs)
```
[AIMS] DELETE /api/activities/[id]/participating-organizations for activity: ...
[AIMS] Participating Org ID: ... Organization ID: null Role type: null
[AIMS] Attempting to delete by ID: ... from activity: ...
[AIMS] Successfully deleted participating organization: [...]
```

### Common Error Scenarios

#### 1. Missing org.id
**Error:** "Organization ID is missing. Cannot delete organization."
**Cause:** The participating organization record doesn't have an `id` field
**Fix:** Check the API response structure when fetching organizations

#### 2. RLS Policy Error
**Error:** "new row violates row-level security policy"
**Cause:** Database RLS policy preventing deletion
**Fix:** Check Supabase RLS policies for `activity_participating_organizations` table

#### 3. Record Not Found
**Error:** "Participating organization not found or already deleted" (404)
**Cause:** Record was already deleted or doesn't exist
**Fix:** Refresh the page and try again

#### 4. Foreign Key Constraint
**Error:** "update or delete on table violates foreign key constraint"
**Cause:** Another table references this record
**Fix:** Check for and remove dependent records first

## Testing

To test the delete functionality:

1. **Go to any activity** with participating organizations
2. **Open browser console** (F12 → Console tab)
3. **Click the trash icon** next to an organization
4. **Confirm deletion** in the popup
5. **Check console logs** for detailed information

### Expected Success Flow

```
✅ [Delete] Deleting participating organization: { activityId: 'abc123', ... }
✅ [AIMS] DELETE /api/activities/[id]/participating-organizations
✅ [AIMS] Attempting to delete by ID: def456
✅ [AIMS] Successfully deleted participating organization
✅ [Delete] Response status: 200
✅ Toast: "Organization removed successfully"
✅ Table refreshes without the deleted organization
```

### Expected Error Flow (with details)

```
❌ [Delete] Deleting participating organization: { ... }
❌ [AIMS] Error deleting participating organization: { message: '...', code: '...', hint: '...' }
❌ [Delete] Response status: 500
❌ [Delete] Error response: { error: '...', details: '...', hint: '...' }
❌ Toast: "Failed to remove organization (500)"
```

## Files Modified

1. ✅ `frontend/src/components/OrganisationsSection.tsx` - Enhanced delete function with validation and logging
2. ✅ `frontend/src/app/api/activities/[id]/participating-organizations/route.ts` - Enhanced API error handling and verification

## Next Steps

If you're still experiencing issues after these fixes:

1. **Check browser console** for the detailed logs
2. **Check Vercel logs** for API-side errors
3. **Check Supabase logs** for database-level errors
4. **Verify RLS policies** in Supabase dashboard
5. **Share the console logs** so I can help diagnose further

## Status

✅ **IMPROVED** - Delete functionality now has comprehensive error handling and logging to help identify and resolve any issues.

The delete should now work, and if it doesn't, the detailed error messages will help us identify the exact problem.


