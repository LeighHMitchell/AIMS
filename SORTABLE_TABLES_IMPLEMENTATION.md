# Sortable Tables Implementation

## Summary
Added sorting functionality to both the **Budgets** and **Planned Disbursements** tables, allowing users to click column headers to sort data in ascending or descending order.

## Changes Made

### 1. Budgets Table (`ActivityBudgetsTab.tsx`)

#### Features Added:
- **Sortable Columns:**
  - Period Start
  - Period End
  - Type
  - Status
  - Value
  - Currency
  - Value Date
  - US$ Value

#### Implementation Details:
- Added sorting state (`sortColumn` and `sortDirection`)
- Created `handleSort` function to toggle sort direction on column click
- Added `sortedBudgets` memo that applies sorting logic
- Updated table headers with:
  - Click handlers for sorting
  - Visual indicators (ArrowUp/ArrowDown icons) showing current sort state
  - Hover effects for better UX
- Updated table body to render `sortedBudgets` instead of unsorted `budgets`

#### Sorting Logic:
- Dates sorted chronologically
- Numeric values sorted numerically
- Text values (currency) sorted alphabetically (case-insensitive)
- Toggle between ascending and descending on subsequent clicks
- First click on a new column defaults to ascending

### 2. Planned Disbursements Table (`PlannedDisbursementsTab.tsx`)

#### Features Added:
- **Sortable Columns:**
  - Period (sorts by period_start date)
  - Status
  - Provider → Receiver (sorts by provider name)
  - Amount
  - US$ Value
  - Value Date

#### Implementation Details:
- Added sorting state (`sortColumn` and `sortDirection`)
- Created `handleSort` function to toggle sort direction on column click
- Added `sortedFilteredDisbursements` memo that applies sorting to filtered disbursements
- Updated table headers with:
  - Click handlers for sorting
  - Visual indicators (ArrowUp/ArrowDown icons) showing current sort state
  - Hover effects for better UX
- Updated table body to render `sortedFilteredDisbursements` instead of unsorted data

#### Sorting Logic:
- Period: Sorts by start date chronologically
- Status: Alphabetical (case-insensitive)
- Provider/Receiver: Alphabetical by organization name (case-insensitive)
- Amount/US$ Value: Numeric sorting
- Value Date: Chronological sorting
- Toggle between ascending and descending on subsequent clicks
- First click on a new column defaults to ascending

## User Experience

### Visual Indicators:
- **Arrow Icons**: Show which column is currently sorted
  - ⬆️ ArrowUp: Ascending order
  - ⬇️ ArrowDown: Descending order
- **Hover Effect**: Column headers highlight on hover to indicate they're clickable
- **Cursor**: Changes to pointer on sortable headers

### How to Use:
1. Click any sortable column header to sort by that column (ascending)
2. Click the same header again to reverse the sort direction (descending)
3. Click a different header to sort by that column instead

## Technical Notes

### Code Changes:
- Imported `ArrowUp` and `ArrowDown` icons from `lucide-react`
- Used `useMemo` hooks for performance optimization (prevents unnecessary re-sorting)
- Used `useCallback` for sort handler to prevent unnecessary re-renders
- Maintained existing functionality (filtering, calculations, etc.)

### Performance:
- Sorting is done in-memory using JavaScript's native `Array.sort()`
- Memoization ensures sorting only recalculates when data or sort parameters change
- No performance impact on data fetching or API calls

### Compatibility:
- Works with existing features:
  - Filtering
  - USD conversion
  - Charts and visualizations
  - Export functionality
  - CRUD operations

## Files Modified

1. `/Users/leighmitchell/aims_project/frontend/src/components/activities/ActivityBudgetsTab.tsx`
2. `/Users/leighmitchell/aims_project/frontend/src/components/activities/PlannedDisbursementsTab.tsx`

## Testing Recommendations

1. **Basic Sorting**: Click each column header and verify data sorts correctly
2. **Direction Toggle**: Click same header twice to verify ascending/descending toggle
3. **Multiple Columns**: Sort by different columns to ensure state updates correctly
4. **Data Types**: Verify dates, numbers, and text all sort appropriately
5. **Edge Cases**: Test with:
   - Empty tables
   - Single row
   - Null/undefined values
   - Large datasets

## Future Enhancements (Optional)

1. Add multi-column sorting (sort by primary and secondary columns)
2. Save sort preferences to user settings/local storage
3. Add keyboard navigation for accessibility
4. Add sort indicators even when not actively sorted (subtle arrows)

