# IATI Activity Linking Fix

## Problem Summary

Transactions were showing warnings about "missing activities" even when those activities were included in the same XML import file. This was due to:

1. **Field Name Mismatch**: The parser used `iatiIdentifier` while the import expected `iati_id`
2. **Premature Unlinking**: Transactions referencing activities in the same import had their `activity_id` set to `undefined`
3. **Incorrect Validation**: The system flagged these transactions as needing manual assignment

## Solution

### 1. Parser Updates

The XML parser now:
- Creates a complete activity map before processing transactions
- Assigns temporary IDs (`new-{iati-id}`) to activities not yet in the database
- Maintains these temporary IDs in transactions for later resolution
- Uses consistent field names between parser and import

### 2. Import Handler Updates

The import handler now:
- Creates all activities first and builds an ID mapping
- Resolves temporary `new-` prefixed IDs to actual UUIDs
- Only flags transactions as missing activities if they truly can't be found

### 3. Field Mapping

Added duplicate fields to ensure compatibility:
- Activities: `iatiIdentifier` → `iati_id`, dates mapped to DB fields
- Transactions: camelCase → snake_case field mappings

## Technical Details

### Activity Processing Flow

```typescript
// Step 1: Parse all activities and create mapping
const activityUuidMap = new Map<string, string>();
// DB activities: iati_id → uuid
// New activities: iati_id → "new-{iati_id}"

// Step 2: Process transactions with activity context
if (activityUuid) {
  tx.activity_id = activityUuid; // Keep the ID (even if "new-")
  tx._needsActivityAssignment = false;
}

// Step 3: During import, resolve "new-" IDs
if (activityId.startsWith('new-')) {
  const iatiId = activityId.replace('new-', '');
  activityId = results.activityIdMap[iatiId]; // Get real UUID
}
```

### Benefits

1. **No False Warnings**: Transactions no longer show missing activity warnings for activities in the same import
2. **Automatic Linking**: Activities and transactions are properly linked during import
3. **Better UX**: Users don't need to manually assign transactions when activities exist

### Example

Before fix:
```
Warning: Transaction #1 references missing activity: XM-DAC-903-SII-38236
```

After fix:
```
✓ Activities: 1 created
✓ Transactions: 1 created
Import Successful
``` 