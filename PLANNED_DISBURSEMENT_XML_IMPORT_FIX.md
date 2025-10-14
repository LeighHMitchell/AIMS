# Planned Disbursement XML Import Fix ✅

## Issue
Planned disbursements imported via IATI XML were not appearing in the Planned Disbursements tab after import.

## Root Cause
The XML parser in `frontend/src/lib/xml-parser.ts` was incorrectly looking for period dates wrapped in a `<period>` element:

```xml
<!-- What the parser was looking for (INCORRECT) -->
<planned-disbursement type="1">
  <period>
    <period-start iso-date="2014-01-01" />
    <period-end iso-date="2014-12-31" />
  </period>
  <value currency="EUR" value-date="2014-01-01">3000</value>
</planned-disbursement>
```

But the IATI 2.03 standard specifies that `<period-start>` and `<period-end>` are **direct children** of `<planned-disbursement>`:

```xml
<!-- Correct IATI 2.03 format -->
<planned-disbursement type="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</planned-disbursement>
```

## The Fix

**File:** `frontend/src/lib/xml-parser.ts` (lines 1029-1047)

**Before:**
```typescript
const period = disbursement.querySelector('period');
// ...
if (period) {
  const periodStart = period.querySelector('period-start');
  const periodEnd = period.querySelector('period-end');
  disbursementData.period = {
    start: periodStart?.getAttribute('iso-date') || undefined,
    end: periodEnd?.getAttribute('iso-date') || undefined,
  };
}
```

**After:**
```typescript
const periodStart = disbursement.querySelector('period-start');
const periodEnd = disbursement.querySelector('period-end');
// ...
// IATI standard: period-start and period-end are direct children, not wrapped in <period>
if (periodStart || periodEnd) {
  disbursementData.period = {
    start: periodStart?.getAttribute('iso-date') || undefined,
    end: periodEnd?.getAttribute('iso-date') || undefined,
  };
}
```

## Impact
✅ Planned disbursements from IATI XML imports now correctly parse period dates  
✅ Data passes validation (period-start and period-end are required fields)  
✅ Planned disbursements now appear in the Planned Disbursements tab after import  

## Testing
To test, import IATI XML with planned disbursements like:
```xml
<planned-disbursement type="1">
  <period-start iso-date="2014-01-01" />
  <period-end iso-date="2014-12-31" />
  <value currency="EUR" value-date="2014-01-01">3000</value>
</planned-disbursement>
```

Expected result: The disbursement should now appear in the Planned Disbursements tab with:
- Period: Jan 2014 - Dec 2014
- Amount: 3,000 EUR
- Type: Original (type="1")

## Status
✅ **FIXED** - Ready to test
