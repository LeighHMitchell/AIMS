# Quick Backfill for USD Planned Disbursements

Since the backfill API is too slow (makes external API calls for each record), here's a faster approach:

## Step 1: Backfill records that are already in USD (instant)

Run this in Supabase SQL Editor:

```sql
-- Update all planned disbursements that are already in USD
-- (no conversion needed, just copy the amount to usd_amount)
UPDATE planned_disbursements
SET usd_amount = amount
WHERE currency = 'USD' AND usd_amount IS NULL;
```

This should instantly update all USD records without needing any currency conversion.

## Step 2: Check how many records still need conversion

```sql
-- Count how many non-USD records need backfilling
SELECT
  currency,
  COUNT(*) as count
FROM planned_disbursements
WHERE usd_amount IS NULL
GROUP BY currency
ORDER BY count DESC;
```

This will show you which currencies need conversion and how many records.

## Step 3: Backfill non-USD currencies (optional)

If you have many non-USD records, you can either:

**Option A:** Let them backfill gradually as you edit activities
- New records get USD values automatically
- When you edit an existing activity, it will recalculate USD values

**Option B:** Run the slow backfill process overnight
- Use: `curl -X POST http://localhost:3000/api/planned-disbursements/backfill-usd`
- This will take a long time if you have hundreds/thousands of records
- You can run it in the background and check back later

**Option C:** Just live with "Not converted" for old records
- Only new and edited records will have USD values
- Old historical data can stay as-is

## For Budgets

Do the same for budgets:

```sql
-- Update all budgets that are already in USD
UPDATE activity_budgets
SET usd_value = value
WHERE currency = 'USD' AND usd_value IS NULL;
```

---

**Summary:** Run Step 1 in Supabase SQL Editor to instantly fix all USD records. The rest can be handled gradually.
