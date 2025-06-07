import { useEffect, useRef, useState, useCallback } from 'react';
import { AutoSaveState } from '../types/gpedc';

interface UseAutoSaveOptions {
  interval?: number; // Save interval in milliseconds (default: 30000 = 30 seconds)
  debounce?: number; // Debounce time in milliseconds (default: 1000 = 1 second)
  onSave: (data: any) => Promise<void>;
}

export function useAutoSave({
  interval = 30000,
  debounce = 1000,
  onSave
}: UseAutoSaveOptions) {
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasChanges: false
  });

  const dataRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Save function
  const performSave = useCallback(async () => {
    if (!dataRef.current || !autoSaveState.hasChanges) return;

    setAutoSaveState(prev => ({ ...prev, isSaving: true }));
    
    try {
      await onSave(dataRef.current);
      setAutoSaveState({
        isSaving: false,
        lastSaved: new Date(),
        hasChanges: false
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveState(prev => ({ ...prev, isSaving: false }));
    }
  }, [onSave, autoSaveState.hasChanges]);

  // Update data and trigger save
  const updateData = useCallback((newData: any) => {
    dataRef.current = newData;
    setAutoSaveState(prev => ({ ...prev, hasChanges: true }));

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounce);
  }, [debounce, performSave]);

  // Manual save trigger
  const triggerSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    performSave();
  }, [performSave]);

  // Set up interval saves
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (autoSaveState.hasChanges) {
        performSave();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [interval, performSave, autoSaveState.hasChanges]);

  return {
    updateData,
    triggerSave,
    autoSaveState
  };
}