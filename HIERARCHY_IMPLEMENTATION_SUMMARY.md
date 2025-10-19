# Activity Hierarchy Implementation Summary

## Overview
Successfully implemented the IATI `@hierarchy` attribute feature for the AIMS system. The hierarchy field allows users to specify the organizational level of an activity within a project structure (Level 1 = top-level program, higher levels = sub-components).

## Changes Made

### 1. New Component Created
**File**: `frontend/src/components/forms/HierarchySelect.tsx`
- Created a searchable dropdown component matching the style of `CollaborationTypeSelect`
- Includes 5 hierarchy levels with descriptions:
  - Level 1: Top-level Program/Strategy
  - Level 2: Sub-program/Country Project
  - Level 3: Specific Implementation/Project
  - Level 4: Sub-component/Activity
  - Level 5: Task/Output Level
- Features:
  - Searchable dropdown with Command UI
  - Clear selection button
  - Hover tooltips with descriptions
  - Consistent styling with other form selects

### 2. Activity Editor Form Updated
**File**: `frontend/src/app/activities/new/page.tsx`

**Changes:**
- Added `HierarchySelect` import
- Added `hierarchy: 1` to default form state initialization (line 1955)
- Added `hierarchy: 1` to form reset state (line 2366)
- Created `hierarchyAutosave` hook for auto-saving (line 247)
- Added hierarchy field to the General tab UI (line 1321-1364)
  - Placed next to Activity Scope field
  - Includes help tooltip explaining the feature
  - Includes auto-save indicator
  - Respects field lock status

### 3. API Route Updated
**File**: `frontend/src/app/api/activities/field/route.ts`

**Changes:**
- Added `hierarchy` case to field update switch statement (line 643-647)
- Maps `hierarchy` form field to `hierarchy` database column
- Enables auto-save functionality for hierarchy changes

### 4. XML Parser Updated
**File**: `frontend/src/lib/xml-parser.ts`

**Changes:**
- Added `hierarchy?: number` to `ParsedActivity` interface (line 48)
- Added parsing logic to extract `@hierarchy` attribute from `<iati-activity>` element (line 539-543)
- Converts string attribute to integer for database storage

## IATI Compliance

The implementation follows IATI XML standards:

```xml
<!-- Example IATI XML -->
<iati-activity hierarchy="2">
  <iati-identifier>GB-GOV-1-12345-KE</iati-identifier>
  <title>Kenya Education Infrastructure Project</title>
  <!-- ... -->
</iati-activity>
```

**Hierarchy Attribute Values:**
- `1` = Top-level activity (programs/strategies)
- `2` = Country/regional projects
- `3` = Specific implementations
- `4` = Sub-components
- `5` = Task-level activities

## User Experience

### Form Behavior
- **Default Value**: Level 1 (top-level program)
- **Location**: General tab, next to Activity Scope
- **Auto-save**: Changes save automatically when user is editing an existing activity
- **Validation**: Integer values 1-5 only
- **Accessibility**: Keyboard navigation, screen reader friendly

### UI Features
- Searchable dropdown (can type to filter)
- Visual indicators (Level badge + name)
- Contextual descriptions for each level
- Clear selection button
- Consistent styling with other IATI fields

## Database

**Column**: `hierarchy` (already exists in `activities` table)
- Type: `INTEGER`
- Default: `1`
- Not Nullable (defaults to 1)

No migration needed - database column already exists.

## Benefits

1. **IATI Compliance**: Properly captures and stores hierarchy attribute from IATI XML
2. **Project Organization**: Helps establish parent-child relationships between activities
3. **Better Reporting**: Enables aggregation and roll-up of data by hierarchy level
4. **Data Quality**: Provides context for activity classification
5. **User-Friendly**: Clear descriptions help users select appropriate level

## Testing Checklist

- [x] Component renders correctly
- [x] Dropdown opens and closes properly
- [x] Search functionality works
- [x] Selection updates form state
- [x] Auto-save triggers correctly
- [x] Field respects lock status
- [x] Default value (1) applies to new activities
- [x] XML parser extracts hierarchy attribute
- [x] API route handles hierarchy updates
- [x] No linter errors

## Future Enhancements

Potential improvements for future consideration:

1. **Hierarchy Tree View**: Display activities in tree structure based on hierarchy
2. **Parent-Child Validation**: Ensure child activities have higher hierarchy than parents
3. **Auto-suggestions**: Suggest hierarchy based on linked activities
4. **Hierarchy Filter**: Add hierarchy filter to activity list/search
5. **Bulk Updates**: Allow bulk hierarchy updates for related activities

## Files Modified

1. ✅ `frontend/src/components/forms/HierarchySelect.tsx` (NEW)
2. ✅ `frontend/src/app/activities/new/page.tsx`
3. ✅ `frontend/src/app/api/activities/field/route.ts`
4. ✅ `frontend/src/lib/xml-parser.ts`

## Status

✅ **COMPLETE** - Feature fully implemented and ready for testing.

---

**Implementation Date**: January 31, 2025
**Issue Reference**: Issue #2 - Hierarchy Attribute Parsing

