# Dev Server Restarted - Ready to Test

## Status
✅ Dev server restarted with updated backend code
✅ Database columns added (type, provider_org_ref, provider_org_type, etc.)
✅ Frontend display code updated
✅ Backend save code updated

## What Was Wrong

The backend changes to save the type and organization reference fields weren't active because the Next.js dev server hadn't reloaded the API route changes. The server has now been restarted.

**Previous API Response** (before restart):
```json
{
  "type": null,
  "provider_org_ref": null,
  "provider_org_type": null,
  "provider_activity_id": null,
  "receiver_org_ref": null,
  "receiver_org_type": null
}
```

**Expected API Response** (after fresh import):
```json
{
  "type": "1",
  "provider_org_ref": "BB-BBB-123456789",
  "provider_org_type": "10",
  "provider_org_activity_id": "BB-BBB-123456789-1234AA",
  "receiver_org_ref": "AA-AAA-123456789",
  "receiver_org_type": "23",
  "receiver_org_activity_id": "AA-AAA-123456789-1234"
}
```

## Testing Steps

### Step 1: Clear Old Data
Delete existing planned disbursements that have null values:
```sql
DELETE FROM planned_disbursements WHERE activity_id = '61693754-cc3e-4d06-ad44-f84218903ee7';
```

Or use the UI to delete them from the Planned Disbursements tab.

### Step 2: Import Fresh Data
1. Go to the activity editor
2. Open IATI Import tab
3. Paste this XML:
```xml
<planned-disbursement type="1">
   <period-start iso-date="2014-01-01" />
   <period-end iso-date="2014-12-31" />
   <value currency="EUR" value-date="2014-01-01">3000</value>
   <provider-org provider-activity-id="BB-BBB-123456789-1234AA" type="10" ref="BB-BBB-123456789">
    <narrative>Agency B</narrative>
   </provider-org>
   <receiver-org receiver-activity-id="AA-AAA-123456789-1234" type="23" ref="AA-AAA-123456789">
    <narrative>Agency A</narrative>
   </receiver-org>
</planned-disbursement>
```
4. Click "Parse XML" or the parsing should happen automatically
5. Expand the "Planned Disbursement 1" row
6. Verify **Import Value card** shows all fields
7. **Current Value card** should be empty (first import)
8. Click "Import Selected Fields"

### Step 3: Re-Import Same XML
1. Paste the **same XML** again
2. Click "Parse XML" or wait for auto-parse
3. Expand the "Planned Disbursement 1" row

### Expected Result
Both cards should show identical content:

**Import Value:**
```
Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
Receiver Activity: AA-AAA-123456789-1234
```

**Current Value:** (should be identical)
```
Type: Original | Start: 2014-01-01 | End: 2014-12-31 | Amount: EUR3,000 |
Value Date: 2014-01-01 | Provider: Agency B | Provider Ref: BB-BBB-123456789 |
Provider Type: 10 | Provider Activity: BB-BBB-123456789-1234AA |
Receiver: Agency A | Receiver Ref: AA-AAA-123456789 | Receiver Type: 23 |
Receiver Activity: AA-AAA-123456789-1234
```

**Status Indicator:** ✅ Green checkmark (values match)

**Selection:** Automatically selected for import

## Console Logs to Watch For

When parsing the second time, look for these console logs:

1. `[IATI Import Debug] Fetched X current planned disbursements:` - Should show 1 disbursement with all fields populated

2. `[Planned Disbursement Debug] Looking for disbursement at index 0, total fetched: 1` - Should show the fetched array has data

3. `[Planned Disbursement Debug] Found current disbursement data:` - Should show the full object with all fields

## Troubleshooting

If Current Value is still blank:
1. Check browser console for the logs above
2. Verify in network tab that `/api/activities/.../planned-disbursements` returns data with non-null type and org fields
3. Check database directly to confirm fields were saved

## Files Changed

Backend:
- `/Users/leighmitchell/aims_project/frontend/src/app/api/activities/[id]/import-iati/route.ts` (lines 1150, 1154)

Frontend:
- `/Users/leighmitchell/aims_project/frontend/src/components/activities/IatiImportTab.tsx` (lines 2581, 3617, 3621, 3642, 3646)
