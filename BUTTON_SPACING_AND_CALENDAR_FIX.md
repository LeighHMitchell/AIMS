# Button Spacing and Calendar Investigation

## Changes Made

### ✅ Improved Button Spacing

**Before:**
```tsx
<ButtonGroup>
  <Button>Add Month</Button>
  <Button>Add Quarter</Button>
  <Button>Add Half-Year</Button>
  <Button>Add Year</Button>
</ButtonGroup>
```

**After:**
```tsx
<div className="mb-6 flex items-center gap-3">
  <span className="text-sm font-medium text-muted-foreground">Add Period:</span>
  <div className="flex gap-2">
    <Button>Add Month</Button>
    <Button>Add Quarter</Button>
    <Button>Add Half-Year</Button>
    <Button>Add Year</Button>
  </div>
</div>
```

**Improvements:**
- Added "Add Period:" label for clarity
- Changed from ButtonGroup to flex with gap-2 for better spacing
- Increased margin-bottom to mb-6 for better visual separation
- Same improved spacing in empty state

### ✅ Cleaned Up Unused Imports

**Removed:**
- `Popover`, `PopoverContent`, `PopoverTrigger` - Not used in component
- `Calendar` component import (kept Calendar icon from lucide-react)

## Calendar Issue Investigation

### What We Found

**In PlannedDisbursementsTab.tsx:**
- ❌ No Calendar component is being rendered
- ❌ No Popover with calendar is being rendered
- ✅ Only Calendar **icon** (from lucide-react) is used in buttons
- ✅ Date inputs use native browser date picker (type="date")

### Possible Causes of Mysterious Calendar

Based on the description "calendar appears by default, vanishes on hover, reappears when hovering away":

1. **Modal Pre-rendering**
   - The modal might be rendering its date pickers even when closed
   - Check if modal has `display: none` or is unmounted when closed

2. **CSS Z-Index Issue**
   - Date input calendar might be absolutely positioned
   - Hovering over button might trigger a z-index change

3. **Browser Extension**
   - Some date picker extensions add calendars to pages
   - Try disabling extensions to test

4. **Parent Component**
   - Calendar might be coming from a parent wrapper
   - Check EnhancedActivityEditor or other parent components

5. **Another Tab Bleeding Through**
   - If tabs share state, calendar from another tab might be visible
   - Check CSS isolation between tabs

### Recommended Next Steps

1. **Check the Modal Component**
   ```tsx
   // Modal should be conditionally rendered
   {showModal && (
     <Dialog>...</Dialog>
   )}
   // NOT just hidden with CSS
   ```

2. **Inspect Element**
   - Use browser dev tools to inspect the mystery calendar
   - Check where it's coming from in the DOM
   - Look at its CSS classes and positioning

3. **Check Parent Components**
   - Look at the EnhancedActivityEditor
   - Check if there's a calendar in the layout wrapper

4. **Test in Incognito Mode**
   - Disable all extensions
   - See if calendar still appears

## Files Modified

- ✅ `/frontend/src/components/activities/PlannedDisbursementsTab.tsx`
  - Improved button spacing
  - Removed unused imports
  - No linter errors

---

**Status:** Button spacing complete ✅  
**Calendar issue:** Needs further investigation - not in this component

