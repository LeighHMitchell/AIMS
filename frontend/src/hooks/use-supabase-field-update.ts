import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';

interface FieldUpdateState {
  isUpdating: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

interface UseSupabaseFieldUpdateOptions {
  tableName: string;
  idField?: string;
  onSuccess?: (field: string, value: any) => void;
  onError?: (field: string, error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export function useSupabaseFieldUpdate(
  recordId: string | null,
  options: UseSupabaseFieldUpdateOptions
) {
  const {
    tableName,
    idField = 'id',
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true
  } = options;

  const [state, setState] = useState<FieldUpdateState>({
    isUpdating: false,
    lastUpdated: null,
    error: null
  });

  const updateField = useCallback(async (field: string, value: any) => {
    if (!recordId) {
      const error = new Error('No record ID provided for field update');
      console.error('[SupabaseFieldUpdate] Error:', error.message);
      onError?.(field, error);
      if (showErrorToast) {
        toast.error(`Failed to update ${field}: No record ID`);
      }
      return false;
    }

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      console.log(`[SupabaseFieldUpdate] Updating ${tableName}.${field}:`, {
        recordId,
        field,
        value,
        type: typeof value
      });

      // For activities table, use the API route to handle field mapping
      if (tableName === 'activities') {
        console.log(`[SupabaseFieldUpdate] Using API route for activities table field update`);
        
        const response = await apiFetch('/api/activities/field', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            activityId: recordId,
            field,
            value
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API update failed: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        console.log(`[SupabaseFieldUpdate] API update successful:`, result);
      } else {
        // For other tables, use direct Supabase update
        console.log(`[SupabaseFieldUpdate] Using direct Supabase update for ${tableName}`);
        
        if (!supabase) {
          const error = new Error('Supabase client not available');
          console.error('[SupabaseFieldUpdate] Error:', error.message);
          onError?.(field, error);
          if (showErrorToast) {
            toast.error('Database connection not available');
          }
          return false;
        }

        // Prepare the update object
        const updateData = { [field]: value };

        // Perform the update
        const { data, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq(idField, recordId)
          .select()
          .single();

        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }

        console.log(`[SupabaseFieldUpdate] Successfully updated ${field}:`, data);
      }

      setState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdated: new Date(),
        error: null
      }));

      // Call success callback
      onSuccess?.(field, value);

      if (showSuccessToast) {
        toast.success(`${field} updated successfully`);
      }

      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      console.error(`[SupabaseFieldUpdate] Failed to update ${field}:`, {
        error: err.message,
        recordId,
        field,
        value
      });

      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: err.message
      }));

      // Call error callback
      onError?.(field, err);

      if (showErrorToast) {
        toast.error(`Failed to update ${field}: ${err.message}`);
      }

      return false;
    }
  }, [recordId, tableName, idField, onSuccess, onError, showSuccessToast, showErrorToast]);

  const updateMultipleFields = useCallback(async (updates: Record<string, any>) => {
    if (!recordId) {
      const error = new Error('No record ID provided for field updates');
      console.error('[SupabaseFieldUpdate] Error:', error.message);
      if (showErrorToast) {
        toast.error('Failed to update fields: No record ID');
      }
      return false;
    }

    if (!supabase) {
      const error = new Error('Supabase client not available');
      console.error('[SupabaseFieldUpdate] Error:', error.message);
      if (showErrorToast) {
        toast.error('Database connection not available');
      }
      return false;
    }

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      console.log(`[SupabaseFieldUpdate] Updating multiple fields in ${tableName}:`, {
        recordId,
        updates,
        fieldsCount: Object.keys(updates).length
      });

      // Perform the batch update
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(idField, recordId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database batch update failed: ${error.message}`);
      }

      console.log(`[SupabaseFieldUpdate] Successfully updated multiple fields:`, data);

      setState(prev => ({
        ...prev,
        isUpdating: false,
        lastUpdated: new Date(),
        error: null
      }));

      // Call success callback for each field
      Object.entries(updates).forEach(([field, value]) => {
        onSuccess?.(field, value);
      });

      if (showSuccessToast) {
        toast.success('Fields updated successfully');
      }

      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      console.error(`[SupabaseFieldUpdate] Failed to update multiple fields:`, {
        error: err.message,
        recordId,
        updates
      });

      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: err.message
      }));

      if (showErrorToast) {
        toast.error(`Failed to update fields: ${err.message}`);
      }

      return false;
    }
  }, [recordId, tableName, idField, onSuccess, onError, showSuccessToast, showErrorToast]);

  return {
    updateField,
    updateMultipleFields,
    state
  };
}