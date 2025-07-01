# IATI Import RPC Function Fix

## Problem Summary

The IATI import was failing with the error:
```
Could not find the function public.insert_iati_transaction in the schema cache
```

This was because the code was trying to use an RPC (Remote Procedure Call) function that doesn't exist in the database.

## Solution

### 1. Replaced RPC Call with Direct Insert

Changed from:
```typescript
await supabaseAdmin.rpc('insert_iati_transaction', {
  ...transactionData,
  p_activity_iati_ref: transaction.activityRef
});
```

To:
```typescript
await supabaseAdmin
  .from('transactions')
  .insert(transactionData)
  .select()
  .single();
```

### 2. Removed Non-Existent Database Fields

The database schema only includes these transaction fields:
- `activity_id` (UUID)
- `transaction_type` 
- `transaction_date`
- `value`
- `currency`
- `status`
- `value_date`
- `description`
- `provider_org` (not provider_org_name)
- `receiver_org` (not receiver_org_name)
- `flow_type`
- `aid_type`
- `tied_status`
- `created_at`
- `updated_at`

Removed fields that don't exist:
- `disbursement_channel`
- `finance_type`
- `sector_code`
- `sector_vocabulary`
- `recipient_country_code`
- `recipient_region_code`
- `recipient_region_vocab`
- `is_humanitarian`
- `activity_iati_ref`

### 3. Fixed Activity ID Mapping

Added fallback logic to handle both field names:
```typescript
const iatiId = activity.iati_id || activity.iatiIdentifier;
```

This ensures activities are properly mapped regardless of which field name is used by the parser.

## Result

- Transactions can now be imported successfully
- Activities are properly linked using their IATI identifiers
- The import process completes without RPC errors

## Future Considerations

1. **Schema Extension**: If IATI-specific fields are needed, consider adding them to the database:
   ```sql
   ALTER TABLE transactions 
   ADD COLUMN disbursement_channel TEXT,
   ADD COLUMN finance_type TEXT,
   ADD COLUMN sector_code TEXT,
   ADD COLUMN activity_iati_ref TEXT;
   ```

2. **RPC Function Creation**: If complex logic is needed, create the RPC function:
   ```sql
   CREATE OR REPLACE FUNCTION insert_iati_transaction(...)
   RETURNS uuid AS $$
   -- Function logic here
   $$ LANGUAGE plpgsql;
   ```

3. **Data Preservation**: Consider storing unmapped IATI data in a JSONB field for future reference. 