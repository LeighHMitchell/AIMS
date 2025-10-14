# Planned Disbursement Import Troubleshooting Guide

## Issue: Import Failed - Internal Server Error

This error occurs when the database is missing required IATI columns for planned disbursements.

---

## Solution: Run the Database Migration

### Step 1: Check Current Schema

1. Go to **Supabase Dashboard**
2. Click **SQL Editor** in the left sidebar
3. Create a new query and paste this:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'planned_disbursements'
ORDER BY ordinal_position;
```

4. Click **Run**

### Step 2: Check for Missing Columns

Look for these 7 columns in the results:
- ✅ `type`
- ✅ `provider_org_ref`
- ✅ `provider_org_type`
- ✅ `provider_activity_id`
- ✅ `receiver_org_ref`
- ✅ `receiver_org_type`
- ✅ `receiver_activity_id`

**If ANY are missing**, continue to Step 3.

### Step 3: Run the Migration

1. In Supabase SQL Editor, create a **new query**
2. Copy the **entire contents** of `add_planned_disbursement_iati_fields.sql` file
3. Paste into the SQL Editor
4. Click **Run**

You should see green checkmarks (✅) indicating successful column additions.

### Step 4: Verify the Migration

Run this verification query:

```sql
SELECT 
  COUNT(*) FILTER (WHERE column_name = 'type') as has_type,
  COUNT(*) FILTER (WHERE column_name = 'provider_org_ref') as has_provider_ref,
  COUNT(*) FILTER (WHERE column_name = 'provider_org_type') as has_provider_type,
  COUNT(*) FILTER (WHERE column_name = 'provider_activity_id') as has_provider_activity,
  COUNT(*) FILTER (WHERE column_name = 'receiver_org_ref') as has_receiver_ref,
  COUNT(*) FILTER (WHERE column_name = 'receiver_org_type') as has_receiver_type,
  COUNT(*) FILTER (WHERE column_name = 'receiver_activity_id') as has_receiver_activity
FROM information_schema.columns
WHERE table_name = 'planned_disbursements';
```

**All values should be 1** ✅

### Step 5: Try the Import Again

1. Go back to your Activity Editor
2. Click on the **IATI XML Import** tab
3. Import your planned disbursement XML again:

```xml
<planned-disbursement type="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</planned-disbursement>
```

4. Click **Import Selected Fields**
5. Go to **Planned Disbursements** tab
6. You should now see your disbursement! 🎉

---

## Common Mistakes

### ❌ DON'T do this:
```sql
add_planned_disbursement_iati_fields.sql
```
This is just a filename, not valid SQL.

### ✅ DO this:
1. **Open the file** in a text editor
2. **Copy all the SQL code** inside it
3. **Paste into Supabase SQL Editor**
4. **Click Run**

---

## What the Migration Does

The migration adds 7 IATI-compliant columns:

| Column | Purpose | Example |
|--------|---------|---------|
| `type` | Budget type (1=Original, 2=Revised) | `'1'` |
| `provider_org_ref` | Provider's IATI org ID | `'BB-BBB-123456789'` |
| `provider_org_type` | Provider org type code | `'10'` (Government) |
| `provider_activity_id` | Provider's activity ID | `'BB-BBB-123456789-1234AA'` |
| `receiver_org_ref` | Receiver's IATI org ID | `'AA-AAA-123456789'` |
| `receiver_org_type` | Receiver org type code | `'23'` (NGO) |
| `receiver_activity_id` | Receiver's activity ID | `'AA-AAA-123456789-1234'` |

---

## Still Getting Errors?

### Check Server Logs

Look at the browser console (F12 → Console) for error details.

### Common Error Messages:

**"Missing period-start"** or **"Missing period-end"**
- ✅ **FIXED** - The XML parser now correctly reads period dates

**"Invalid type"**
- Type must be `'1'` (Original) or `'2'` (Revised)
- Check your XML: `<planned-disbursement type="1">`

**"Failed to update activity: Internal Server Error"**
- Database columns are missing
- **Solution:** Run the migration (Steps above)

---

## Need Help?

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Verify all database columns exist
3. Ensure your XML follows IATI 2.03 format
4. Check that the activity exists and is saved before importing

---

## Summary

✅ **Parser Bug Fixed** - Now correctly reads `<period-start>` and `<period-end>`  
✅ **Database Migration** - Adds required IATI columns  
✅ **Import Should Work** - After running the migration  

Run the migration → Try import again → Success! 🎉
