import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { setFieldSaved, isFieldSaved, clearFieldSaved } from '@/utils/persistentSave';
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
  const retryCountRef = useRef(0);

  // Enhanced save function with proper queue handling and retry logic
  const performFieldSave = useCallback(async (value: any, isRetry = false) => {
    console.log(`[FieldAutosave] performFieldSave called for field ${fieldName}`);
    console.log(`[FieldAutosave] performFieldSave - value:`, value);
    console.log(`[FieldAutosave] performFieldSave - isRetry: ${isRetry}`);
    console.log(`[FieldAutosave] performFieldSave - enabled: ${enabled}`);
    console.log(`[FieldAutosave] performFieldSave - isSavingRef.current: ${isSavingRef.current}`);
    console.log(`[FieldAutosave] performFieldSave - activityId: ${activityId}`);
    console.log(`[FieldAutosave] performFieldSave - userId: ${userId}`);
    
    if (!enabled || isSavingRef.current) {
      console.log(`[FieldAutosave] performFieldSave EARLY RETURN - enabled: ${enabled}, isSaving: ${isSavingRef.current}`);
      // If already saving, queue the latest value
      pendingValueRef.current = value;
      console.log(`[FieldAutosave] performFieldSave - queued value:`, value);
      return;
    }
    
    console.log(`[FieldAutosave] performFieldSave - proceeding with save for ${fieldName}`);

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

      console.log(`[FieldAutosave] Making request to ${endpoint}`);
      console.log('[FieldAutosave] Request body:', JSON.stringify(requestBody, null, 2));
      
      // Create a timeout promise that rejects after 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
      });

      // Race the fetch against the timeout
      const response = await Promise.race([
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal
        }),
        timeoutPromise
      ]) as Response;

      console.log(`[FieldAutosave] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FieldAutosave] HTTP error details:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('[FieldAutosave] Response data:', responseData);
      
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

      // Reset retry counter on successful save
      retryCountRef.current = 0;
      
      onSuccess?.(responseData);
      console.log(`[FieldAutosave] Field ${fieldName} saved successfully`);

      // Process any pending value that was queued during this save
      // FIXED: Prevent infinite loops by checking if we've already processed this value
      if (pendingValueRef.current !== null && pendingValueRef.current !== value) {
        const pendingValue = pendingValueRef.current;
        pendingValueRef.current = null;
        
        // Additional safety check to prevent infinite recursion
        if (JSON.stringify(pendingValue) !== JSON.stringify(value)) {
          console.log(`[FieldAutosave] Processing pending value for ${fieldName}`);
          // Use setTimeout to avoid immediate recursion and give time for state updates
          setTimeout(() => {
            // Double-check the value hasn't changed again
            if (pendingValueRef.current === null) {
              performFieldSave(pendingValue);
            }
          }, 200);
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`[FieldAutosave] Request for ${fieldName} aborted`);
        // CRITICAL FIX: Reset saving state on abort
        isSavingRef.current = false;
        setState(prev => ({ ...prev, isSaving: false }));
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[FieldAutosave] Field ${fieldName} save failed:`, err);
      
      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err,
        hasUnsavedChanges: true // Mark as unsaved since save failed
      }));

      // Show user-friendly error message
      if (err.message.includes('timeout')) {
        console.error(`[FieldAutosave] Save timeout - server may be unresponsive`);
      } else if (err.message.includes('fetch')) {
        console.error(`[FieldAutosave] Network error - check connection`);
      }

      // Retry logic - retry up to 2 times for timeout or network errors
      if (!isRetry && retryCountRef.current < 2 && 
          (err.message.includes('timeout') || err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        retryCountRef.current += 1;
        console.log(`[FieldAutosave] Retrying save attempt ${retryCountRef.current}/2 for ${fieldName}`);
        
        // Wait 2 seconds before retry
        setTimeout(() => {
          performFieldSave(value, true);
        }, 2000);
        return;
      }

      // Reset retry counter on final failure
      retryCountRef.current = 0;
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
    console.log(`[FieldAutosave] saveNow called for field ${fieldName} with value:`, value);
    console.log(`[FieldAutosave] saveNow - enabled: ${enabled}, activityId: ${activityId}, userId: ${userId}`);
    console.log(`[FieldAutosave] saveNow - isSavingRef.current: ${isSavingRef.current}`);
    
    if (timeoutRef.current) {
      console.log(`[FieldAutosave] saveNow - clearing existing timeout for ${fieldName}`);
      clearTimeout(timeoutRef.current);
    }
    
    console.log(`[FieldAutosave] saveNow - about to call performFieldSave for ${fieldName}`);
    await performFieldSave(value);
    console.log(`[FieldAutosave] saveNow - performFieldSave completed for ${fieldName}`);
  }, [performFieldSave, fieldName, enabled, activityId, userId]);

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
    debounceMs: 1000, // Save quickly for defaults
    onSuccess: () => {
      toast.success('Default Aid Type saved', { position: 'top-right' });
    },
  });
}

export function useDefaultFinanceTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFinanceType', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Finance Type saved', { position: 'top-right' });
    },
  });
}

export function useDefaultCurrencyAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultCurrency', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Currency saved', { position: 'top-right' });
    },
  });
}

export function useDefaultTiedStatusAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultTiedStatus', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Tied Status saved', { position: 'top-right' });
    },
  });
}

export function useDefaultFlowTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFlowType', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Flow Type saved', { position: 'top-right' });
    },
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
  console.log(`[useSectorsAutosave] Hook called with activityId: ${activityId}, userId: ${userId}`);
  const result = useFieldAutosave('sectors', { 
    activityId,
    userId,
    debounceMs: 2000 // Longer debounce for complex array operations
  });
  console.log(`[useSectorsAutosave] Hook result:`, result);
  return result;
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

export function useDefaultModalityAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultModality', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Modality saved', { position: 'top-right' });
    },
  });
}

export function useDefaultModalityOverrideAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultModalityOverride', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Modality Override saved', { position: 'top-right' });
    },
  });
}

export function useDefaultAidModalityAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidModality', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Aid Modality saved', { position: 'top-right' });
    },
  });
}

export function useDefaultAidModalityOverrideAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidModalityOverride', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Aid Modality Override saved', { position: 'top-right' });
    },
  });
}

// useFieldAutosave is already exported in the function declaration above 