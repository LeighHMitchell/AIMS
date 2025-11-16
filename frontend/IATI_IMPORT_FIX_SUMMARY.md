# IATI Import Fix Summary

## Issue
After importing IATI XML data, many fields were showing as blank when attempting to re-import, including:
- Default Currency
- Default Tied Status
- Tags (all)
- Country Budget Items (all)
- DAC CRS Channel Code

## Root Causes Identified

### 1. **Default Currency & Default Tied Status** - Missing from Field Mappings
**Location**: `/api/activities/[id]/import-iati/route.ts` line 154-169

**Problem**: The `fieldMappings` object that defines which fields to update was missing these two fields.

**Fix**: Added both fields to the mapping:
```typescript
default_currency: 'default_currency',  // Added
default_tied_status: 'default_tied_status',  // Added
```

### 2. **Tags** - No Import Handler
**Location**: `/api/activities/[id]/import-iati/route.ts` line 1402-1462

**Problem**: The frontend was processing tags but the backend route had no handler to save them.

**Fix**: Added complete tags import handler that:
- Clears existing activity_tags relationships
- Creates tags in the `tags` table if they don't exist
- Creates activity-tag relationships in `activity_tags` table

### 3. **Country Budget Items** - No Import Handler
**Location**: `/api/activities/[id]/import-iati/route.ts` line 1464-1518

**Problem**: The frontend was processing country budget items but the backend route had no handler to save them.

**Fix**: Added complete country budget items import handler that:
- Clears existing country_budget_items records
- Inserts parent `country_budget_items` records
- Inserts child `budget_items` records with proper foreign key relationships

### 4. **DAC CRS Channel Code** - Not Updated on Existing Records
**Location**: `/api/activities/[id]/import-iati/route.ts` line 1331-1337

**Problem**: The channel_code was only being set when creating new financing_terms records, not when updating existing ones.

**Fix**: Added update statement to set channel_code when the financing_terms record already exists:
```typescript
if (iati_data.financingTerms.channelCode) {
  await supabase
    .from('financing_terms')
    .update({ channel_code: iati_data.financingTerms.channelCode })
    .eq('id', financingTermsId);
}
```

## Files Modified
1. `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts`
   - Added `default_currency` and `default_tied_status` to fieldMappings
   - Added tags import handler (60 lines)
   - Added country budget items import handler (54 lines)
   - Added channel_code update for existing financing_terms records

## Testing Instructions

### 1. Clear the existing data
Before re-importing, you may want to clear the partially imported data:

```bash
cd /Users/leighmitchell/aims_project/frontend
npx tsx scripts/check-activity-data.ts 61693754-cc3e-4d06-ad44-f84218903ee7
```

### 2. Re-import the IATI XML
1. Navigate to the activity editor for activity `61693754-cc3e-4d06-ad44-f84218903ee7`
2. Go to the IATI Import tab
3. Import the same IATI XML file
4. Select all fields and click "Import Selected Fields"

### 3. Verify the import
After import completes, run the diagnostic script again:

```bash
cd /Users/leighmitchell/aims_project/frontend
npx tsx scripts/check-activity-data.ts 61693754-cc3e-4d06-ad44-f84218903ee7
```

**Expected Results:**
- ✅ Default Currency: "USD"
- ✅ Default Tied Status: "3"
- ✅ Tags: 2 tags found
- ✅ Country Budget Items: 2 items found
- ✅ Financing Terms: channel_code should be "21039"
- ✅ All other previously working fields should still work

### 4. Re-import Test
After the import is successful, try importing the same file again. All fields should show as "already imported" with green checkmarks, and the field comparison should show no conflicts.

## Data Verification Checklist

Run this query to verify all data was saved:

```sql
-- Check basic fields
SELECT
  title_narrative,
  default_currency,
  default_tied_status,
  capital_spend_percentage,
  default_aid_type,
  default_finance_type,
  default_flow_type
FROM activities
WHERE id = '61693754-cc3e-4d06-ad44-f84218903ee7';

-- Check tags
SELECT COUNT(*) as tag_count
FROM activity_tags
WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';

-- Check country budget items
SELECT COUNT(*) as cbi_count
FROM country_budget_items
WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';

-- Check financing terms
SELECT channel_code
FROM financing_terms
WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';
```

## Frontend Data Mapping Check

If import still fails, verify the frontend is sending the correct field names:
- Check console logs for "Selected fields count"
- Ensure field names match the backend expectations:
  - `default_currency` (not `defaultCurrency`)
  - `default_tied_status` (not `defaultTiedStatus`)
  - `tags` array structure
  - `countryBudgetItems` array structure

## Known Limitations

1. **IATI Identifier**: The diagnostic shows this is an empty string. This may be a separate issue where the field is not being mapped correctly from `iati_identifier` field.

2. **Planned Disbursement Organizations**: Some planned disbursements are missing provider/receiver org names. This is expected if the organizations weren't found or created during import.

## Next Steps

After testing:
1. If import is successful, document the fix and close the issue
2. If import still fails, check browser console for error messages
3. Review server logs for any API errors
4. Consider adding field-level validation warnings in the UI

---

**Created**: 2025-11-14
**Author**: Claude Code
**Activity ID**: 61693754-cc3e-4d06-ad44-f84218903ee7
