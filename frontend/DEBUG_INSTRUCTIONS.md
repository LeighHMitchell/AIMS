# Debugging Transactions and Contributors Not Saving

## Quick Checklist

### For Transactions:
1. **Open Finances Tab** → Click "Add Transaction"
2. **Fill ALL Required Fields:**
   - Transaction Type (e.g., Disbursement)
   - Value (must be > 0)
   - Currency
   - Provider Organisation
   - Receiver Organisation
   - Transaction Date
3. **Click "Add Transaction" button** at the bottom of the dialog
4. **Verify** transaction appears in the list
5. **Check Console** for: `[AIMS DEBUG] Transactions state changed: Array(1)`

### For Contributors:
1. **Open Contributors Tab** → Click "Nominate Contributor"
2. **Select an Organization** from the dropdown
3. **Click "Add Contributor"** button
4. **Verify** contributor appears in the list
5. **Check Console** for: `[AIMS DEBUG] Contributors state changed: Array(1)`

### When Saving:
Check console for these key logs:
```
[AIMS DEBUG] Pre-save state check:
[AIMS DEBUG] - transactions count: 1
[AIMS DEBUG] - contributors count: 1
[AIMS] Transactions in payload: [...]
[AIMS] Contributors in payload: [...]
```

## Common Issues:
1. **Closing dialog without clicking "Add"** - Data won't be saved
2. **Missing required fields** - Check for error toasts
3. **Not logged in** - Must be logged in to save activities

## What the API Logs Should Show:
```
[AIMS] Processing transactions for update, count: 1
[AIMS] Processing contributors for update, count: 1
[AIMS] Successfully inserted transactions
[AIMS] Successfully inserted contributors
``` 