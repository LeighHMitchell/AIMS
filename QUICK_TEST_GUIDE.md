# Quick Test Guide - IATI URL Import

## ⚠️ BEFORE TESTING - REQUIRED STEP

**You MUST run the database migration first:**

**IMPORTANT:** The migration file has been updated to include the `humanitarian` column for transactions. This is critical for transaction imports to work.

```bash
# Option 1: Using psql command line
psql -d your_database_name -f frontend/sql/migrations/20250120000000_add_missing_iati_fields.sql

# Option 2: Using psql interactive
psql -d your_database_name
\i frontend/sql/migrations/20250120000000_add_missing_iati_fields.sql
\q
```

**Verify the migration completed:**
```sql
-- Check that humanitarian column was added to transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'humanitarian';
```

Expected: Should return one row showing `humanitarian | boolean`

Then restart your dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## 🧪 Test the Import

### Step 1: Navigate to Import Page
Go to: `http://localhost:3001/iati-import`

### Step 2: Select URL Method
Click the "From URL" tab

### Step 3: Enter Official IATI Example URL
```
https://raw.githubusercontent.com/IATI/IATI-Extra-Documentation/version-2.03/en/activity-standard/activity-standard-example-annotated.xml
```

### Step 4: Fetch and Parse
Click "Fetch and Parse" button

### Step 5: Wait for Parsing
You should see progress and then a summary screen

### Step 6: Select All Fields
Click "Select All" to import everything

### Step 7: Import
Click "Import Selected" button

---

## ✅ What You Should See

### In Console (No Errors):
```
[Sector Validation] Checking code: "111" vocabulary: "2" result: "VALID" ✅
[Sector Validation] Checking code: "112" vocabulary: "2" result: "VALID" ✅
[XML Import] Sectors imported successfully ✅
[XML Import] Processing transactions import... ✅
[XML Import] Processing conditions import... ✅
[XML Import] Processing financing terms import... ✅
[XML Import] ✓ Loan terms created ✅
```

### Success Toast Messages:
- ✅ "Sectors imported successfully - 2 sector(s) added"
- ✅ "Transactions imported successfully - 1 transaction(s) added"
- ✅ "Conditions imported successfully - 1 condition(s) imported"
- ✅ "Financing terms imported successfully"
- ✅ "Budgets imported successfully - 2 budget(s) added"
- ✅ "Planned disbursements imported successfully - 4 disbursement(s) added"
- ✅ "Humanitarian data imported successfully"
- ✅ "Contacts imported successfully"
- ✅ "Policy markers imported successfully"
- ✅ "Tags imported successfully"
- ✅ "Documents imported successfully"

### NO Errors Like:
- ❌ "CORS error"
- ❌ "Load failed"
- ❌ "Invalid sector codes"
- ❌ "Access control checks"

---

## 🔍 Verify in Activity Editor

After import, navigate through these tabs and verify data appears:

| Tab | Expected Data |
|-----|--------------|
| **Sectors** | 2 sectors: "111" and "112" |
| **Transactions** | 1 transaction for 1000 EUR from Agency B |
| **Budgets** | 2 budgets (one 3000 EUR for 2014) |
| **Planned Disbursements** | 4 disbursements |
| **Financing Terms** | Loan with 4% and 3% rates |
| **Conditions** | 1 condition: "Conditions text" |
| **Contacts** | A. Example (Transparency Lead) |
| **Humanitarian** | 2 scopes (Nepal Earthquake) |
| **Policy Markers** | 3 markers (codes 2, 9, A1) |
| **Tags** | 2 tags |
| **Results** | 1 result with indicators |
| **Documents** | Project Report 2013 |
| **Organizations** | 3 participating orgs (Agency A, B, C) |
| **Locations** | 2 locations (Afghanistan, Cambodia) |

---

## 🗄️ Verify in Database

```sql
-- Replace [activity-id] with the actual UUID from your import

SELECT 
  'Sectors' as section, 
  COUNT(*) as count,
  STRING_AGG(sector_code::text, ', ') as codes
FROM activity_sectors 
WHERE activity_id = '[activity-id]'
UNION ALL 
SELECT 'Transactions', COUNT(*), STRING_AGG(value::text, ', ')
FROM transactions WHERE activity_id = '[activity-id]'
UNION ALL 
SELECT 'Conditions', COUNT(*), STRING_AGG(condition_text, '; ')
FROM activity_conditions WHERE activity_id = '[activity-id]'
UNION ALL 
SELECT 'Financing Terms', COUNT(*), NULL
FROM financing_terms WHERE activity_id = '[activity-id]'
UNION ALL 
SELECT 'Budgets', COUNT(*), STRING_AGG(amount::text, ', ')
FROM activity_budgets WHERE activity_id = '[activity-id]'
UNION ALL 
SELECT 'Contacts', COUNT(*), STRING_AGG(person_name, ', ')
FROM activity_contacts WHERE activity_id = '[activity-id]';
```

**Expected Results:**
```
section          | count | codes/values
-----------------|-------|------------------
Sectors          | 2     | 111, 112
Transactions     | 1     | 1000
Conditions       | 1     | Conditions text
Financing Terms  | 1     | NULL
Budgets          | 2     | 3000, 3000
Contacts         | 1     | A. Example
```

---

## 🐛 If Something Still Doesn't Work

### Sectors Not Importing?
**Check:** `[Sector Validation] ... vocabulary: "2" result: "VALID"`
- If vocabulary is still `undefined`, clear browser cache and retry
- If still failing, check browser dev tools for the actual sector object structure

### Transactions Not Importing?
**Check Console For:**
- "[XML Import] Processing transactions import..." ← Should appear
- "[XML Import] Transaction insert error:" ← Should NOT appear
- Check migration created `transactions` table

### Conditions Not Importing?
**Check:**
- Migration created `activity_conditions` table
- Console shows "[XML Import] Conditions to insert: ..."
- Look for Supabase errors in console

### Financing Terms Not Importing?
**Check:**
- Migration created 4 tables: `financing_terms`, `loan_terms`, `loan_statuses`, `financing_other_flags`
- Console shows "[XML Import] Processing financing terms import..."
- Check for Supabase errors

---

## 📝 Quick Checklist

- [ ] Migration executed
- [ ] Dev server restarted
- [ ] URL import page loads
- [ ] XML fetches from URL
- [ ] Parsing completes
- [ ] All 56 fields appear
- [ ] Import completes
- [ ] ✅ Success toasts appear
- [ ] ❌ No CORS errors
- [ ] Data appears in tabs
- [ ] Database has records

---

## 📞 Get Help

If issues persist after following all steps:

1. **Check browser console** - Look for specific error messages
2. **Check server logs** - Backend errors may provide clues  
3. **Verify migration** - Run the SELECT queries to check tables exist
4. **Check Supabase connection** - Ensure client is initialized

**Most Common Issue:** Forgetting to run the migration!

---

## 🎯 What Was Fixed Today

1. ✅ URL import enabled (was "coming soon")
2. ✅ Sector vocabulary-aware validation (3-digit & 5-digit)
3. ✅ Sector validation made non-blocking
4. ✅ Transactions handler with Supabase
5. ✅ Financing terms handler with Supabase
6. ✅ Conditions handler fixed
7. ✅ Linked activities search fixed
8. ✅ All 14 IATI sections now supported

**Ready for production after testing!** 🚀
