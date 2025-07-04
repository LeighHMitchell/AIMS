# Activity Editor Auto-Save Implementation

## Overview
The Activity Editor has been enhanced with automatic saving functionality that saves changes in the background without requiring manual save actions from users.

## Date Field Validation

### IATI-Compliant Date Rules
The Activity Editor enforces IATI standard rules for date fields based on the selected activity status:

#### Status-Based Field Availability
- **Pipeline/Identification (Status 1)**: Only planned start and end dates are available
- **Implementation (Status 2)**: Planned dates + actual start date are available (actual end disabled)
- **Finalisation (Status 3)**: All date fields are available
- **Closed (Status 4)**: All date fields are available
- **Cancelled (Status 5)**: All date fields are available
- **Suspended (Status 6)**: All date fields are available

#### Visual Indicators
- Disabled fields are greyed out with `bg-gray-100` background
- Disabled field labels appear in lighter gray text
- Tooltip icons explain why fields are disabled
- Fields automatically enable/disable when status changes

## Auto-Save Behavior

### When Auto-Save Triggers
- **On field changes**: 2 seconds after any text input, dropdown selection, or other field modification
- **On tab navigation**: Immediately when switching between tabs/sections
- **On navigation away**: Warns users if there are unsaved changes when leaving the page

### Required Fields
The following field must be completed before auto-save can occur:
- Activity Title

If the Activity Title is missing, users will see a dialog prompting them to complete it.

## Visual Indicators

### Save Status Display
Located in the top-right corner of the editor:
- **Saving...** - Shows with spinning icon during save operation
- **Saved [time]** - Shows with checkmark after successful save
- **Unsaved changes** - Shows with warning icon when changes are pending

## Changes from Previous Version

### Removed Features
- **Save Draft button** - No longer needed as saving happens automatically
- **Save & Continue button** - No longer needed as changes are auto-saved before navigation

### Retained Features
- **Submit for Validation** - Still available for Tier 2 users
- **Publish Activity** - Still available for users with publish permissions
- **Approve/Reject** - Still available for validation workflow

## Technical Implementation

### Debouncing
Auto-save uses a 2-second debounce to avoid excessive API calls. Changes are batched and saved together.

### Error Handling
If auto-save fails:
- The save status indicator remains in "unsaved" state
- Errors are logged to console
- No user interruption occurs
- Next auto-save attempt will retry

### Performance
- Auto-save runs asynchronously in the background
- Does not block user interactions
- Minimal impact on UI responsiveness 