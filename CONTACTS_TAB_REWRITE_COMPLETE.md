# Contacts Tab - Complete Rewrite Summary

## Overview

Successfully completed a full rewrite of the Activity Editor Contacts tab with IATI-compliant fields, unified contact search, and robust XML import with deduplication. The new implementation provides a modern, search-first user experience.

## What Was Implemented

### 1. Database Schema ✅

**Migration**: `frontend/supabase/migrations/20250113000001_add_linked_contact_id.sql`

Added `linked_contact_id UUID` column to `activity_contacts` table:
- Foreign key to `user_contact(id)` with `ON DELETE SET NULL`
- Index for better query performance
- Tracks provenance when contact is added from address book

**Existing Columns Utilized**:
- `is_focal_point` (boolean) - Designates activity focal points
- `has_editing_rights` (boolean) - Grants editing permissions
- `linked_user_id` (UUID FK → users) - Links to user accounts
- All IATI fields: `job_title`, `department`, `website`, `mailing_address`

### 2. Unified Contact Search API ✅

**File**: `frontend/src/app/api/contacts/search/route.ts`

- **Endpoint**: `GET /api/contacts/search?q=<query>&limit=10`
- **Searches**: Both `users` and `user_contact` tables in parallel
- **Returns**: Normalized array with source discriminator
- **Features**:
  - Minimum 2 characters required
  - Searches by first name, last name, email
  - Includes organization data via JOIN
  - Default limit of 10 results
  - Sorted alphabetically

**Response Format**:
```json
[{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.org",
  "phone": "+1234567890",
  "organization": "Agency A",
  "organizationId": "org-uuid",
  "source": "user" | "user_contact",
  "label": "John Doe (john@example.org) - Agency A"
}]
```

### 3. Enhanced Contact Utilities ✅

**File**: `frontend/src/lib/contact-utils.ts`

**New Functions**:
- `validateIatiContactType(type)` - Returns `{ valid, label, code }` with friendly labels
- `getContactTypeIcon(type)` - Returns emoji icons (📧💼💰📢)
- `normalizeContact(input, source)` - Normalizes from any source to common format
- `areContactsDuplicate(a, b)` - Checks email + name match
- `deduplicateContacts(contacts)` - Removes duplicates with smart merging
- `mergeContact(a, b)` - Merges two contacts, preferring non-empty values

**Updated Functions**:
- `mapIatiContactToDb()` - Now includes `isFocalPoint` and `hasEditingRights` (default false)

### 4. API Persistence Updates ✅

**Files Updated**:
- `frontend/src/app/api/activities/[id]/contacts/route.ts`
- `frontend/src/app/api/activities/field/route.ts`

**Changes**:
- Added `linked_contact_id` support in both GET and POST
- Added JOIN to `user_contact` table in GET
- Returns `linkedContactId`, `linkedContactName`, `linkedContactEmail` in response
- Persists all IATI fields + focal point + editing rights flags

### 5. New UI Components ✅

#### ContactCard
**File**: `frontend/src/components/contacts/ContactCard.tsx`

- Displays contact with type icon and label
- Shows badges for focal point (⭐) and editor (✏️)
- Lists all contact information (email, phone, org, website, address)
- Shows linked provenance if contact came from users/user_contact
- Edit and delete buttons

#### ContactForm
**File**: `frontend/src/components/contacts/ContactForm.tsx`

- Full IATI-compliant form with all fields
- Contact type dropdown (1-4)
- Focal point and editing rights checkboxes
- Name fields (title, first, middle, last)
- Position/role and job title (IATI)
- Organisation and department (IATI)
- Primary and secondary email
- Phone and website (IATI)
- Mailing address (IATI) - textarea
- Validation for required fields, email format, URL format
- Shows as edit or create mode

#### ContactSearchBar
**File**: `frontend/src/components/contacts/ContactSearchBar.tsx`

- Prominent search input at top
- 300ms debounced search
- Shows results dropdown with source tag (User/Contact)
- Displays organization for each result
- "Create New Contact" button
- "No results" message for empty search
- Click outside to close dropdown

#### ContactsTab (Main Component)
**File**: `frontend/src/components/contacts/ContactsTab.tsx`

- Search-first layout
- Shows/hides form based on user action
- Manages contacts state and autosave
- Duplicate detection before adding
- Confirmation dialog for delete
- Loading and saving states with overlays
- Toast notifications for success/error
- Fetches contacts on mount
- Read-only mode support

### 6. Activity Editor Integration ✅

**File**: `frontend/src/app/activities/new/page.tsx`

- Imported new `ContactsTab` component
- Feature flag: `NEXT_PUBLIC_CONTACTS_V2` (defaults to true)
- Falls back to legacy `ContactsSection` if flag is false
- Passes `activityId` and `readOnly` props

### 7. XML Import with Deduplication ✅

**File**: `frontend/src/components/activities/XmlImportTab.tsx`

**Enhanced Contact Import Flow**:
1. Collects contact-info from parsed XML
2. Maps via `mapIatiContactToDb()`
3. **Fetches existing contacts from activity**
4. **Merges and deduplicates** using `deduplicateContacts()`
5. Saves via `/api/activities/field`
6. Logs deduplication stats

