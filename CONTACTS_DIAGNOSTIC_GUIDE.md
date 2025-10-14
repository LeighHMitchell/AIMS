# Contacts Display & XML Import Diagnostic Guide

## Problem Statement

**Issue 1**: Activity has 2 contacts in `activity_contacts` table in Supabase, but only 1 contact displays in the Contacts tab UI

**Issue 2**: Verify IATI XML Import tool correctly imports contact-info elements with the user's specific XML structure

## Overview

This guide provides a systematic approach to diagnose and resolve contact display and import issues. Five diagnostic tools have been created:

1. **diagnose_contacts_display.sql** - Database layer analysis
2. **diagnose_contacts_api.js** - API endpoint testing  
3. **diagnose_contacts_ui.js** - UI rendering analysis
4. **diagnose_xml_contact_import.js** - XML parsing & mapping tests
5. **test_contact_xml_import.xml** - Test XML file

## Quick Start

### Step 1: Database Verification (5 minutes)

1. Log into Supabase Dashboard
2. Navigate to SQL Editor
3. Open `diagnose_contacts_display.sql`
4. Replace `<ACTIVITY_ID>` with your actual activity UUID
5. Run the script
6. Review all 8 sections of output

**Key Questions:**
- Does Section 2 show `total_contacts = 2`? → Both contacts exist in database
- Does Section 3 show any rows? → Contacts are duplicates (same email+name)
- Does Section 4 show all 'OK'? → All required fields are valid
- Does Section 5 show any orphaned users? → Linked user references are broken
- Does Section 8 show differences? → Compare the two contacts side-by-side

### Step 2: API Layer Testing (3 minutes)

1. Navigate to Activity Editor for the problematic activity
2. Open Browser DevTools Console (F12)
3. Copy entire contents of `diagnose_contacts_api.js`
4. Replace `<ACTIVITY_ID>` on line 12 with your activity UUID
5. Paste into console and press Enter
6. Review 6 test sections

**Key Questions:**
- Does TEST 1 show status 200? → API is responding correctly
- Does TEST 2 show correct count? → API is returning all contacts
- Does TEST 4 show duplicate IDs? → React key collision issue
- Does TEST 6 show duplicates by email+name? → Deduplication will merge them

### Step 3: UI Layer Analysis (3 minutes)

1. Navigate to Activity Editor → Contacts tab
2. Open Browser DevTools Console (F12)
3. Copy entire contents of `diagnose_contacts_ui.js`
4. Paste into console and press Enter
5. Review output and follow manual inspection steps

**Key Questions:**
- Does TEST 2 find the correct number of cards? → Rendering is working
- Are any cards hidden via CSS? → Check display/visibility/opacity
- Does count mismatch header? → State management issue

### Step 4: XML Import Testing (5 minutes)

**Part A: Test Parsing Functions**
1. Navigate to Activity Editor → XML Import tab
2. Open Browser DevTools Console (F12)
3. Copy entire contents of `diagnose_xml_contact_import.js`
4. Paste into console and press Enter
5. Review all 6 test sections

**Part B: Test Full Import Flow**
1. Stay on XML Import tab
2. Upload or paste `test_contact_xml_import.xml`
3. Watch console for parsing logs: `[XML Import Debug] Processing contact:`
4. Verify field preview shows 2 contacts with all fields
5. Select contact fields
6. Click "Import Selected Fields"
7. Navigate to Contacts tab
8. Verify both contacts appear

## Diagnostic Decision Tree

