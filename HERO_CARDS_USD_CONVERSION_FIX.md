# Hero Cards USD Conversion Fix

## Issue Summary

The hero cards in the Activity Editor (showing Planned Disbursements, Budgets, and Transactions) were displaying values in the original currency reported instead of showing USD conversions. This made financial summaries inconsistent and difficult to compare across activities with different currencies.

## Root Cause Analysis

### 1. **Planned Disbursements**
- **Problem**: The code calculated USD amounts on the frontend but **never saved them** to the database
- **Impact**: `FinancialSummaryCards` component fell back to original currency values
- **Location**: `PlannedDisbursementsTab.tsx` lines 685-700

### 2. **Activity Budgets**
- **Problem**: The `usd_value` column might not exist in the `activity_budgets` table
- **Impact**: Hero cards showed original currency values when USD column was missing
- **Location**: Database schema for `activity_budgets`

### 3. **FinancialSummaryCards Fallback**
- **Problem**: Component fell back to original currency when USD fields were null/missing
- **Impact**: Users saw inconsistent currency values across hero cards
- **Location**: `FinancialSummaryCards.tsx` lines 53-62, 77-85

## Solution Implemented

### 1. Database Schema Updates

Created migration script: `add_usd_columns_migration.sql`

This script safely adds:
- `usd_value` column to `activity_budgets` table (NUMERIC(20,2))
- `usd_amount` column to `planned_disbursements` table (NUMERIC(15,2))
- Performance indexes for both columns
- Proper documentation comments

**How to Run:**
```sql
-- In Supabase SQL Editor or via psql
\i add_usd_columns_migration.sql
```

Or copy-paste the contents into Supabase SQL Editor.

### 2. Frontend Code Updates

#### A. PlannedDisbursementsTab.tsx

**Change 1: Save USD amounts to database** (Line 689)
```typescript
const disbursementData = {
  activity_id: activityId,
  amount: disbursement.amount,
  currency: disbursement.currency,
  usd_amount: usdAmount, // ✅ NOW SAVED TO DATABASE
  period_start: periodStart,
  // ... rest of fields
};
```

**Change 2: Modal save handler calculates USD** (Lines 892-908)
```typescript
// Convert to USD before saving
let usdAmount = 0;
if (modalDisbursement.amount && modalDisbursement.currency && modalDisbursement.currency !== 'USD') {
  const conversionDate = modalDisbursement.value_date ? new Date(modalDisbursement.value_date) : new Date();
  const result = await fixedCurrencyConverter.convertToUSD(
    modalDisbursement.amount,
    modalDisbursement.currency,
    conversionDate
  );
  usdAmount = result.usd_amount || 0;
} else if (modalDisbursement.currency === 'USD') {
  usdAmount = modalDisbursement.amount;
}
```

**Change 3: Use stored USD values on fetch** (Lines 495-523)
```typescript
// Prefer the stored usd_amount from database
let usdAmount = disbursement.usd_amount || 0;

// Only recalculate if usd_amount is missing or zero
if (!usdAmount && disbursement.amount && disbursement.currency) {
  // ... conversion logic
}
```

#### B. planned-disbursement.ts Type Definition

**Change: Added database field** (Line 10)
```typescript
export interface PlannedDisbursement {
  // Financial fields
  amount: number;
  currency: string;
  value_date?: string;
  usd_amount?: number;  // ✅ USD-converted amount stored in database
  // ... rest of fields
}
```

### 3. Existing Code Already Working

The following components already had proper USD handling:

- **ActivityBudgetsTab.tsx**: Already saves `usd_value` when budgets are saved
- **FinancialSummaryCards.tsx**: Already queries and displays USD values correctly
- **ActivityHeroCards.tsx**: Already uses USD values from budgets and transactions
- **Transaction handling**: Already has USD conversion with triggers and API

## Verification Steps

After applying these fixes:

### 1. Run Database Migration
```sql
-- Run in Supabase SQL Editor
\i add_usd_columns_migration.sql
```

Verify output shows:
```
✅ Added column: activity_budgets.usd_value
✅ Added column: planned_disbursements.usd_amount
✅ Created index: idx_activity_budgets_usd_value
✅ Created index: idx_planned_disbursements_usd_amount
```

### 2. Check Database Schema
```sql
-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_budgets' AND column_name = 'usd_value';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'planned_disbursements' AND column_name = 'usd_amount';
```

### 3. Test in UI

1. **Create/Edit Activity with Budget in EUR**
   - Add budget: 1000 EUR
   - Check hero card shows USD equivalent (e.g., ~$1,100)

2. **Create/Edit Planned Disbursement in GBP**
   - Add disbursement: 500 GBP
   - Check hero card shows USD equivalent (e.g., ~$650)

3. **Verify Hero Cards Display**
   - All hero cards should show values in USD
   - No mixing of currencies
   - Values should be consistent across page refreshes

### 4. Check Console Logs
```javascript
// Should see in browser console:
[FinancialSummaryCards] Setting totalBudgeted to: <USD value>
[FinancialSummaryCards] Setting plannedDisbursements to: <USD value>
```

## Data Migration for Existing Records

If you have existing budgets or planned disbursements without USD values:

### Option 1: Re-save Records (Recommended)
The code will automatically calculate and save USD values when records are edited and saved.

### Option 2: Bulk Conversion Script (Optional)

```sql
-- This would need to be implemented if you have many records
-- Not provided as it requires integration with currency conversion API
-- Better to let the frontend handle it as records are accessed/edited
```

## Files Modified

1. ✅ `add_usd_columns_migration.sql` - NEW
2. ✅ `frontend/src/components/activities/PlannedDisbursementsTab.tsx`
3. ✅ `frontend/src/types/planned-disbursement.ts`
4. ✅ `HERO_CARDS_USD_CONVERSION_FIX.md` - NEW (this file)

## Files Already Working Correctly

- `frontend/src/components/activities/ActivityBudgetsTab.tsx`
- `frontend/src/components/FinancialSummaryCards.tsx`
- `frontend/src/components/ActivityHeroCards.tsx`
- `frontend/src/app/api/planned-disbursements/route.ts`

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] USD columns exist in both tables
- [ ] Create new budget in non-USD currency
- [ ] Hero card shows USD conversion for budget
- [ ] Create new planned disbursement in non-USD currency  
- [ ] Hero card shows USD conversion for planned disbursement
- [ ] Edit existing budget - USD value updates
- [ ] Edit existing planned disbursement - USD value updates
- [ ] Page refresh maintains USD values
- [ ] Console shows no errors related to USD conversion

## Notes

- The system uses `fixedCurrencyConverter` for all USD conversions
- Conversions use historical exchange rates based on `value_date`
- USD transactions (currency = 'USD') are stored directly without conversion
- The hero cards will show "$0" for records without `value_date` until edited

## Future Enhancements

Consider adding:
1. Bulk recalculation tool for existing records
2. Warning indicator when USD conversion failed
3. Option to refresh USD values when exchange rates change
4. Admin panel to view conversion rates used
