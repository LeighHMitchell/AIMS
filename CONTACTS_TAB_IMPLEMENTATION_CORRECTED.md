# Contacts Tab Rewrite - Corrected Implementation

## Database Schema Clarification

After reviewing the actual database schema, it was confirmed that:

- ✅ The contacts table is called `activity_contacts` (not `user_contact`)
- ✅ There is NO separate `user_contact` table in the database
- ✅ The system only has a `users` table for user accounts
- ✅ The `activity_contacts` table already has `linked_user_id` (FK to `users.id`) for linking

## Corrected Implementation

### Migration (20250113000001_add_linked_contact_id.sql)

**Status**: Verification only - no changes needed

The migration was updated to:
- Document that `user_contact` table doesn't exist
- Verify that all required columns already exist:
  - `linked_user_id` (UUID FK to users.id)
  - `is_focal_point` (BOOLEAN)
  - `has_editing_rights` (BOOLEAN)
  - All IATI fields (job_title, department, website, mailing_address)

### API Changes

**`/api/contacts/search` (GET)**
- ✅ Searches ONLY the `users` table
- ✅ Returns results with `source: 'user'`
- ✅ No longer attempts to query non-existent `user_contact` table

**`/api/activities/[id]/contacts` (GET)**
- ✅ Removed `user_contact` join
- ✅ Only joins to `users` via `linked_user_id`
- ✅ Returns `linkedUserId`, `linkedUserName`, `linkedUserEmail`
- ❌ Removed `linkedContactId`, `linkedContactName`, `linkedContactEmail`

**`/api/activities/field` (POST)**
- ✅ Persists `linked_user_id` only
- ❌ Removed `linked_contact_id` persistence

### Utility Functions (`contact-utils.ts`)

**`normalizeContact(input, source)`**
- Updated signature: `source: 'user' | 'iati'` (removed 'user_contact')
- Only handles 'user' and 'iati' sources
- Sets `linkedUserId` when source is 'user'

### UI Components

**ContactCard**
- ✅ Shows linked user info via `linkedUserName` and `linkedUserEmail`
- ❌ Removed `linkedContactId` references

**ContactForm**
- ✅ Accepts `linkedUserId` only
- ❌ Removed `linkedContactId` field

**ContactSearchBar**
- ✅ Source type updated to `'user'` only
- ✅ Badge shows "User" for all results

**ContactsTab**
- ✅ Works with single source (users only)
- ✅ All functionality intact

## Database Schema (Actual)

```sql
activity_contacts
├── id UUID PRIMARY KEY
├── activity_id UUID FK → activities.id
├── type TEXT (IATI contact type 1-4)
├── title TEXT
├── first_name TEXT NOT NULL
├── middle_name TEXT
├── last_name TEXT NOT NULL
├── position TEXT
├── job_title TEXT (IATI)
├── organisation TEXT (deprecated, use organisation_name)
├── organisation_id UUID FK → organizations.id
├── organisation_name TEXT
├── department TEXT (IATI)
├── email TEXT (deprecated, use primary_email)
├── primary_email TEXT
├── secondary_email TEXT
├── phone TEXT (deprecated)
├── country_code TEXT
├── phone_number TEXT
├── fax TEXT (deprecated)
├── fax_country_code TEXT
├── fax_number TEXT
├── website TEXT (IATI)
├── mailing_address TEXT (IATI)
├── profile_photo TEXT
├── notes TEXT
├── display_on_web BOOLEAN DEFAULT TRUE
├── user_id UUID FK → users.id (deprecated, use linked_user_id)
├── role TEXT
├── name TEXT
├── is_focal_point BOOLEAN DEFAULT FALSE ⭐
├── has_editing_rights BOOLEAN DEFAULT FALSE ✏️
├── linked_user_id UUID FK → users.id 🔗
├── created_at TIMESTAMPTZ
└── updated_at TIMESTAMPTZ
```

## User Flow (Updated)

1. User opens Contacts tab → sees search bar
2. User types name/email → searches `users` table only
3. User selects a user → form pre-fills with their data
4. User sets IATI contact type, focal point, editing rights
5. User clicks "Add Contact to Activity"
6. Contact saves with `linked_user_id` set to the selected user
7. Contact card shows 🔗 "Linked to user: [Name] ([Email])"

## What Changed from Original Plan

| Original Plan | Actual Implementation |
|---------------|----------------------|
| Search `users` + `user_contact` | Search `users` only |
| Add `linked_contact_id` column | Not needed - column doesn't exist |
| Support two link types | Support `linked_user_id` only |
| Source discriminator: 'user' \| 'user_contact' | Source: 'user' only |

## Files Modified (Corrected)

1. **Migration**: `frontend/supabase/migrations/20250113000001_add_linked_contact_id.sql`
   - Changed to verification-only migration
   
2. **API**: `frontend/src/app/api/contacts/search/route.ts`
   - Removed `user_contact` queries
   
3. **API**: `frontend/src/app/api/activities/[id]/contacts/route.ts`
   - Removed `user_contact` join
   - Removed `linkedContactId` fields
   
4. **API**: `frontend/src/app/api/activities/field/route.ts`
   - Removed `linked_contact_id` persistence
   
5. **Utils**: `frontend/src/lib/contact-utils.ts`
   - Updated `normalizeContact` signature
   - Removed 'user_contact' source handling
   
6. **Components**: All contact components updated to remove `linkedContactId` references

## Migration Command

```bash
# Run the verification migration
psql -d your_database -f frontend/supabase/migrations/20250113000001_add_linked_contact_id.sql

# Expected output:
# NOTICE: Verifying activity_contacts schema...
# NOTICE: ✓ linked_user_id column exists
# NOTICE: ✓ is_focal_point column exists
# NOTICE: ✓ has_editing_rights column exists
```

## Testing Notes

All E2E tests remain valid except:
- Search results will only show users (not two sources)
- Linked provenance will only show "Linked to user" (not "Linked to contact")
- No need to test dual-source scenarios

## Summary

The implementation is now **correctly aligned with the actual database schema**. The system:
- ✅ Searches and links to `users` table only
- ✅ Uses `linked_user_id` for provenance tracking
- ✅ Supports all IATI fields
- ✅ Supports focal point and editing rights assignment
- ✅ Includes deduplication and smart merging on XML import
- ✅ Provides search-first UX
- ✅ Feature-flagged rollout ready

**Status**: Ready for testing with corrected schema assumptions

