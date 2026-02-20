import { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { humanizeFieldName } from '@/lib/utils';

interface WorkingGroupAutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  hasUnsavedChanges: boolean;
}

interface UseWorkingGroupAutosaveOptions {
  workingGroupId?: string;
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  displayName?: string;
}

export function useWorkingGroupAutosave(
  fieldName: string,
  options: UseWorkingGroupAutosaveOptions = {}
) {
  const {
    workingGroupId,
    enabled = true,
    debounceMs = 1500,
    onSuccess,
    onError,
    showToast = false,
    displayName
  } = options;

  const [state, setState] = useState<WorkingGroupAutosaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSavingRef = useRef(false);
  const pendingValueRef = useRef<any>(null);
  const lastSavedValueRef = useRef<any>(null);

  const performSave = useCallback(async (value: any) => {
    if (!enabled || !workingGroupId || isSavingRef.current) {
      if (isSavingRef.current) {
        pendingValueRef.current = value;
      }
      return;
    }

    if (JSON.stringify(value) === JSON.stringify(lastSavedValueRef.current)) {
      return;
    }

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, isSaving: true, error: null }));

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const updatePayload: Record<string, any> = {
        [fieldName]: value
      };

      const response = await fetch(`/api/working-groups/${workingGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save: ${errorText}`);
      }

      const responseData = await response.json();

      isSavingRef.current = false;
      lastSavedValueRef.current = value;

      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));

      if (showToast) {
        toast.success(`${displayName || humanizeFieldName(fieldName)} saved`);
      }

      onSuccess?.(responseData);

      if (pendingValueRef.current !== null &&
          JSON.stringify(pendingValueRef.current) !== JSON.stringify(value)) {
        const pending = pendingValueRef.current;
        pendingValueRef.current = null;
        setTimeout(() => performSave(pending), 100);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        isSavingRef.current = false;
        setState(prev => ({ ...prev, isSaving: false }));
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[WGAutosave] Field ${fieldName} save failed:`, err);

      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err,
        hasUnsavedChanges: true
      }));

      onError?.(err);
    }
  }, [fieldName, workingGroupId, enabled, onSuccess, onError, showToast, displayName]);

  const triggerSave = useCallback((value: any) => {
    if (!enabled || !workingGroupId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    if (isSavingRef.current) {
      pendingValueRef.current = value;
      return;
    }

    timeoutRef.current = setTimeout(() => {
      performSave(value);
    }, debounceMs);
  }, [enabled, workingGroupId, debounceMs, performSave]);

  const saveNow = useCallback(async (value: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(value);
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return { state, triggerSave, saveNow };
}
