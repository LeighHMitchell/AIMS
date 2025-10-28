# Finance Type Inheritance - Complete Implementation

## Overview
Transactions that lack an explicit finance type now automatically inherit from the activity's `default_finance_type` if set. Inherited finance types are displayed with dimmed styling and informative tooltips across all transaction views.

## Implementation Complete ✅

### 1. Database Changes

#### Migration 1: Add Column
**File:** `frontend/supabase/migrations/20250128000001_add_inherited_finance_type_flag.sql`
- Adds `finance_type_inherited` BOOLEAN column to `transactions` table
- Defaults to FALSE
- Includes index for performance

#### Migration 2: Backfill Existing Data
**File:** `frontend/supabase/migrations/20250128000002_backfill_finance_type_inherited.sql`
- Identifies existing transactions where `finance_type` matches activity's `default_finance_type`
- Marks them as inherited (sets flag to TRUE)
- Updates all matching records in one operation

#### Standalone Script
**File:** `backfill_inherited_finance_types.sql`
- Can be run immediately to backfill existing transactions
- Shows before/after counts and sample results
- Useful for testing or immediate deployment

### 2. TypeScript Interfaces

#### Transaction Type
**File:** `frontend/src/types/transaction.ts`
```typescript
finance_type_inherited?: boolean; // True if finance_type was inherited from activity default
```

#### ParsedField Interface
**File:** `frontend/src/components/activities/XmlImportTab.tsx`
```typescript
isInherited?: boolean; // True if value was inherited from activity defaults
inheritedFrom?: string; // Description of where the value was inherited from
```

### 3. Import Logic

#### XML Import Tab
**File:** `frontend/src/components/activities/XmlImportTab.tsx`
- Updated `generateDetailedFields()` to accept activity defaults parameter
- Checks if transaction has explicit `financeType`, otherwise uses activity's `default_finance_type`
- Sets `isInherited: true` with descriptive tooltip text
- Import save logic includes `finance_type_inherited` flag in database writes
- Added Tooltip components for dimmed styling display

#### API Import Route
**File:** `frontend/src/app/api/iati/import-enhanced/route.ts`
- Queries activity's `default_finance_type` when transaction lacks explicit finance type
- Applies inherited value and sets `finance_type_inherited: true`
- Includes both fields in INSERT statement

### 4. Display Logic

#### Import Preview
**File:** `frontend/src/components/activities/XmlImportTab.tsx`
- Shows inherited values with dimmed styling: `text-gray-400 opacity-70`
- Tooltip: "Inherited from activity's default finance type (code {code} – {name})"
- Example: "Inherited from activity's default finance type (code 110 – Standard grant)"

#### Transaction List (Activity Editor)
**File:** `frontend/src/components/activities/TransactionList.tsx`
- Finance Type column checks `finance_type_inherited` flag
- Applies dimmed styling and tooltip for inherited values
- Consistent with import preview styling

#### Transaction Table (Activity Profile)
**File:** `frontend/src/components/transactions/TransactionTable.tsx`
- Updated `TransactionData` interface to include `finance_type_inherited`
- Conditional tooltip text based on inherited status
- Dimmed styling for inherited values

### 5. Update Logic - Important!

When users manually edit a transaction's finance type, it's marked as explicitly set:

#### Main Transaction API
**File:** `frontend/src/app/api/transactions/route.ts` (PUT method)
```typescript
// If finance_type is being explicitly set/changed, mark it as not inherited
if ('finance_type' in updateData) {
  cleanedData.finance_type_inherited = false;
}
```

#### Activity Transaction API
**File:** `frontend/src/app/api/activities/[id]/transactions/[transactionId]/route.ts` (PUT method)
```typescript
// If finance_type is being explicitly set/changed, mark it as not inherited
if ('finance_type' in body) {
  updateData.finance_type_inherited = false;
}
```

#### Data Clinic API
**File:** `frontend/src/app/api/data-clinic/transactions/[id]/route.ts` (PATCH method)
```typescript
// If finance_type is being updated, mark it as not inherited
if (dbField === 'finance_type') {
  updateData.finance_type_inherited = false;
}
```

## How to Deploy

### Option 1: Run Migrations
```bash
# Run the migrations in order
psql -d your_database -f frontend/supabase/migrations/20250128000001_add_inherited_finance_type_flag.sql
psql -d your_database -f frontend/supabase/migrations/20250128000002_backfill_finance_type_inherited.sql
```

### Option 2: Run Standalone Script (Immediate)
```bash
# This shows diagnostics and performs the backfill
psql -d your_database -f backfill_inherited_finance_types.sql
```

## How It Works

### For New Imports
1. User imports transactions from IATI XML
2. Parser checks each transaction for explicit `finance_type`
3. If missing, checks activity's `default_finance_type`
4. If default exists, applies it with `finance_type_inherited = true`
5. Displays in import preview with dimmed styling and tooltip

### For Existing Transactions
1. Run backfill script/migration
2. Identifies transactions where `finance_type` matches activity's `default_finance_type`
3. Marks them as inherited
4. UI immediately shows them with dimmed styling on next page load

### For Manual Edits
1. User opens transaction editor
2. Changes finance type field
3. On save, `finance_type_inherited` is set to `false`
4. Transaction no longer shows as inherited (displays normally)

## Visual Indicators

**Inherited Finance Types:**
- Text color: `text-gray-400`
- Opacity: `opacity-70`
- Tooltip on hover: Shows inheritance source with code and name
- Appears in: Import preview, Activity Editor finances tab, Activity Profile finances tab

**Explicit Finance Types:**
- Normal text color and opacity
- Standard tooltip showing code and name
- No inheritance indicator

## Benefits

1. **Data Completeness**: Automatically fills missing finance types from activity defaults
2. **Visual Clarity**: Users can distinguish inherited vs explicit values
3. **User Control**: Can override inherited values anytime
4. **Audit Trail**: Database tracks inheritance status for reporting
5. **Consistent UX**: Same styling and behavior across all transaction views

## Testing

### Test Scenario 1: Import with Inherited Finance Type
1. Create/find an activity with `default_finance_type = "110"`
2. Import IATI XML with transactions lacking `<finance-type>` elements
3. Verify transactions show finance type "110" with dimmed styling
4. Hover to confirm tooltip shows inheritance message

### Test Scenario 2: Existing Transactions
1. Run backfill script
2. Navigate to activity with transactions
3. Verify transactions matching activity default show as inherited (dimmed)

### Test Scenario 3: Manual Override
1. Edit an inherited transaction
2. Change finance type to something different
3. Save and verify it displays normally (not dimmed)
4. Check database: `finance_type_inherited` should be `false`

## Notes

- API endpoints using `.select('*')` automatically include the new field
- No frontend code changes needed beyond those listed above
- Backwards compatible: existing transactions without the flag display normally
- The backfill is safe to run multiple times (uses WHERE clause to avoid re-updating)



