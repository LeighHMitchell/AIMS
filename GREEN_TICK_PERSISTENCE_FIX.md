# Green Tick Persistence Fix ✅

## Issue
Green ticks for Budgets and Planned Disbursements tabs were disappearing when clicking on those tabs, even though data existed.

## Root Cause

The tab components (`ActivityBudgetsTab` and `PlannedDisbursementsTab`) were calling their parent callbacks (`onBudgetsChange` and `onDisbursementsChange`) **immediately on mount**, before fetching data from the database.

### The Problem Sequence:

1. **Initial Load:** Activity editor fetches budgets/disbursements → Sets state → Green tick appears ✅
2. **User clicks tab:** Component mounts with empty state array `[]`
3. **Immediate callback:** `useEffect` runs → Calls parent callback with empty array
4. **Parent state updated:** `setBudgets([])` or `setPlannedDisbursements([])` → Green tick disappears ❌
5. **Data loads:** Component fetches data → Updates local state
6. **But...** The parent was already notified with empty array, so tick stays gone

### Code Before Fix:

```typescript
// Notify parent component when budgets/disbursements change
useEffect(() => {
  if (onBudgetsChange) {
    onBudgetsChange(budgets);  // ❌ Called immediately with empty array
  }
}, [budgets, onBudgetsChange]);
```

## The Solution

Modified both components to:
1. **Wait for initial load** before notifying parent
2. **Filter generated rows** - only count actual saved items with IDs
3. **Remove duplicate useEffect** (ActivityBudgetsTab had two!)

### Code After Fix:

```typescript
// Notify parent component when budgets change (only after initial load)
useEffect(() => {
  // Only notify parent after initial data load is complete
  // This prevents the green tick from disappearing when switching tabs
  if (onBudgetsChange && !loading) {
    // Filter out generated empty budgets - only count actual saved budgets with IDs
    const actualBudgets = budgets.filter(b => b.id);
    onBudgetsChange(actualBudgets);
  }
}, [budgets, onBudgetsChange, loading]);
```

## Key Changes

### 1. **Added Loading Check**
`if (onBudgetsChange && !loading)` - Only notify after data is loaded

### 2. **Filter Saved Items Only**
```typescript
const actualBudgets = budgets.filter(b => b.id);
const actualDisbursements = disbursements.filter(d => d.id);
```
This ensures we only count items that are actually saved to the database, not generated template rows.

### 3. **Added `loading` to Dependency Array**
```typescript
}, [budgets, onBudgetsChange, loading]);
```
Ensures the effect re-runs when loading state changes.

### 4. **Removed Duplicate (ActivityBudgetsTab only)**
Removed the second identical `useEffect` that was redundantly calling `onBudgetsChange`.

## Files Modified

- ✅ `/frontend/src/components/activities/PlannedDisbursementsTab.tsx`
  - Lines 511-520: Updated useEffect with loading check and ID filter

- ✅ `/frontend/src/components/activities/ActivityBudgetsTab.tsx`
  - Lines 384-393: Updated useEffect with loading check and ID filter
  - Lines 1225-1228: Removed duplicate useEffect

## Testing

### Test Case 1: Budgets Tab ✅
1. Create an activity and add a budget
2. Navigate away from Budgets tab
3. **Expected:** Green tick stays visible
4. Click on Budgets tab
5. **Expected:** Green tick remains visible (doesn't flicker/disappear)

### Test Case 2: Planned Disbursements Tab ✅
1. Import a planned disbursement via IATI XML
2. Navigate away from Planned Disbursements tab
3. **Expected:** Green tick stays visible
4. Click on Planned Disbursements tab
5. **Expected:** Green tick remains visible (doesn't flicker/disappear)

### Test Case 3: Empty Tabs ⭕
1. Create new activity (no budgets/disbursements)
2. **Expected:** No green tick (correct)
3. Click on Budgets or Planned Disbursements tab
4. **Expected:** Still no green tick (correct)

### Test Case 4: Organizations Tab (Control) ✅
1. Add a participating organization
2. Navigate away and back to Organizations tab
3. **Expected:** Green tick persists consistently (was already working)
4. **Verify:** This behavior matches Budgets and Planned Disbursements now

## How It Works Now

### Correct Sequence:

1. **Initial Load:** Activity editor fetches data → Green tick appears ✅
2. **User clicks tab:** Component mounts, `loading = true`
3. **No premature callback:** useEffect sees `loading = true` → Skips parent callback
4. **Data loads:** Fetches from database, updates state, sets `loading = false`
5. **Proper notification:** useEffect runs with `loading = false` → Calls parent with actual data
6. **Green tick persists:** Parent receives correct data → Tick stays visible ✅

## Benefits

1. ✅ **Consistent UX** - Green ticks now behave like Organizations tab
2. ✅ **No flickering** - Ticks don't disappear when switching tabs
3. ✅ **Accurate state** - Parent only receives data after it's actually loaded
4. ✅ **Better performance** - Removed duplicate useEffect in ActivityBudgetsTab
5. ✅ **More reliable** - Only counts saved items with IDs, not generated templates

## Related Issues Fixed

- ✅ Green tick persistence for Budgets tab
- ✅ Green tick persistence for Planned Disbursements tab
- ✅ Removed duplicate useEffect in ActivityBudgetsTab
- ✅ Now only counts actual saved data (items with IDs)

## Status

✅ **FIXED** - Green ticks now persist consistently across tab navigation

The green tick will:
- ✅ Stay visible when you have saved budgets/disbursements
- ✅ Remain visible when you click on the tab
- ✅ Only disappear if you actually delete all items
- ✅ Behave consistently like the Organizations tab
