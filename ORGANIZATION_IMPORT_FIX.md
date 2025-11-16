# Organization Import Fix - Summary

## Problem Identified

When importing IATI XML data, **14 duplicate organizations** were created with the name "The University of British Columbia" instead of creating one and reusing it. Additionally, planned disbursements showed the acronym "TUOBC" instead of linking to the organization.

### Root Causes

1. **`.ilike()` with `.maybeSingle()` bug**: The Supabase query used `.maybeSingle()` which throws an error if multiple matching rows exist. This caused the lookup to fail silently and create a new organization each time.

2. **No deduplication logic**: Each transaction/planned disbursement import called the helper independently without checking if previous imports had already created the organization.

## Solution Implemented

### 1. Fixed the Helper Function

**File**: `frontend/src/lib/organization-helpers.ts`

**Changed**:
```typescript
// Before (buggy)
.ilike('name', name)
.maybeSingle();

// After (fixed)
.ilike('name', name)
.limit(1);
```

Now the query returns an array and we take the first match, avoiding the error when duplicates exist.

### 2. Organization Resolution Flow

The helper now follows this logic:

1. **Lookup by IATI ref** (if provided) - exact match on `iati_org_id`
2. **Lookup by name** (if provided) - case-insensitive match using `.ilike()`, returns first match
3. **Create new** (if not found) - creates organization with provided details

## Cleanup Instructions

### Step 1: Run the Cleanup Script

Execute this SQL script in your Supabase SQL Editor:

```bash
frontend/sql/cleanup_duplicate_organizations.sql
```

This script will:
- Find all organizations named "The University of British Columbia"
- Keep the oldest one (created first)
- Update all transaction references to point to the canonical org
- Update all planned disbursement references to point to the canonical org
- Delete the duplicate organizations
- Verify the cleanup was successful

### Step 2: Verify the Fix

After running the cleanup script, check:

1. **Organizations table**: Should have only ONE "The University of British Columbia"
   ```sql
   SELECT * FROM organizations WHERE name ILIKE '%University of British Columbia%';
   ```

2. **Planned disbursements**: Should show organization name, not "TUOBC"
   ```sql
   SELECT 
       pd.receiver_org_name,
       pd.receiver_org_id,
       o.name as linked_org_name
   FROM planned_disbursements pd
   LEFT JOIN organizations o ON pd.receiver_org_id = o.id
   WHERE pd.receiver_org_name ILIKE '%University of British Columbia%'
   LIMIT 5;
   ```

3. **Transactions**: Should link to the same organization
   ```sql
   SELECT 
       t.receiver_org_name,
       t.receiver_org_id,
       o.name as linked_org_name
   FROM transactions t
   LEFT JOIN organizations o ON t.receiver_org_id = o.id
   WHERE t.receiver_org_name ILIKE '%University of British Columbia%'
   LIMIT 5;
   ```

### Step 3: Test with New Import

After cleanup, test by importing the same XML again. It should:
- ✅ Find the existing "The University of British Columbia" organization
- ✅ NOT create any new organizations
- ✅ Link all transactions and planned disbursements to the existing org
- ✅ Display the full organization name (not "TUOBC")

## Expected Behavior (After Fix)

Given this IATI XML:

```xml
<planned-disbursement type="1">
  <value currency="CAD">135870</value>
  <receiver-org type="80">
    <narrative>The University of British Columbia</narrative>
  </receiver-org>
</planned-disbursement>

<transaction>
  <transaction-type code="3"/>
  <value currency="CAD">135870</value>
  <receiver-org type="80">
    <narrative>The University of British Columbia</narrative>
  </receiver-org>
</transaction>
```

**First import**:
1. Creates ONE organization: "The University of British Columbia" (type 80)
2. Planned disbursement links to it via `receiver_org_id`
3. Transaction links to it via `receiver_org_id`

**Second import** (same XML):
1. Finds existing "The University of British Columbia" 
2. Does NOT create duplicate
3. All new records link to the same organization

**UI Display**:
- Financials tab shows: "The University of British Columbia" ✓
- NOT: "TUOBC" ✗

## Files Modified

1. ✅ `frontend/src/lib/organization-helpers.ts` - Fixed `.ilike()` lookup
2. ✅ `frontend/sql/cleanup_duplicate_organizations.sql` - Cleanup script (new)
3. ✅ `ORGANIZATION_IMPORT_FIX.md` - This documentation (new)

## Preventing Future Issues

The fix ensures:
- Case-insensitive matching prevents "university" vs "University" duplicates
- First-match logic returns existing orgs even if multiple somehow exist
- Consistent helper usage across all import routes
- All import routes (API and UI) use the same logic

## Testing Checklist

- [ ] Run cleanup script
- [ ] Verify only 1 "The University of British Columbia" exists
- [ ] Check planned disbursements show organization name (not TUOBC)
- [ ] Check transactions link to organization
- [ ] Import same XML again
- [ ] Verify no new duplicates created
- [ ] Check Financials tab displays correctly

## Support

If you encounter issues:
1. Check console logs for `[Org Helper]` messages
2. Verify the organization exists in the database
3. Check that `receiver_org_id` is populated in planned_disbursements table
4. Run the verification queries above