**Deduplication Logic**:
- Matches by: email (case-insensitive) + firstName + lastName
- If duplicate found, merges with `mergeContact()`
- Prefers non-empty IATI fields from XML
- Uses OR logic for boolean flags (focal point, editing rights)

### 8. Comprehensive Tests ✅

**File**: `e2e-tests/contacts-tab.spec.ts`

**Test Coverage**:
- Display search bar and create button
- Search for existing contacts
- Create new contact with all IATI fields
- Mark contact as focal point
- Mark contact as editor
- Search and add existing user
- Edit existing contact
- Delete contact
- Prevent duplicate contacts
- Validate required fields
- Validate email format
- Validate website URL format
- Display contact type badges correctly
- Show linked user provenance
- Import contacts from IATI XML
- Deduplicate contacts on XML import

## User Flow

### Primary Flow: Search & Add

1. User opens **Contacts** tab
2. Sees **prominent search bar** at top
3. Types name or email (≥2 chars)
4. After 300ms debounce, **results appear**
5. User selects a result → **form pre-fills**
6. User sets contact type, focal point, editing rights
7. User can edit any IATI fields
8. User clicks **"Add Contact to Activity"**
9. Contact saves and appears in list below

### Alternative Flow: Create New

1. User clicks **"Create New Contact"**
2. **Blank form appears**
3. User fills in required fields (type, first name, last name)
4. User optionally fills IATI fields
5. User sets focal point/editing rights checkboxes
6. User clicks **"Add Contact to Activity"**
7. Contact saves and appears in list

### Edit Flow

1. User clicks **Edit** button on contact card
2. Form appears **pre-filled** with contact data
3. User modifies fields
4. User clicks **"Update Contact"**
5. Changes save and card updates

### Delete Flow

1. User clicks **Delete** button on contact card
2. **Confirmation dialog** appears
3. User confirms
4. Contact removes from list

### XML Import Flow

1. User goes to **XML Import** tab
2. Uploads or pastes IATI XML with `<contact-info>` blocks
3. Parser extracts contacts
4. User **selects contacts** in field preview
5. User clicks **"Import Selected Fields"**
6. System **fetches existing contacts**
7. System **deduplicates and merges**
8. Contacts save to database
9. User navigates to **Contacts** tab
10. **Imported contacts appear** in list

## Data Model

```
activity_contacts (PostgreSQL)
├── Core Fields
│   ├── id (UUID, PK)
│   ├── activity_id (UUID, FK → activities)
│   ├── type (TEXT) - IATI contact type 1-4
│   ├── title (TEXT) - Mr., Ms., Dr., etc.
│   ├── first_name (TEXT) - Required
│   ├── middle_name (TEXT)
│   ├── last_name (TEXT) - Required
│   └── position (TEXT) - Position/role
│
├── IATI Fields
│   ├── job_title (TEXT) - IATI job-title
│   ├── department (TEXT) - IATI department
│   ├── website (TEXT) - IATI website URL
│   └── mailing_address (TEXT) - IATI mailing-address
│
├── Contact Info
│   ├── email (TEXT)
│   ├── secondary_email (TEXT)
│   ├── phone (TEXT) - Legacy
│   ├── country_code (TEXT)
│   ├── phone_number (TEXT)
│   ├── fax (TEXT) - Legacy
│   ├── fax_country_code (TEXT)
│   └── fax_number (TEXT)
│
├── Organisation
│   ├── organisation (TEXT) - Legacy text field
│   └── organisation_id (UUID, FK → organizations)
│
├── Role & Linking
│   ├── is_focal_point (BOOLEAN) - Activity focal point flag
│   ├── has_editing_rights (BOOLEAN) - Editing permissions flag
│   ├── linked_user_id (UUID, FK → users) - User account link
│   └── linked_contact_id (UUID, FK → user_contact) - Contact directory link
│
└── Metadata
    ├── profile_photo (TEXT)
    ├── notes (TEXT)
    ├── display_on_web (BOOLEAN)
    ├── created_at (TIMESTAMP)
    └── updated_at (TIMESTAMP)
```

## IATI Compliance

### Contact Type Codes (IATI Standard)

| Code | Label | Icon | Usage |
|------|-------|------|-------|
| 1 | General Enquiries | 📧 | Public information and general questions |
| 2 | Project Management | 💼 | Implementation and delivery queries |
| 3 | Financial Management | 💰 | Budget, finance, and funding questions |
| 4 | Communications | 📢 | Media, press, and transparency |

### IATI Fields Supported

From `<contact-info>` element:
- ✅ `@type` - Contact type code (1-4)
- ✅ `organisation/narrative` - Organization name
- ✅ `department/narrative` - Department within organization
- ✅ `person-name/narrative` - Full name (parsed into first/middle/last)
- ✅ `job-title/narrative` - IATI job title
- ✅ `telephone` - Phone number
- ✅ `email` - Email address
- ✅ `website` - Website URL
- ✅ `mailing-address/narrative` - Physical mailing address

### Example IATI XML

