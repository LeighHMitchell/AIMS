# Organization Alias Resolution System - Implementation Summary

## Overview

The Organization Alias Resolution System enables AIMS to correctly handle inconsistent organization references in IATI data by combining automated fuzzy matching with human-guided resolution workflows. This ensures that organizations like KOICA (KR-GOV-010) are correctly identified even when source data uses legacy codes (e.g., "010712") or alternate names.

**Implementation Date:** February 1, 2025

## System Architecture

### 1. Database Layer

#### New Columns on `organizations` Table
- `alias_refs TEXT[]` - Legacy/internal organization codes (e.g., "010712", "KR-GOV-OLD")
- `name_aliases TEXT[]` - Alternate organization names (e.g., "KOICA", "Korea Intern. Cooperation Agency")

#### New Table: `organization_alias_mappings`
Audit trail table tracking how organizations were resolved during imports:
```sql
CREATE TABLE organization_alias_mappings (
    id UUID PRIMARY KEY,
    original_ref TEXT,
    original_narrative TEXT,
    resolved_organization_id UUID REFERENCES organizations(id),
    resolution_method TEXT, -- 'direct', 'alias_ref', 'fuzzy_name', 'fuzzy_alias', 'manual'
    matched_by TEXT,
    similarity_score DECIMAL(3,2),
    import_session_id TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ
);
```

#### PostgreSQL Function: `find_similar_organizations`
Uses pg_trgm extension for fuzzy text matching:
- Searches across organization name, acronym, and name_aliases
- Returns results with similarity scores ≥ 0.6
- Orders by similarity (best match first)

### 2. Backend APIs

#### `/api/organizations/resolve` (POST)
**Purpose:** Resolve a single organization reference from IATI XML

**Request:**
```typescript
{
  ref: string | null,
  narrative: string | null
}
```

**Response:**
```typescript
{
  matched: boolean,
  organization?: {
    id: string,
    name: string,
    iati_org_id: string | null,
    country_represented: string | null,
    acronym: string | null
  },
  method?: 'direct' | 'alias_ref' | 'fuzzy_name' | 'fuzzy_alias',
  similarity?: number,
  matched_by?: string
}
```

**Resolution Logic:**
1. Exact match by `iati_org_id`
2. Exact match in `alias_refs` array
3. Fuzzy match by `name` using pg_trgm (similarity > 0.6)
4. Fuzzy match in `name_aliases` array

#### `/api/organizations/resolve-batch` (POST)
Resolve multiple organizations in a single request (wraps `/resolve` endpoint).

#### `/api/organizations/alias-mappings` (GET/POST)
- **POST:** Create audit log entry for a resolution
- **GET:** Retrieve resolution history (filterable by org, session, user)

#### `/api/organizations/[id]` (PUT) - Enhanced
Now validates and normalizes `alias_refs` and `name_aliases` arrays:
- Trims whitespace
- Removes duplicates
- Prevents conflicts (aliases can't be another org's canonical IATI ID)

### 3. Frontend Components

#### StringArrayInput Component
`/frontend/src/components/ui/string-array-input.tsx`

Reusable component for managing arrays of strings:
- Input field with "Add" button
- Enter key support
- Display as removable badges
- Duplicate detection
- Optional custom validation

#### EditOrganizationModal - New "Aliases" Tab
`/frontend/src/components/organizations/EditOrganizationModal.tsx`

Added 7th tab for managing aliases:
- **Legacy or Internal Codes** - Uses StringArrayInput for `alias_refs`
- **Alternate Names** - Uses StringArrayInput for `name_aliases`
- Help text explaining purpose and behavior
- Info banner about automatic matching

#### ResolveOrganizationModal Component
`/frontend/src/components/organizations/ResolveOrganizationModal.tsx`

