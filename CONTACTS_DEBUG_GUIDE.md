# Contacts Tab - Debugging Guide

## Issue: Contact Saved But Not Appearing

If you add a contact and it saves to the database but doesn't appear in the UI, follow these steps:

### Step 1: Check Browser Console

After adding a contact, look for these console messages:

```
✅ Expected Flow:
[ContactsTab] Saving contact: {...}
[ContactsTab] Adding new contact to 0 existing contacts
[ContactsTab] New contacts array length: 1
[ContactsTab] Saving 1 contacts to database
[ContactsTab] Save successful, refreshing contacts list
[ContactsTab] Fetching contacts for activity: uuid
[ContactsTab] Fetched contacts: 1 contacts
[ContactsTab] Save complete, closing form
```

### Step 2: Check for Errors

Look for any of these error patterns:

```
❌ Problem: Activity ID Missing
[ContactsTab] Cannot save - no activityId

Solution: Ensure you're on an existing activity page, not a new unsaved activity
```

```
❌ Problem: API Error
[ContactsTab] Save failed: {...}

Solution: Check the API response. Open Network tab and look at the /api/activities/field request
```

```
❌ Problem: Fetch Failed After Save
[ContactsTab] Fetch failed with status: 404

Solution: The activity might not exist or you don't have permissions
```

### Step 3: Manual Database Check

Check if the contact actually saved:

```sql
SELECT 
  id, 
  activity_id,
  first_name, 
  last_name, 
  email, 
  type,
  is_focal_point,
  has_editing_rights
FROM activity_contacts 
WHERE activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY created_at DESC;
```

If the contact is there but not showing in UI, check:

1. **Wrong Activity ID**: Make sure the contact's `activity_id` matches the activity you're viewing
2. **Multiple Tabs**: Close other tabs showing the same activity
3. **Cache Issue**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Step 4: Check API Response

After adding a contact, open Network tab and find the GET request to:
```
/api/activities/{activityId}/contacts
```

Check the response:
- ✅ Should return an array with your contact
- ❌ If empty array, contact might not have correct activity_id
- ❌ If 404, activity doesn't exist
- ❌ If 500, server error (check server logs)

### Step 5: Force Refresh

If contact is in database but not showing:

```javascript
// In browser console:
window.location.reload();
```

Or navigate away from the activity and back to it.

### Common Issues & Solutions

#### Issue 1: Contact Saves But List Doesn't Update
**Symptoms**: Success toast appears, contact in DB, but UI still shows old list

**Check**:
1. Look for: `[ContactsTab] Fetched contacts: X contacts` in console
2. If count is correct but UI wrong, it's a React rendering issue
3. If count is 0 but DB has contacts, it's an API issue

**Solution**: 
- Check that activity IDs match
- Verify the `/api/activities/[id]/contacts` endpoint is working
- Try hard refresh

#### Issue 2: Duplicate Detection Blocking Save
**Symptoms**: Toast shows "already exists" but you don't see the contact

**Check**: Look for `[ContactsTab] Duplicate contact detected` in console

**Solution**: The contact already exists. Refresh the page to see it.

#### Issue 3: Form Doesn't Close After Save
**Symptoms**: Success toast but form still open

**Check**: Look for `[ContactsTab] Save complete, closing form` in console

**Solution**: If you see the log, it's a state issue. Try clicking cancel and reopening contacts tab.

### Testing Commands

Run these in browser console to debug:

```javascript
// Check current state
console.log('Activity ID:', document.querySelector('[data-activity-id]')?.dataset.activityId);

// Force fetch
fetch(`/api/activities/YOUR_ACTIVITY_ID/contacts`)
  .then(r => r.json())
  .then(data => console.log('Contacts from API:', data));

// Clear local state and refresh
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Quick Fix Checklist

- [ ] Open browser console (F12)
- [ ] Try adding a contact
- [ ] Check for console logs starting with `[ContactsTab]`
- [ ] Check Network tab for `/api/activities/field` POST
- [ ] Check response status (should be 200)
- [ ] Check Network tab for `/api/activities/{id}/contacts` GET
- [ ] Verify activity_id in URL matches database
- [ ] Try hard refresh (Cmd+Shift+R)
- [ ] Check database directly with SQL query
- [ ] Verify no JavaScript errors in console

### Expected Console Output (Success Case)

```
[ContactsTab] Fetching contacts for activity: abc-123
[ContactsTab] Fetched contacts: 0 contacts
[ContactsTab] Saving contact: {firstName: "Test", lastName: "User", ...}
[ContactsTab] Adding new contact to 0 existing contacts
[ContactsTab] New contacts array length: 1
[ContactsTab] Saving 1 contacts to database
[ContactsTab] Save successful, refreshing contacts list
[ContactsTab] Fetching contacts for activity: abc-123
[ContactsTab] Fetched contacts: 1 contacts
[ContactsTab] Save complete, closing form
```

### If All Else Fails

1. Export console logs (right-click in console → Save as...)
2. Export Network HAR file (Network tab → right-click → Save all as HAR)
3. Run this SQL to verify data:
```sql
SELECT * FROM activity_contacts WHERE activity_id = 'YOUR_ID';
```
4. Check that migrations have been applied:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'activity_contacts'
ORDER BY ordinal_position;
```

### Contact Me With:
- Console logs showing the flow
- Network tab showing API responses
- SQL query results
- Any error messages

