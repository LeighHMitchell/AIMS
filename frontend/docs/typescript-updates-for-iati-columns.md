# TypeScript Updates for IATI Column Name Changes

This document summarizes the TypeScript code updates made to support the new IATI-compliant column names in the activities table.

## Column Name Changes

The following columns were renamed:
- `iati_id` → `iati_identifier`
- `title` → `title_narrative`
- `description` → `description_narrative`
- `tied_status` → `default_tied_status`
- `partner_id` → `other_identifier`

New columns added:
- `reporting_org_id` (foreign key reference)
- `hierarchy` (INTEGER, default 1)
- `linked_data_uri` (TEXT)

## Files Updated

### 1. Type Definitions
**File**: `frontend/src/lib/supabase.ts`
- Updated the `activities` table type definition to use the new column names
- Added new fields to the type interface

### 2. API Routes
**File**: `frontend/src/app/api/activities/route.ts`
- Updated POST endpoint to use new column names in insert/update operations
- Updated GET endpoint to select and return new column names
- Updated response transformation to map database columns to API format
- Added backward compatibility by maintaining the original API field names

### 3. IATI Export
**File**: `frontend/src/lib/iati-export.ts`
- Updated to use new column names with fallback support
- Uses `activity.iati_identifier || activity.iati_id`
- Uses `activity.title_narrative || activity.title`
- Uses `activity.description_narrative || activity.description`

### 4. Activity Logger
**File**: `frontend/src/lib/activity-logger.ts`
- Updated all activity logging functions to use new column names with fallback
- Uses `activity.title_narrative || activity.title` for activity titles

## Backward Compatibility

The updates maintain backward compatibility by:
1. Using fallback patterns (`newColumn || oldColumn`) in critical places
2. Keeping the original API field names in responses
3. Supporting both old and new column names during the transition period

## Testing

A test script was created to verify all database operations work correctly with the new column names:
- SELECT queries with new columns
- INSERT operations
- UPDATE operations
- DELETE operations
- Search functionality

All tests passed successfully, confirming the migration is working correctly.

## Next Steps

Other files that may need updating in the future:
- Component files that directly access activity properties
- Scripts that import/export activity data
- Any direct database queries in other parts of the application

The backward-compatible view `activities_iati_compliant` can be used by parts of the application that haven't been updated yet. 