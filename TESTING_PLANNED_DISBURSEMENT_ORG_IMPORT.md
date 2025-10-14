# Testing Guide: Planned Disbursement Organization Import

## Overview

This guide will help you verify that the organization lookup and auto-creation logic for planned disbursements is working correctly.

## Test File

Use the provided test XML file: `test_planned_disbursement_org_import.xml`

This file contains 7 test cases covering different scenarios:
1. New organizations (should auto-create)
2. Existing organizations by IATI ref (should match)
3. Organizations without refs (should match by name)
4. New organizations with detailed info
5. Disbursement with only receiver org
6. Disbursement without any organizations
7. Revised disbursement with same orgs

## Prerequisites

1. Have a running AIMS instance with database access
2. Have at least one activity created where you can import XML
3. Open browser developer console (F12) to view logs
4. Know how to access your Supabase database to verify results

## Testing Steps

### Step 1: Initial Database State

Before importing, check what organizations currently exist:

```sql
SELECT id, name, acronym, iati_org_id, Organisation_Type_Code 
FROM organizations 
ORDER BY name;
```

Note which of the following organizations exist (if any):
- AFD (Agence Française de Développement) with ref "FR-3"
- World Bank
- UNICEF
- Government of Mali with ref "ML-1"

### Step 2: Import the Test XML

1. Navigate to an activity in your AIMS system
2. Go to the "Import from XML" tab
3. Upload or paste `test_planned_disbursement_org_import.xml`
4. Select the "Planned Disbursements" fields for import
5. Click "Import Selected Fields"
6. **Watch the browser console** for detailed logs

### Step 3: Verify Console Logs

You should see logs like these for EACH planned disbursement:

**For new organizations:**
```
[Planned Disbursement] Searching for org by IATI ref: "XM-DAC-41114"
[Planned Disbursement] No IATI ref match found for "XM-DAC-41114"
[Planned Disbursement] Searching for org by name: "United Nations Development Programme"
[Planned Disbursement] No exact name match found for "United Nations Development Programme"
[Planned Disbursement] Creating new org: "United Nations Development Programme"
[Planned Disbursement] ✓ Created new org successfully: United Nations Development Programme
```

**For existing organizations:**
```
[Planned Disbursement] Searching for org by IATI ref: "FR-3"
[Planned Disbursement] ✓ Matched org by IATI ref "FR-3": Agence Française de Développement
```

**For organizations matched by name:**
```
[Planned Disbursement] Searching for org by name: "World Bank"
[Planned Disbursement] ✓ Matched org by name "World Bank": World Bank
```

### Step 4: Verify Database - Organizations Created

Check which new organizations were created:

```sql
SELECT 
  id,
  name, 
  iati_org_id, 
  Organisation_Type_Code,
  created_at
FROM organizations 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected new organizations (if they didn't exist before):**
- United Nations Development Programme (ref: XM-DAC-41114, type: 40)
- Oxfam GB (ref: GB-CHC-202918, type: 21)
- UK Foreign, Commonwealth and Development Office (ref: GB-GOV-1, type: 10)
- Kenya Health Foundation (ref: KE-NGO-001, type: 22)
- Tanzania Education Network (ref: TZ-NGO-005, type: 22)

**Organizations that should have been matched (if they existed):**
- AFD (matched by ref FR-3)
- World Bank (matched by name)
- UNICEF (matched by name)
- Government of Mali (matched by ref ML-1)

### Step 5: Verify Database - Planned Disbursements Linked

Check that planned disbursements have organization IDs populated:

```sql
SELECT 
  pd.id,
  pd.period_start,
  pd.period_end,
  pd.amount,
  pd.currency,
  -- Provider org details
  pd.provider_org_id,
  pd.provider_org_name,
  pd.provider_org_ref,
  po.name as provider_org_actual_name,
  po.iati_org_id as provider_org_actual_ref,
  -- Receiver org details
  pd.receiver_org_id,
  pd.receiver_org_name,
  pd.receiver_org_ref,
  ro.name as receiver_org_actual_name,
  ro.iati_org_id as receiver_org_actual_ref