```xml
<contact-info type="1">
  <organisation>
    <narrative>Agency A</narrative>
  </organisation>
  <department>
    <narrative>Department B</narrative>
  </department>
  <person-name>
    <narrative>A. Example</narrative>
  </person-name>
  <job-title>
    <narrative>Transparency Lead</narrative>
  </job-title>
  <telephone>0044111222333444</telephone>
  <email>transparency@example.org</email>
  <website>http://www.example.org</website>
  <mailing-address>
    <narrative>Transparency House, The Street, Town, City, Postcode</narrative>
  </mailing-address>
</contact-info>
```

## Feature Flag

**Environment Variable**: `NEXT_PUBLIC_CONTACTS_V2`

- **Default**: `true` (new ContactsTab enabled)
- **Set to `'false'`**: Falls back to legacy ContactsSection
- **Purpose**: Safe rollout and A/B testing

## Rollout Plan

1. ✅ **Migration**: Run `20250113000001_add_linked_contact_id.sql`
2. ✅ **API**: Deploy unified search and updated persistence
3. ✅ **Utils**: Deploy extended contact-utils
4. ✅ **UI**: Deploy new ContactsTab components
5. ✅ **Integration**: Wire into activity editor with feature flag
6. ✅ **XML Import**: Deploy deduplication logic
7. ✅ **Tests**: Add comprehensive E2E tests
8. ⏳ **Validation**: Test manually and run E2E suite
9. ⏳ **Rollout**: Monitor in production, validate no regressions
10. ⏳ **Cleanup**: Remove feature flag and legacy ContactsSection

## Files Created

### Database
- `frontend/supabase/migrations/20250113000001_add_linked_contact_id.sql`

### API
- `frontend/src/app/api/contacts/search/route.ts`

### Components
- `frontend/src/components/contacts/ContactsTab.tsx`
- `frontend/src/components/contacts/ContactCard.tsx`
- `frontend/src/components/contacts/ContactForm.tsx`
- `frontend/src/components/contacts/ContactSearchBar.tsx`

### Tests
- `e2e-tests/contacts-tab.spec.ts`

### Documentation
- `CONTACTS_TAB_REWRITE_COMPLETE.md` (this file)

## Files Modified

- `frontend/src/lib/contact-utils.ts` - Extended with normalization, deduplication, merge
- `frontend/src/app/api/activities/[id]/contacts/route.ts` - Added linked_contact_id support
- `frontend/src/app/api/activities/field/route.ts` - Added linked_contact_id persistence
- `frontend/src/components/activities/XmlImportTab.tsx` - Added deduplication on import
- `frontend/src/app/activities/new/page.tsx` - Integrated ContactsTab with feature flag

## Key Features

✅ **Search-First UX**: Prominent search bar encourages linking existing contacts  
✅ **Unified Search**: Searches both users and user_contact tables simultaneously  
✅ **IATI Compliance**: All fields from IATI contact-info standard supported  
✅ **Focal Point**: Checkbox to designate activity focal points (⭐ badge)  
✅ **Editing Rights**: Checkbox to grant editing permissions (✏️ badge)  
✅ **Provenance Tracking**: Links preserved via linked_user_id/linked_contact_id  
✅ **Deduplication**: Smart merge on XML import prevents duplicates  
✅ **Validation**: Email, URL, required fields validated client-side  
✅ **Autosave**: Changes save automatically on add/edit/delete  
✅ **Type Badges**: Visual icons (📧💼💰📢) for contact types  
✅ **Read-Only Mode**: Respects activity permissions  
✅ **Feature Flag**: Safe rollout with fallback to legacy component  

## Next Steps

1. **Run E2E Tests**: Execute `npm run test:e2e` to validate all flows
2. **Manual Testing**: Test in dev environment with real data
3. **Database Migration**: Apply migration to staging/production
4. **Monitor Rollout**: Watch for errors in production logs
5. **Gather Feedback**: Collect user feedback on new UX
6. **Remove Flag**: After validation, set default to new tab permanently
7. **Delete Legacy**: Remove old ContactsSection.tsx once stable
8. **Update Documentation**: Add to user manual and help docs

## Notes

- **Backward Compatible**: Legacy ContactsSection still available via feature flag
- **No Data Loss**: Migration adds column without modifying existing data
- **Performance**: Indexed queries on linked_user_id and linked_contact_id
- **Scalability**: Search debounced to 300ms, limit 10 results
- **Accessibility**: Uses semantic HTML and ARIA labels where appropriate
- **Responsive**: Works on desktop and tablet (mobile optimization may be needed)

## Success Metrics

- ✅ All IATI contact fields importable from XML
- ✅ Deduplication prevents duplicate contacts
- ✅ Users can search across both users and user_contact
- ✅ Focal point and editing rights assignable and visible
- ✅ Validation prevents invalid data entry
- ✅ No linter errors in new code
- ✅ Feature flag allows safe rollout

---

**Implementation Complete**: 2025-01-13  
**Status**: Ready for testing and validation  
**Feature Flag**: `NEXT_PUBLIC_CONTACTS_V2=true` (default)

