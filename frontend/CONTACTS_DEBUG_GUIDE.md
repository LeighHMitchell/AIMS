# Contact Saving Debug Guide

## Step 1: Check Browser Console

When you save an activity with contacts, look for these logs:

```javascript
// Frontend logs - should show contact data being sent
[AIMS DEBUG] - contacts state: [...]
[AIMS DEBUG] - contacts count: 1
[AIMS] Contacts being saved: [{...}]
[AIMS] Contacts details: [
  {
    "id": "contact-123456",
    "type": "general",
    "firstName": "John",
    "lastName": "Doe",
    "position": "Manager",
    ...
  }
]

// Backend response logs
[AIMS DEBUG] After save - contacts from response: []  // ⚠️ If empty, contacts didn't save
[AIMS DEBUG] After save - contacts count: 0         // ⚠️ Should match sent count
```

## Step 2: Check Network Tab

1. Open Network tab (F12)
2. Find the POST request to `/api/activities`
3. Check Request Payload:
   ```json
   {
     "contacts": [
       {
         "id": "contact-123456",
         "type": "general",
         "firstName": "John",
         "lastName": "Doe",
         "position": "Manager",
         "organisation": "ACME Corp",
         "email": "john@example.com"
       }
     ]
   }
   ```
4. Check Response for warnings:
   ```json
   {
     "_warnings": [
       {
         "message": "Some contacts could not be saved",
         "details": "column \"xyz\" does not exist"
       }
     ]
   }
   ```

## Step 3: Check Server Logs (Terminal)

Look for these backend logs:

```
[AIMS] Processing contacts for update, count: 1
[AIMS] Raw contacts data received: [{
  "id": "contact-123456",
  "type": "general",
  ...
}]
[AIMS] Processing contact 0: {...}
[AIMS] Mapped contact 0: {
  "activity_id": "abc-123",
  "type": "general",
  "first_name": "John",
  ...
}
[AIMS] Inserting contacts data: [...]

// Success:
[AIMS API] Successfully saved contacts: 1

// OR Error:
[AIMS] Error saving contacts: {
  "code": "42703",
  "message": "column \"xyz\" of relation \"activity_contacts\" does not exist"
}
```

## Step 4: Check Supabase Table Structure

Go to your Supabase dashboard → Table Editor → `activity_contacts` table and verify columns:

Expected columns:
- `id` (uuid, primary key)
- `activity_id` (uuid, foreign key)
- `type` (text)
- `title` (text, nullable)
- `first_name` (text)
- `middle_name` (text, nullable)
- `last_name` (text)
- `position` (text)
- `organisation` (text, nullable)
- `phone` (text, nullable)
- `fax` (text, nullable)
- `email` (text, nullable)
- `profile_photo` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Step 5: Common Issues & Solutions

### Issue 1: RLS (Row Level Security) Blocking Inserts
**Symptom:** No error but contacts don't save
**Check:** Supabase Dashboard → Authentication → Policies → activity_contacts
**Solution:** Ensure RLS policy allows inserts for authenticated users

### Issue 2: Missing Required Fields
**Symptom:** `null value in column "xyz" violates not-null constraint`
**Solution:** Ensure all required fields have values:
- `type` (defaults to 'general')
- `first_name` (defaults to 'Unknown')
- `last_name` (defaults to 'Unknown')
- `position` (defaults to 'Unknown')

### Issue 3: Invalid Activity ID
**Symptom:** `insert or update on table "activity_contacts" violates foreign key constraint`
**Solution:** Ensure activity is saved first before adding contacts

### Issue 4: UUID Format Issues
**Symptom:** `invalid input syntax for type uuid`
**Solution:** Contact IDs should be valid UUIDs or generated strings

## Step 6: Quick Test

Run this in Supabase SQL Editor to test direct insert:

```sql
-- Test if you can insert a contact directly
INSERT INTO activity_contacts (
  activity_id,
  type,
  first_name,
  last_name,
  position
) VALUES (
  'YOUR-ACTIVITY-ID-HERE', -- Replace with actual activity ID
  'general',
  'Test',
  'Contact',
  'Test Position'
);

-- Check if it was inserted
SELECT * FROM activity_contacts 
WHERE first_name = 'Test' AND last_name = 'Contact';
```

## Step 7: Enable Detailed Logging

Add this to your save function for more details:

```javascript
// In saveActivity function, after the fetch:
if (!res.ok) {
  const errorText = await res.text();
  console.error('[AIMS] Full error response:', errorText);
  throw new Error(data.error || errorText || "Failed to save activity");
}
```

## Need More Help?

If contacts still aren't saving:
1. Copy all console logs
2. Copy the network request/response
3. Note any error messages
4. Check if the contact appears in Supabase table directly

The most common issues are:
- RLS policies blocking inserts
- Missing required fields
- Activity not saved before contacts
- Database column mismatch 