# Activity Editor Save/Publish Behavior Implementation

## Overview
The Activity Editor now implements the desired save/publish behavior with proper UX patterns including loading indicators, toast notifications, and error handling with retry options.

## Button Behaviors

### 1. Save Button ✅
- **Action**: Saves the current activity data via API
- **UI Response**: 
  - Shows loading spinner while saving
  - Displays success toast: "Activity saved"
  - Stays on the current tab (no navigation)
  - Updates all form data with the response from server
- **Error Handling**: Shows error alert with retry button

### 2. Save and Next Button ✅
- **Action**: Saves the current data and moves to next tab
- **UI Response**:
  - Shows loading spinner while saving
  - Displays success toast: "Changes saved"
  - Automatically switches to the next tab in sequence
  - Updates all form data with the response from server
- **Tab Order**: 
  - General → Sectors → Locations → Organisations → Contributors → Contacts → Linked Activities → Finances → Results → MSDP → SDG → Government (if enabled) → Documents → Aid Effectiveness

### 3. Publish Button ✅
- **Action**: Publishes the activity (sets publication status to "published")
- **UI Response**:
  - Shows loading spinner while saving
  - Displays success toast: "Activity published successfully"
  - Stays on the current tab (no navigation)
  - Updates all form data with the response from server
- **Validation**: 
  - Requires activity title
  - Validates sector allocations must total 100% before allowing publish
  - Shows specific error messages if validation fails

## Implementation Details

### Loading States
All buttons show:
- Disabled state while submitting
- Animated spinner icon during save operation
- Proper cursor states (disabled cursor when inactive)

### Error Handling
- Non-blocking error alerts with red styling
- Includes "Retry" button for failed saves
- Clear error messages explaining the issue
- Errors are cleared on successful save

### Toast Notifications
- Success toasts appear in top-right corner
- Auto-dismiss after a few seconds
- Different messages for each action type
- Non-blocking UI (user can continue working)

### State Management
- All form data is updated with server response after save
- Ensures data consistency between frontend and backend
- No page reloads - smooth user experience
- Proper handling of all activity fields including sectors, transactions, contacts, etc.

## Code Structure

### Save Function
```typescript
const saveActivity = useCallback(async ({ publish = false, goToList = false, goToNext = false }) => {
  // Clear previous messages
  setError("");
  setSuccess("");
  
  // Validate required fields
  if (!general.title.trim()) {
    setError("Activity Title is required");
    return;
  }
  
  // Validate sectors before publishing
  if (publish && sectorValidation && !sectorValidation.isValid) {
    setError("Cannot publish: " + sectorValidation.errors.join(", "));
    toast.error("Please fix sector allocation errors before publishing");
    return;
  }
  
  // Show loading state
  setSubmitting(true);
  
  try {
    // Make API call
    // Update state with response
    // Show success toast
    // Handle navigation if needed
  } catch (err) {
    // Show error with retry option
  } finally {
    setSubmitting(false);
  }
});
```

### Button Components
Each button includes:
- Proper disabled states
- Loading spinner component
- Click handlers with appropriate parameters
- Styled with Tailwind CSS for consistency

## User Experience Benefits

1. **No Disorientation**: Users stay on their current tab unless explicitly choosing "Save and Next"
2. **Clear Feedback**: Every action has immediate visual feedback
3. **Error Recovery**: Failed saves can be retried without losing work
4. **Performance**: No page reloads mean faster interactions
5. **Validation**: Prevents publishing invalid data with clear error messages

## Testing Checklist

- [ ] Save button keeps user on current tab
- [ ] Save and Next moves to the next logical tab
- [ ] Publish button keeps user on current tab
- [ ] Loading spinners appear during save operations
- [ ] Success toasts appear after successful saves
- [ ] Error alerts appear with retry option on failures
- [ ] Sector validation prevents publishing with invalid allocations
- [ ] All form data updates correctly after save
- [ ] No page reloads occur during any save operation 