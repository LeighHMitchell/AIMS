# Contacts Tab - Troubleshooting Guide

## Issue 1: Select Error on Manual Contact Creation

**Error**: `A <Select.Item /> must have a value prop that is not an empty string`

**Cause**: The title dropdown had an empty string value for "None" option

**Fix**: ✅ Removed empty string value and use placeholder instead
- Changed `{ value: '', label: 'None' }` 
- Now uses `placeholder="None"` with no empty value option

**Status**: Fixed in `ContactForm.tsx`

## Issue 2: Contacts Not Appearing After XML Import

**Possible Causes**:

### A. Contacts Not Being Parsed
**Check**: Look in browser console for `[XML Import Debug] Processing contact:`
- If you see this log, contacts are being parsed ✅
- If not, check your XML structure

**Expected XML Structure**:
```xml
<iati-activity>
  <contact-info type="1">
    <organisation><narrative>Agency A</narrative></organisation>
    <person-name><narrative>A. Example</narrative></person-name>
    <email>contact@example.org</email>
  </contact-info>
</iati-activity>
```

### B. Contacts Not Being Selected for Import
**Check**: In XML Import preview, do you see contacts listed?
- Should show as "Contact 1: [Name]" in the fields list
- Make sure to **check the checkbox** next to each contact
- Click "Import Selected Fields"

### C. Contacts Not Being Saved
**Check**: Browser console for:
- `[XML Import] Processing contacts import...`
- `[XML Import] Transformed contacts data:` - shows mapped contacts
- `[XML Import] After deduplication:` - shows counts

**Common Issues**:
1. **API Error**: Check network tab for 500 errors on `/api/activities/field`
2. **Validation Error**: Check that first_name and last_name are extracted
3. **Permission Error**: Ensure you have edit permissions on the activity

### D. Contacts Saved But Not Displayed
**Check**: 
1. Navigate to Contacts tab
2. Open browser console
3. Look for: `[Contacts Tab] Fetching contacts for activity:`
4. Check response from `/api/activities/{id}/contacts`

## Quick Test Steps

### Test 1: Manual Contact Creation
1. Go to activity → Contacts tab
2. Click "Create New Contact"
3. Fill in:
   - Contact Type: General Enquiries
   - First Name: Test
   - Last Name: Contact
   - Email: test@example.org
4. Click "Add Contact to Activity"
5. Should see contact card appear below

**If it fails**: Check browser console for errors

### Test 2: XML Snippet Import
1. Copy this test XML:
```xml
<iati-activity>
  <contact-info type="1">
    <person-name><narrative>Test Person</narrative></person-name>
    <email>test@example.org</email>
    <telephone>+1234567890</telephone>
  </contact-info>
</iati-activity>
```

2. Go to XML Import tab
3. Paste XML snippet
4. Click "Parse XML"
5. Should see "Contact 1: Test Person" in fields list
6. Check the checkbox
7. Click "Import Selected Fields"
8. Go to Contacts tab
9. Should see "Test Person" contact card

**If contacts don't appear in preview**: Check XML parser console logs

**If import fails**: Check `/api/activities/field` network request

## Console Debugging

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('debug', 'contacts:*,xml:*');
```

Look for these log patterns:

### Parsing Stage
```
[XML Import Debug] Processing contact: { type: "1", personName: "...", ... }
```

### Collection Stage
```
[XML Import] Adding contact for import: { type: "1", ... }
```

### Import Stage
```
[XML Import] Processing contacts import...
[XML Import] Transformed contacts data: [...]
[XML Import] After deduplication: { existing: 0, new: 1, deduplicated: 1 }
```

### Display Stage
```
[Contacts Tab] Fetching contacts for activity: uuid
[Contacts API] Query successful. Found contacts: 1
```

## Common XML Import Issues

### Issue: Contact Has No Name
**XML**:
```xml
<contact-info type="1">
  <email>someone@example.org</email>
</contact-info>
```

**Problem**: `person-name` is missing
**Solution**: Parser will set firstName to "Unknown" and lastName to "Contact"

### Issue: Duplicate Contacts
**Symptom**: Toast message "Duplicate Contact"
**Cause**: Contact with same email + name already exists
**Solution**: Deduplication will merge them automatically on XML import

### Issue: Type Not Showing
**Check**: Contact type must be 1, 2, 3, or 4
**Default**: If missing or invalid, defaults to '1' (General Enquiries)

## API Endpoints to Test

### Get Contacts
```bash
GET /api/activities/{activityId}/contacts
```

Expected response:
```json
[{
  "id": "uuid",
  "type": "1",
  "firstName": "Test",
  "lastName": "Contact",
  "email": "test@example.org",
  "isFocalPoint": false,
  "hasEditingRights": false
}]
```

### Save Contacts
```bash
POST /api/activities/field
Content-Type: application/json

{
  "activityId": "uuid",
  "field": "contacts",
  "value": [{
    "type": "1",
    "firstName": "Test",
    "lastName": "Contact",
    "email": "test@example.org"
  }]
}
```

### Search Users
```bash
GET /api/contacts/search?q=test
```

## Quick Fixes

### Fix 1: Clear State and Retry
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Fix 2: Check Database Directly
```sql
-- Check if contacts exist in database
SELECT id, first_name, last_name, email, type 
FROM activity_contacts 
WHERE activity_id = 'YOUR_ACTIVITY_ID';
```

### Fix 3: Check Migrations
```sql
-- Verify all columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'activity_contacts'
AND column_name IN ('linked_user_id', 'is_focal_point', 'has_editing_rights', 'job_title', 'department', 'website', 'mailing_address');
```

Should return all 7 columns.

## Support

If issues persist:
1. Export browser console logs
2. Check network tab for failed requests
3. Verify database schema matches expected structure
4. Check that all migrations have been applied

## Test Files

Use these test files:
- `test_contact_snippet.xml` - Simple contact XML
- `test_contact_import.xml` - Full IATI contact example
- `e2e-tests/contacts-tab.spec.ts` - Automated tests

