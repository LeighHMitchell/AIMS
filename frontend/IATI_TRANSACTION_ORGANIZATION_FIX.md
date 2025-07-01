# IATI Transaction Organization Import Fix

## Problem Summary

The IATI transaction import was failing with the error:
```
Could not find the 'receiver_org' column of 'transactions' in the schema cache
```

This error occurred because:
1. The database schema was missing organization-related columns
2. Transactions were not being linked to activities properly
3. Provider/receiver organizations were not being resolved correctly

## Solution

### 1. Database Schema Updates

Created migration script `add_transaction_org_columns.sql` to add missing columns:

```sql
-- Provider organization columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS provider_org_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS provider_org_ref TEXT,
  ADD COLUMN IF NOT EXISTS provider_org_name TEXT;

-- Receiver organization columns  
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS receiver_org_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS receiver_org_ref TEXT,
  ADD COLUMN IF NOT EXISTS receiver_org_name TEXT;

-- Activity IATI reference
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS activity_iati_ref TEXT;
```

### 2. Import API Updates

Updated `frontend/src/app/api/iati/import-enhanced/route.ts`:

- Removed incorrect column names (`provider_org`, `receiver_org`)
- Added proper organization resolution logic:
  1. Check for UI-assigned organizations first
  2. Fall back to database lookup by `organization_ref`
  3. Store organization reference and name even if UUID not found

- Fixed transaction data structure to match database schema

### 3. UI Organization Assignment

Created `AssignOrganizationsModal` component to allow users to:
- View transactions with missing organization assignments
- Search and select from existing organizations
- Assign provider and receiver organizations before import
- See IATI organization names/refs for context

### 4. Import Workflow Updates

Enhanced the import workflow in `frontend/src/app/iati-import-enhanced/page.tsx`:

1. After transaction activity assignment
2. After code mapping
3. **NEW**: Check for missing organizations and show assignment modal
4. Then proceed to preview/import

## How It Works

### During XML Parse
1. Extract provider/receiver organization data from `<transaction>` elements
2. Store `provider_org_ref`, `provider_org_name`, etc.
3. Mark transactions that need organization assignment

### During Import
1. Apply any UI-assigned organizations first
2. Try to resolve organizations by reference from database
3. Store all available organization data (ID, ref, name)
4. Import proceeds even if organization UUID not found

### Organization Data Model
```typescript
// Transaction fields
{
  provider_org_id: UUID | null,      // FK to organizations table
  provider_org_ref: string | null,   // IATI organization reference
  provider_org_name: string | null,  // Organization name from XML
  receiver_org_id: UUID | null,      // FK to organizations table  
  receiver_org_ref: string | null,   // IATI organization reference
  receiver_org_name: string | null   // Organization name from XML
}
```

## Benefits

1. **Data Integrity**: Transactions maintain organization references even if not in system
2. **Flexibility**: Users can assign organizations manually or skip
3. **Traceability**: Original IATI references are preserved
4. **Progressive Enhancement**: Organizations can be linked later as they're added

## Usage

1. Upload IATI XML file
2. System parses and validates data
3. If transactions have unresolved organizations:
   - Modal shows transactions needing assignment
   - User can search and assign organizations
   - Or skip assignment and import with references only
4. Import proceeds with all available organization data

## Future Enhancements

- Auto-create organizations from IATI data
- Bulk organization import
- Organization matching by name similarity
- Organization reference reconciliation tools 