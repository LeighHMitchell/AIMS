# Critical Budget Import Fixes - Apply These Now

## Fix 1: API Validation Bug 🔴 CRITICAL
**File**: `frontend/src/app/api/activities/[id]/route.ts`  
**Line**: 312

### Current Code (BROKEN):
```typescript
        // Value validation (must be >= 0)
        if (budget.value < 0) errors.push('Value must be >= 0');
```

### Fixed Code:
```typescript
        // Value validation (must be >= 0)
        if (budget.value !== undefined && budget.value !== null && budget.value < 0) {
          errors.push('Value must be >= 0');
        }
```

**Why**: Prevents crash when budget.value is undefined/null

---

## Fix 2: Currency Fallback in Parser 🟡 HIGH
**File**: `frontend/src/lib/xml-parser.ts`  
**Line**: 957

### Current Code:
```typescript
          currency: value?.getAttribute('currency') || undefined,
```

### Fixed Code:
```typescript
          currency: value?.getAttribute('currency') || activity.getAttribute('default-currency') || undefined,
```

**Why**: Uses activity's default-currency when budget doesn't specify currency (IATI standard)

---

## Fix 3: Add Import Progress Feedback 🟢 ENHANCEMENT
**File**: `frontend/src/components/activities/XmlImportTab.tsx`  
**Location**: Around line 2780, after collecting budgets

### Add This Code:
```typescript
            } else if (field.fieldName.startsWith('Budget ')) {
              // Collect budget data for import
              if (!updateData.importedBudgets) updateData.importedBudgets = [];
              const budgetIndex = parseInt(field.fieldName.split(' ')[1]) - 1;
              if (parsedActivity.budgets && parsedActivity.budgets[budgetIndex]) {
                updateData.importedBudgets.push(parsedActivity.budgets[budgetIndex]);
              }
              console.log(`[XML Import] Adding budget ${budgetIndex + 1} for import`);
            }
```

**ADD AFTER LINE 2781** (after the budget collection):
```typescript
      // After all fields processed, show budget import progress
      if (updateData.importedBudgets && updateData.importedBudgets.length > 0) {
        console.log(`[XML Import] Collected ${updateData.importedBudgets.length} budgets for import`);
      }
```

---

## Database Migration Check

### Step 1: Check if tables exist
Run this SQL in your database:

```sql
SELECT 
  'activity_budgets' as table_name,
  CASE WHEN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'activity_budgets'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'activity_budget_exceptions' as table_name,
  CASE WHEN EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'activity_budget_exceptions'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
```

### Step 2: If tables are MISSING, run migration
```bash
# Option 1: Using psql
psql $DATABASE_URL -f frontend/sql/create_activity_budgets_tables_safe.sql

# Option 2: Using Supabase dashboard
# Copy contents of frontend/sql/create_activity_budgets_tables_safe.sql
# Paste into SQL Editor and run
```

---

## Testing After Fixes

### 1. Test XML Parser Fix
```bash
# In browser console after uploading test_budget_import.xml:
console.log('Parsed budgets:', parsedActivity.budgets);
# Check that each budget has:
# - period.start (should not be undefined)
# - period.end (should not be undefined)
# - currency (should fallback to USD if not specified)
```

### 2. Test Import
1. Upload `test_budget_import.xml`
2. Go to Financial → Budgets tab
3. Should see 14 budgets
4. 10-11 should be auto-selected (valid)
5. Click "Import Selected Fields"
6. Should see success message

### 3. Verify Database
```sql
SELECT 
  type, status, period_start, period_end, 
  value, currency, value_date 
FROM activity_budgets 
WHERE activity_id = '[your-test-activity-id]'
ORDER BY period_start;
```

### 4. Verify in UI
- Go to activity editor → Budgets tab
- Should see imported budgets in table
- Summary cards should show totals
- Can edit budgets

---

## Quick Apply Guide

### 1. Fix API (2 minutes)
- Open: `frontend/src/app/api/activities/[id]/route.ts`
- Find line 312
- Replace: `if (budget.value < 0)`
- With: `if (budget.value !== undefined && budget.value !== null && budget.value < 0)`
- Save

### 2. Fix Parser (2 minutes)
- Open: `frontend/src/lib/xml-parser.ts`
- Find line 957
- Replace: `currency: value?.getAttribute('currency') || undefined,`
- With: `currency: value?.getAttribute('currency') || activity.getAttribute('default-currency') || undefined,`
- Save

### 3. Check Database (3 minutes)
- Run SQL check query above
- If tables missing, run migration script

### 4. Test (5 minutes)
- Upload test file
- Verify import works
- Check database

**Total Time: ~12 minutes**

---

## Success Criteria ✅

After applying fixes, you should have:
- ✅ No crashes during import
- ✅ Currency defaults to activity default-currency
- ✅ Budget tables exist in database
- ✅ Budgets save correctly
- ✅ Budgets display in Budget tab
- ✅ Validation warnings show correctly
- ✅ 10-11 budgets import successfully from test file

---

## If Something Goes Wrong

### Error: "budget.value < 0 crashes"
- Fix 1 not applied correctly
- Check line 312 in route.ts

### Error: "Currency is undefined"
- Fix 2 not applied correctly  
- Check line 957 in xml-parser.ts

### Error: "Table does not exist"
- Database migration not run
- Run: `psql $DATABASE_URL -f frontend/sql/create_activity_budgets_tables_safe.sql`

### Error: "Budgets not importing"
- Check browser console for errors
- Check API logs for validation errors
- Verify activityId is correct

---

## Support

If you need help:
1. Check browser console for errors
2. Check API logs (look for `[AIMS API]` messages)
3. Verify database tables exist
4. Test with simple budget first (just one budget in XML)

---

*Fixes ready to apply - January 2025*
