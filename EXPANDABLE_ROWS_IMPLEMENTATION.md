# Expandable Rows Implementation - Complete

## Overview
Added expandable/collapsible rows to all financial tables in the activity profile page, allowing users to view additional details by clicking a chevron icon.

## Implementation Complete ✅

### Components Updated

#### 1. TransactionList.tsx
**Location:** `frontend/src/components/activities/TransactionList.tsx`

**Changes:**
- Added `ChevronDown` and `ChevronUp` icon imports
- Added `expandedRows` state: `useState<Set<string>>(new Set())`
- Added `toggleRowExpansion()` function
- Added chevron column header (empty, 40px width)
- Added chevron button in first column of each row
- Added expandable detail row showing:
  - Transaction Reference
  - Description
  - Aid Type
  - Flow Type
  - Tied Status
  - Disbursement Channel
  - Sector Code
  - Recipient Country
  - Recipient Region
  - Humanitarian flag
  - Linked Activities (Provider/Receiver activity IDs)

**Styling:**
- Expandable row: `bg-muted/20` (subtle gray background)
- Two-column grid layout for detail fields
- Conditional rendering (only shows fields if they have values)

---

#### 2. ActivityBudgetsTab.tsx
**Location:** `frontend/src/components/activities/ActivityBudgetsTab.tsx`

**Changes:**
- Added `expandedRows` state: `useState<Set<string>>(new Set())`
- Added `toggleRowExpansion()` function
- Added chevron column header (empty, 40px width)
- Added chevron button in first column of each row
- Added expandable detail row showing:
  - Period Dates (full dates with day)
  - Budget ID
  - Budget Lines (if present) - ref, value, currency, narrative
  - Original Currency amount
  - USD Equivalent with exchange rate

**Styling:**
- Same pattern as TransactionList
- Grid layout with responsive columns
- Shows budget lines breakdown if available

---

#### 3. PlannedDisbursementsTab.tsx
**Location:** `frontend/src/components/activities/PlannedDisbursementsTab.tsx`

**Changes:**
- Added `expandedRows` state: `useState<Set<string>>(new Set())`
- Added `toggleRowExpansion()` function
- Added chevron column header (empty, 40px width)
- Added chevron button in first column of each row
- Added expandable detail row showing:
  - Period Dates (full dates with day)
  - Provider Org Ref (IATI identifier)
  - Receiver Org Ref (IATI identifier)
  - Notes
  - Created date
  - Last Updated date
  - Disbursement ID

**Styling:**
- Consistent with other components
- Two-column grid layout
- Conditional field rendering

---

## User Experience

### Collapsed State (Default)
- Clean, compact table view
- Chevron pointing down (▼)
- Shows only essential columns
- Easy to scan

### Expanded State
- Chevron pointing up (▲)
- Additional row appears below with light gray background
- Shows detailed information in organized two-column grid
- Doesn't interfere with sorting, filtering, or other table functions

### Interaction
- Click chevron icon to toggle expansion
- Each row expands/collapses independently
- State is maintained while browsing (until page refresh)
- Click doesn't interfere with edit/delete actions
- Works in both read-only and edit modes

---

## Technical Details

### State Management
```typescript
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

const toggleRowExpansion = (rowId: string) => {
  setExpandedRows(prev => {
    const newSet = new Set(prev);
    if (newSet.has(rowId)) {
      newSet.delete(rowId);
    } else {
      newSet.add(rowId);
    }
    return newSet;
  });
};
```

### Table Structure
```tsx
<React.Fragment key={itemId}>
  {/* Main Row */}
  <TableRow>
    <TableCell>
      <Button onClick={() => toggleRowExpansion(itemId)}>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </Button>
    </TableCell>
    {/* ... other columns */}
  </TableRow>
  
  {/* Expandable Detail Row */}
  {isExpanded && (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={columnCount}>
        {/* Detail content in two-column grid */}
      </TableCell>
    </TableRow>
  )}
</React.Fragment>
```

---

## Benefits

1. **Cleaner Tables**: Main view is uncluttered, shows only key info
2. **On-Demand Details**: Users can expand only what they need to see
3. **Better Scannability**: Easier to review many transactions/budgets/disbursements
4. **Progressive Disclosure**: Advanced/technical fields hidden until needed
5. **Consistent UX**: Same pattern across all three financial tables
6. **Accessibility**: Proper ARIA labels, keyboard navigation works
7. **Mobile Friendly**: Expandable content stacks well on smaller screens

---

## Fields Shown in Expandable Rows

### Transactions (Comprehensive View)

**🧾 Transaction Details**
- Transaction Type (with full name)
- Validation Status (if present)
- Transaction Value (with currency)
- Transaction Date
- Value Date
- Transaction Reference

**🏛 Parties Involved**
- Provider Organisation (name)
- Provider Org Ref (IATI identifier)
- Provider Activity ID (linked activity)
- Receiver Organisation (name)
- Receiver Org Ref (IATI identifier)
- Receiver Activity ID (linked activity)

**🧠 Description**
- Full transaction description (if present)

**💰 Funding Modality & Aid Classification**
- Aid Type
- Flow Type
- Finance Type (with full name)
- Tied Status
- Disbursement Channel
- Humanitarian flag

**⚙️ Advanced IATI Fields / System Identifiers**
- Transaction UUID (system identifier)
- Activity ID (parent activity)
- Sector Code
- Recipient Country
- Recipient Region

### Budgets (All Modal Fields)
- Type (Original/Revised)
- Status (Indicative/Committed)
- Period Start & End Dates (full precision)
- Currency
- Value (in original currency)
- Value Date
- USD Value (with exchange rate)
- Budget ID
- Budget Lines breakdown (if present) - shows ref, narrative, and value for each line

### Planned Disbursements (All Modal Fields)
- Status (Original/Revised)
- Period Start & End Dates (full precision)
- Currency
- Amount (in original currency)
- Value Date
- USD Value
- Provider Organisation (name and IATI ref)
- Receiver Organisation (name and IATI ref)
- Notes
- Disbursement ID
- Created & Updated timestamps

---

## Future Enhancements (Optional)

- **Expand All/Collapse All** - Bulk expand/collapse button
- **Remember State** - Persist expanded state in localStorage
- **Keyboard Shortcuts** - Arrow keys to navigate expanded rows
- **Print View** - Auto-expand all rows when printing
- **Export** - Include expanded details in CSV/Excel export
- **Mobile Optimization** - Single column layout for small screens

---

## Testing Checklist

- ✅ Chevron icon appears in all three tables
- ✅ Clicking chevron toggles expansion
- ✅ Expandable content shows correct data
- ✅ Works in read-only mode
- ✅ Works in edit mode
- ✅ Doesn't interfere with sorting
- ✅ Doesn't interfere with bulk selection (budgets/disbursements)
- ✅ Doesn't interfere with edit/delete actions
- ✅ No linter errors
- ✅ Conditional rendering (only shows fields with values)
- ✅ Responsive layout

---

## Files Modified

1. ✅ `frontend/src/components/activities/TransactionList.tsx`
2. ✅ `frontend/src/components/activities/ActivityBudgetsTab.tsx`
3. ✅ `frontend/src/components/activities/PlannedDisbursementsTab.tsx`

## No Database Changes Required

This is a pure UI enhancement - no migrations or API changes needed!

