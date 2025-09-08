import { useState, useCallback, useRef, useEffect } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseSaveIndicatorOptions<T> {
  initialHasValue?: boolean;
  saveFn: (value: T) => Promise<void>;
  validateValue?: (value: T) => boolean;
}

interface UseSaveIndicatorResult<T> {
  status: SaveStatus;
  hasValue: boolean;
  error: Error | null;
  onFocusStart: () => void;
  onBlurSave: (value: T) => void;
  saveImmediately: (value: T) => void;
  clearError: () => void;
}

/**
 * Custom hook to manage save indicator states for form fields
 * 
 * @param initialHasValue - Whether the field has an initial non-empty value (e.g., prefilled defaults)
 * @param saveFn - Async function to save the field value
 * @param validateValue - Optional function to validate if the value is non-empty/valid
 * 
 * @returns Object with status, hasValue, and handler functions
 */
export function useSaveIndicator<T = string>(
  options: UseSaveIndicatorOptions<T>
): UseSaveIndicatorResult<T> {
  const { 
    initialHasValue = false, 
    saveFn, 
    validateValue 
  } = options;
  
  // Initialize status based on whether field has initial value
  const [status, setStatus] = useState<SaveStatus>(
    initialHasValue ? 'saved' : 'idle'
  );
  
  const [hasValue, setHasValue] = useState(initialHasValue);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if we're currently saving to prevent duplicate saves
  const isSavingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Default value validator for strings
  const defaultValidateValue = useCallback((value: T): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (value === null || value === undefined) {
      return false;
    }
    // For arrays, check if non-empty
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    // For objects, check if not empty
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    // For other types, consider them valid if truthy
    return Boolean(value);
  }, []);
  
  const isValueValid = validateValue || defaultValidateValue;
  
  /**
   * Called when field receives focus - hides any indicators
   */
  const onFocusStart = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);
  
  /**
   * Called on blur to save the field value
   */
  const onBlurSave = useCallback(async (value: T) => {
    // Skip if already saving
    if (isSavingRef.current) {
      return;
    }
    
    // Abort any pending save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this save
    abortControllerRef.current = new AbortController();
    
    try {
      isSavingRef.current = true;
      setStatus('saving');
      setError(null);
      
      // Perform the save
      await saveFn(value);
      
      // Check if save was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      // Determine if value is non-empty
      const valueIsValid = isValueValid(value);
      setHasValue(valueIsValid);
      
      // Set status to 'saved' to show green tick (if value is valid)
      // The actual display logic is in the component
      setStatus('saved');
      
    } catch (err) {
      // Check if error was due to abort
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      setStatus('error');
      
      // Don't throw - let the UI handle the error display
      console.error('Field save error:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFn, isValueValid]);
  
  /**
   * Save immediately without waiting for blur
   * Used for select fields and other immediate-save scenarios
   */
  const saveImmediately = useCallback(async (value: T) => {
    await onBlurSave(value);
  }, [onBlurSave]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    status,
    hasValue,
    error,
    onFocusStart,
    onBlurSave,
    saveImmediately,
    clearError
  };
}