Multi-organization resolution workflow:
- **Accordion UI** showing all unresolved organizations
- **Three resolution options per org:**
  1. **Link to existing** - Search using OrganizationCombobox
     - Optional "Remember mapping" checkbox (adds as alias)
  2. **Create new** - Inline form for basic org details
  3. **Skip** - Resolve later (activities won't import)
- **Progress tracking** - "Resolved: X / Y"
- **Batch operations** - "Skip All" button
- **Validation** - Ensures all orgs are resolved before saving

### 4. Organization Profile Display

Organization profile page now shows aliases if present:
- **Legacy Codes** - Displayed as blue monospace badges
- **Alternate Names** - Displayed as outlined badges
- Help text: "Used for matching in IATI imports"
- Only shown if aliases exist

### 5. Validation & Helper Functions

#### `/frontend/src/lib/organization-alias-validator.ts`

Utility functions:
- `normalizeAliasArray()` - Trim, dedupe, sort
- `validateAliasRefs()` - Check for conflicts
- `validateNameAliases()` - Check for duplicates/length
- `checkAliasConflicts()` - Map conflicts to org names
- `looksLikeIATIIdentifier()` - Pattern check for IATI IDs
- `suggestAliasType()` - Auto-suggest ref vs name
- `getOrgRefKey()` - Generate unique key for deduplication

## Integration Points (To Be Completed)

The following integration steps are defined but not yet implemented:

### 10. IATI Parse Route Enhancement
**File:** `/frontend/src/app/api/iati/parse/route.ts`

After parsing activities, collect all unique organization references from:
- `participating-org` elements
- `reporting-org` elements  
- `provider-org` in transactions
- `receiver-org` in transactions

For each unique (ref, narrative) combination:
- Call `/api/organizations/resolve`
- Mark as `matched: true` if found
- Add to `unresolvedOrganizations` array if not

### 11. IATI Import Page UI
**File:** `/frontend/src/app/iati-import/page.tsx`

After parsing:
- If `unresolvedOrganizations.length > 0`, show warning banner
- Auto-open `ResolveOrganizationModal`
- Disable import until resolved
- When importing:
  - For resolutions with `rememberMapping: true`, add aliases via API
  - Log all resolutions to `organization_alias_mappings`
  - Use resolved organization IDs in import

### 12. Activity XML Import Tab
**File:** `/frontend/src/components/activities/XmlImportTab.tsx`

Apply same resolution flow as full import, scoped to single activity.

## Usage Guide

### For Users: Adding Aliases Manually

1. Navigate to organization profile
2. Click "Edit Organization"
3. Go to "Aliases" tab
4. Add legacy codes or alternate names
5. Save

Aliases are immediately available for future imports.

### For Users: Resolving During Import

1. Upload IATI XML file
2. If unrecognized organizations are found, modal appears automatically
3. For each organization:
   - **Option A:** Search and link to existing org
     - Check "Remember mapping" to add as alias for future imports
   - **Option B:** Create new organization (add full details later)
   - **Option C:** Skip (won't import activities/transactions for this org)
4. Click "Save" when all resolved

### For Developers: Using the Resolve API

```typescript
const response = await fetch('/api/organizations/resolve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ref: '010712',
    narrative: 'KOREA INTERN. COOPERATION AGENCY'
  })
});

const result = await response.json();
if (result.matched) {
  console.log(`Matched to: ${result.organization.name}`);
  console.log(`Method: ${result.method}`);
  if (result.similarity) {
    console.log(`Similarity: ${result.similarity}`);
  }
}
```

### For Developers: Logging Resolutions

```typescript
await fetch('/api/organizations/alias-mappings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    original_ref: '010712',
    original_narrative: 'KOREA INTERN. COOPERATION AGENCY',
    resolved_organization_id: 'uuid-here',
    resolution_method: 'manual',
    import_session_id: 'import-session-123',
    notes: 'User linked during XML import'
  })
});
```

## Database Migrations

Run migrations in order:
1. `20250201000000_add_organization_aliases.sql` - Add alias columns
2. `20250201000001_create_alias_mappings_log.sql` - Create audit table
3. `20250201000002_create_fuzzy_match_function.sql` - Create search function

## Benefits

1. **Automatic Recognition** - Organizations matched via aliases without manual intervention
2. **Data Integrity** - Prevents duplicate organizations from inconsistent source data
3. **Full Audit Trail** - Track how every resolution was made
4. **User Control** - Easy alias management in UI, no developer needed
5. **Fuzzy Matching** - Handles typos and variations automatically
6. **IATI Compliance** - Encourages use of canonical IATI identifiers

## Example Scenario

**Problem:** UNDP publishes KOICA activities using code "010712"

**Solution:**
1. User imports UNDP XML file
2. System doesn't recognize "010712"
3. Resolution modal appears
4. User searches for "KOICA"
5. Selects "KOICA (KR-GOV-010)"
6. Checks "Remember mapping"
7. System adds "010712" to KOICA's `alias_refs`
8. Import proceeds successfully
9. Future imports automatically recognize "010712" → KOICA

## Future Enhancements

Potential additions not in current scope:

1. **Admin Panel** - Centralized alias management view
2. **Bulk Alias Import** - CSV upload for multiple aliases
3. **Suggestion Engine** - Auto-suggest likely matches based on patterns
4. **Confidence Scoring** - Show fuzzy match confidence in UI
5. **Alias Conflict Detection** - Warn when same alias appears in multiple orgs
6. **Import Session History** - View all resolutions from past imports

## Files Modified

### Database
- `frontend/supabase/migrations/20250201000000_add_organization_aliases.sql`
- `frontend/supabase/migrations/20250201000001_create_alias_mappings_log.sql`
- `frontend/supabase/migrations/20250201000002_create_fuzzy_match_function.sql`

### Backend APIs
- `frontend/src/app/api/organizations/resolve/route.ts` (new)
- `frontend/src/app/api/organizations/resolve-batch/route.ts` (new)
- `frontend/src/app/api/organizations/alias-mappings/route.ts` (new)
- `frontend/src/app/api/organizations/[id]/route.ts` (enhanced)

### Frontend Components
- `frontend/src/components/ui/string-array-input.tsx` (new)
- `frontend/src/components/organizations/ResolveOrganizationModal.tsx` (new)
- `frontend/src/components/organizations/EditOrganizationModal.tsx` (added Aliases tab)
- `frontend/src/app/organizations/[id]/page.tsx` (added alias display)

### Utilities & Types
- `frontend/src/lib/organization-alias-validator.ts` (new)
- `frontend/src/lib/supabase.ts` (updated types)

## Testing Checklist

- [ ] Add aliases via Edit Organization modal
- [ ] Verify aliases display on organization profile
- [ ] Test fuzzy matching via `/api/organizations/resolve`
- [ ] Test alias conflict prevention
- [ ] Test resolution modal with multiple orgs
- [ ] Verify "Remember mapping" adds alias correctly
- [ ] Test "Create new" organization flow
- [ ] Verify audit log entries are created
- [ ] Test batch resolution endpoint
- [ ] Integrate with IATI import flow (pending)

## Support & Questions

For questions or issues with the alias resolution system, contact the development team or file an issue in the project repository.

---

**Last Updated:** February 1, 2025  
**Status:** Core implementation complete, IATI import integration pending

