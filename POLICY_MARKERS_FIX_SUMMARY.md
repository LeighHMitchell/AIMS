# Policy Markers Import Fix - Comprehensive Solution

## Issues Identified and Fixed

### 🔧 **Issue 1: Database Column Mismatch**
**Problem**: The database migration renamed `score` to `significance`, but APIs were still using `score`.

**Files Fixed**:
- `frontend/src/app/api/activities/[id]/policy-markers/route.ts`
- `frontend/src/app/api/activities/field/route.ts`  
- `frontend/src/app/api/activities/route.ts`

**Changes**:
- Updated all database queries to use `significance` column instead of `score`
- Added additional fields (vocabulary, vocabulary_uri, iati_code, is_iati_standard) to SELECT queries
- Fixed data mapping in response transformations

### 🔧 **Issue 2: Incomplete IATI Code Mapping**
**Problem**: XML import only matched on `marker.code` but didn't check `marker.iati_code` field.

**Files Fixed**:
- `frontend/src/components/activities/XmlImportTab.tsx`

**Changes**:
- Enhanced matching logic to check both `marker.code` and `marker.iati_code`
- Added fallback matching for CUSTOM_ prefixed codes
- Improved logging for better debugging

### 🔧 **Issue 3: Custom Marker Type Assignment**
**Problem**: Custom markers (vocabulary="99") were assigned `marker_type: 'other'` instead of `marker_type: 'custom'`.

**Files Fixed**:
- `frontend/src/components/activities/XmlImportTab.tsx`
- `frontend/src/app/api/policy-markers/route.ts`

**Changes**:
- Updated custom marker creation to use `marker_type: 'custom'` for vocabulary="99"
- Enhanced marker creation with proper vocabulary and vocabulary_uri handling
- Added validation for custom marker type in POST API

### 🔧 **Issue 4: Missing vocabulary-uri Support**
**Problem**: XML parser wasn't extracting `vocabulary-uri` attribute.

**Files Fixed**:
- `frontend/src/lib/xml-parser.ts`

**Changes**:
- Added `vocabulary_uri` extraction from XML attributes
- Updated TypeScript interface to include `vocabulary_uri` field
- Enhanced custom marker creation to pass vocabulary_uri to database

### 🔧 **Issue 5: Database Schema Constraints**
**Problem**: Database schema didn't support `marker_type: 'custom'` and column naming inconsistencies.

**Files Created**:
- `frontend/sql/fix_policy_markers_schema.sql`
- `frontend/sql/setup_iati_policy_markers.sql`

**Changes**:
- Updated marker_type constraint to include 'custom'
- Ensured score→significance column migration
- Added proper IATI standard policy markers (codes 1-12)
- Created indexes for better performance

## Test Cases Created

### 📋 **Comprehensive Test XML**
**File**: `test_comprehensive_policy_markers.xml`

**Test Coverage**:
- Standard IATI markers (vocabulary="1", codes 1,2,3,4,9)
- Custom vocabulary markers (vocabulary="99" with and without vocabulary-uri)
- Edge cases (non-standard vocabularies, missing vocabulary attribute)
- All significance levels (0-4)

## Expected Behavior After Fixes

### ✅ **Standard IATI Markers**
- `vocabulary="1" code="2"` → Maps to "Aid to Environment" marker
- `vocabulary="1" code="9"` → Maps to "RMNCH" marker  
- Properly saved with significance levels 0-4
- Displayed in correct tabs based on marker_type

### ✅ **Custom Vocabulary Markers**
- `vocabulary="99" code="A1"` → Creates custom marker with marker_type='custom'
- Saves vocabulary_uri if provided
- Should appear in Custom Policy Markers tab (not Other Cross-Cutting Issues)

### ✅ **Database Consistency**
- All APIs use `significance` column consistently
- Proper IATI code matching via both `code` and `iati_code` fields
- Support for significance range 0-4 (IATI standard)

## Implementation Steps

1. **Apply Database Fixes**:
   ```sql
   \i frontend/sql/fix_policy_markers_schema.sql
   \i frontend/sql/setup_iati_policy_markers.sql
   ```

2. **Deploy Code Changes**: All API and component fixes are complete

3. **Test Import**: Use `test_comprehensive_policy_markers.xml` to verify

## Verification Checklist

- [ ] Standard IATI markers (codes 2, 9) import and display correctly
- [ ] Custom vocabulary markers create new entries with marker_type='custom'  
- [ ] Policy markers appear in Activity Editor after import
- [ ] Re-importing same XML shows current values (not empty)
- [ ] Custom markers appear in appropriate tab sections
- [ ] Significance levels 0-4 are properly handled
- [ ] vocabulary-uri is captured for custom markers

## Files Modified

**Backend APIs**:
- `frontend/src/app/api/activities/[id]/policy-markers/route.ts`
- `frontend/src/app/api/activities/field/route.ts`
- `frontend/src/app/api/activities/route.ts`
- `frontend/src/app/api/policy-markers/route.ts`

**Frontend Components**:
- `frontend/src/components/activities/XmlImportTab.tsx`

**Core Libraries**:
- `frontend/src/lib/xml-parser.ts`

**Database Scripts**:
- `frontend/sql/fix_policy_markers_schema.sql`
- `frontend/sql/setup_iati_policy_markers.sql`

**Test Files**:
- `test_comprehensive_policy_markers.xml`













