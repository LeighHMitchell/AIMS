# Backfill USD Values - Step-by-Step Instructions

After you've applied the database migration to add the `usd_amount` column, follow these steps to backfill USD values.

## Step 1: Apply the Database Migration (REQUIRED FIRST)

Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lhiayyjwkjkjkxvhcenw/sql

Run this SQL:

```sql
ALTER TABLE planned_disbursements
ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(15,2);

COMMENT ON COLUMN planned_disbursements.usd_amount IS 'USD equivalent of the disbursement amount, calculated using exchange rates at value_date or period_start';
```

## Step 2: Verify Column Was Added

In the same SQL Editor, run:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'planned_disbursements'
AND column_name = 'usd_amount';
```

You should see one row with `usd_amount` and `numeric` type.

## Step 3: Backfill Planned Disbursements

### Option A: Using Browser
1. Make sure your dev server is running: `npm run dev`
2. Open your browser console
3. Run this:
```javascript
fetch('http://localhost:3000/api/planned-disbursements/backfill-usd', {
  method: 'POST'
})
.then(r => r.json())
.then(data => console.log('Planned Disbursements Result:', data));
```

### Option B: Using curl
```bash
curl -X POST http://localhost:3000/api/planned-disbursements/backfill-usd
```

## Step 4: Backfill Budgets

### Option A: Using Browser
```javascript
fetch('http://localhost:3000/api/budgets/backfill-usd', {
  method: 'POST'
})
.then(r => r.json())
.then(data => console.log('Budgets Result:', data));
```

### Option B: Using curl
```bash
curl -X POST http://localhost:3000/api/budgets/backfill-usd
```

## What to Expect

The backfill endpoints will:
- Find all records without USD values
- Convert each one using historical exchange rates
- Update the database with USD amounts
- Report how many were processed, converted, and any failures

Example output:
```json
{
  "message": "Backfill complete",
  "processed": 150,
  "converted": 120,
  "alreadyUSD": 25,
  "failed": 5,
  "errors": [...]
}
```

## Troubleshooting

**Error: Column "usd_amount" does not exist**
- You haven't applied Step 1 yet. Go apply the migration first.

**Error: Cannot connect**
- Make sure your dev server is running with `npm run dev`

**Some conversions failed**
- This is normal for old dates or unsupported currencies
- Check the `errors` array in the response for details

## After Backfill is Complete

Test that it worked:
1. Go to an activity in the Activity Editor
2. Open the Planned Disbursements tab
3. You should see USD values displayed (not "Not converted")
4. Try the Budgets tab too

All new planned disbursements and budgets will automatically get USD values when created!
