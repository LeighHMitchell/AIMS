# Infinite Loop Diagnosis & Fix

## Symptom
When clicking pagination buttons (Next, page 2, etc.) in the Transaction List on the Activity Profile page, the entire app freezes and becomes unresponsive.

## Root Cause: Circular Dependency

### The Problematic Code Flow

```typescript
// Step 1: sortedTransactions depends on usdValues
const sortedTransactions = React.useMemo(() => {
  // Uses usdValues[id]?.usd for 'value_usd' sorting
}, [transactions, sortField, sortDirection, usdValues]); // ❌ usdValues here!

// Step 2: paginatedTransactions depends on sortedTransactions
const paginatedTransactions = React.useMemo(() => {
  return sortedTransactions.slice(startIndex, endIndex);
}, [sortedTransactions, currentPage, itemsPerPage]);

// Step 3: USD conversion updates usdValues when paginatedTransactions changes
React.useEffect(() => {
  async function convertAll() {
    // ... convert currencies ...
    setUsdValues(newUsdValues); // ❌ Triggers sortedTransactions recalculation!
  }
  convertAll();
}, [paginatedTransactions]);
```

### The Infinite Loop

```
User clicks page 2
  ↓
currentPage changes from 1 to 2
  ↓
paginatedTransactions recalculates (new slice of sortedTransactions)
  ↓
USD conversion useEffect triggers (new paginatedTransactions)
  ↓
setUsdValues(...) updates state
  ↓
sortedTransactions recalculates (depends on usdValues) ❌
  ↓
paginatedTransactions recalculates (depends on sortedTransactions)
  ↓
USD conversion useEffect triggers again (new paginatedTransactions)
  ↓
LOOP CONTINUES FOREVER → Browser freezes
```

## The Fix

**Remove `usdValues` from `sortedTransactions` dependencies:**

```typescript
const sortedTransactions = React.useMemo(() => {
  // ... sorting logic that still uses usdValues in the closure ...
}, [transactions, sortField, sortDirection]); // ✅ usdValues removed!
```

### Why This Works

1. **Sorting still functions correctly:**
   - The memo still has access to `usdValues` through closure
   - When `usdValues` updates, it triggers a component re-render
   - On re-render, the memo recalculates with the latest `usdValues`

2. **Loop is broken:**
   - Changing page → `paginatedTransactions` changes
   - USD conversion → `usdValues` updates
   - Component re-renders, but `sortedTransactions` memo doesn't recalculate (no dependency trigger)
   - `paginatedTransactions` doesn't change (same slice of same sortedTransactions)
   - USD conversion doesn't re-trigger
   - ✅ No loop!

3. **Sorting by USD value:**
   - When user sorts by USD (`value_usd`), `sortField` changes
   - `sortedTransactions` recalculates (sortField is in dependencies)
   - Works perfectly

## Testing Verification

After fix, test:
1. ✅ Click page 2 - should work without freezing
2. ✅ Click Next/Previous - should navigate smoothly  
3. ✅ Sort by USD value column - should still work
4. ✅ Navigate to page 5+ and back to activity - should stay on valid page
5. ✅ Console should be much cleaner (no spam)

## Technical Lesson

**React Dependency Best Practices:**
- Be careful with circular dependencies in `useMemo`/`useEffect`
- If value B depends on value A, don't make value A also depend on value B
- Consider whether a dependency truly needs to trigger recalculation
- Values accessed in closures don't always need to be in dependencies
- Use React DevTools Profiler to catch excessive re-renders

