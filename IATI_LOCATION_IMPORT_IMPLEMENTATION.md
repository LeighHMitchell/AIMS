# IATI Location Import - Implementation Complete

## Overview

Successfully implemented comprehensive IATI location data import functionality, enabling users to import detailed location information from IATI XML files and view it in the Activity Editor's Location tab.

## Implementation Summary

### ✅ Completed Tasks

1. **Enhanced XML Parser** (`frontend/src/lib/xml-parser.ts`)
   - Added `ParsedLocation` interface with full IATI location metadata
   - Added location parsing logic to extract:
     - Location names and descriptions
     - Point coordinates (latitude/longitude)
     - Location reach (activity vs beneficiary sites)
     - Exactness (exact, approximate, extrapolated)
     - Location class (administrative region, populated place, structure, etc.)
     - Administrative boundaries (level and code)
     - Gazetteer references (location ID vocabulary and code)
     - Feature designation codes
   - Integrated location count in activity summary

2. **Updated Parse API** (`frontend/src/app/api/iati/parse/route.ts`)
   - Added `ParsedLocation` interface
   - Extended `ParsedActivity` to include `locations` array
   - Implemented location extraction using fast-xml-parser
   - Parse all IATI-compliant location elements including nested structures

3. **Enhanced Import API** (`frontend/src/app/api/activities/[id]/import-iati/route.ts`)
   - Added location import handler
   - Parse coordinates from "latitude longitude" format
   - Automatically determine location type (site vs coverage) based on coordinates
   - Map IATI location fields to database schema:
     - `location_reach` (1-2)
     - `exactness` (1-3)
     - `location_class` (1-4)
     - `feature_designation` (text code)
     - `location_id_vocabulary` and `location_id_code` (gazetteer)
     - `admin_vocabulary`, `admin_level`, `admin_code` (administrative)
     - `srs_name` (coordinate reference system)
   - Set metadata (`source='import'`, `validation_status='valid'`)
   - Store previous locations for audit trail

4. **Updated XML Import UI** (`frontend/src/components/activities/XmlImportTab.tsx`)
   - Added location display in comparison table
   - Show location summary with:
     - Location name
     - Coordinates (if available)
     - Location reach type
     - Exactness level
     - Location class
     - Administrative code
     - Gazetteer ID
   - Added `isLocationItem` flag and `locationData` to field structure
   - Collect selected locations for import
   - Import locations via API with proper error handling
   - Display success/error toasts for location imports

## Database Schema Support

The `activity_locations` table fully supports all IATI location fields:

| Database Column | IATI Element | Data Type | Purpose |
|----------------|--------------|-----------|---------|
| `location_name` | `location/name/narrative` | TEXT | Location name |
| `location_description` | `location/description/narrative` | TEXT | Location description |
| `activity_location_description` | `location/activity-description/narrative` | TEXT | Activity at location |
| `latitude` | `location/point/pos` (first value) | DECIMAL | Latitude coordinate |
| `longitude` | `location/point/pos` (second value) | DECIMAL | Longitude coordinate |
| `srs_name` | `location/point/@srsName` | TEXT | Coordinate system |
| `location_reach` | `location/location-reach/@code` | SMALLINT | 1=Activity, 2=Beneficiary |
| `exactness` | `location/exactness/@code` | SMALLINT | 1=Exact, 2=Approx, 3=Extrap |
| `location_class` | `location/location-class/@code` | SMALLINT | 1=Admin, 2=Place, 3=Structure, 4=Feature |
| `feature_designation` | `location/feature-designation/@code` | TEXT | Feature type code |
| `location_id_vocabulary` | `location/location-id/@vocabulary` | TEXT | Gazetteer vocabulary |
| `location_id_code` | `location/location-id/@code` | TEXT | Gazetteer code |
| `admin_vocabulary` | `location/administrative/@vocabulary` | TEXT | Admin vocabulary |
| `admin_level` | `location/administrative/@level` | TEXT | Admin level (0-5) |
| `admin_code` | `location/administrative/@code` | TEXT | Admin code |
| `location_type` | (derived) | VARCHAR | 'site' or 'coverage' |
| `source` | (metadata) | TEXT | 'import' |
| `validation_status` | (metadata) | TEXT | 'valid' |

## IATI Standard Compliance

### Supported IATI v2.03 Location Elements

✅ **Core Elements:**
- `location/@ref` - Unique location reference
- `location/name/narrative` - Location name
- `location/description/narrative` - Location description
- `location/activity-description/narrative` - Activity at location
- `location/point/pos` - Coordinates (lat lon)
- `location/point/@srsName` - Spatial reference system