FROM planned_disbursements pd
LEFT JOIN organizations po ON pd.provider_org_id = po.id
LEFT JOIN organizations ro ON pd.receiver_org_id = ro.id
WHERE pd.activity_id = 'YOUR_ACTIVITY_ID_HERE'
ORDER BY pd.period_start;
```

**What to verify:**
- ✅ All disbursements with provider-org in XML should have `provider_org_id` NOT NULL
- ✅ All disbursements with receiver-org in XML should have `receiver_org_id` NOT NULL
- ✅ Text fields (`provider_org_name`, `provider_org_ref`) should match XML
- ✅ Joined org names should match the text names (proving correct link)
- ✅ Disbursements without orgs should have NULL IDs (test case 6)

### Step 6: Verify UI Display

1. Navigate to the "Planned Disbursements" tab in the activity
2. Look at the "Provider → Receiver" column
3. Verify:
   - ✅ Organization names display correctly
   - ✅ Organization logos appear (if orgs have logos)
   - ✅ Can click on organization names to view profiles
   - ✅ No "undefined" or error states
   - ✅ Test case 6 (no orgs) displays properly

### Step 7: Test Duplicate Prevention

1. Import the same XML file again
2. Check console logs
3. Verify all organizations are MATCHED (not created again):

```
[Planned Disbursement] Searching for org by IATI ref: "XM-DAC-41114"
[Planned Disbursement] ✓ Matched org by IATI ref "XM-DAC-41114": United Nations Development Programme
```

4. Check database - organization count should NOT increase:

```sql
SELECT COUNT(*) as total_orgs FROM organizations;
```

The count should be the same as after the first import.

### Step 8: Test Concurrent Import Handling

This tests the retry logic for duplicate creation:

1. Have two users/windows ready
2. Both import the SAME XML file with NEW organizations at the SAME time
3. Check console logs - one should create, one should retry and find:

```
[Planned Disbursement] Org creation failed (possibly duplicate), retrying search
[Planned Disbursement] ✓ Found org on retry: United Nations Development Programme
```

4. Verify only ONE instance of each org exists in database

## Expected Results Summary

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| 1 | New orgs with IATI refs | Create 2 new orgs, link both |
| 2 | Existing orgs by ref | Match existing, link both |
| 3 | Orgs without refs | Match by name or create, link both |
| 4 | New orgs with details | Create 2 new orgs with all fields, link both |
| 5 | Only receiver org | Receiver ID populated, provider ID NULL |
| 6 | No organizations | Both IDs NULL, import succeeds |
| 7 | Revised with same orgs | Match existing orgs from test case 1 |

## Troubleshooting

### Issue: Organizations not being created

**Check:**
- Console logs show "Creating new org" message?
- Any error messages in console?
- Database permissions for creating organizations?

**Fix:** Check Supabase policies for organizations table

### Issue: Duplicate organizations created

**Check:**
- Are IATI org IDs comma-separated? (e.g., "FR-3,FR-AFD")
- Are names exactly matching (case, spaces, trim)?
- Console logs show matching logic?

**Fix:** May need to adjust matching logic for edge cases

### Issue: Organizations matched incorrectly

**Check:**
- Console logs show which org was matched
- Database query to see organization names and refs
- Are there similar named orgs causing confusion?

**Fix:** Review exact match logic, may need to be more strict

### Issue: provider_org_id or receiver_org_id still NULL

**Check:**
- Was organization creation successful? Check console logs
- Does the org exist in database?
- Was there an error during insert?

**Fix:** Check database foreign key constraints and error logs

### Issue: Import succeeds but console shows no matching logs

**Check:**
- Are you looking at the right browser console?
- Refresh the page and try again
- Check if `body.importedPlannedDisbursements` is populated

**Fix:** May be an issue with XML parsing, check parser logs

## Verification Checklist

After testing, confirm all items:

- [ ] Console logs show detailed matching process for each org
- [ ] New organizations are created when they don't exist
- [ ] Existing organizations are matched by IATI ref
- [ ] Existing organizations are matched by name when no ref
- [ ] No duplicate organizations created on re-import
- [ ] `provider_org_id` populated for all disbursements with provider-org
- [ ] `receiver_org_id` populated for all disbursements with receiver-org
- [ ] Text fields preserved for IATI compliance
- [ ] UI displays organization names and logos correctly
- [ ] Can navigate to organization profiles from planned disbursements
- [ ] Disbursements without organizations still import successfully
- [ ] Concurrent imports handled gracefully (retry logic works)

## Success Criteria

✅ **All tests pass if:**
1. No silent failures - all orgs are linked via foreign keys
2. No duplicates - same org not created multiple times
3. Proper matching - orgs matched by ref first, then name
4. Auto-creation works - new orgs created when needed
5. UI displays correctly - names, logos, clickable profiles
6. Data integrity maintained - text fields preserved for IATI

## Next Steps After Successful Testing

1. Document any edge cases found during testing
2. Update user documentation if needed
3. Consider adding similar logic to other imports (transactions, etc.)
4. Monitor production imports for any issues
5. Create backup before deploying to production

## Support

If you encounter issues during testing:
1. Save console logs (right-click → Save as...)
2. Export database query results
3. Take screenshots of UI issues
4. Note the exact XML that caused the issue
5. Check the implementation document: `PLANNED_DISBURSEMENT_ORG_IMPORT_FIX.md`

