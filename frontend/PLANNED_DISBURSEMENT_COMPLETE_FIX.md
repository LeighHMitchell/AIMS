# Planned Disbursement Import - Complete Fix Summary

## Issue

When importing IATI planned disbursements and then re-importing the same XML, the **Current Value** card only showed "EUR3,000" instead of showing all the details like the **Import Value** card does.

### Expected Behavior
Both cards should show identical information:
```
Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
Receiver Activity: AA-AAA-123456789-1234
```

### Actual Behavior (Before Fix)
- Import Value card: ✅ Shows all fields
- Current Value card: ❌ Only shows "EUR3,000"

## Root Causes

### 1. Missing Database Columns
The backend code was trying to save to columns that didn't exist in the `planned_disbursements` table:
- `type` (IATI @type: 1=Original, 2=Revised) ❌
- `provider_org_ref` (Organization identifier) ❌
- `provider_org_type` (Organization type code) ❌
- `provider_org_activity_id` (Provider activity IATI ID) ❌
- `receiver_org_ref` (Organization identifier) ❌
- `receiver_org_type` (Organization type code) ❌
- `receiver_org_activity_id` (Receiver activity IATI ID) ❌

### 2. Backend Not Saving Type Fields
Even after columns exist, the backend wasn't saving `provider_org_type` and `receiver_org_type`.

### 3. Frontend Not Displaying Type Fields
The current value display logic wasn't showing `provider_org_type` and `receiver_org_type` even if they were in the database.

## Fixes Applied

### ✅ Fix 1: Backend - Added Missing Fields to Save Logic
**File**: `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts`
**Lines**: 1147-1156

Added to the planned disbursement save object:
```typescript
provider_org_type: pd.providerOrg?.type,      // ← ADDED
receiver_org_type: pd.receiverOrg?.type,      // ← ADDED
```

### ✅ Fix 2: Frontend - Enhanced Current Value Display
**File**: `/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx`
**Lines**: 3609-3623

Added to current value display:
```typescript
currentDisbursement.provider_org_type && `Provider Type: ${currentDisbursement.provider_org_type}`,    // ← ADDED
currentDisbursement.receiver_org_type && `Receiver Type: ${currentDisbursement.receiver_org_type}`,    // ← ADDED
```

### ✅ Fix 3: Frontend - Enhanced Matching Logic
**File**: `/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx`
**Lines**: 3632-3647

Added to value matching comparison:
```typescript
(currentDisbursement.provider_org_type || null) === (disbursement.providerOrg?.type || null) &&              // ← ADDED
(currentDisbursement.provider_org_activity_id || null) === (disbursement.providerOrg?.providerActivityId || null) &&  // ← ADDED
(currentDisbursement.receiver_org_type || null) === (disbursement.receiverOrg?.type || null) &&              // ← ADDED
(currentDisbursement.receiver_org_activity_id || null) === (disbursement.receiverOrg?.receiverActivityId || null);    // ← ADDED
```

## Required Database Migration

⚠️ **IMPORTANT**: You must run this SQL in Supabase SQL Editor before the fix will work.

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

## Testing Steps

### Step 1: Run Database Migration
Copy and run the SQL above in Supabase SQL Editor.

### Step 2: Delete Existing Test Data
Delete any existing planned disbursements for your test activity to start fresh:
```sql
DELETE FROM planned_disbursements WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';
```

### Step 3: Import Test XML (First Time)
Use this comprehensive test XML:
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

**Expected Result**:
- Import Value card shows all 13 fields
- Current Value card is empty (no data in DB yet)
- Field is selected for import
- Click Import button

### Step 4: Import Same XML (Second Time)
Re-import the exact same XML.

**Expected Result**:
- **Import Value card** shows:
  ```
  Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
  Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
  Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
  Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
  Receiver Activity: AA-AAA-123456789-1234
  ```

- **Current Value card** shows **EXACTLY THE SAME**:
  ```
  Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
  Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
  Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
  Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
  Receiver Activity: AA-AAA-123456789-1234
  ```

- **Green checkmark** appears (values match)
- Field is **auto-selected** for import
- No conflict indicator

### Step 5: Verify in Database
```sql
SELECT
  id,
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
WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';
```

**Expected Result**:
```
type                   | 1
period_start           | 2014-01-01
period_end             | 2014-12-31
amount                 | 3000.00
currency               | EUR
value_date             | 2014-01-01
provider_org_name      | Agency B
provider_org_ref       | BB-BBB-123456789
provider_org_type      | 10
provider_org_activity_id | BB-BBB-123456789-1234AA
receiver_org_name      | Agency A
receiver_org_ref       | AA-AAA-123456789
receiver_org_type      | 23
receiver_org_activity_id | AA-AAA-123456789-1234
```

## Files Modified

1. ✅ `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts`
   - Line 1150: Added `provider_org_type`
   - Line 1154: Added `receiver_org_type`

2. ✅ `/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx`
   - Line 3617: Added `provider_org_type` to current value display
   - Line 3621: Added `receiver_org_type` to current value display
   - Lines 3642, 3646: Added type fields to matching logic

## Migration Files

1. `/Users/leighmitchell/aims_project/frontend/supabase/migrations/20250115000000_add_planned_disbursement_iati_ref_fields.sql`
   - Complete migration with error handling (for reference)

2. `/Users/leighmitchell/aims_project/frontend/scripts/add-planned-disbursement-columns.ts`
   - Script that outputs required SQL

## Summary

**Before**: Current value only showed amount because type and org ref fields were null.
**After**: Both current and import values show all 13 fields identically.

**Action Required**: Run the SQL migration in Supabase SQL Editor, then test with fresh import.