```
START: 2 contacts in DB, 1 shows in UI
│
├─ Run diagnose_contacts_display.sql
│  │
│  ├─ Section 2 shows total_contacts = 1?
│  │  └─ ❌ ISSUE: Contact was deleted or never created
│  │     → Check Section 7 (Activity Ownership) for RLS issues
│  │     → Review import logs for errors
│  │
│  ├─ Section 2 shows total_contacts = 2?
│  │  │
│  │  ├─ Run diagnose_contacts_api.js
│  │  │  │
│  │  │  ├─ TEST 2 shows "Contacts Returned: 1"?
│  │  │  │  └─ ❌ ISSUE: API filtering or RLS policy blocking
│  │  │  │     → Check RLS policies in Section 6 of SQL script
│  │  │  │     → Verify current user has access to activity
│  │  │  │
│  │  │  ├─ TEST 2 shows "Contacts Returned: 2"?
│  │  │  │  │
│  │  │  │  ├─ TEST 4 shows duplicate IDs?
│  │  │  │  │  └─ ❌ ISSUE: React key collision
│  │  │  │  │     → Same ID assigned to multiple contacts
│  │  │  │  │     → Fix: Ensure unique UUIDs in database
│  │  │  │  │
│  │  │  │  ├─ Run diagnose_contacts_ui.js
│  │  │  │  │  │
│  │  │  │  │  ├─ TEST 2 finds 1 card in DOM?
│  │  │  │  │  │  └─ ❌ ISSUE: Rendering bug in ContactCard
│  │  │  │  │  │     → Check React DevTools component state
│  │  │  │  │  │     → Look for conditional rendering logic
│  │  │  │  │  │     → Verify map() is not filtering
│  │  │  │  │  │
│  │  │  │  │  ├─ TEST 2 finds 2 cards but 1 hidden?
│  │  │  │  │  │  └─ ❌ ISSUE: CSS hiding contact
│  │  │  │  │  │     → Check display: none, visibility, opacity
│  │  │  │  │  │     → Look for conditional classes
│  │  │  │  │  │
│  │  │  │  │  ├─ TEST 2 finds 2 visible cards?
│  │  │  │  │  │  └─ ✅ Both contacts ARE displaying!
│  │  │  │  │  │     → User may have overlooked second contact
│  │  │  │  │  │     → Check if contacts look very similar
│
END: Root cause identified
```

## Common Issues and Solutions

### Issue: RLS Policy Blocking Access

**Symptoms:**
- Database shows 2 contacts
- API returns 1 or 0 contacts
- Section 6 of SQL script shows restrictive policies

**Root Cause:**
The RLS policy on `activity_contacts` requires user to be activity creator, from same org, or accepted contributor. If a contact was created by a different user/org without proper permissions, it won't be visible.

**Solution:**
```sql
-- Option A: Temporarily disable RLS to confirm
ALTER TABLE activity_contacts DISABLE ROW LEVEL SECURITY;
-- Test if contacts appear, then re-enable:
ALTER TABLE activity_contacts ENABLE ROW LEVEL SECURITY;

-- Option B: Grant proper permissions
-- Add user as contributor to activity
INSERT INTO activity_contributors (activity_id, organization_id, status)
VALUES ('<ACTIVITY_ID>', '<USER_ORG_ID>', 'accepted');
```

### Issue: Duplicate React Keys

**Symptoms:**
- API returns 2 contacts
- Only 1 renders in UI
- TEST 4 shows duplicate IDs
- Console warning: "Each child should have unique key prop"

**Root Cause:**
Two contacts have the same `id` field, causing React to treat them as the same component and skip rendering the second one.

**Solution:**
```sql
-- Check for duplicate IDs
SELECT id, COUNT(*) 
FROM activity_contacts 
WHERE activity_id = '<ACTIVITY_ID>'
GROUP BY id 
HAVING COUNT(*) > 1;

-- If duplicates found, regenerate IDs
UPDATE activity_contacts 
SET id = uuid_generate_v4() 
WHERE activity_id = '<ACTIVITY_ID>';
```

### Issue: Deduplication Merging Contacts

**Symptoms:**
- Import shows 2 contacts in preview
- After import, only 1 contact exists
- TEST 6 shows "DUPLICATE CONTACTS DETECTED"
- Console log: "After deduplication: existing: X, new: Y, deduplicated: X+Y-1"

**Root Cause:**
Two contacts have identical email + firstName + lastName (case-insensitive). The deduplication logic merges them into one.

