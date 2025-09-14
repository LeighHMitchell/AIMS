# IATI Policy Markers Import Fix - Changelog

## Summary
Fixed critical issues preventing IATI XML policy marker import by correcting UUID foreign key references, implementing proper IATI code mappings, and adding activity-scoped custom marker support.

## Issues Fixed

### 1. UUID/ID Foreign Key Mismatch
- **Problem**: The `activity_policy_markers` table's foreign key incorrectly referenced `policy_markers(id)` (serial integer) instead of `policy_markers(uuid)`
- **Solution**: Updated FK constraint to reference the UUID column correctly
- **Files Changed**:
  - `/frontend/sql/fix_policy_markers_uuid_fk.sql` (new migration)

### 2. Missing IATI Standard Code Mappings
- **Problem**: Database used descriptive codes (e.g., `gender_equality`) while IATI XML uses numeric codes (1-12)
- **Solution**: Populated `iati_code` field for all 12 standard IATI policy markers
- **Files Changed**:
  - `/frontend/sql/fix_policy_markers_uuid_fk.sql` (backfill IATI codes)

### 3. API UUID Handling
- **Problem**: APIs expected and returned integer IDs instead of UUIDs
- **Solution**: Updated all API endpoints to use UUIDs consistently
- **Files Changed**:
  - `/frontend/src/app/api/activities/[id]/policy-markers/route.ts`
  - `/frontend/src/app/api/policy-markers/route.ts`

### 4. Custom Marker Creation (vocabulary="99")
- **Problem**: Custom markers were incorrectly prefixed with `CUSTOM_` and vocabulary handling was broken
- **Solution**: Store custom marker codes exactly as provided in XML, proper vocabulary handling
- **Files Changed**:
  - `/frontend/src/app/api/policy-markers/route.ts`

### 5. XML Import Logic
- **Problem**: Incorrect marker lookup strategy, passing wrong ID types to API
- **Solution**: Implemented proper lookup by vocabulary + code/iati_code, use UUIDs for API calls
- **Files Changed**:
  - `/frontend/src/components/activities/XmlImportTab.tsx`

### 6. Activity-Scoped Custom Markers
- **Problem**: Custom markers were globally visible across all activities
- **Solution**: Implemented activity-scoped marker retrieval and display
- **Files Changed**:
  - `/frontend/src/app/api/policy-markers/route.ts` (GET with activity_id parameter)
  - `/frontend/src/components/PolicyMarkersSectionIATIWithCustom.tsx`

## Database Migration

Run the following migration to fix your database schema:

```bash
# Apply the migration
psql $DATABASE_URL < frontend/sql/fix_policy_markers_uuid_fk.sql
```

### Migration includes:
1. Fixes FK constraint to reference UUID column
2. Adds unique constraint on (activity_id, policy_marker_id)
3. Adds check constraint for significance (0-4)
4. Backfills IATI codes for standard markers
5. Creates indexes for efficient lookups

## API Changes

### `/api/activities/[id]/policy-markers`
- **POST**: Now expects `policy_marker_id` as UUID (not integer)
- **GET**: Returns marker UUID in response
- Added significance validation (0-4)
- Added UUID format validation

### `/api/policy-markers`
- **GET**: Added `?activity_id=` parameter for activity-scoped retrieval
- **POST**: Fixed custom marker creation without forced prefixes
- Returns both standard markers and activity-linked custom markers

## Expected Behavior After Fix

### Standard IATI Markers (vocabulary="1")
- XML codes 1-12 correctly map to database markers via `iati_code`
- Significance values 0-4 are properly validated
- Import creates links in `activity_policy_markers` with correct UUIDs

### Custom Markers (vocabulary="99")
- Created on-demand during import if not found
- Code stored exactly as in XML (e.g., "A1" not "CUSTOM_A1")
- vocabulary_uri properly persisted
- Only visible in the activity they were imported for

### UI Behavior
- Activity Editor shows standard markers globally
- Custom markers only appear for their linked activity
- Proper significance dropdown values
- Delete functionality for custom markers

## Testing

### Test Files Provided
- `/test_policy_markers.xml` - Standard IATI markers test
- `/test_comprehensive_policy_markers.xml` - Mixed standard and custom

### Manual Test Steps
1. Import XML with standard markers (codes 1-12)
2. Verify markers appear in Activity Editor with correct significance
3. Import XML with custom markers (vocabulary="99")
4. Verify custom markers only visible in that activity
5. Test deletion of custom markers

## Rollback Instructions

If needed to rollback:

```sql
-- Restore original FK (pointing to wrong column but if that's what was working)
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT activity_policy_markers_policy_marker_uuid_fkey;

ALTER TABLE activity_policy_markers
  ADD CONSTRAINT activity_policy_markers_policy_marker_id_fkey
  FOREIGN KEY (policy_marker_id)
  REFERENCES public.policy_markers (id);

-- Remove added constraints
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS activity_policy_markers_unique;
ALTER TABLE activity_policy_markers
  DROP CONSTRAINT IF EXISTS chk_apm_significance_range;
```

## Commit Message
```
fix(iati-import): correct UUID FK, add IATI mapping, normalize custom markers, and enforce activity-scoped UI for customs; add significance validation and unique link constraint

- Fix FK to reference policy_markers(uuid) not id
- Backfill iati_code for 12 standard markers
- Update APIs to use UUIDs consistently
- Fix custom marker creation without CUSTOM_ prefix
- Implement activity-scoped custom marker visibility
- Add significance validation (0-4 per IATI spec)
- Add unique constraint for activity-marker pairs
```

## Notes
- The system now correctly handles both IATI standard markers and custom organization-specific markers
- Custom markers are activity-scoped to prevent pollution across activities
- All ID references now use UUIDs for consistency with Supabase best practices
- The fix is backward compatible with existing data (migration handles conversion)