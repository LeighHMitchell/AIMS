# Location Matching Fix - Unique Identifier Based Matching

## Problem
When importing IATI XML locations, the system was matching locations by **array index** instead of **unique identifiers**. This caused critical bugs:

### Example Scenario:
1. Import two locations:
   - Location 1: Phnom Penh (ref: "KH-PNH") at index 0
   - Location 2: Kabul (ref: "AF-KAN") at index 1

2. Delete Phnom Penh

3. Re-import the same IATI XML

4. **Bug**: The system thinks Location 1 is now Kabul (because Kabul shifted to index 0), showing incorrect "Match" status for the wrong location

## Root Cause
**File**: `frontend/src/components/activities/XmlImportTab.tsx`
**Line**: 1807 (old code)

```typescript
// OLD CODE - WRONG: Matches by array index
const currentLocation = currentActivityData.locations && currentActivityData.locations[locIndex];
```

This approach breaks when:
- Locations are deleted (array indices shift)
- Locations are reordered
- New locations are added in the middle

## Solution
Replace index-based matching with **unique identifier-based matching** using a priority system:

```typescript
// NEW CODE - CORRECT: Matches by unique identifiers
const currentLocation = currentActivityData.locations?.find((existingLoc: any) => {
  // Priority 1: Match by location_ref (most reliable)
  if (location.ref && existingLoc.location_ref) {
    return location.ref === existingLoc.location_ref;
  }
  
  // Priority 2: Match by coordinates
  const existingCoords = existingLoc.latitude && existingLoc.longitude 
    ? `${existingLoc.latitude} ${existingLoc.longitude}` 
    : '';
  const importCoords = location.point?.pos || '';
  
  if (existingCoords && importCoords) {
    return normalizeCoordinates(existingCoords) === normalizeCoordinates(importCoords);
  }
  
  // Priority 3: Match by name (least reliable)
  return location.name && existingLoc.location_name && 
         location.name.toLowerCase().trim() === existingLoc.location_name.toLowerCase().trim();
});
```

## Matching Priority
1. **location_ref** (IATI ref attribute like "AF-KAN", "KH-PNH") - Most reliable
2. **Coordinates** (latitude/longitude) - Very reliable for site locations
3. **Location name** (case-insensitive, trimmed) - Least reliable fallback

## Changes Made

### 1. XmlImportTab.tsx (lines 1806-1834)
- **Added**: `normalizeCoordinates` helper function (moved up from line 1871)
- **Replaced**: Index-based lookup with `.find()` using unique identifiers
- **Removed**: Duplicate `normalizeCoordinates` definition at line 1871

### 2. Backup Created
- `frontend/src/components/activities/XmlImportTab.tsx.backup_location_matching`

## Testing Scenarios

### ✅ Scenario 1: Delete and Re-import
1. Import locations: Phnom Penh (KH-PNH), Kabul (AF-KAN)
2. Delete Phnom Penh
3. Re-import same XML
4. **Expected**: Kabul shows as "Match" (not "New")
5. **Expected**: Only Phnom Penh shows as "New"

### ✅ Scenario 2: Update Location Details
1. Import location: Kabul (AF-KAN, 34.5553 69.2075)
2. In XML, change name to "Kabul City"
3. Re-import
4. **Expected**: Shows as "Match" (coordinates match, ref matches)

### ✅ Scenario 3: Move Location
1. Import location: Kabul (AF-KAN, 34.5553 69.2075)
2. In XML, change coordinates to 34.5000 69.2000
3. Re-import
4. **Expected**: Shows as "Conflict" or "Update" (ref matches but coordinates differ)

### ✅ Scenario 4: Locations Without Refs
1. Import locations without ref attributes
2. Delete middle location
3. Re-import
4. **Expected**: Matches by coordinates or name (not by index)

## Impact
- **Fixes**: Incorrect location matching after deletions
- **Fixes**: Locations showing as "New" when they already exist
- **Improves**: Re-import accuracy
- **Prevents**: Data duplication and confusion

## Files Modified
- `frontend/src/components/activities/XmlImportTab.tsx`

## Date
October 2, 2025

