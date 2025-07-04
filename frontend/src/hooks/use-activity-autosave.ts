import { useCallback, useEffect, useRef, useState } from 'react';

interface ActivityAutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  hasUnsavedChanges: boolean;
}

interface UseActivityAutosaveOptions {
  activityId?: string;
  userId?: string;
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useActivityAutosave(
  activityData: any,
  options: UseActivityAutosaveOptions = {}
) {
  const {
    activityId,
    userId,
    enabled = true,
    debounceMs = 2000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<ActivityAutosaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  // Use refs to avoid stale closures
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activityDataRef = useRef(activityData);
  const saveQueueRef = useRef<any[]>([]);

  // Update ref when data changes
  useEffect(() => {
    activityDataRef.current = activityData;
  }, [activityData]);

  // Core save function
  const performSave = useCallback(async (dataToSave: any) => {
    // Don't save if already saving or missing required data
    if (state.isSaving || !dataToSave.title?.trim()) {
      console.log('[ActivityAutosave] Skipping save:', { 
        isSaving: state.isSaving, 
        hasTitle: !!dataToSave.title?.trim() 
      });
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      console.log('[ActivityAutosave] Saving activity:', {
        id: dataToSave.id,
        title: dataToSave.title,
        fields: Object.keys(dataToSave).filter(k => dataToSave[k] !== undefined).length
      });

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dataToSave,
          user: userId ? { id: userId } : undefined
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Save failed: ${errorText}`);
      }

      const responseData = await response.json();
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));

      onSuccess?.(responseData);
      
      console.log('[ActivityAutosave] Save successful');

      // Process any queued saves
      if (saveQueueRef.current.length > 0) {
        const nextData = saveQueueRef.current.pop();
        saveQueueRef.current = [];
        triggerSave(nextData);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[ActivityAutosave] Request aborted');
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('[ActivityAutosave] Save failed:', err);
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err
      }));

      onError?.(err);
    }
  }, [state.isSaving, userId, onSuccess, onError]);

  // Trigger save with debouncing
  const triggerSave = useCallback((newData?: any) => {
    if (!enabled) return;

    const dataToSave = newData || activityDataRef.current;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update state immediately
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // If currently saving, queue this update
    if (state.isSaving) {
      saveQueueRef.current = [dataToSave];
      console.log('[ActivityAutosave] Queued save while another save is in progress');
      return;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave(dataToSave);
    }, debounceMs);
  }, [enabled, debounceMs, performSave, state.isSaving]);

  // Save immediately (bypass debounce)
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(activityDataRef.current);
  }, [performSave]);

  // Field update helper
  const updateField = useCallback((field: string, value: any) => {
    const updatedData = {
      ...activityDataRef.current,
      [field]: value
    };
    
    console.log(`[ActivityAutosave] Field updated: ${field} =`, value);
    
    // Update the ref immediately
    activityDataRef.current = updatedData;
    
    // Trigger autosave
    triggerSave(updatedData);
  }, [triggerSave]);

  // Nested field update helper (e.g., for general.title)
  const updateNestedField = useCallback((path: string, value: any) => {
    const keys = path.split('.');
    const updatedData = { ...activityDataRef.current };
    
    let current = updatedData;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = { ...current[key] };
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    
    console.log(`[ActivityAutosave] Nested field updated: ${path} =`, value);
    
    // Update the ref immediately
    activityDataRef.current = updatedData;
    
    // Trigger autosave
    triggerSave(updatedData);
  }, [triggerSave]);

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
    triggerSave,
    saveNow,
    updateField,
    updateNestedField
  };
}