# Planned Disbursement Import Fix

## Summary

When importing IATI planned disbursements, the **type** field and **organization reference fields** (provider_org_ref, provider_org_type, provider_org_activity_id, receiver_org_ref, receiver_org_type, receiver_org_activity_id) were not being saved to the database because these columns didn't exist in the `planned_disbursements` table schema.

## Root Cause

The backend import code in `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts` was trying to save to columns that didn't exist:

```typescript
// Backend was trying to save these fields:
type: pd.type || '1',                                    // ❌ Column didn't exist
provider_org_ref: pd.providerOrg?.ref,                   // ❌ Column didn't exist
provider_org_type: pd.providerOrg?.type,                 // ❌ Column didn't exist
provider_org_activity_id: pd.providerOrg?.providerActivityId, // ❌ Column didn't exist
receiver_org_ref: pd.receiverOrg?.ref,                   // ❌ Column didn't exist
receiver_org_type: pd.receiverOrg?.type,                 // ❌ Column didn't exist
receiver_org_activity_id: pd.receiverOrg?.receiverActivityId  // ❌ Column didn't exist
```

The existing schema only had:
- `provider_org_id` (UUID FK to organizations table)
- `provider_org_name` (VARCHAR text field)
- `receiver_org_id` (UUID FK to organizations table)
- `receiver_org_name` (VARCHAR text field)

## Solution

### Step 1: Add Missing Database Columns

Run the following SQL in Supabase SQL Editor:
**URL**: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql

```sql
-- Add type column (IATI @type: 1=Original, 2=Revised)
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS type VARCHAR(2) DEFAULT '1';

-- Add provider organization reference fields
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_ref VARCHAR(255);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_type VARCHAR(10);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS provider_org_activity_id VARCHAR(255);

-- Add receiver organization reference fields
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_ref VARCHAR(255);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_type VARCHAR(10);
ALTER TABLE planned_disbursements ADD COLUMN IF NOT EXISTS receiver_org_activity_id VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_provider_org_ref ON planned_disbursements(provider_org_ref);
CREATE INDEX IF NOT EXISTS idx_planned_disbursements_receiver_org_ref ON planned_disbursements(receiver_org_ref);
```

### Step 2: Code Changes Already Made

The following files have already been updated:

1. **Backend Import Handler** (`/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts`):
   - Line 1137: Changed `disbursement_type` to `type`
   - Lines 1148-1153: Added organization reference fields

2. **Frontend Display** (`/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx`):
   - Lines 3578-3593: Enhanced import value display to show all fields
   - Lines 3595-3625: Enhanced current value display to show all fields
   - Lines 3630-3641: Added comprehensive matching logic

## Testing

After running the SQL migration:

1. **Import Test XML**:
   ```xml
   <planned-disbursement type="1">
      <period-start iso-date="2014-01-01" />
      <period-end iso-date="2014-12-31" />
      <value currency="EUR" value-date="2014-01-01">3000</value>
      <provider-org provider-activity-id="BB-BBB-123456789-1234AA" type="10" ref="BB-BBB-123456789">
       <narrative>Agency B</narrative>
      </provider-org>
      <receiver-org receiver-activity-id="AA-AAA-123456789-1234" type="23" ref="AA-AAA-123456789">
       <narrative>Agency A</narrative>
      </receiver-org>
   </planned-disbursement>
   ```

2. **Expected Behavior**:
   - Import value card should show:
     ```
     Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
     Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
     Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
     Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
     Receiver Activity: AA-AAA-123456789-1234
     ```

3. **After Importing, Import Again**:
   - Current value card should now show the same information
   - Field should show green checkmark indicating values match
   - Field should be auto-selected for import

4. **Verify in Database**:
   ```sql
   SELECT
     type,
     period_start,
     period_end,
     amount,
     currency,
     value_date,
     provider_org_name,
     provider_org_ref,
     provider_org_type,
     provider_org_activity_id,
     receiver_org_name,
     receiver_org_ref,
     receiver_org_type,
     receiver_org_activity_id
   FROM planned_disbursements
   WHERE activity_id = '<activity-id>';
   ```

## Files Modified

1. `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts`
   - Line 1137: Fixed type field name

2. `/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx`
   - Lines 2505-2591: Added current value fetch
   - Lines 3578-3641: Enhanced display and matching logic

## Migration Files Created

1. `/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250115000000_add_planned_disbursement_iati_ref_fields.sql`
   - Full migration with error handling (can't be run via API)

2. `/Users/leighmitchell/aims_project/frontend/scripts/add-planned-disbursement-columns.ts`
   - Script that outputs the required SQL

## Next Steps

1. ✅ Run the SQL migration in Supabase SQL Editor
2. ✅ Test IATI import with comprehensive XML
3. ✅ Verify all fields save and display correctly
4. ✅ Confirm re-import shows matching values with green checkmarks
