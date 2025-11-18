# 🔧 Fix "Not converted" in Planned Disbursements

## The Problem

You're seeing "Not converted" in red text for planned disbursements in the Activity Profile Finances tab. This happens because existing planned disbursements (created before USD conversion was implemented) don't have their `usd_amount` field populated in the database.

## The Solution

I've created a backfill API endpoint that will convert all existing planned disbursements to USD and save the values to the database.

### Option 1: Run via Browser (Easiest)

1. **Start your development server** (if not already running):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open your browser** and navigate to this URL:
   ```
   POST http://localhost:3000/api/planned-disbursements/backfill-usd
   ```
   
   Or use this one-liner in your browser console:
   ```javascript
   fetch('/api/planned-disbursements/backfill-usd', { method: 'POST' })
     .then(res => res.json())
     .then(data => console.log('Backfill results:', data));
   ```

### Option 2: Run via cURL

```bash
curl -X POST http://localhost:3000/api/planned-disbursements/backfill-usd \
  -H "Content-Type: application/json"
```

### Option 3: Run via Postman or Thunder Client

- **Method**: POST
- **URL**: `http://localhost:3000/api/planned-disbursements/backfill-usd`
- **Headers**: `Content-Type: application/json`
- **Body**: None required

## What the Backfill Does

The backfill endpoint:

1. ✅ Finds all planned disbursements where `usd_amount IS NULL`
2. ✅ For USD disbursements: Copies `amount` → `usd_amount`
3. ✅ For non-USD disbursements (like EUR):
   - Converts to USD using the exchange rate on the `value_date` or `period_start`
   - Saves the converted amount to `usd_amount`
4. ✅ Returns a summary of results

## Expected Output

```json
{
  "message": "Backfill complete",
  "processed": 2,
  "converted": 2,
  "failed": 0,
  "alreadyUSD": 0,
  "errors": []
}
```

### If Conversions Fail

If you see errors for old dates (like 2014), you may need to add historical exchange rates. The system will show detailed error information:

```json
{
  "errors": [
    {
      "id": "disbursement-uuid",
      "error": "No exchange rate available for EUR on 2014-01-01",
      "currency": "EUR",
      "amount": 3000,
      "date": "2014-01-01"
    }
  ]
}
```

### Add Historical Exchange Rates (if needed)

If conversions fail for 2014 dates, run this SQL in your Supabase SQL Editor:

```sql
-- Add EUR exchange rates for 2014
INSERT INTO exchange_rates (from_currency, to_currency, exchange_rate, rate_date, source)
VALUES 
  ('EUR', 'USD', 1.3791, '2014-01-01', 'historical-fallback'),
  ('EUR', 'USD', 1.3945, '2014-07-01', 'historical-fallback'),
  ('EUR', 'USD', 1.2507, '2014-12-31', 'historical-fallback')
ON CONFLICT (from_currency, to_currency, rate_date) 
DO NOTHING;
```

Then run the backfill API again.

## Verification

After running the backfill:

1. **Refresh the Activity Profile page** in your browser
2. **Navigate to the Finances tab** → Planned Disbursements
3. **Verify USD Value column** now shows:
   - ✅ "USD 3,000" (or converted amount) instead of "Not converted"

## Future Disbursements

All **new** planned disbursements will automatically convert to USD when saved, so you only need to run this backfill once for existing records.

## Troubleshooting

### "No planned disbursements need backfilling"

This means all your disbursements already have USD values. Check:
- The database: `SELECT * FROM planned_disbursements WHERE usd_amount IS NULL`
- If the issue persists, the problem might be elsewhere

### "Failed to fetch planned disbursements"

Check your database connection and ensure the `planned_disbursements` table exists and has the `usd_amount` column.

### Still showing "Not converted" after backfill

1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Check the browser console for errors
3. Verify the database was actually updated:
   ```sql
   SELECT id, amount, currency, usd_amount 
   FROM planned_disbursements 
   WHERE currency = 'EUR';
   ```

## Files Created

- **`/api/planned-disbursements/backfill-usd/route.ts`** - The backfill API endpoint

## Summary

✅ **Problem**: Existing planned disbursements show "Not converted" because they lack USD values  
✅ **Solution**: Run the backfill API endpoint to populate USD values for all existing records  
✅ **Future**: New disbursements automatically convert on save  

---

**Quick Start**: Just run this in your browser console while on your app:

```javascript
fetch('/api/planned-disbursements/backfill-usd', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log('✅ Backfill complete:', data));
```



