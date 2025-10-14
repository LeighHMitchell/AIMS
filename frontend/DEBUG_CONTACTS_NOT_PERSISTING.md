# Debug Guide: Contacts Not Persisting

## Investigation Results

### ✅ What We've Verified

1. **Database Schema** - ✅ ALL REQUIRED COLUMNS EXIST
   - Ran `check-contacts-schema.js` 
   - Result: All 35 columns present including all IATI fields

2. **Direct Database Insert** - ✅ DATABASE ACCEPTS CONTACTS
   - Ran `test-contact-insert.js`
   - Result: Both minimal and full contacts insert successfully
   - Conclusion: Database schema is correct and working

3. **Code Updates** - ✅ ALL IATI FIELDS ADDED TO API
   - POST `/api/activities` route updated with all fields
   - Field `/api/activities/field` route already had all fields
   - contact-utils.ts updated to set position to null

### 🔍 Where the Problem Is

Since database works perfectly but contacts still don't persist, the issue must be:

**Option A: The API is not being called at all**
- The autosave might be disabled or failing silently
- Check browser console for `[CONTACTS DEBUG] Triggering autosave for contacts...`
- If you don't see this log, the save isn't even attempted

**Option B: The API is being called but receiving bad data**
- The contact data might be malformed
- Check server logs for `[Field API] About to insert contacts data:`
- If you see error logs, they'll show what's wrong

**Option C: The API succeeds but fetch fails**
- The save works but contacts don't load on refresh
- Check server logs for `[Contacts API] Found contacts:`
- If it shows 0 contacts, the fetch query might be wrong

## How to Debug

### Step 1: Check Browser Console (FRONTEND)

When you save a contact, look for these logs:

**What You SHOULD See:**
```
[CONTACTS DEBUG] handleContactsChange called with: [...]
[CONTACTS DEBUG] Activity ID: 634c2682-a81a-4b66-aca2-eb229c0e9581
[CONTACTS DEBUG] Triggering autosave for contacts...
```

**If You DON'T See These:**
- The save function isn't being called
- Issue is in the UI logic, not the API

### Step 2: Check Server Console (BACKEND)

Your Next.js server console should show:

**For Manual Save (via Field API):**
```
[Field API] Processing contacts update for activity: <id>
[Field API] Contacts data: <JSON array>
[Field API] About to insert contacts data: <JSON array>
[Field API] Number of contacts to insert: 1
[Field API] Activity ID: <id>
[Field API] ✅ Successfully inserted contacts: 1 contacts
[Field API] Inserted contact IDs: [<uuid>]
```

**For XML Import (via POST API):**
```
[AIMS API] Updating contacts for activity: <id>
[AIMS API] Attempting to insert 1 contacts
[AIMS API] Contact data sample: <JSON object>
[AIMS API] ✅ Successfully updated 1 contacts
[AIMS API] Inserted contact IDs: [<uuid>]
```

**If You See ERROR Logs:**
```
[Field API] ❌ FAILED TO INSERT CONTACTS!
[Field API] Error details: { message: "...", details: "..." }
```
This tells you EXACTLY what's wrong!

### Step 3: Check Network Tab (BROWSER)

1. Open DevTools > Network
2. Filter by "Fetch/XHR"
3. Save a contact
4. Look for:
   - `/api/activities/field` (for manual save)
   - Status should be 200
   - Response should have success message

**If Status is 500:**
- Click on the request
- Check the "Response" tab for error message
- This shows the API error details

### Step 4: Check Database Directly

After saving a contact, run this SQL in Supabase:

```sql
SELECT id, first_name, last_name, email, job_title, created_at
FROM activity_contacts
WHERE activity_id = '634c2682-a81a-4b66-aca2-eb229c0e9581'
ORDER BY created_at DESC;
```

**If Contacts ARE in Database:**
- The save is working!
- The issue is in the fetch/display logic
- Check the GET `/api/activities/[id]/contacts` endpoint

**If Contacts are NOT in Database:**
- The save is failing
- Check server logs for the error
- The error logs will tell you exactly why

## Common Issues & Solutions

### Issue 1: "Activity ID is undefined"

**Symptoms:**
- Browser console shows: `[CONTACTS DEBUG] No activity ID, skipping autosave`

**Solution:**
- The activity hasn't been saved yet
- Save the activity first, then add contacts

### Issue 2: "Contacts autosave is disabled"

**Symptoms:**
- No autosave logs appear
- Changes don't trigger save

**Solution:**
- Check if `activityId` is passed to `ContactsSection` component
- Verify `useContactsAutosave` hook is working

### Issue 3: "API returns 500 error"

**Symptoms:**
- Network tab shows 500 status
- Server logs show database error

**Solution:**
- Check the server error logs for exact message
- The error will indicate which field/constraint failed

### Issue 4: "Contacts save but don't appear"

**Symptoms:**
- Server logs show successful insert
- Database has the contacts
- UI shows empty list

**Solution:**
- Issue is in the GET endpoint or frontend rendering
- Check `[Contacts API] Found contacts: N` in server logs
- Check if frontend is calling the correct API

## Enhanced Logging Added

We've added detailed logging to help debug:

**File: `frontend/src/app/api/activities/field/route.ts`**
- Logs contact data before insert
- Logs success with contact IDs
- Logs detailed errors with all fields

**File: `frontend/src/app/api/activities/route.ts`**
- Logs sample contact data
- Logs insert success with IDs
- Logs detailed errors

## What to Do Next

1. **Try to save a contact manually**
2. **Watch BOTH browser console AND server console**
3. **Look for the logs mentioned above**
4. **Report back with:**
   - What you see in browser console
   - What you see in server console
   - What you see in Network tab (status code, response)
   - What you see in database (run the SQL query)

With these logs, we can identify the EXACT issue and fix it!

## Scripts Available

- `node check-contacts-schema.js` - Verify database columns
- `node test-contact-insert.js <activity-id>` - Test direct insert
- `node verify-position-nullable.js` - Check position column

