# Contacts Tab Bug Fixes - New Contacts Not Appearing

## Issues Found

1. **Contact not appearing after save**: New contacts were being saved but not showing in the UI
2. **Contacts being overwritten**: New contacts were replacing old ones instead of being added

## Root Causes

### 1. Mismatched Field Names
The GET endpoint was looking for `organisation_name` and `primary_email`, but the save endpoint was only populating `organisation` and `email` (legacy fields).

### 2. Source Type Mismatch
The `normalizeContact` utility function didn't handle the 'contact' source type, only 'user' and 'iati'. When searching for existing contacts, the search returns source: 'contact', but the function couldn't process it.

### 3. Duplicate Detection Logic
The duplicate detection required BOTH email AND full name to match (AND logic). This meant contacts without emails or with different emails wouldn't be caught as duplicates even if they had the same name.

### 4. Race Condition in Save
Multiple save operations could happen simultaneously without protection, causing contacts to be overwritten with stale data.

### 5. Database Transaction Timing
The fetch after save might happen before the database transaction fully commits, causing stale data to be returned.

## Fixes Applied

### Fix 1: Updated normalizeContact Function
**File**: `frontend/src/lib/contact-utils.ts`

Added support for 'contact' source type:
```typescript
if (source === 'contact') {
  return {
    id: input.id,
    firstName: input.firstName || input.first_name || '',
    lastName: input.lastName || input.last_name || '',
    email: input.email || '',
    phone: input.phone || input.phoneNumber || input.phone_number || '',
    phoneNumber: input.phoneNumber || input.phone_number || input.phone || '',
    organisation: input.organisation || input.organisation_name || '',
    organisationId: input.organisationId || input.organisation_id || null,
    position: input.position || '',
    type: input.type || '1',
    title: input.title || undefined,
  };
}
```

### Fix 2: Improved Duplicate Detection
**File**: `frontend/src/lib/contact-utils.ts`

Changed from AND to OR logic:
```typescript
// Before: Email AND name must match
return emailMatch && firstNameMatch && lastNameMatch;

// After: Email OR full name must match
return emailMatch || fullNameMatch;
```

This catches duplicates when:
- Email matches (even if names slightly different)
- Full name matches (even if no email or different emails)

### Fix 3: Save Duplicate Protection
**File**: `frontend/src/components/contacts/ContactsTab.tsx`

Added ref to prevent concurrent saves:
```typescript
const saveInProgressRef = useRef(false);

if (saveInProgressRef.current) {
  console.warn('[ContactsTab] Save already in progress, ignoring duplicate request');
  return;
}

saveInProgressRef.current = true;
// ... save logic ...
saveInProgressRef.current = false;
```

### Fix 4: Transaction Timing Delay
**File**: `frontend/src/components/contacts/ContactsTab.tsx`

Added 100ms delay before fetching to ensure DB transaction completes:
```typescript
// Small delay to ensure database transaction commits
await new Promise(resolve => setTimeout(resolve, 100));

// Refresh contacts from database
await fetchContacts();
```

### Fix 5: Field Name Consistency
**File**: `frontend/src/app/api/activities/field/route.ts`

Now saves to both legacy and new field names:
```typescript
const orgValue = toNullIfEmpty(contact.organisation);
const contactData = {
  // ...
  organisation: orgValue,              // Legacy field
  organisation_name: orgValue,         // New field
  email: toNullIfEmpty(contact.email),
  primary_email: toNullIfEmpty(contact.email),  // New field
  phone_number: toNullIfEmpty(contact.phoneNumber || contact.phone),
  // ...
};
```

## Testing Checklist

After these fixes, verify:

- [x] Create new contact without email → Saves and appears in UI
- [x] Create new contact with email → Saves and appears in UI  
- [x] Create contact with same name as existing → Shows duplicate warning
- [x] Create contact with same email as existing → Shows duplicate warning
- [x] Multiple rapid clicks on save button → Only saves once
- [x] Search for existing contact → Returns contacts from activity_contacts table
- [x] Edit existing contact → Updates correctly
- [x] Delete contact → Removes from list
- [x] Organization dropdown → Searches and links correctly

## Summary

All identified issues have been fixed:

1. ✅ `normalizeContact` now handles 'contact' source type
2. ✅ Duplicate detection uses OR logic (email OR name)
3. ✅ Save operation has duplicate protection
4. ✅ Added delay for database transaction timing
5. ✅ Field names consistent between save and fetch (organisation_name, primary_email)

New contacts should now save correctly and appear immediately in the UI without overwriting existing contacts.

