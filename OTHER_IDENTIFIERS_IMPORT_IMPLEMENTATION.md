# Other Identifiers Import Implementation

## Overview

This document describes the implementation of IATI `other-identifier` import functionality in the XML Import tool.

## Changes Made

### 1. Database Schema

**File:** `frontend/supabase/migrations/20250106000000_add_other_identifiers_jsonb.sql`

- Added `other_identifiers` JSONB column to the `activities` table
- Stores an array of other identifier objects with type, code, and optional owner-org data
- Format: `[{"type": "A1", "code": "ABC123", "ownerOrg": {"ref": "AA-AAA-123456789", "narrative": "Organisation name"}}]`
- Added GIN index for efficient JSONB queries

### 2. Field API Route

**File:** `frontend/src/app/api/activities/field/route.ts`

- Added `otherIdentifiers` case to handle saving other identifiers as JSONB array
- Stores the array directly to the `other_identifiers` column in the database

### 3. XML Import Tab

**File:** `frontend/src/components/activities/XmlImportTab.tsx`

#### Parsing (Already Implemented)
- The XML parser already extracts `other-identifier` elements from IATI XML
- Each identifier includes:
  - `ref`: The identifier code (e.g., "ABC123-XYZ")
  - `type`: The identifier type code (e.g., "A1")
  - `ownerOrg`: Optional owner organization with ref and narrative

#### Import Preview (Already Implemented)
- Other identifiers are displayed in the import preview table
- Shows the type code, type name, and identifier code
- Located in the "Identifiers & IDs" subtab of the General tab

#### Import Processing (New)
- Added logic to save imported other identifiers after the main activity update
- Transforms the imported data to the correct format:
  ```typescript
  {
    type: "A1",
    code: "ABC123-XYZ",
    ownerOrg: {
      ref: "AA-AAA-123456789",
      narrative: "Organisation name"
    }
  }
  ```
- Saves using the field API endpoint
- Shows success/error toast notifications

### 4. Activity Editor (New Activity Page)

**File:** `frontend/src/app/activities/new/page.tsx`

#### State Management
- Added `otherIdentifiers` to the general state with proper TypeScript typing
- Type: `Array<{ type: string; code: string; ownerOrg?: { ref?: string; narrative?: string } }>`
- Initialized as empty array for new activities
- Loaded from `data.otherIdentifiers` or `data.other_identifiers` for existing activities

#### UI (Already Implemented)
- The UI already has a complete interface for managing other identifiers:
  - Displays existing identifiers with type and code
  - Dropdown to select identifier type (using `OtherIdentifierTypeSelect`)
  - Input field for identifier code
  - Delete button for each identifier
  - "Add Other Identifier" button to add new ones
- Uses autosave functionality to persist changes

### 5. XML Parser

**File:** `frontend/src/lib/xml-parser.ts`

- Already implemented: Parses `other-identifier` elements from IATI XML
- Extracts `ref`, `type`, and `owner-org` data
- Handles multilingual narratives for owner organization names

## IATI Other Identifier Types

The system supports all IATI other identifier types:

- **A1**: Reporting Organisation's internal activity identifier
- **A2**: CRS Activity identifier
- **A3**: Previous Activity Identifier
- **A9**: Other Activity Identifier
- **B1**: Previous Reporting Organisation Identifier
- **B9**: Other Organisation Identifier

## XML Import Example

```xml
<other-identifier ref="ABC123-XYZ" type="A1">
  <owner-org ref="AA-AAA-123456789">
    <narrative>Organisation name</narrative>
  </owner-org>
</other-identifier>
```

This will be imported and stored as:

```json
{
  "type": "A1",
  "code": "ABC123-XYZ",
  "ownerOrg": {
    "ref": "AA-AAA-123456789",
    "narrative": "Organisation name"
  }
}
```

## Import Flow

1. **Parse XML**: Extract `other-identifier` elements from IATI XML
2. **Preview**: Display in import preview table with type name and code
3. **Select**: User selects which identifiers to import
4. **Transform**: Convert to database format with type, code, and ownerOrg
5. **Save**: Store as JSONB array in `other_identifiers` column
6. **Display**: Show in activity editor for viewing/editing

## API Endpoint Updates

**File:** `frontend/src/app/api/activities/[id]/basic/route.ts`

- Added `other_identifiers` to the SELECT query
- Added `otherIdentifiers` and `other_identifiers` to the transformed response
- Ensures the field is returned when fetching activity data
- **Added graceful fallback**: If the `other_identifiers` column doesn't exist (migration not applied), the endpoint will retry the query without it, preventing the "Failed to load activity" error

This fix ensures that:
1. When the activity editor refreshes, the other identifiers are loaded from the database and displayed in the UI
2. The system continues to work even if the database migration hasn't been applied yet
3. Existing activities can still be loaded and edited without errors

## Testing

To test the implementation:

1. Create or edit an activity
2. Go to the XML Import tab
3. Import XML with `other-identifier` elements
4. Verify identifiers appear in the import preview
5. Select and import the identifiers
6. Check that they appear in the "Other Identifier Types" section of the General tab
7. Verify they are saved to the database correctly
8. **Refresh the page** - the other identifiers should persist and still be visible

## Database Migration

To apply the database migration:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase dashboard
```

## Notes

- The `owner-org` data is preserved but not currently displayed in the UI
- Future enhancement: Display owner organization information in the UI
- The old `other_identifier` text column is kept for backward compatibility
- Multiple other identifiers can be imported and stored for each activity
