# Testing Transaction Fixes on Localhost

## Quick Test Steps

### 1. Start Your Development Server
```bash
cd /workspace/frontend
npm run dev
# Server will run on http://localhost:3000
```

### 2. Apply Database Migration
```bash
# Run the SQL file against your database
psql -h localhost -U your_user -d your_database -f fix_transaction_persistence_issues.sql
```

### 3. Test Transaction Saving

1. **Login to your application** at http://localhost:3000

2. **Navigate to an Activity**:
   - Go to Activities page
   - Click on any existing activity (or create a new one)
   
3. **Go to Finances Tab**:
   - Click on the "Finances" tab in the activity editor
   
4. **Test Adding a Transaction**:
   - Click "Add Transaction" button
   - Fill in the form:
     - Transaction Type: Select "Disbursement"
     - Date: Today's date
     - Value: 1000
     - Currency: USD
     - Status: Draft
   - Click "Add Transaction"
   - ✅ You should see a success message: "Transaction added successfully"

5. **Test Validation** (Try these to see error messages):
   - Try to save without selecting a transaction type
   - Try to save with 0 or negative value
   - Try to save without a date
   - Try to save without selecting currency
   - ✅ Each should show a specific error message

6. **Test Persistence**:
   - After adding a transaction, refresh the page (F5)
   - Go back to Finances tab
   - ✅ Your transaction should still be there

### 4. Check Browser Console

Open Developer Tools (F12) and look for these messages:
- `[AIMS] Mapped transaction 0: {organization_id: "uuid-here", ...}`
- `[AIMS] Successfully upserted 1 transactions`
- `[TransactionAPI] Creating transaction with organization_id: uuid-here`

### 5. Visual Indicators of Success

✅ **Success looks like:**
- Toast notification: "Transaction added successfully"
- Transaction appears in the list immediately
- No console errors
- Transaction persists after refresh

❌ **Old behavior (before fix):**
- Silent failure or generic error
- Transaction disappears on refresh
- Console errors about NULL organization_id
- No clear error messages for validation

## Troubleshooting

If transactions still aren't saving:

1. **Check Database Migration Ran**:
   - The SQL script should output status messages
   - Look for: "Made organization_id nullable"

2. **Check User Has Organization**:
   - In browser console: `JSON.parse(localStorage.getItem('user'))`
   - Should have `organizationId` field

3. **Check Network Tab**:
   - Look for POST to `/api/activities/[id]/transactions`
   - Check request payload has all required fields
   - Check response for specific error messages