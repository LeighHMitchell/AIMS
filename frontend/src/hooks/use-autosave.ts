import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './use-debounce';

interface AutosaveOptions {
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface AutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  hasUnsavedChanges: boolean;
}

export function useAutosave<T extends Record<string, any>>(
  data: T,
  options: AutosaveOptions
): {
  save: (newData?: Partial<T>) => Promise<void>;
  state: AutosaveState;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
} {
  const {
    endpoint,
    method = 'PATCH',
    debounceMs = 2000,
    onSuccess,
    onError,
    enabled = true
  } = options;

  const [state, setState] = useState<AutosaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const dataRef = useRef(data);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Core save function
  const performSave = useCallback(async (dataToSave: T) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      console.log('[Autosave] Saving data:', {
        endpoint,
        method,
        fields: Object.keys(dataToSave).filter(key => dataToSave[key] !== undefined)
      });

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      }));

      onSuccess?.(responseData);
      
      console.log('[Autosave] Save successful:', responseData);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Autosave] Request aborted');
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('[Autosave] Save failed:', err);
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err
      }));

      onError?.(err);
    }
  }, [endpoint, method, onSuccess, onError]);

  // Debounced save function
  const debouncedSave = useDebounce(performSave, debounceMs);

  // Public save function
  const save = useCallback(async (newData?: Partial<T>) => {
    if (!enabled) return;

    const dataToSave = newData ? { ...dataRef.current, ...newData } : dataRef.current;
    
    // Update state to show unsaved changes
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
    
    // Trigger debounced save
    debouncedSave(dataToSave);
  }, [enabled, debouncedSave]);

  // Helper to update a single field and trigger save
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    const updatedData = { ...dataRef.current, [field]: value };
    dataRef.current = updatedData;
    
    console.log(`[Autosave] Field updated: ${String(field)} =`, value);
    
    // Trigger save with the updated data
    save(updatedData);
  }, [save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    save,
    state,
    updateField
  };
}