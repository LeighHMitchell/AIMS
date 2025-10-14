# Contacts Tab - Cache and Delete Fix

## Issues Fixed

1. **Stale data showing in UI** - Contacts showing that don't exist in database
2. **Delete not working** - Unable to remove contacts from the activity

## Root Cause

Browser/API caching was preventing the UI from seeing the latest database state. The contacts were being cached even with cache-control headers.

## Fixes Applied

### 1. Enhanced Cache Busting
**File**: `frontend/src/components/contacts/ContactsTab.tsx`

Added stronger cache control:
```typescript
const response = await fetch(`/api/activities/${activityId}/contacts?_t=${timestamp}&_force=${force}`, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

### 2. Force Refresh Parameter
Added optional `force` parameter to `fetchContacts()`:
- Normal fetch: `fetchContacts(false)` - used on initial load
- Force refresh: `fetchContacts(true)` - used after save/delete operations

### 3. Better Delete Handling
Added console logging and toast notifications:
```typescript
const handleDelete = async (contactId: string) => {
  console.log('[ContactsTab] Deleting contact:', contactId);
  console.log('[ContactsTab] Current contacts count:', contacts.length);
  const updatedContacts = contacts.filter(c => c.id !== contactId);
  console.log('[ContactsTab] After filter contacts count:', updatedContacts.length);
  await saveContacts(updatedContacts);
  toast.success('Contact deleted successfully');
};
```

### 4. Increased Transaction Delay
Increased delay from 100ms to 150ms to ensure database commits:
```typescript
await new Promise(resolve => setTimeout(resolve, 150));
```

### 5. Force Refresh After Operations
All save/delete operations now force a fresh fetch:
```typescript
await fetchContacts(true); // Force refresh after save
```

## How to Fix the Current State

If you're seeing stale contacts right now:

1. **Click the Refresh button** (🔄) in the top-right of the contacts list
2. The contacts will force-fetch from the database
3. You should now see only the 1 contact that actually exists

## Testing the Fix

1. **View contacts**: Should show only what's in the database
2. **Click Refresh**: Should fetch latest from database
3. **Delete a contact**: 
   - Click delete (trash icon)
   - Confirm the deletion
   - Should show "Contact deleted successfully"
   - Contact should disappear immediately
4. **Add a contact**:
   - Should save and appear immediately
   - No duplicates should appear

## Console Debugging

Check the browser console (F12) for detailed logs:
```
[ContactsTab] Fetching contacts for activity: <id> (forced refresh)
[ContactsTab] Deleting contact: <id>
[ContactsTab] Current contacts count: 2
[ContactsTab] After filter contacts count: 1
[ContactsTab] Save successful, refreshing contacts list
```

## If Issues Persist

1. **Hard refresh the page**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear browser cache**: Open DevTools > Application > Clear storage
3. **Check the database directly**: Run query in Supabase to verify actual state
4. **Check console logs**: Look for any error messages

## Summary

✅ Added stronger cache busting with multiple headers
✅ Force refresh after all mutations (save/delete)
✅ Increased transaction delay to 150ms
✅ Better logging for debugging
✅ Toast notifications for user feedback
✅ Manual refresh button available anytime

