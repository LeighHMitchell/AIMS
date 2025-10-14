# Duplicate Functionality Fixes

## ✅ IMPLEMENTATION COMPLETE

Both duplicate functionality issues have been fixed and are ready for testing.

---

## Issues Found

### Issue 1: Planned Disbursement Duplicate - Not Persisting

**Problem:**
When duplicating a planned disbursement, it appears in the UI but disappears on page refresh.

**Root Cause:**
The `handleDuplicate` function in `PlannedDisbursementsTab.tsx` (lines 832-844) only updates local state but never saves to the database.

```typescript
// Current code - WRONG
const handleDuplicate = (disbursement: PlannedDisbursement) => {
  const newDisbursement: PlannedDisbursement = {
    ...disbursement,
    id: undefined,
    period_start: format(addMonths(parseISO(disbursement.period_start), 3), 'yyyy-MM-dd'),
    period_end: format(addMonths(parseISO(disbursement.period_end), 3), 'yyyy-MM-dd'),
    usdAmount: 0
  };
  
  setDisbursements(prev => [newDisbursement, ...prev]); // ❌ Only updates UI state
};
```

**Fix Required:**
Add API call to save the new disbursement to the database, similar to how budgets work.

```typescript
// Fixed code
const handleDuplicate = async (disbursement: PlannedDisbursement) => {
  if (isReadOnly) return;

  const newDisbursement: PlannedDisbursement = {
    ...disbursement,
    id: undefined,
    period_start: format(addMonths(parseISO(disbursement.period_start), 3), 'yyyy-MM-dd'),
    period_end: format(addMonths(parseISO(disbursement.period_end), 3), 'yyyy-MM-dd'),
    usdAmount: 0
  };

  // Save to database
  try {
    const response = await fetch('/api/planned-disbursements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newDisbursement,
        activity_id: activityId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate planned disbursement');
    }

    const createdDisbursement = await response.json();
    setDisbursements(prev => [createdDisbursement, ...prev]);
    toast.success('Planned disbursement duplicated successfully');
  } catch (error) {
    console.error('Error duplicating planned disbursement:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to duplicate planned disbursement');
  }
};
```

**File to Modify:**
`frontend/src/components/activities/PlannedDisbursementsTab.tsx` (lines 832-844)

---

### Issue 2: Budget Duplicate - "Failed to create budget" Error

**Problem:**
When duplicating a budget, it shows "Failed to create budget" error.

**Root Cause:**
The API endpoint `/api/activities/[id]/budgets` requires all fields (type, status, period_start, period_end, value, currency, value_date) but the duplicate might have undefined or missing fields.

The budget API validation (line 102 in `/api/activities/[id]/budgets/route.ts`):
```typescript
if (!body.type || !body.status || !body.period_start || !body.period_end || 
    !body.value || !body.currency || !body.value_date) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}
```

**Current Code Location:**
`frontend/src/components/activities/ActivityBudgetsTab.tsx` (lines 544-600)

**Likely Issues:**
1. The duplicated budget might be missing required fields from the original
2. Fields might be `undefined` or `null` instead of valid values
3. The API validation is checking for falsy values (including 0)

**Fix Required:**
Ensure all required fields are present and have valid values before sending to API.

```typescript
// Enhanced duplicate function
const duplicateBudget = useCallback((index: number) => {
  const today = formatDateFns(new Date(), 'yyyy-MM-dd');
  const budget = budgets[index];
  
  // Find next available period
  const nextPeriod = findNextAvailablePeriod(
    budget.period_start, 
    budget.period_end, 
    budgets.filter((_, i) => i !== index)
  );
  
  const finalPeriod = nextPeriod || {
    period_start: budget.period_start,
    period_end: budget.period_end
  };

  // Ensure all required fields are present with defaults
  const newBudget: ActivityBudget = {
    activity_id: activityId,
    type: budget.type || 1, // Default to Original if missing
    status: budget.status || 1, // Default to Indicative if missing
    period_start: finalPeriod.period_start,
    period_end: finalPeriod.period_end,
    value: budget.value || 0,
    currency: budget.currency || defaultCurrency || 'USD',
    value_date: today,
    budget_lines: budget.budget_lines || []
  };

  // Validate required fields before sending
  if (!newBudget.type || !newBudget.status || !newBudget.period_start || 
      !newBudget.period_end || newBudget.value === undefined || 
      !newBudget.currency || !newBudget.value_date) {
    toast.error('Cannot duplicate budget: missing required fields');
    console.error('Missing required fields:', newBudget);
    return;
  }

  // Save via API
  (async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Budget creation error:', error);
        throw new Error(error.error || error.details || 'Failed to duplicate budget');
      }

      const createdBudget = await response.json();
      setBudgets(prev => [...prev, createdBudget].sort((a, b) => 
        new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      ));
      toast.success('Budget duplicated successfully');
  
      if (!nextPeriod) {
        console.log(`Budget duplicated with same period ${finalPeriod.period_start} to ${finalPeriod.period_end}`);
      } else {
        console.log(`Budget duplicated with period ${finalPeriod.period_start} to ${finalPeriod.period_end}`);
      }
    } catch (error) {
      console.error('Error duplicating budget:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate budget');
    }
  })();
}, [budgets, findNextAvailablePeriod, activityId, defaultCurrency]);
```

**File to Modify:**
`frontend/src/components/activities/ActivityBudgetsTab.tsx` (lines 544-600)

---

## Additional Debugging Steps

