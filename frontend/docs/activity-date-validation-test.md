# Activity Date Field Validation Test Plan

## Test Cases

### 1. Pipeline/Identification Status (1)
- Select "Pipeline / Identification" from Activity Status dropdown
- **Expected**: 
  - Planned Start Date: ✅ Enabled
  - Planned End Date: ✅ Enabled
  - Actual Start Date: ❌ Disabled (greyed out)
  - Actual End Date: ❌ Disabled (greyed out)

### 2. Implementation Status (2)
- Select "Implementation" from Activity Status dropdown
- **Expected**:
  - Planned Start Date: ✅ Enabled
  - Planned End Date: ✅ Enabled
  - Actual Start Date: ✅ Enabled
  - Actual End Date: ❌ Disabled (greyed out)

### 3. Finalisation Status (3)
- Select "Finalisation" from Activity Status dropdown
- **Expected**:
  - Planned Start Date: ✅ Enabled
  - Planned End Date: ✅ Enabled
  - Actual Start Date: ✅ Enabled
  - Actual End Date: ✅ Enabled

### 4. Closed Status (4)
- Select "Closed" from Activity Status dropdown
- **Expected**: All date fields enabled

### 5. Cancelled Status (5)
- Select "Cancelled" from Activity Status dropdown
- **Expected**: All date fields enabled

### 6. Suspended Status (6)
- Select "Suspended" from Activity Status dropdown
- **Expected**: All date fields enabled

## Visual Validation

### Disabled Fields Should Have:
1. Light gray background (`bg-gray-100`)
2. Cursor shows as not-allowed
3. Label text is lighter gray
4. Tooltip icon next to label
5. Tooltip explains why field is disabled

### Field State Preservation
1. Enter dates in all fields when status allows
2. Change to restrictive status (e.g., Pipeline)
3. Change back to permissive status
4. **Expected**: Previously entered dates should still be present

## Auto-Save Integration
1. Change activity status
2. Verify auto-save triggers (check "Saving..." indicator)
3. Refresh page
4. **Expected**: New status and date field states persist 