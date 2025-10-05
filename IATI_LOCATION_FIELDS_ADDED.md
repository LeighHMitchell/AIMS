# IATI Location Fields - What Was Added

## Summary

All missing IATI location elements are now fully imported and displayed in the **Advanced IATI Location Fields** tab.

## Fields Added to UI

### 1. Administrative Vocabulary (Enhanced from 2 to 3 fields)
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ Vocabulary          │ Level               │ Code                │
│ [Dropdown]          │ [Dropdown]          │ [Text Input]        │
│ G1, A1, A2, etc.    │ 0-5                 │ 1453782             │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### 2. Location Reference (NEW)
```
┌──────────────────────────────────────────────────────────────┐
│ Location Reference                                      (?)  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ e.g., AF-KAN, KH-PNH                                     │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3. Spatial Reference System (NEW)
```
┌──────────────────────────────────────────────────────────────┐
│ Spatial Reference System                                (?)  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ http://www.opengis.net/def/crs/EPSG/0/4326              │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Complete Field List in Advanced Tab

| # | Field Name | Type | Options/Values |
|---|------------|------|----------------|
| 1 | Location Reach | Dropdown | Activity (1), Beneficiary (2) |
| 2 | Exactness | Dropdown | Exact (1), Approximate (2), Extrapolated (3) |
| 3 | Location ID Vocabulary | Dropdown | GeoNames, OpenStreetMap, GADM, etc. |
| 4 | Location ID Code | Text Input | e.g., 1453782 |
| 5 | **Admin Vocabulary** | **Dropdown** | **G1, A1-A9, etc. (NEW)** |
| 6 | Administrative Level | Dropdown | Country (0) to Fifth Order (5) |
| 7 | Administrative Code | Text Input | e.g., 1453782 |
| 8 | Location Class | Dropdown | Admin Region, Populated Place, Structure, Site, Other |
| 9 | Feature Designation | Grouped Dropdown | ADMF, PPL, BLDG, etc. (by category) |
| 10 | Coordinates | Number Inputs | Latitude / Longitude |
| 11 | Activity Description | Textarea | What happens at this location |
| 12 | Percentage Allocation | Number Input | 0-100% |
| 13 | **Location Reference** | **Text Input** | **e.g., AF-KAN (NEW)** |
| 14 | **Spatial Reference System** | **Text Input** | **Coordinate system (NEW)** |

## XML Example

### Input XML:
```xml
<location ref="AF-KAN">
  <location-reach code="1" />
  <location-id vocabulary="G1" code="1453782" />
  <administrative vocabulary="G1" level="1" code="1453782" />
  <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>31.616944 65.716944</pos>
  </point>
  <exactness code="1"/>
  <location-class code="2"/>
  <feature-designation code="ADMF"/>
</location>
```

### Now Imports:
✅ `ref="AF-KAN"` → Location Reference field  
✅ `<location-reach code="1" />` → Location Reach dropdown  
✅ `vocabulary="G1"` → Location ID Vocabulary dropdown  
✅ `code="1453782"` → Location ID Code input  
✅ `vocabulary="G1"` → **Administrative Vocabulary dropdown (NEW)**  
✅ `level="1"` → Administrative Level dropdown  
✅ `code="1453782"` → Administrative Code input  
✅ `srsName="..."` → **Spatial Reference System input (NEW)**  
✅ `<pos>31.616944 65.716944</pos>` → Latitude/Longitude  
✅ `<exactness code="1"/>` → Exactness dropdown  
✅ `<location-class code="2"/>` → Location Class dropdown  
✅ `<feature-designation code="ADMF"/>` → Feature Designation dropdown  

## Database Changes

### New Column:
```sql
ALTER TABLE activity_locations ADD COLUMN location_ref TEXT;
```

### Complete Schema:
All IATI location fields now have database column support:
- location_ref ✅ NEW
- location_reach ✅
- exactness ✅
- location_class ✅
- feature_designation ✅
- location_id_vocabulary ✅
- location_id_code ✅
- admin_vocabulary ✅
- admin_level ✅
- admin_code ✅
- srs_name ✅
- latitude, longitude ✅
- location_name ✅
- location_description ✅
- activity_location_description ✅

## Migration Required

**Before deployment, run:**
```sql
-- File: frontend/sql/add_location_ref_column.sql
psql -f frontend/sql/add_location_ref_column.sql
```

Or execute in Supabase SQL Editor.

## What This Means

### Before:
❌ Location Reference (`ref`) attribute was ignored  
❌ Administrative Vocabulary was not captured  
❌ Spatial Reference System was not shown  
⚠️ Several IATI fields were parsed but not displayed  

### After:
✅ **100% IATI location compliance**  
✅ All XML elements captured in database  
✅ All fields visible and editable in UI  
✅ Complete metadata for reporting  
✅ Full coordinate system information  

---

**Implementation Date**: October 2, 2025  
**Status**: ✅ Complete and Ready for Deployment

