# Transaction and Contact Persistence Fix

## Issues Fixed

### 1. ✅ Transactions Not Persisting - organization_id was NULL

**Problem:** Transactions were not saving because the `organization_id` field was NULL in the database. This field links the transaction to the organization that created it.

**Root Cause:** 
- `body.createdByOrg` was sometimes empty if user data hadn't loaded when the activity was first created
- The backend was only using `body.createdByOrg` without a fallback

**Fix Applied:**
```typescript
// Before:
organization_id: cleanUUIDValue(body.createdByOrg),

// After:
organization_id: cleanUUIDValue(body.createdByOrg) || cleanUUIDValue(body.user?.organizationId),
```

The fix adds a fallback to use the user's organization ID from the user object if `createdByOrg` is empty.

### 2. ✅ Better User Data in Payload

**Fix Applied:** Added `organizationId` explicitly to the user object in the payload:
```typescript
user: user ? {
  id: user.id,
  name: user.name,
  role: user.role,
  organizationId: user.organizationId, // Now included
} : undefined,
```

### 3. ✅ Contact Validation

**Problem:** Contacts might fail to save if required fields are missing.

**Fix Applied:** Added validation and defaults for required contact fields:
- `type` - defaults to 'general'
- `first_name` - defaults to 'Unknown'
- `last_name` - defaults to 'Unknown'  
- `position` - defaults to 'Unknown'

### 4. ✅ Enhanced Error Reporting

**Improvements:**
- Better logging when `organization_id` is missing
- Warnings array returned in response for partial save failures
- Console warnings for missing required fields
- Toast notifications in UI for save failures

## Testing Instructions

### 1. Test Transaction Saving
1. Clear browser cache (Ctrl+Shift+R)
2. Log in with a valid user account
3. Create a new activity or edit existing
4. Go to **Finances** tab
5. Add a transaction with all fields
6. Save the activity
7. Check browser console for:
   ```
   [AIMS] Mapped transaction 0: {
     organization_id: "550e8400-e29b-41d4-a716-446655440000", // Should NOT be null
     ...
   }
   ```
8. Refresh the page - transactions should persist
9. Check Supabase - `organization_id` should have a UUID value

### 2. Test Contact Saving
1. Go to **Contacts** tab
2. Add a contact with minimal info
3. Save the activity
4. Check for warnings if required fields are missing
5. Refresh - contacts should persist

### 3. Monitor Console Logs
Look for these key messages:
- `[AIMS] Transaction X has no organization_id` - indicates a problem
- `[AIMS] Successfully inserted transactions: X` - indicates success
- `[AIMS] Contact missing required fields` - validation warnings

## What Success Looks Like

**Good Transaction Save:**
```sql
-- In Supabase transactions table:
organization_id: "550e8400-e29b-41d4-a716-446655440000" ✅ (Not NULL)
activity_id: "123e4567-e89b-12d3-a456-426614174000"
transaction_type: "D"
value: 50000.00
```

**Frontend Success Message:**
```
✅ Activity saved successfully! Saved: 3 transactions, 2 contacts
```

## Debugging Tips

### Check User Organization ID
In browser console:
```javascript
// Get current user data
const userData = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User Organization ID:', userData.organizationId);
console.log('Is valid UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userData.organizationId));
```

### Monitor Network Tab
1. Open Network tab (F12)
2. Save activity with transactions
3. Find POST to `/api/activities`
4. Check Request payload:
   - `createdByOrg` should have a UUID
   - `user.organizationId` should have a UUID
5. Check Response for any `_warnings`

## Known Limitations

1. If user's organization ID is not set in their profile, transactions still won't save properly
2. Legacy transactions without organization_id will remain NULL
3. The fix only applies to new saves - existing NULL values need manual update

## Next Steps

1. **Data Migration**: Update existing transactions with NULL organization_id
2. **User Validation**: Ensure all users have valid organization IDs
3. **Required Field Enforcement**: Make organization_id required at database level after migration 