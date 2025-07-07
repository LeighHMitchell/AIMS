/**
 * Field-level autosave hook that triggers saves on specific field changes
 * This ensures every user interaction triggers autosave
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useAutosaveContext } from '@/components/forms/AutosaveFormWrapper';
import { autosaveDebugger } from '@/utils/autosave-debugger';
import { toast } from 'sonner';

interface FieldAutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  hasUnsavedChanges: boolean;
}

interface UseFieldAutosaveOptions {
  activityId?: string;
  userId?: string;
  enabled?: boolean;
  debounceMs?: number;
  immediate?: boolean; // For critical fields like title
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useFieldAutosave(
  fieldName: string,
  options: UseFieldAutosaveOptions = {}
) {
  const {
    activityId,
    userId,
    enabled = true,
    debounceMs = 2000,
    immediate = false,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<FieldAutosaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);

  // Field-level save function
  const performFieldSave = useCallback(async (value: any) => {
    if (!enabled || !activityId) {
      console.log(`[FieldAutosave] Skipping save for ${fieldName} - not enabled or no activity ID`);
      return;
    }

    if (isSavingRef.current) {
      console.log(`[FieldAutosave] Already saving ${fieldName}, skipping`);
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isSavingRef.current = true;
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      console.log(`[FieldAutosave] Saving field ${fieldName}:`, value);

      // Create minimal payload for field-level update
      const payload = {
        activityId,
        field: fieldName,
        value,
        user: userId ? { id: userId } : undefined
      };

      const response = await fetch('/api/activities/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Field save failed: ${errorText}`);
      }

      const responseData = await response.json();
      
      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));

      onSuccess?.(responseData);
      console.log(`[FieldAutosave] Field ${fieldName} saved successfully`);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`[FieldAutosave] Request for ${fieldName} aborted`);
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[FieldAutosave] Field ${fieldName} save failed:`, err);
      
      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err
      }));

      onError?.(err);
    }
  }, [fieldName, activityId, userId, enabled, onSuccess, onError]);

  // Trigger field save with debouncing
  const triggerFieldSave = useCallback((value: any) => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update state immediately
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    if (immediate) {
      // For critical fields, save immediately
      performFieldSave(value);
    } else {
      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        performFieldSave(value);
      }, debounceMs);
    }
  }, [enabled, immediate, debounceMs, performFieldSave]);

  // Save immediately (bypass debounce)
  const saveNow = useCallback(async (value: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performFieldSave(value);
  }, [performFieldSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    triggerFieldSave,
    saveNow
  };
}

// Higher-order component to wrap form fields with autosave
export function withFieldAutosave<T extends { onChange?: (value: any) => void }>(
  Component: React.ComponentType<T>,
  fieldName: string,
  options: Omit<UseFieldAutosaveOptions, 'fieldName'> = {}
) {
  const WrappedComponent = function(props: T) {
    const { triggerFieldSave } = useFieldAutosave(fieldName, options);
    
    // Wrap the onChange handler
    const originalOnChange = props.onChange;
    const wrappedOnChange = useCallback((value: any) => {
      // Call original onChange first
      if (originalOnChange) {
        originalOnChange(value);
      }
      
      // Then trigger autosave
      triggerFieldSave(value);
    }, [originalOnChange, triggerFieldSave]);

    return React.createElement(Component, { ...props, onChange: wrappedOnChange });
  };
  
  WrappedComponent.displayName = `withFieldAutosave(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specific hooks for different types of fields
export function useTextFieldAutosave(fieldName: string, immediate = false) {
  return useFieldAutosave(fieldName, { immediate });
}

export function useSelectFieldAutosave(fieldName: string, immediate = true) {
  return useFieldAutosave(fieldName, { immediate }); // Selects are usually immediate
}

export function useArrayFieldAutosave(fieldName: string, immediate = true) {
  return useFieldAutosave(fieldName, { immediate }); // Array changes are immediate
}

// Custom hooks for specific Activity Editor fields
export function useTitleAutosave() {
  return useFieldAutosave('title', { 
    immediate: true // Title changes should save immediately
  });
}

export function useDescriptionAutosave() {
  return useFieldAutosave('description', { 
    debounceMs: 3000 // Longer debounce for rich text
  });
}

export function useStatusAutosave() {
  return useFieldAutosave('activityStatus', { 
    immediate: true // Status changes should save immediately
  });
}

export function useSectorAutosave() {
  return useFieldAutosave('sectors', { 
    immediate: true // Sector changes should save immediately
  });
}

export function useTransactionAutosave() {
  return useFieldAutosave('transactions', { 
    immediate: true // Transaction changes should save immediately
  });
}

export function useDefaultAidTypeAutosave() {
  return useFieldAutosave('defaultAidType', { 
    debounceMs: 1000 // Save quickly for defaults
  });
}

export function useDefaultFinanceTypeAutosave() {
  return useFieldAutosave('defaultFinanceType', { 
    debounceMs: 1000
  });
}

export function useDefaultCurrencyAutosave() {
  return useFieldAutosave('defaultCurrency', { 
    debounceMs: 1000
  });
}

export function useDefaultTiedStatusAutosave() {
  return useFieldAutosave('defaultTiedStatus', { 
    debounceMs: 1000
  });
}

export function useDefaultFlowTypeAutosave() {
  return useFieldAutosave('defaultFlowType', { 
    debounceMs: 1000
  });
}

export function useDateFieldAutosave(fieldName: string) {
  return useFieldAutosave(fieldName, { 
    debounceMs: 2000
  });
}