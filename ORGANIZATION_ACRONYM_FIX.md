# Organization Acronym Fix - Contact Cards

## Problem
Organization acronyms were not displaying in contact cards within the Activity Editor's Contacts tab, even though users were selecting organizations with acronyms when creating/editing contacts.

## Root Cause
A **typo in the API route** caused the organization data from the database join to be inaccessible.

### Details

In `/frontend/src/app/api/activities/[id]/contacts/route.ts`:

**The Join Query (Line 31-37):**
```typescript
const queryBuilder = supabase
  .from('activity_contacts')
  .select(`
    *,
    organizations:organisation_id (
      id,
      name,
      acronym
    )
  `, { count: 'exact' });
```

This Supabase join syntax creates a nested object with the key `organizations` (matching the table name).

**The Transformation Code (Lines 88-90) - BEFORE:**
```typescript
organisation: contact.organisations?.name || contact.organisation_name || contact.organisation,
organisationId: contact.organisation_id,
organisationAcronym: contact.organisations?.acronym || contact.organisation_acronym,
```

Notice the typo: `contact.organisations` (with British spelling ending in 's')

**The actual structure returned by Supabase:**
```json
{
  "id": "...",
  "first_name": "John",
  "organization_id": "abc-123",
  "organizations": {    // ← Note: American spelling
    "id": "abc-123",
    "name": "World Health Organization",
    "acronym": "WHO"
  }
}
```

Since `contact.organisations` was `undefined`, it would fall back to `contact.organisation_acronym`, which doesn't exist as a database column.

## Solution

Changed `contact.organisations` to `contact.organizations` (American spelling) in lines 88 and 90:

```typescript
organisation: contact.organizations?.name || contact.organisation_name || contact.organisation,
organisationId: contact.organisation_id,
organisationAcronym: contact.organizations?.acronym || contact.organisation_acronym,
```

## Files Modified
- `/frontend/src/app/api/activities/[id]/contacts/route.ts` (Lines 88, 90)

## Testing
To verify the fix:
1. Navigate to an activity editor
2. Go to the Contacts tab
3. Add or edit a contact
4. Select an organization that has an acronym
5. Save the contact
6. Verify that the organization acronym appears in parentheses next to the organization name in the contact card

**Expected display:**
```
John Smith
Project Manager
World Health Organization (WHO)
```

## Data Flow (After Fix)

1. **User selects organization in ContactForm** → Sets `organisationId`, `organisation`, and `organisationAcronym`
2. **Contact is saved via API** → `organisation_id` (UUID) is stored in database
3. **Contact is fetched via GET API** → Join query retrieves organization data as `contact.organizations`
4. **Transformation** → Extracts `contact.organizations.acronym` → Sets `organisationAcronym` in response
5. **ContactCard renders** → Displays "Organization Name (ACRONYM)" if acronym exists

## Related Components
- `/frontend/src/components/contacts/ContactForm.tsx` - User selects organization
- `/frontend/src/app/api/activities/field/route.ts` - Saves `organisation_id` to database
- `/frontend/src/app/api/activities/[id]/contacts/route.ts` - Fetches contacts with organization join
- `/frontend/src/components/contacts/ContactCard.tsx` - Displays organization acronym

## Prevention
This type of issue can be prevented by:
1. Using TypeScript types for API responses
2. Adding tests for the full data flow
3. Consistent naming conventions (American vs British spelling)