**Solution:**
```javascript
// Deduplication key: email_firstName_lastName (lowercase)

// If contacts should be separate:
// 1. Change email address to make unique
// 2. OR modify first/last name slightly
// 3. OR disable deduplication temporarily

// To disable deduplication for testing:
// Edit XmlImportTab.tsx line 3280:
// const contactsData = allContacts; // Skip deduplication
```

### Issue: Position Field Empty

**Symptoms:**
- Import fails with database error
- Error message: "null value in column 'position' violates not-null constraint"
- Console log shows: "mappedPosition: Not specified"

**Root Cause:**
The `position` column in `activity_contacts` is NOT NULL, but imported contact has no job-title.

**Solution:**
Already handled in `mapIatiContactToDb()`:
```javascript
// Line 145 in contact-utils.ts
position: extractNarrative(iatiContact.jobTitle) || 'Not specified'
```

This defaults to "Not specified" if job-title is missing. If error persists, check that migration has been applied.

### Issue: Name Parsing Incorrect

**Symptoms:**
- "A. Example" becomes firstName: "A.", lastName: "Example"
- User expects firstName: "A", lastName: "Example" or full name in one field

**Root Cause:**
IATI person-name is a single field, but database requires firstName and lastName separately. The system splits on spaces.

**Current Logic:**
```javascript
extractFirstName("A. Example") → "A."
extractLastName("A. Example") → "Example"
```

**If This Is Wrong:**
Modify `extractFirstName()` and `extractLastName()` in `contact-utils.ts`:
```javascript
// Option 1: Remove periods from first name
export function extractFirstName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts[0].replace(/\./g, ''); // "A." → "A"
}

// Option 2: Put full name in lastName, empty firstName
export function extractFirstName(): string {
  return '';
}
export function extractLastName(fullName: string | undefined | null): string {
  return fullName?.trim() || '';
}
```

## XML Import Verification Checklist

Use this checklist to verify the user's specific XML structure works correctly:

### ✅ Parsing (xml-parser.ts lines 965-993)

- [ ] `<organisation><narrative>` → `organization` field
- [ ] `<department><narrative>` → `department` field  
- [ ] `<person-name><narrative>` → `personName` field
- [ ] `<job-title><narrative>` → `jobTitle` field
- [ ] `<telephone>` → `telephone` field (direct text)
- [ ] `<email>` → `email` field (direct text)
- [ ] `<website>` → `website` field (direct text)
- [ ] `<mailing-address><narrative>` → `mailingAddress` field
- [ ] `@type` attribute → `type` field

**Test:** Upload `test_contact_xml_import.xml` and check console logs for parsed structure.

### ✅ Mapping (contact-utils.ts lines 134-157)

- [ ] `organization` → `organisation` (database column)
- [ ] `department` → `department` (database column)
- [ ] `personName` → `firstName` + `lastName` (split logic)
- [ ] `jobTitle` → `jobTitle` AND `position` (both columns)
- [ ] `telephone` → `phone` (database column)
- [ ] `email` → `email` (database column)
- [ ] `website` → `website` (database column)
- [ ] `mailingAddress` → `mailingAddress` (database column)
- [ ] `type` → validated against codes 1-4

**Test:** Run `diagnose_xml_contact_import.js` to see mapping output.

### ✅ Import Flow (XmlImportTab.tsx lines 3247-3286)

- [ ] Contacts collected from parsed XML
- [ ] `mapIatiContactToDb()` transforms to database format
- [ ] Existing contacts fetched from API
- [ ] Deduplication merges duplicates by email+name
- [ ] Field API deletes all existing contacts
- [ ] Field API inserts new contacts
- [ ] Success toast shows "Contacts updated"

**Test:** Follow Step 4 Part B above to test full flow.

### ✅ Display (ContactsTab.tsx lines 54-308)

- [ ] API called with cache-busting timestamp
- [ ] Response parsed as JSON array
- [ ] State updated with contacts
- [ ] ContactCard rendered for each contact via map()
- [ ] All IATI fields displayed in card
- [ ] Contact type badge shows correct label
- [ ] Edit and Delete buttons functional

**Test:** Navigate to Contacts tab after import and verify display.

## Database Schema Reference

