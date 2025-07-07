# Field-Level Autosave Solution for AIMS Activity Editor

## Problem Summary

The AIMS Activity Editor was experiencing several critical issues:

1. **Payload Size Issue**: "Request payload too large" errors when saving entire activity data
2. **Inefficient Autosave**: Sending complete activity state including large arrays (transactions, sectors, contacts)
3. **Default Persistence**: Default values not properly syncing to transaction editor
4. **Poor UX**: No immediate feedback for field-level saves

## Solution Overview

### 1. Field-Level API Endpoint

Created `/api/activities/field` endpoint that handles individual field updates:

```typescript
// Minimal payload structure
{
  activityId: string,
  field: string,        // e.g., 'defaultAidType', 'title', 'description'
  value: any,           // The new field value
  user: { id: string }  // User context for logging
}
```

**Benefits:**
- Dramatically reduced payload size (from ~4MB to ~1KB)
- Faster save operations
- Better error handling per field
- Maintains activity logging

### 2. Field-Level Autosave Hook

Created `useFieldAutosave` hook for individual field management:

```typescript
const { state, triggerFieldSave, saveNow } = useFieldAutosave('defaultAidType', {
  activityId: 'activity-123',
  userId: 'user-456',
  debounceMs: 1000,
  immediate: false
});
```

**Features:**
- Individual field debouncing
- Immediate saves for critical fields (title, status)
- Error handling per field
- Save state tracking

### 3. Default Fields Component

Created `DefaultFieldsAutosave` component that demonstrates the pattern:

```typescript
<DefaultFieldsAutosave
  activityId={activity.id}
  userId={user.id}
  defaults={{
    defaultAidType: activity.defaultAidType,
    defaultFinanceType: activity.defaultFinanceType,
    defaultCurrency: activity.defaultCurrency,
    defaultTiedStatus: activity.defaultTiedStatus,
    defaultFlowType: activity.defaultFlowType
  }}
  onDefaultsChange={(field, value) => {
    // Update local state
    setActivity(prev => ({ ...prev, [field]: value }));
  }}
/>
```

## Implementation Steps

### Step 1: API Endpoint Setup

The field-level API endpoint (`/api/activities/field`) handles:

- **Field Validation**: Ensures only supported fields are updated
- **Type Conversion**: Handles date cleaning, UUID validation
- **Change Logging**: Logs field changes for audit trail
- **Error Handling**: Returns specific error messages

### Step 2: Hook Integration

Replace the existing autosave system with field-level hooks:

```typescript
// OLD: Full activity autosave
const { updateNestedField } = useActivityAutosave(activityData, options);

// NEW: Field-level autosave
const titleAutosave = useTitleAutosave(activityId, userId);
const aidTypeAutosave = useDefaultAidTypeAutosave(activityId, userId);

// Usage in form fields
<Input
  value={title}
  onChange={(e) => {
    setTitle(e.target.value);
    titleAutosave.triggerFieldSave(e.target.value);
  }}
/>
```

### Step 3: Default Persistence

Ensure defaults are properly passed to transaction editor:

```typescript
// In activity editor
const defaults = {
  defaultAidType: activity.defaultAidType,
  defaultFinanceType: activity.defaultFinanceType,
  defaultCurrency: activity.defaultCurrency,
  defaultTiedStatus: activity.defaultTiedStatus,
  defaultFlowType: activity.defaultFlowType
};

// Pass to transaction manager
<TransactionsManager
  activityId={activity.id}
  transactions={transactions}
  onTransactionsChange={setTransactions}
  defaultAidType={defaults.defaultAidType}
  defaultFinanceType={defaults.defaultFinanceType}
  defaultCurrency={defaults.defaultCurrency}
  defaultTiedStatus={defaults.defaultTiedStatus}
  defaultFlowType={defaults.defaultFlowType}
/>
```

## File Structure

```
frontend/src/
├── app/api/activities/field/route.ts          # Field-level API endpoint
├── hooks/use-field-autosave-new.ts            # Field autosave hook
├── components/forms/DefaultFieldsAutosave.tsx # Default fields component
└── docs/field-level-autosave-solution.md      # This documentation
```

## Usage Examples

### Basic Field Autosave

```typescript
import { useTitleAutosave } from '@/hooks/use-field-autosave-new';

function ActivityTitleField({ activityId, userId, title, setTitle }) {
  const titleAutosave = useTitleAutosave(activityId, userId);
  
  return (
    <div>
      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          titleAutosave.triggerFieldSave(e.target.value);
        }}
      />
      {titleAutosave.state.isSaving && <span>Saving...</span>}
      {titleAutosave.state.error && <span>Error: {titleAutosave.state.error.message}</span>}
    </div>
  );
}
```

### Default Fields with Autosave

```typescript
import { DefaultFieldsAutosave } from '@/components/forms/DefaultFieldsAutosave';

function ActivityDefaultsSection({ activity, user, setActivity }) {
  const handleDefaultsChange = (field, value) => {
    setActivity(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <DefaultFieldsAutosave
      activityId={activity.id}
      userId={user.id}
      defaults={{
        defaultAidType: activity.defaultAidType,
        defaultFinanceType: activity.defaultFinanceType,
        defaultCurrency: activity.defaultCurrency,
        defaultTiedStatus: activity.defaultTiedStatus,
        defaultFlowType: activity.defaultFlowType
      }}
      onDefaultsChange={handleDefaultsChange}
    />
  );
}
```

## Benefits

### Performance
- **Payload Size**: Reduced from ~4MB to ~1KB per save
- **Network Efficiency**: Only changed fields are transmitted
- **Response Time**: Faster API responses due to smaller payloads
- **Concurrent Saves**: Multiple fields can save simultaneously

### User Experience
- **Immediate Feedback**: Visual indicators for each field's save status
- **Error Handling**: Field-specific error messages
- **Debouncing**: Prevents excessive API calls
- **Persistence**: Reliable saving of user changes

### Maintainability
- **Modular Design**: Each field manages its own save state
- **Reusable Hooks**: Consistent autosave behavior across components
- **Type Safety**: TypeScript interfaces for all field types
- **Error Recovery**: Automatic retry and error handling

## Migration Guide

### Phase 1: Critical Fields
1. Implement field-level autosave for title and status
2. Test with new API endpoint
3. Verify error handling

### Phase 2: Default Fields
1. Implement autosave for default fields (aid type, flow type, etc.)
2. Update transaction editor to use defaults
3. Test default persistence

### Phase 3: All Fields
1. Implement autosave for remaining fields
2. Remove old full-activity autosave
3. Performance testing and optimization

## Testing

### Unit Tests
- Field autosave hook behavior
- API endpoint field validation
- Error handling scenarios

### Integration Tests
- Field-level saves with activity editor
- Default persistence to transaction editor
- Concurrent field saves

### Performance Tests
- Payload size measurements
- Save operation timing
- Memory usage optimization

## Future Enhancements

1. **Batch Field Updates**: Group multiple field changes into single API call
2. **Offline Support**: Queue field changes when offline
3. **Conflict Resolution**: Handle concurrent field edits
4. **Advanced Debouncing**: Adaptive debounce based on field type
5. **Save History**: Track field change history for undo/redo

## Conclusion

This field-level autosave solution resolves the payload size issues while providing a better user experience. The modular approach makes it easy to implement and maintain, while the performance improvements ensure the application remains responsive even with large activity data. 