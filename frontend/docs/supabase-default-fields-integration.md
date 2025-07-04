# Supabase Default Fields Integration

## Overview

This document describes the comprehensive solution for saving default IATI fields directly to Supabase in the AIMS application. The implementation ensures that default classification fields are immediately saved to the database when changed in the UI, with proper error handling, optimistic updates, and user feedback.

## Problem Statement

Previously, default IATI fields (`default_aid_type`, `default_finance_type`, `default_flow_type`, `default_currency`, `default_tied_status`) were not being saved immediately to the Supabase `activities` table when changed in dropdown components. Users would select values but the changes wouldn't persist to the database.

## Solution Architecture

### 1. Core Hooks

#### `useSupabaseFieldUpdate`
**Location:** `/frontend/src/hooks/use-supabase-field-update.ts`

A reusable hook for updating individual fields or multiple fields in any Supabase table.

**Features:**
- Single field updates with `updateField(field, value)`
- Batch updates with `updateMultipleFields(updates)`
- Automatic error handling and retry logic
- Success/error callbacks
- Toast notifications (configurable)
- Request cancellation for rapid successive updates

**Usage:**
```typescript
const { updateField, updateMultipleFields, state } = useSupabaseFieldUpdate(
  'activity-id',
  {
    tableName: 'activities',
    onSuccess: (field, value) => console.log(`${field} updated to ${value}`),
    onError: (field, error) => console.error(`Failed to update ${field}:`, error),
    showErrorToast: true
  }
);

// Update single field
await updateField('default_currency', 'USD');

// Update multiple fields
await updateMultipleFields({
  default_currency: 'USD',
  default_aid_type: 'C01'
});
```

#### `useActivityDefaults`
**Location:** `/frontend/src/hooks/use-activity-defaults.ts`

Specialized hook for managing activity default fields with optimistic updates.

**Features:**
- Optimistic UI updates (immediate local state changes)
- Individual field update methods (`updateDefaultAidType`, etc.)
- Batch update capability
- Unsaved changes tracking
- Reset to initial values
- Error reversion (reverts optimistic updates on failure)

**Usage:**
```typescript
const {
  values,
  updateDefaultCurrency,
  updateDefaultAidType,
  updateMultipleDefaults,
  isUpdating,
  hasUnsavedChanges
} = useActivityDefaults({
  activityId: 'activity-id',
  initialValues: {
    default_currency: 'MMK',
    default_aid_type: null
  },
  onFieldUpdate: (field, value) => console.log(`${field} saved as ${value}`)
});

// Update individual field
await updateDefaultCurrency('USD');

// Batch update
await updateMultipleDefaults({
  default_currency: 'USD',
  default_aid_type: 'C01'
});
```

### 2. Enhanced Components

#### `SupabaseSelect`
**Location:** `/frontend/src/components/forms/SupabaseSelect.tsx`

A wrapper around the standard Select component that provides direct Supabase integration.

**Features:**
- Automatic database updates on value change
- Visual status indicators (saving, saved, error)
- Optimistic updates with error reversion
- Configurable success/error toasts
- Loading states and disabled states during updates

**Usage:**
```typescript
<SupabaseSelect
  activityId={activityId}
  fieldName="default_currency"
  value={currentValue}
  placeholder="Select Currency"
  showStatus={true}
  enableOptimisticUpdates={true}
  onUpdateSuccess={(field, value) => console.log(`${field} saved`)}
  onUpdateError={(field, error) => console.error(`${field} failed`)}
>
  <SelectContent>
    <SelectItem value="USD">USD - US Dollar</SelectItem>
    <SelectItem value="EUR">EUR - Euro</SelectItem>
  </SelectContent>
</SupabaseSelect>
```

#### `withSupabaseIntegration` HOC
Higher-order component that adds Supabase integration to existing Select components.

**Usage:**
```typescript
const SupabaseAidTypeSelect = withSupabaseIntegration(AidTypeSelect);

<SupabaseAidTypeSelect
  activityId={activityId}
  fieldName="default_aid_type"
  value={value}
  onUpdateSuccess={handleSuccess}
  onUpdateError={handleError}
/>
```

#### `DefaultFieldsSection`
**Location:** `/frontend/src/components/forms/DefaultFieldsSection.tsx`

Comprehensive component that manages all default fields with integrated status display.

**Features:**
- All default fields in one component
- Real-time status indicators
- Error display and recovery
- Debug information panel
- Unsaved changes tracking

### 3. Integration Examples

#### Enhanced Finances Section
**Location:** `/frontend/src/components/activities/EnhancedFinancesSection.tsx`

Demonstrates three approaches to implementing Supabase-integrated default fields:

1. **Comprehensive Component:** Using `DefaultFieldsSection`
2. **Individual Enhanced Components:** Using `withSupabaseIntegration` HOC
3. **Custom Implementation:** Using `SupabaseSelect` directly

## Database Schema

### Updated TypeScript Types
**Location:** `/frontend/src/lib/supabase.ts`

Added missing default field types:
```typescript
activities: {
  Row: {
    // ... existing fields
    default_tied_status: string | null
    default_currency: string | null
    default_aid_type: string | null
    default_finance_type: string | null
    default_flow_type: string | null
  }
}
```