```sql
CREATE TABLE activity_contacts (
  -- Core fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                    -- IATI contact type: 1-4
  title TEXT,                            -- Mr., Ms., Dr., etc.
  first_name TEXT NOT NULL,              -- Required
  middle_name TEXT,
  last_name TEXT NOT NULL,               -- Required
  position TEXT NOT NULL,                -- Required, defaults to jobTitle or "Not specified"
  
  -- IATI fields (added 2025-01-12)
  job_title TEXT,                        -- IATI job-title field
  department TEXT,                       -- IATI department field
  website TEXT,                          -- IATI website field
  mailing_address TEXT,                  -- IATI mailing-address field
  
  -- Contact details
  organisation TEXT,                     -- DEPRECATED but kept for compatibility
  organisation_id UUID REFERENCES organizations(id),
  email TEXT,
  secondary_email TEXT,
  phone TEXT,                            -- Legacy field
  country_code TEXT,
  phone_number TEXT,
  fax TEXT,                              -- Legacy field
  fax_country_code TEXT,
  fax_number TEXT,
  profile_photo TEXT,
  notes TEXT,
  
  -- Settings
  display_on_web BOOLEAN DEFAULT TRUE,
  
  -- Roles (added 2025-01-13)
  is_focal_point BOOLEAN DEFAULT FALSE,
  has_editing_rights BOOLEAN DEFAULT FALSE,
  linked_user_id UUID REFERENCES users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RLS Policies

### SELECT Policy (Viewing)
```sql
CREATE POLICY "Activity contacts are viewable by everyone"
  ON activity_contacts FOR SELECT
  USING (true);
```
**Effect:** Anyone can view contacts (no restrictions)

### ALL Policy (Insert/Update/Delete)
```sql
CREATE POLICY "Activity contacts can be managed by authorized users"
  ON activity_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_contacts.activity_id
      AND (
        a.created_by = auth.uid()                    -- Activity creator
        OR a.created_by_org IN (                     -- Same organization
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (                                   -- Accepted contributor
          SELECT 1 FROM activity_contributors ac
          WHERE ac.activity_id = a.id
          AND ac.organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
          AND ac.status = 'accepted'
        )
      )
    )
  );
```
**Effect:** Only authorized users can create/edit/delete contacts

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `diagnose_contacts_display.sql` | Database verification | Start here - confirms contacts exist |
| `diagnose_contacts_api.js` | API endpoint testing | If DB has 2 but need to check API layer |
| `diagnose_contacts_ui.js` | UI rendering analysis | If API returns 2 but only 1 displays |
| `diagnose_xml_contact_import.js` | XML parsing tests | Test import logic without actual import |
| `test_contact_xml_import.xml` | Test XML file | Full end-to-end import test |

## Support Resources

### Console Log Keywords

Search for these in browser console to find relevant logs:

- `[ContactsTab]` - UI component logs
- `[Contacts API]` - API endpoint logs
- `[Field API]` - Save operation logs
- `[XML Import]` - Import process logs
- `[XML Import Debug]` - XML parsing logs

### Key Files in Codebase

- **Database**: `frontend/supabase/migrations/*_contact*.sql`
- **API**: `frontend/src/app/api/activities/[id]/contacts/route.ts`
- **UI**: `frontend/src/components/contacts/ContactsTab.tsx`
- **Parser**: `frontend/src/lib/xml-parser.ts` (lines 965-993)
- **Mapping**: `frontend/src/lib/contact-utils.ts` (lines 134-157)
- **Import**: `frontend/src/components/activities/XmlImportTab.tsx` (lines 3247-3286)
- **Field API**: `frontend/src/app/api/activities/field/route.ts` (lines 415-557)

## Next Steps

After running diagnostics:

1. **Identify root cause** using decision tree above
2. **Apply fix** from Common Issues section
3. **Verify fix** by re-running relevant diagnostic
4. **Test XML import** with `test_contact_xml_import.xml`
5. **Document findings** for future reference

If issue persists after diagnostics, check:
- Browser console for JavaScript errors
- Network tab for failed API requests
- React DevTools for component state
- Supabase logs for database errors