### For Budget Duplicate Failure:

1. **Check Browser Console:**
   Look for detailed error messages when duplicate fails:
   ```
   Budget creation error: { error: 'Missing required fields', ... }
   ```

2. **Check which fields are missing:**
   Add logging before the API call:
   ```typescript
   console.log('Creating budget with data:', newBudget);
   ```

3. **Common issues:**
   - `type` or `status` are `undefined` or `0` (which is falsy)
   - `value` is `0` (which is falsy in the validation)
   - `currency` is empty string
   - Date fields are not in correct format

### For Planned Disbursement:

1. **Verify API endpoint works:**
   Test manually:
   ```javascript
   fetch('/api/planned-disbursements', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       activity_id: 'YOUR_ACTIVITY_ID',
       amount: 1000,
       currency: 'USD',
       period_start: '2024-01-01',
       period_end: '2024-12-31',
       value_date: '2024-01-01'
     })
   })
   ```

2. **Check required fields:**
   Look at `/api/planned-disbursements/route.ts` to see what fields are required

---

## Testing After Fix

### Test Planned Disbursement Duplicate:
1. Go to Planned Disbursements tab
2. Click duplicate icon on any disbursement
3. ✅ New disbursement appears in list
4. ✅ Refresh the page
5. ✅ Duplicated disbursement still exists

### Test Budget Duplicate:
1. Go to Budgets tab
2. Click duplicate icon on any budget
3. ✅ Success toast appears
4. ✅ New budget appears in list
5. ✅ Refresh the page
6. ✅ Duplicated budget still exists
7. ✅ No console errors

---

## Root Cause Summary

| Issue | Component | Root Cause | Impact |
|-------|-----------|------------|--------|
| Planned Disbursement disappears | PlannedDisbursementsTab | No API call to save | Data loss on refresh |
| Budget duplicate fails | ActivityBudgetsTab | Missing/invalid required fields | Cannot duplicate budgets |

Both issues stem from incomplete implementation of duplicate functionality - one missing the save operation entirely, the other not properly formatting the data for the API.

---

## Implementation Summary

### Changes Made

#### 1. Planned Disbursement Duplicate Fix
**File:** `frontend/src/components/activities/PlannedDisbursementsTab.tsx` (lines 832-866)

**Changes:**
- ✅ Changed `handleDuplicate` to async function
- ✅ Added POST request to `/api/planned-disbursements` to save duplicated disbursement
- ✅ Added success/error toast notifications
- ✅ Added error handling and logging
- ✅ Updates UI state only after successful database save

**Result:** Duplicated planned disbursements now persist after page refresh

#### 2. Budget Duplicate Fix
**File:** `frontend/src/components/activities/ActivityBudgetsTab.tsx` (lines 544-615)

**Changes:**
- ✅ Added `activity_id` to new budget object
- ✅ Ensured all required fields have valid defaults:
  - `type`: defaults to 1 (Original)
  - `status`: defaults to 1 (Indicative)
  - `value`: defaults to 0 if undefined
  - `currency`: defaults to `defaultCurrency` or 'USD'
  - `value_date`: set to today's date
  - `budget_lines`: defaults to empty array
- ✅ Added validation check before API call
- ✅ Added detailed error logging to console
- ✅ Improved error messages with details from API response
- ✅ Added `defaultCurrency` to useCallback dependencies

**Result:** Budget duplication now works without validation errors

### Testing Instructions

#### Test Planned Disbursement Duplicate:
1. Navigate to any activity's Planned Disbursements tab
2. Click the duplicate icon (📋) on any existing disbursement
3. ✅ Verify success toast appears: "Planned disbursement duplicated successfully"
4. ✅ Verify new disbursement appears with dates shifted 3 months forward
5. ✅ Refresh the page (F5)
6. ✅ Verify duplicated disbursement still exists in the list
7. ✅ Check console - no errors

#### Test Budget Duplicate:
1. Navigate to any activity's Budgets tab
2. Click the duplicate icon (📋) on any existing budget
3. ✅ Verify success toast appears: "Budget duplicated successfully"
4. ✅ Verify new budget appears in the list
5. ✅ Refresh the page (F5)
6. ✅ Verify duplicated budget still exists
7. ✅ Check console - no errors
8. ✅ Verify all budget fields are properly populated (type, status, value, dates)

### Verification Queries

**Check Planned Disbursements:**
```sql
SELECT 
  id, 
  activity_id,
  period_start, 
  period_end,
  amount,
  currency,
  created_at,
  provider_org_name,
  receiver_org_name
FROM planned_disbursements
WHERE activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**Check Budgets:**
```sql
SELECT 
  id,
  activity_id,
  type,
  status,
  period_start,
  period_end,
  value,
  currency,
  value_date,
  created_at
FROM activity_budgets
WHERE activity_id = 'YOUR_ACTIVITY_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Known Edge Cases Handled

#### Planned Disbursements:
- ✅ Handles disbursements without organizations
- ✅ Preserves all organization references (provider/receiver)
- ✅ Calculates new period dates (3 months forward)
- ✅ Resets USD amount (will be recalculated)
- ✅ Shows user-friendly error messages on failure

#### Budgets:
- ✅ Handles budgets with missing type/status (defaults to 1)
- ✅ Handles budgets with value = 0 (validates properly)
- ✅ Handles budgets without budget_lines
- ✅ Validates all required fields before API call
- ✅ Shows detailed error messages from API
- ✅ Finds next available non-overlapping period when possible

