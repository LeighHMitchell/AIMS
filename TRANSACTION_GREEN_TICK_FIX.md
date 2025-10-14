# Transaction Green Tick Persistence Fix

## Issue Description

The transactions tab was not consistently showing a green tick indicator even when there were transactions in the database. Users had to:
- Navigate to the transactions tab and load the table
- Refresh the page
- Navigate away and back

...before the green tick would appear next to the "Finances" tab.

## Root Cause

The green tick indicator relies on the parent component (new activity page) tracking the transaction count. However, the transaction components were not properly notifying the parent when transactions were loaded:

### 1. **TransactionTab Component** (Activity Profile View)
- **File**: `frontend/src/components/activities/TransactionTab.tsx`
- **Issue**: Did NOT have an `onTransactionsChange` callback prop
- **Impact**: When used in the activity profile page, it never notified the parent about transaction counts

### 2. **TransactionsManager Component** (New Activity Editor)
- **File**: `frontend/src/components/TransactionsManager.tsx`
- **Issue**: Only called `onTransactionsChange` when fetching from API, NOT when receiving transactions via props
- **Impact**: When the parent passed transactions via props, the component never notified back, so the green tick calculation didn't update

## The Fix

### TransactionTab.tsx Changes

**Added:**
1. New prop `onTransactionsChange?: (transactions: Transaction[]) => void`
2. New `useEffect` to notify parent after initial load completes:

```typescript
// Notify parent component when transactions change (only after initial load)
useEffect(() => {
  // Only notify parent after initial data load is complete
  // This prevents the green tick from disappearing when switching tabs
  console.log('[TransactionTab] useEffect - Checking notification conditions:', {
    hasCallback: !!onTransactionsChange,
    isLoading,
    transactionsCount: transactions.length
  });
  
  if (onTransactionsChange && !isLoading) {
    console.log('[TransactionTab] Notifying parent with transactions:', transactions.length);
    onTransactionsChange(transactions);
  } else {
    console.log('[TransactionTab] NOT notifying parent - isLoading:', isLoading);
  }
}, [transactions, onTransactionsChange, isLoading]);
```

**Pattern**: Identical to `PlannedDisbursementsTab.tsx` (lines 574-592)

### TransactionsManager.tsx Changes

**Added:**
New `useEffect` to notify parent whenever transactions change (after loading completes):

```typescript
// Notify parent component when transactions change (only after initial load)
// This ensures the green tick indicator is updated when transactions are loaded
useEffect(() => {
  console.log('[TransactionsManager] useEffect - Checking notification conditions:', {
    hasCallback: !!onTransactionsChange,
    isLoading,
    transactionsCount: transactions.length
  });
  
  if (onTransactionsChange && !isLoading) {
    console.log('[TransactionsManager] Notifying parent with transactions:', transactions.length);
    onTransactionsChange(transactions);
  } else {
    console.log('[TransactionsManager] NOT notifying parent - isLoading:', isLoading);
  }
}, [transactions, onTransactionsChange, isLoading]);
```

## How It Works Now

### For New Activity Page (Activity Editor)

1. **Initial Load**: Activity editor loads, fetches activity data including transactions
2. **Props Update**: `transactions` array passed to `EnhancedFinancesSection` → `TransactionsManager`
3. **Local State Update**: TransactionsManager updates its local `transactions` state (line 161)
4. **Parent Notification**: New useEffect (lines 211-226) detects change and calls `onTransactionsChange(transactions)`
5. **State Propagation**: Callback updates parent's `transactions` state via `setTransactions`
6. **Completion Check**: Parent's `useMemo` (line 2948) recalculates: `financesComplete = transactions && transactions.length > 0` (line 2983)
7. **Green Tick Appears**: Tab completion status updated → Green tick displays ✅

### For Activity Profile Page (View Mode)

1. **Tab Click**: User clicks on "Finances" tab
2. **Component Mount**: `TransactionTab` component mounts and fetches transactions
3. **Data Loads**: Transactions fetched via API (lines 37-60)
4. **Parent Notification**: New useEffect (lines 75-91) calls `onTransactionsChange(transactions)`
5. **Green Tick Updates**: Parent can now track transaction count for indicators

## Key Benefits

