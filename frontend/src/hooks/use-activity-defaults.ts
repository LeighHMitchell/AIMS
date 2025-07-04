import { useState, useCallback, useEffect } from 'react';
import { useSupabaseFieldUpdate } from './use-supabase-field-update';

interface ActivityDefaults {
  default_aid_type: string | null;
  default_finance_type: string | null;
  default_flow_type: string | null;
  default_currency: string | null;
  default_tied_status: string | null;
}

interface UseActivityDefaultsOptions {
  activityId: string | null;
  initialValues?: Partial<ActivityDefaults>;
  onFieldUpdate?: (field: keyof ActivityDefaults, value: string | null) => void;
  onError?: (field: keyof ActivityDefaults, error: Error) => void;
}

export function useActivityDefaults(options: UseActivityDefaultsOptions) {
  const { activityId, initialValues, onFieldUpdate, onError } = options;

  // Local state for optimistic updates
  const [localValues, setLocalValues] = useState<ActivityDefaults>({
    default_aid_type: initialValues?.default_aid_type || null,
    default_finance_type: initialValues?.default_finance_type || null,
    default_flow_type: initialValues?.default_flow_type || null,
    default_currency: initialValues?.default_currency || null,
    default_tied_status: initialValues?.default_tied_status || null,
  });

  // Update local values when initial values change
  useEffect(() => {
    if (initialValues) {
      setLocalValues(prev => ({
        ...prev,
        ...initialValues
      }));
    }
  }, [initialValues]);

  // Supabase field update hook
  const { updateField, updateMultipleFields, state } = useSupabaseFieldUpdate(
    activityId,
    {
      tableName: 'activities',
      onSuccess: (field, value) => {
        console.log(`[ActivityDefaults] Successfully updated ${field} to:`, value);
        onFieldUpdate?.(field as keyof ActivityDefaults, value);
      },
      onError: (field, error) => {
        console.error(`[ActivityDefaults] Failed to update ${field}:`, error);
        onError?.(field as keyof ActivityDefaults, error);
        
        // Revert optimistic update on error
        setLocalValues(prev => ({
          ...prev,
          [field]: initialValues?.[field as keyof ActivityDefaults] || null
        }));
      },
      showErrorToast: true,
      showSuccessToast: false // We'll handle success feedback in the UI
    }
  );

  // Update a single default field
  const updateDefaultField = useCallback(async (
    field: keyof ActivityDefaults, 
    value: string | null
  ) => {
    console.log(`[ActivityDefaults] Updating ${field} from "${localValues[field]}" to "${value}"`);

    // Optimistic update
    setLocalValues(prev => ({
      ...prev,
      [field]: value
    }));

    // Update in database
    const success = await updateField(field, value);
    
    if (success) {
      console.log(`[ActivityDefaults] Database update successful for ${field}`);
    }

    return success;
  }, [localValues, updateField]);

  // Convenient methods for each field
  const updateDefaultAidType = useCallback(
    (value: string | null) => updateDefaultField('default_aid_type', value),
    [updateDefaultField]
  );

  const updateDefaultFinanceType = useCallback(
    (value: string | null) => updateDefaultField('default_finance_type', value),
    [updateDefaultField]
  );

  const updateDefaultFlowType = useCallback(
    (value: string | null) => updateDefaultField('default_flow_type', value),
    [updateDefaultField]
  );

  const updateDefaultCurrency = useCallback(
    (value: string | null) => updateDefaultField('default_currency', value),
    [updateDefaultField]
  );

  const updateDefaultTiedStatus = useCallback(
    (value: string | null) => updateDefaultField('default_tied_status', value),
    [updateDefaultField]
  );

  // Batch update multiple fields
  const updateMultipleDefaults = useCallback(async (updates: Partial<ActivityDefaults>) => {
    console.log('[ActivityDefaults] Updating multiple defaults:', updates);

    // Optimistic update
    setLocalValues(prev => ({
      ...prev,
      ...updates
    }));

    // Update in database
    const success = await updateMultipleFields(updates);
    
    if (success) {
      console.log('[ActivityDefaults] Batch database update successful');
    }

    return success;
  }, [updateMultipleFields]);

  // Reset to initial values
  const resetToInitial = useCallback(() => {
    setLocalValues({
      default_aid_type: initialValues?.default_aid_type || null,
      default_finance_type: initialValues?.default_finance_type || null,
      default_flow_type: initialValues?.default_flow_type || null,
      default_currency: initialValues?.default_currency || null,
      default_tied_status: initialValues?.default_tied_status || null,
    });
  }, [initialValues]);

  return {
    // Current values (optimistically updated)
    values: localValues,
    
    // Update methods
    updateDefaultField,
    updateDefaultAidType,
    updateDefaultFinanceType,
    updateDefaultFlowType,
    updateDefaultCurrency,
    updateDefaultTiedStatus,
    updateMultipleDefaults,
    
    // Utility methods
    resetToInitial,
    
    // State
    isUpdating: state.isUpdating,
    lastUpdated: state.lastUpdated,
    error: state.error,
    
    // Check if we have unsaved changes
    hasUnsavedChanges: JSON.stringify(localValues) !== JSON.stringify(initialValues || {})
  };
}