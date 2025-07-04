# AIMS Activity Editor Autosave Implementation

## Overview

The AIMS Activity Editor implements a comprehensive autosave system that automatically saves changes to activity data in real-time. This document describes the implementation, best practices, and troubleshooting steps.

## Key Components

### 1. Core Autosave Function

Located in `/frontend/src/app/activities/new/page.tsx`, the `autoSave` function handles:
- **Validation**: Ensures minimum required fields (title) are present
- **Payload Construction**: Builds complete activity payload
- **API Communication**: Makes POST request to `/api/activities`
- **State Management**: Updates local state with response data
- **Error Handling**: Gracefully handles failures with user feedback

### 2. Debounced Trigger

The `triggerAutoSave` function provides:
- **Debouncing**: 2-second delay after last change
- **Stable Reference**: Uses ref to avoid stale closures
- **Timeout Management**: Properly clears and resets timers
- **State Updates**: Marks changes as unsaved immediately

### 3. Select Component Integration

All dropdown components now trigger autosave explicitly:
- **CollaborationTypeSelect**: Triggers autosave on value change
- **ActivityStatusSelect**: Triggers autosave on value change
- **Default Value Selectors**: Already had autosave integration

## Implementation Details

### Fixed Stale Closure Issue

**Problem**: The original `triggerAutoSave` function had a dependency on `autoSave`, causing it to be recreated frequently and breaking the debounce mechanism.

**Solution**: Use a ref to store the latest `autoSave` function:

```typescript
// Store latest autoSave function in ref
const autoSaveRef = useRef(autoSave);
useEffect(() => {
  autoSaveRef.current = autoSave;
}, [autoSave]);

// Stable trigger function with no dependencies
const triggerAutoSave = useCallback(() => {
  // Clear existing timeout
  if (autoSaveTimeoutRef.current) {
    clearTimeout(autoSaveTimeoutRef.current);
  }
  
  // Set new timeout using ref
  autoSaveTimeoutRef.current = setTimeout(() => {
    autoSaveRef.current();
  }, 2000);
  
  setHasUnsavedChanges(true);
}, []); // No dependencies - stable reference
```

### Select Component Pattern

**Before** (inconsistent autosave):
```typescript
<CollaborationTypeSelect
  onValueChange={(value) => {
    setGeneral((g: any) => ({ ...g, collaborationType: value }));
    // No autosave trigger
  }}
/>
```

**After** (consistent autosave):
```typescript
<CollaborationTypeSelect
  onValueChange={(value) => {
    console.log('[AIMS DEBUG] CollaborationType changed from', general.collaborationType, 'to', value);
    setGeneral((g: any) => ({ ...g, collaborationType: value }));
    // Explicitly trigger autosave
    triggerAutoSave();
  }}
/>
```

### Comprehensive Logging

Added detailed logging for debugging:
- **Field Changes**: Log old and new values
- **Save Attempts**: Log payload and success/failure
- **Error Conditions**: Log specific error details
- **Timing**: Log when saves occur

## Best Practices

### 1. Consistent Pattern

All form controls should follow this pattern:
```typescript
const handleFieldChange = (value: any) => {
  console.log(`[AIMS DEBUG] Field changed: ${fieldName} = ${value}`);
  setGeneral((g: any) => ({ ...g, [fieldName]: value }));
  triggerAutoSave();
};
```

### 2. Optimistic Updates

- Update UI state immediately
- Show "Saving..." indicator
- Handle errors gracefully without reverting UI

### 3. Error Handling

- Never interrupt user flow with errors
- Show non-blocking error messages
- Log detailed error information for debugging

### 4. Performance Considerations

- Use debouncing to prevent excessive API calls
- Batch multiple rapid changes
- Cancel in-flight requests when new changes occur

## Testing

### Unit Tests

Located in `/frontend/src/__tests__/autosave.test.tsx`:
- **Field Change Detection**: Verifies select changes trigger autosave
- **Repeated Changes**: Ensures multiple changes to same field work
- **Error Handling**: Tests graceful failure scenarios
- **Debouncing**: Validates rapid changes are properly debounced

### Manual Testing

1. **Basic Functionality**:
   - Enter activity title
   - Change collaboration type
   - Verify autosave indicator shows "Saving..." then "Saved"

2. **Repeated Changes**:
   - Change same field multiple times rapidly
   - Verify only final value is saved
   - Check network tab for single request

3. **Error Scenarios**:
   - Disable network connection
   - Change field values
   - Verify error message appears

## Troubleshooting

### Common Issues

1. **Autosave Not Triggering**:
   - Check if `triggerAutoSave()` is called in `onValueChange`
   - Verify console logs show field changes
   - Ensure minimum required fields are present

2. **Multiple API Calls**:
   - Check if debouncing is working correctly
   - Verify `triggerAutoSave` function is stable
   - Look for dependency array issues in `useCallback`

3. **Stale Values Being Saved**:
   - Ensure state updates happen before autosave
   - Check for closure issues in callbacks
   - Verify ref usage for stable function access

### Debug Steps

1. **Enable Debug Logging**:
   ```typescript
   console.log('[AIMS DEBUG] Field changed:', fieldName, value);
   ```

2. **Monitor Network Tab**:
   - Check API call frequency
   - Verify payload contents
   - Monitor response status

3. **Check State Updates**:
   - Use React DevTools
   - Verify state changes trigger re-renders
   - Check `useEffect` dependencies

## Future Enhancements

1. **Retry Logic**: Implement exponential backoff for failed saves
2. **Offline Support**: Queue changes when offline
3. **Conflict Resolution**: Handle concurrent edits
4. **Real-time Collaboration**: WebSocket integration for live updates

## Hooks and Utilities

### useActivityAutosave Hook

Located in `/frontend/src/hooks/use-activity-autosave.ts`:
- Reusable autosave logic
- Configurable debounce timing
- Built-in error handling
- Optimistic updates

### useDebounce Hook

Located in `/frontend/src/hooks/use-debounce.ts`:
- Generic debounce utility
- Stable function references
- Automatic cleanup

### AutosaveSelect Components

Located in `/frontend/src/components/forms/AutosaveSelect.tsx`:
- Wrapper for consistent autosave behavior
- Enhanced logging
- Error state handling

## Migration Guide

To add autosave to a new select component:

1. **Add explicit trigger**:
   ```typescript
   onValueChange={(value) => {
     console.log('[AIMS DEBUG] FieldName changed to:', value);
     setGeneral((g: any) => ({ ...g, fieldName: value }));
     triggerAutoSave();
   }}
   ```

2. **Test thoroughly**:
   - Verify changes are saved
   - Check for multiple API calls
   - Test rapid changes

3. **Add debug logging**:
   - Log field changes
   - Monitor API responses
   - Track timing

## API Requirements

The autosave system requires:
- **POST /api/activities**: Accept activity data
- **Upsert Logic**: Create new or update existing
- **Error Responses**: Meaningful error messages
- **ID Generation**: Return activity ID for new records