✅ **Classification:**
- `location/location-reach/@code` - Activity vs beneficiary site
- `location/exactness/@code` - Coordinate precision level
- `location/location-class/@code` - Type of location
- `location/feature-designation/@code` - Geographic feature type

✅ **Gazetteer References:**
- `location/location-id/@vocabulary` - Vocabulary (G1=GeoNames, G2=OSM, etc.)
- `location/location-id/@code` - Gazetteer entry code

✅ **Administrative Boundaries:**
- `location/administrative/@vocabulary` - Admin vocabulary
- `location/administrative/@level` - Admin level (0-5)
- `location/administrative/@code` - Admin boundary code

## Usage Instructions

### 1. Import IATI XML with Locations

1. Navigate to Activity Editor for any activity
2. Go to "XML Import" tab
3. Upload or paste IATI XML containing `<location>` elements
4. Click "Parse File"
5. Review parsed locations in the "Locations" tab of the comparison view
6. Select locations to import (checkbox)
7. Click "Import Selected Fields"
8. Locations will be saved to the database

### 2. View Imported Locations

Imported locations automatically appear in the Activity Editor's **Locations Tab**:

- **Activity Sites sub-tab**: Shows site locations with coordinates on map
- **Country & Region Allocation sub-tab**: Shows broad coverage areas
- All IATI metadata is preserved and displayed

### 3. IATI Location Codes Reference

**Location Reach:**
- `1` = Activity (where activity happens)
- `2` = Intended Beneficiaries (where beneficiaries are)

**Exactness:**
- `1` = Exact location
- `2` = Approximate location
- `3` = Extrapolated from nearby location

**Location Class:**
- `1` = Administrative Region
- `2` = Populated Place
- `3` = Structure (building)
- `4` = Other Topographical Feature

**Administrative Level:**
- `0` = National
- `1` = First sub-national level (state/region)
- `2` = Second sub-national level (district/township)
- `3-5` = Further sub-divisions

## Testing

### Test File

Created comprehensive test file: `test_iati_with_locations.xml`

Contains 3 test locations:
1. **Site with exact coordinates** - Water well with precise GPS location
2. **Site with approximate coordinates** - Training center with estimated location
3. **Coverage area without coordinates** - Beneficiary coverage region

### Validation

✅ Parser correctly extracts all location elements
✅ Import API saves locations to database with proper types
✅ UI displays locations in comparison view
✅ Locations visible in Locations tab after import
✅ IATI metadata preserved through import cycle
✅ Coordinates properly parsed from "lat lon" format
✅ Location type automatically determined (site vs coverage)

## Technical Details

### Coordinate Parsing

IATI uses `<point><pos>lat lon</pos></point>` format:
```xml
<pos>3.2819 32.8836</pos>
```

Parser splits on space and converts to:
```javascript
latitude: 3.2819
longitude: 32.8836
```

### Location Type Determination

```javascript
const locationType = (latitude && longitude) ? 'site' : 'coverage';
```

- **site**: Has coordinates → shows on map
- **coverage**: No coordinates → administrative/regional only

### Import Strategy

The import does **NOT** delete existing locations (unlike sectors). New locations are **added** to existing ones. This allows:
- Multiple imports from different sources
- Incremental location data addition
- Preservation of manually entered locations

To replace all locations, the API route supports a `replace: true` option (currently set to `false`).

## Files Modified

1. `frontend/src/lib/xml-parser.ts` - Parser logic
2. `frontend/src/app/api/iati/parse/route.ts` - Parse API
3. `frontend/src/app/api/activities/[id]/import-iati/route.ts` - Import API
4. `frontend/src/components/activities/XmlImportTab.tsx` - UI display

## Future Enhancements

Potential improvements:
1. **Bulk location validation** - Validate coordinates against country boundaries
2. **Duplicate detection** - Check for duplicate locations by coordinates or gazetteer ID
3. **Map preview** - Show location pins on map preview before import
4. **Geocoding integration** - Reverse geocode coordinates to populate address fields
5. **Admin boundary lookup** - Auto-populate Myanmar admin boundaries from coordinates
6. **Sensitive location handling** - Option to mark imported locations as sensitive
7. **Percentage allocation** - Support percentage allocation across multiple locations

## Benefits

Users can now:
✅ Import complete location data from IATI XML files
✅ View location coordinates on maps in Activity Editor
✅ Track administrative boundaries and gazetteer references
✅ Maintain IATI compliance for location reporting
✅ Export location data back to IATI XML format
✅ Leverage existing IATI location metadata
✅ Save time vs manual location data entry

## Conclusion

The IATI location import feature is **fully functional** and ready for production use. Users can now import detailed, IATI-compliant location data directly from XML files, significantly improving data quality and reducing manual data entry burden.
