# Transaction Humanitarian Column Fix

## Date
January 20, 2025 - Final Fix

## Issue

Transaction import was failing with error:
```
"Could not find the 'humanitarian' column of 'transactions' in the schema cache"
```

## Root Cause

The transactions handler (line 4981 in XmlImportTab.tsx) was trying to insert:
```typescript
humanitarian: transaction.humanitarian
```

But the `transactions` table didn't have a `humanitarian` column.

## Why This Column is Needed

Per IATI v2.03 standard, transactions can be marked as humanitarian at the transaction level:

```xml
<transaction ref="1234" humanitarian="1">
  <transaction-type code="1" />
  <!-- ... -->
</transaction>
```

This is separate from the activity-level humanitarian flag.

## Solution Applied

### Updated Migration File

**File:** `frontend/sql/migrations/20250120000000_add_missing_iati_fields.sql`

**Added (after line 18):**
```sql
-- Add humanitarian column to transactions table (IATI allows transaction-level humanitarian flag)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS humanitarian BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transactions_humanitarian ON transactions(humanitarian) WHERE humanitarian = true;
```

### Also Fixed Typo

Changed `BOaOLEAN` to `BOOLEAN` on line 12 (pre-existing typo).

## Impact

**Before Fix:**
- ❌ Transactions failed to insert
- ❌ Error: "Could not find the 'humanitarian' column"
- ❌ Import showed 0 transactions in database

**After Fix:**
- ✅ Transactions insert successfully
- ✅ Humanitarian flag preserved for transactions
- ✅ IATI v2.03 compliant

## IATI Compliance

This column is required for full IATI v2.03 compliance:
- Activity-level humanitarian flag: `activities.humanitarian`
- Transaction-level humanitarian flag: `transactions.humanitarian`
- Humanitarian scope details: `activity_humanitarian_scope` table

## Testing

After running the updated migration:

```bash
psql -d your_database -f frontend/sql/migrations/20250120000000_add_missing_iati_fields.sql
```

Test transaction import with official IATI example:

**Expected in Console:**
```
[XML Import] Processing transactions import...
[XML Import] Successfully imported transactions
```

**Verify in Database:**
```sql
SELECT 
  transaction_type,
  value,
  currency,
  humanitarian
FROM transactions 
WHERE activity_id = '[your-activity-id]';
```

**Expected Result:**
```
transaction_type | value | currency | humanitarian
-----------------|-------|----------|-------------
1                | 1000  | EUR      | true
```

## Migration Changes Summary

**Lines Added:**
- Line 20-24: ALTER TABLE transactions + index

**Lines Fixed:**
- Line 12: Typo correction (BOaOLEAN → BOOLEAN)

## Status

✅ **COMPLETE AND READY FOR TESTING**

The migration now includes the humanitarian column for transactions, enabling complete IATI v2.03 transaction import.

## Next Steps

1. Run the updated migration
2. Restart dev server
3. Test transaction import
4. Verify `humanitarian` column exists in transactions table
5. Confirm transaction from official example imports with humanitarian=true

