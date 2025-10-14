# Quick Deployment Guide: USD Conversion Fix for Hero Cards

## What This Fixes

Hero cards in the Activity Editor now correctly show **USD conversions** instead of original currency values for:
- ✅ Total Budgeted
- ✅ Planned Disbursements  
- ✅ Total Committed
- ✅ Total Disbursed & Expended

## Deployment Steps

### Step 1: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy and paste contents from: `add_usd_columns_migration.sql`
5. Click "Run"
6. Verify success messages appear

**Expected Output:**
```
✅ Added column: activity_budgets.usd_value
✅ Added column: planned_disbursements.usd_amount
✅ Created index: idx_activity_budgets_usd_value
✅ Created index: idx_planned_disbursements_usd_amount
✅ Migration completed successfully!
```

### Step 2: Deploy Frontend Code

The following files have been updated:
- `frontend/src/components/activities/PlannedDisbursementsTab.tsx`
- `frontend/src/types/planned-disbursement.ts`

Deploy via your normal process (e.g., Git push, Vercel deploy, etc.)

### Step 3: Verify Deployment

1. **Check Database:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'activity_budgets' AND column_name = 'usd_value';
   
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'planned_disbursements' AND column_name = 'usd_amount';
   ```
   Both should return a row.

2. **Test in Application:**
   - Create activity with budget in EUR (e.g., 1000 EUR)
   - Hero card should show USD equivalent (~$1,100)
   - Create planned disbursement in GBP (e.g., 500 GBP)
   - Hero card should show USD equivalent (~$650)
   - Refresh page - values should persist

## Changes Summary

### Database Changes
- Added `usd_value` column to `activity_budgets` table
- Added `usd_amount` column to `planned_disbursements` table
- Added performance indexes

### Code Changes
- PlannedDisbursementsTab now saves USD amounts to database
- Modal save handler calculates USD before saving
- Fetch logic prefers stored USD values
- Type definitions updated

### Existing Features Preserved
- Activity budgets already had USD saving (just needed column)
- Transactions already had USD conversion
- All existing functionality maintained

## Rollback Plan

If issues occur:

### Rollback Frontend
```bash
git revert <commit-hash>
# Redeploy
```

### Rollback Database (Optional)
Only if there are issues with the new columns:
```sql
-- Remove columns (only if absolutely necessary)
ALTER TABLE activity_budgets DROP COLUMN IF EXISTS usd_value;
ALTER TABLE planned_disbursements DROP COLUMN IF EXISTS usd_amount;

-- Remove indexes
DROP INDEX IF EXISTS idx_activity_budgets_usd_value;
DROP INDEX IF EXISTS idx_planned_disbursements_usd_amount;
```

**Note:** Rollback is unlikely to be needed as:
- Columns are nullable (won't break existing data)
- Code gracefully handles missing values
- Migration is idempotent (safe to re-run)

## Known Behavior

1. **Existing Records**: Will show $0 until edited/saved (first time)
2. **USD Transactions**: Stored as-is without conversion (value = usd_value)
3. **Missing Value Date**: Uses current date for conversion
4. **Conversion Failures**: Shows $0 and logs error (doesn't break page)

## Support

If issues arise:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify migration completed successfully
4. Check that USD columns exist in database
5. Refer to `HERO_CARDS_USD_CONVERSION_FIX.md` for detailed documentation

## Post-Deployment Monitoring

Monitor for:
- [ ] Hero cards display USD values correctly
- [ ] No console errors related to USD conversion
- [ ] Page load times remain normal
- [ ] Saving budgets/disbursements works
- [ ] Values persist after page refresh
- [ ] Multi-currency activities display correctly

## Success Criteria

✅ Hero cards show USD for all financial metrics
✅ No mixing of currencies in hero cards
✅ Values persist across page refreshes
✅ New records save USD automatically
✅ No performance degradation
✅ No linting errors
✅ No console errors