### Required Database Columns
Ensure these columns exist in the `activities` table:
- `default_aid_type` (VARCHAR, nullable)
- `default_finance_type` (VARCHAR, nullable)
- `default_flow_type` (VARCHAR, nullable)
- `default_currency` (VARCHAR, nullable)
- `default_tied_status` (VARCHAR, nullable)

## Implementation Guide

### Step 1: Basic Integration

Replace existing default field selects with Supabase-integrated versions:

**Before:**
```typescript
<AidTypeSelect
  value={general.defaultAidType}
  onValueChange={(value) => {
    setGeneral(g => ({ ...g, defaultAidType: value }));
    triggerAutoSave(); // May not work reliably
  }}
/>
```

**After:**
```typescript
<SupabaseAidTypeSelect
  activityId={activityId}
  fieldName="default_aid_type"
  value={general.defaultAidType}
  onUpdateSuccess={(field, value) => {
    setGeneral(g => ({ ...g, defaultAidType: value }));
  }}
/>
```

### Step 2: Comprehensive Integration

Use the complete `DefaultFieldsSection` component:

```typescript
<DefaultFieldsSection
  activityId={activityId}
  initialValues={{
    default_aid_type: general.defaultAidType,
    default_finance_type: general.defaultFinanceType,
    default_flow_type: general.defaultFlowType,
    default_currency: general.defaultCurrency,
    default_tied_status: general.defaultTiedStatus
  }}
  onFieldUpdate={(field, value) => {
    // Update local state to keep UI in sync
    setGeneral(g => ({ ...g, [field.replace('default_', 'default')]: value }));
  }}
/>
```

### Step 3: Custom Implementation

For maximum control, use the hooks directly:

```typescript
const {
  values,
  updateDefaultCurrency,
  isUpdating,
  error
} = useActivityDefaults({
  activityId,
  initialValues: {
    default_currency: general.defaultCurrency
  }
});

// In your component
<CurrencySelector
  value={values.default_currency}
  onValueChange={updateDefaultCurrency}
  disabled={isUpdating}
/>
```

## Error Handling

### Automatic Error Recovery
- Failed updates automatically revert optimistic changes
- Error messages displayed to users via toasts or inline text
- Retry mechanisms for transient failures

### Error Types Handled
1. **Network Errors:** Connection timeouts, offline scenarios
2. **Database Errors:** Constraint violations, permission issues
3. **Validation Errors:** Invalid field values, type mismatches
4. **Authentication Errors:** Expired sessions, insufficient permissions

### Error Display
```typescript
// Inline error display
{error && (
  <div className="text-sm text-red-600 mt-1">
    Failed to save: {error}
  </div>
)}

// Toast notifications (automatic)
toast.error(`Failed to update ${field}: ${error.message}`);
```

## Testing

### Unit Tests
**Location:** `/frontend/src/__tests__/supabase-field-update.test.tsx`

Tests cover:
- Successful field updates
- Error handling and recovery
- Optimistic updates
- Batch updates
- Missing activity ID scenarios
- Network failure scenarios

### Manual Testing

1. **Basic Functionality:**
   - Open activity editor with existing activity
   - Change default field values
   - Verify immediate database updates
   - Check for success indicators

2. **Error Scenarios:**
   - Disconnect network
   - Change field values
   - Verify error display and local state reversion

3. **Rapid Changes:**
   - Change same field multiple times quickly
   - Verify final value is correctly saved
   - Check for request cancellation

## Performance Considerations

### Request Optimization
- Automatic cancellation of in-flight requests when new changes occur
- Debouncing for rapid successive changes (optional)
- Batch updates for multiple field changes

### UI Performance
- Optimistic updates for immediate feedback
- Minimal re-renders through proper memoization
- Efficient state management with refs and callbacks

## Monitoring and Debugging

### Debug Logging
All components include comprehensive console logging:
```typescript
console.log(`[SupabaseFieldUpdate] Updating ${field}:`, {
  activityId,
  field,
  value,
  timestamp: new Date().toISOString()
});
```

### Status Indicators
- Visual loading states during updates
- Success/error icons with timestamps
- Unsaved changes badges

### Debug Panel
The `DefaultFieldsSection` includes an optional debug panel showing:
- Current field values
- Update statistics
- Error history
- Network request timing

## Security Considerations

### RLS (Row Level Security)
- All updates respect existing Supabase RLS policies
- User authentication checked before database operations
- Activity ownership/permission validation

### Data Validation
- Client-side validation before sending to database
- Server-side validation in Supabase functions
- Type safety through TypeScript interfaces

## Migration Strategy

### Gradual Rollout
1. **Phase 1:** Implement hooks and components
2. **Phase 2:** Replace individual dropdowns
3. **Phase 3:** Add comprehensive sections
4. **Phase 4:** Remove legacy autosave code

### Backward Compatibility
- New components work alongside existing autosave system
- Gradual migration without breaking existing functionality
- Fallback to legacy autosave if Supabase integration fails

## Future Enhancements

### Planned Features
1. **Offline Support:** Queue updates when offline, sync when reconnected
2. **Real-time Sync:** WebSocket integration for multi-user editing
3. **Audit Trail:** Track all field changes with timestamps and user info
4. **Conflict Resolution:** Handle concurrent edits from multiple users
5. **Advanced Validation:** Custom validation rules per field type

### Extension Points
- Custom field update hooks for other tables
- Integration with other database providers
- Advanced caching strategies
- Performance monitoring and analytics