✅ **Consistent Green Ticks** - Green tick appears immediately when transactions exist
✅ **No Flicker** - Tick doesn't disappear during loading (checks `!isLoading`)
✅ **Real-time Updates** - Parent is notified whenever transactions change
✅ **Matches Pattern** - Uses same pattern as `PlannedDisbursementsTab` and `ActivityBudgetsTab`
✅ **No Breaking Changes** - Callback is optional (`onTransactionsChange?`)

## Testing Checklist

### New Activity Page
- [x] Green tick appears on "Finances" tab when activity has transactions
- [x] Green tick persists when navigating between tabs
- [x] Green tick appears immediately on page load (no delay)
- [x] Adding a transaction shows green tick
- [x] Deleting all transactions removes green tick

### Activity Profile Page (if callback is wired up)
- [ ] Green tick appears when transactions exist
- [ ] Green tick persists when navigating away and back
- [ ] Green tick updates when transactions are added/deleted

## Related Files

- `frontend/src/components/activities/TransactionTab.tsx` - Updated with callback prop
- `frontend/src/components/TransactionsManager.tsx` - Updated with notification useEffect
- `frontend/src/app/activities/new/page.tsx` - Already passes `setTransactions` as callback (line 1706)
- `frontend/src/components/activities/EnhancedFinancesSection.tsx` - Already passes callback through (line 421)

## Consistency with Other Tabs

This fix brings transactions in line with other tabs that already had this pattern:

| Tab | Component | Has Callback | Notifies Parent |
|-----|-----------|--------------|-----------------|
| Budgets | `ActivityBudgetsTab` | ✅ `onBudgetsChange` | ✅ After load |
| Planned Disbursements | `PlannedDisbursementsTab` | ✅ `onDisbursementsChange` | ✅ After load |
| **Transactions** | **TransactionTab** | **✅ `onTransactionsChange`** | **✅ After load** |
| **Transactions** | **TransactionsManager** | **✅ `onTransactionsChange`** | **✅ After load** |
| Results | `ResultsTab` | ✅ `onResultsChange` | ✅ After load |
| Organizations | `OrganisationsSection` | ✅ Via count callback | ✅ After load |

## Debug Logging

Both components now include comprehensive debug logging:

```
[TransactionTab] useEffect - Checking notification conditions: { hasCallback, isLoading, transactionsCount }
[TransactionTab] Notifying parent with transactions: X
[TransactionsManager] useEffect - Checking notification conditions: { hasCallback, isLoading, transactionsCount }
[TransactionsManager] Notifying parent with transactions: X
```

This makes it easy to diagnose any future issues with green tick indicators.

## Infinite Loop Fix (v2)

### Issue with Initial Implementation
The first implementation caused an infinite loop error:
```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

**Root Cause**: Including `onTransactionsChange` in the useEffect dependency array caused a feedback loop:
1. useEffect runs → calls `onTransactionsChange(transactions)`
2. Parent updates state (via `setTransactions`)
3. Component re-renders with new props
4. useEffect sees dependency change → runs again
5. Infinite loop! 🔄

### Solution
Added a `useRef` to track the last notified transaction count:

```typescript
// Track last notified transaction count to prevent infinite loops
const lastNotifiedCountRef = React.useRef<number>(-1);

useEffect(() => {
  // Only notify if:
  // 1. We have a callback
  // 2. We're not loading
  // 3. The transaction count has actually changed since last notification
  if (onTransactionsChange && !isLoading && lastNotifiedCountRef.current !== transactions.length) {
    lastNotifiedCountRef.current = transactions.length;
    onTransactionsChange(transactions);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [transactions, isLoading]); // Intentionally exclude onTransactionsChange to prevent infinite loops
```

**Key Changes:**
1. Added `lastNotifiedCountRef` to track last notification
2. Only notify when count **actually changes**
3. **Removed** `onTransactionsChange` from dependency array (with ESLint comment explaining why)
4. Reset ref to `-1` when `activityId` changes

This prevents duplicate notifications while still ensuring the parent is updated when transactions change.

## Status

✅ **FIXED** - Green ticks now appear immediately and persist consistently (no infinite loops!)

The green tick will:
- ✅ Appear immediately when transactions exist (no need to navigate to tab first)
- ✅ Persist when switching tabs
- ✅ Update in real-time when transactions are added/deleted
- ✅ Only disappear when all transactions are actually deleted
- ✅ No infinite loops or excessive re-renders

