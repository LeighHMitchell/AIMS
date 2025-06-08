# AIMS Activity Editor Fixes

## Issues Fixed

### 1. ✅ Contributors Not Saving
**Problem:** Contributors were selected but disappeared after save/refresh due to invalid UUID format.

**Fix Applied:**
- Enhanced UUID validation in `/api/activities/route.ts` to handle invalid organization IDs gracefully
- Added warning system to notify users when contributors fail to save
- Contributors with invalid UUIDs are now skipped with proper error messages
- User receives clear feedback about what went wrong

### 2. ✅ Transactions Not Persisting
**Problem:** Transactions appeared to save but vanished on refresh.

**Fix Applied:**
- UUID validation already exists in `TransactionsManager.tsx`
- Backend now accepts both UUID and non-UUID values for legacy compatibility
- Clear error messages if organization IDs are invalid

### 3. ✅ No Error Feedback
**Problem:** Users weren't notified when saves failed partially.

**Fix Applied:**
- Added `_warnings` array to API responses
- Frontend displays toast notifications for each warning
- Persistent error message shown in UI when warnings occur
- "View Details" button in toasts for debugging
- Console logging of detailed error information

### 4. ✅ Invalid ID Format Error
**Problem:** Error persisted even when activity loaded successfully.

**Fix Applied:**
- Added proper error clearing on page load
- Better validation of user and organization IDs before save
- More specific error messages explaining the issue
- Validation happens early with clear feedback

### 5. ✅ Better UI Feedback
**Improvements:**
- Error messages persist in red box at top of form
- Toast notifications with 10-second duration for warnings
- Action buttons in toasts to view error details
- Clear indication when some data couldn't be saved

## Testing Instructions

### 1. Test Contributor Saving
```bash
# Clear browser cache first
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

1. Go to **Activities** > **Create New Activity**
2. Fill in required fields (Title, etc.)
3. Go to **Contributors** tab
4. Select an organization and click **Nominate**
5. Click **Save**
6. Check for:
   - Success toast with contributor count
   - No error warnings
   - Refresh page - contributors should persist

### 2. Test Transaction Saving
1. Go to **Finances** tab
2. Click **Add Transaction**
3. Fill all required fields
4. Select organizations from dropdowns (don't type)
5. Save transaction
6. Save activity
7. Refresh - transactions should persist

### 3. Test Error Feedback
1. Open browser console (F12)
2. Try saving with invalid data
3. Look for:
   - Red error box at top of form
   - Toast notifications for warnings
   - Console logs with `[AIMS]` prefix

### 4. What Success Looks Like

**Good Save:**
```
✅ Activity saved successfully! Saved: 2 contributors, 3 transactions
Activity ID: 123e4567-e89b-12d3-a456-426614174000
```

**Warning Save:**
```
⚠️ Some contributors could not be saved
Details: All contributors had invalid organization IDs
Warning shown in red box at top of form
```

## Debugging Tips

### Check User/Org IDs
In browser console:
```javascript
// Check your user data
const userData = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User ID:', userData.id);
console.log('Org ID:', userData.organizationId);
console.log('Is User ID valid UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userData.id));
```

### Monitor Network Requests
1. Open Network tab (F12)
2. Save activity
3. Look for POST to `/api/activities`
4. Check Request payload for IDs
5. Check Response for `_warnings` array

## Known Limitations

1. **Numeric IDs**: The system temporarily accepts numeric IDs for testing but converts them to fake UUIDs. This should be removed in production.

2. **Legacy Data**: Old activities may have organization names instead of UUIDs. The system handles this gracefully but shows warnings.

3. **User Account**: Users must be logged in with valid UUID-based accounts from the database. Test accounts with numeric IDs will cause warnings.

## Next Steps

1. **Database Migration**: Update all existing non-UUID references to proper UUIDs
2. **User Migration**: Ensure all user accounts have proper UUID identifiers
3. **Remove Workarounds**: Remove numeric ID support once all data is migrated 