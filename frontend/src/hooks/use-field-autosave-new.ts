import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { setFieldSaved, isFieldSaved, clearFieldSaved } from '@/utils/persistentSave';

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
  additionalData?: Record<string, any>; // Pre-entered values to include in activity creation
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
    onError,
    additionalData = {}
  } = options;

  // Add persistent saved state
  const [isPersistentlySaved, setIsPersistentlySaved] = useState(() => {
    if (activityId && userId) {
      return isFieldSaved(activityId, userId, fieldName);
    }
    return false;
  });

  const [state, setState] = useState<FieldAutosaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);
  const pendingValueRef = useRef<any>(null);
  const saveQueueRef = useRef<any[]>([]);

  // Enhanced save function with proper queue handling
  const performFieldSave = useCallback(async (value: any) => {
    if (!enabled || isSavingRef.current) {
      // If already saving, queue the latest value
      pendingValueRef.current = value;
      return;
    }

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, isSaving: true, error: null }));

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      console.log(`[FieldAutosave] Saving field ${fieldName} with value:`, value);

      let endpoint = '/api/activities/field';
      let requestBody: any = {
        field: fieldName,
        value: value,
        activityId: activityId,
        userId: userId,
        ...additionalData
      };

      // Handle activity creation vs update
      if (!activityId || activityId === 'NEW') {
        endpoint = '/api/activities';
        requestBody = {
          [fieldName]: value,
          activityStatus: '1',
          publicationStatus: 'draft',
          submissionStatus: 'draft',
          uuid: 'NEW',
          user: { id: userId },
          ...additionalData
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

      // Set persistent saved flag
      if (activityId && userId) {
        setFieldSaved(activityId, userId, fieldName);
        setIsPersistentlySaved(true);
      }

      onSuccess?.(responseData);
      console.log(`[FieldAutosave] Field ${fieldName} saved successfully`);

      // Process any pending value that was queued during this save
      if (pendingValueRef.current !== null && pendingValueRef.current !== value) {
        const pendingValue = pendingValueRef.current;
        pendingValueRef.current = null;
        // Use setTimeout to avoid immediate recursion
        setTimeout(() => performFieldSave(pendingValue), 100);
      }

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
  }, [fieldName, activityId, userId, enabled, onSuccess, onError, additionalData]);

  // Enhanced trigger function with better handling of rapid typing
  const triggerFieldSave = useCallback((value: any) => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update state immediately
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Clear persistent saved flag on edit
    if (activityId && userId) {
      clearFieldSaved(activityId, userId, fieldName);
      setIsPersistentlySaved(false);
    }

    if (immediate) {
      // For critical fields like title, handle rapid typing properly
      if (isSavingRef.current) {
        // If already saving, queue the latest value
        pendingValueRef.current = value;
        console.log(`[FieldAutosave] Queuing value for ${fieldName}:`, value);
      } else {
        // Save immediately
        performFieldSave(value);
      }
    } else {
      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        performFieldSave(value);
      }, debounceMs);
    }
  }, [enabled, immediate, debounceMs, performFieldSave, activityId, userId, fieldName]);

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

  const mergedState = useMemo(() => ({
    ...state,
    isPersistentlySaved
  }), [state, isPersistentlySaved]);

  return {
    state: mergedState,
    triggerFieldSave,
    saveNow
  };
}

// Custom hooks for specific Activity Editor fields
export function useTitleAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('title', { 
    activityId,
    userId,
    immediate: true, // Title changes should save immediately
    debounceMs: 500 // Short debounce for immediate fields to handle rapid typing
  });
}

export function useDescriptionAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('description', { 
    activityId,
    userId,
    debounceMs: 3000 // Longer debounce for rich text
  });
}

export function useStatusAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('activityStatus', { 
    activityId,
    userId,
    immediate: true // Status changes should save immediately
  });
}

export function useDefaultAidTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidType', { 
    activityId,
    userId,
    debounceMs: 1000 // Save quickly for defaults
  });
}

export function useDefaultFinanceTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFinanceType', { 
    activityId,
    userId,
    debounceMs: 1000
  });
}

export function useDefaultCurrencyAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultCurrency', { 
    activityId,
    userId,
    debounceMs: 1000
  });
}

export function useDefaultTiedStatusAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultTiedStatus', { 
    activityId,
    userId,
    debounceMs: 1000
  });
}

export function useDefaultFlowTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFlowType', { 
    activityId,
    userId,
    debounceMs: 1000
  });
}

export function useDateFieldAutosave(fieldName: string, activityId?: string, userId?: string) {
  return useFieldAutosave(fieldName, { 
    activityId,
    userId,
    debounceMs: 2000
  });
}

export function useSectorsAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('sectors', { 
    activityId,
    userId,
    debounceMs: 2000 // Longer debounce for complex array operations
  });
}

export function useLocationsAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('locations', { 
    activityId,
    userId,
    debounceMs: 2000 // Longer debounce for complex location operations
  });
}

export function useExtendingPartnersAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('extendingPartners', { 
    activityId,
    userId,
    debounceMs: 1500 // Medium debounce for partner operations
  });
}

export function useImplementingPartnersAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('implementingPartners', { 
    activityId,
    userId,
    debounceMs: 1500 // Medium debounce for partner operations
  });
}

export function useGovernmentPartnersAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('governmentPartners', { 
    activityId,
    userId,
    debounceMs: 1500 // Medium debounce for partner operations
  });
}

export function useContactsAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('contacts', { 
    activityId,
    userId,
    debounceMs: 1500 // Medium debounce for contact operations
  });
}

// useFieldAutosave is already exported in the function declaration above 