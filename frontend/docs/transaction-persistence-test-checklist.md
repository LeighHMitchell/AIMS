# Transaction Persistence Test Checklist

## Pre-requisites
1. Apply the database migration: `database_migration_transaction_audit_fixes.sql`
2. Restart the development server
3. Clear browser cache

## Test Scenarios

### 1. Basic Transaction Creation
- [ ] Open an activity in edit mode
- [ ] Navigate to Transactions tab
- [ ] Click "Add Transaction"
- [ ] Fill in all fields:
  - Transaction Type: Disbursement (3)
  - Status: Actual
  - Value: 50000
  - Currency: USD
  - Transaction Date: Today
  - Transaction Reference: TEST-001
  - Description: Test transaction
  - Provider Organization: Select existing
  - Receiver Organization: Select existing
  - Aid Type: C01
  - Flow Type: 10 (ODA)
  - Finance Type: 110 (Standard grant)
  - Tied Status: 5 (Untied)
  - Disbursement Channel: 1
- [ ] Click "Add Transaction"
- [ ] Save the activity
- [ ] Refresh the page
- [ ] **VERIFY**: All fields are persisted correctly

### 2. FX Settlement Date Test
- [ ] Add a new transaction
- [ ] Set Transaction Date: 2024-01-01
- [ ] Check "FX settlement date is different"
- [ ] Set Value Date: 2024-01-05
- [ ] Save transaction and activity
- [ ] Refresh page
- [ ] **VERIFY**: 
  - Value Date shows as 2024-01-05
  - FX checkbox is checked
  - `fx_differs` = true in database

### 3. Financing Classification Test
- [ ] Add transaction with:
  - Flow Type: 10 (ODA)
  - Finance Type: 110 (Standard grant)
- [ ] **VERIFY**: Computed classification shows "ODA Grant"
- [ ] Check "Override classification" 
- [ ] Select "Other" from dropdown
- [ ] Save transaction and activity
- [ ] Refresh page
- [ ] **VERIFY**: Classification still shows "Other"

### 4. Organization Type Persistence
- [ ] Create transaction with:
  - Provider Org: Government type (10)
  - Receiver Org: NGO type (21)
- [ ] Save and refresh
- [ ] Edit the transaction
- [ ] **VERIFY**: Organization types are preserved

### 5. All Optional Fields Test
- [ ] Create transaction with ALL optional fields filled
- [ ] Save and refresh
- [ ] **VERIFY** each field:
  - [ ] value_date (if different)
  - [ ] transaction_reference
  - [ ] description
  - [ ] provider_org_ref (IATI identifier)
  - [ ] receiver_org_ref (IATI identifier)
  - [ ] disbursement_channel
  - [ ] aid_type
  - [ ] flow_type
  - [ ] finance_type
  - [ ] tied_status
  - [ ] is_humanitarian
  - [ ] financing_classification

### 6. Edit Existing Transaction
- [ ] Edit an existing transaction
- [ ] Change multiple fields
- [ ] Save activity
- [ ] Refresh page
- [ ] **VERIFY**: All changes persisted

### 7. Database Verification Queries

Run these queries in Supabase SQL editor:

```sql
-- Check latest transaction
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify financing classification
SELECT 
  transaction_type,
  flow_type,
  finance_type,
  financing_classification,
  fx_differs,
  value_date,
  transaction_date
FROM transactions 
WHERE transaction_reference = 'TEST-001';

-- Check organization types
SELECT 
  provider_org_name,
  provider_org_type,
  provider_org_ref,
  receiver_org_name,
  receiver_org_type,
  receiver_org_ref
FROM transactions 
WHERE transaction_reference = 'TEST-001';
```

## Common Issues to Check

1. **Value Date Logic**
   - If value_date = transaction_date, it should be stored as NULL
   - The trigger should automatically handle this

2. **Missing Fields in API**
   - Check browser DevTools Network tab
   - Verify all fields are being sent in the request payload

3. **Type Mismatches**
   - Ensure enum values match exactly (e.g., '3' not 3 for tied_status)
   - Currency codes must be valid ISO 4217

4. **Null vs Undefined**
   - Optional fields should be null, not undefined
   - Check the API is handling this correctly

## Expected Outcomes

✅ All transaction fields persist correctly after save
✅ Refreshing the page shows all saved data
✅ Editing transactions preserves all fields
✅ Computed fields (financing_classification) work correctly
✅ FX date logic works as expected
✅ No console errors during save/load

## Troubleshooting

If transactions are not persisting:

1. Check browser console for errors
2. Check Network tab for API response
3. Verify database migration was applied
4. Check Supabase logs for constraint violations
5. Ensure user has proper permissions 