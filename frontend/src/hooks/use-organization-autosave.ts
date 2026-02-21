import { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { humanizeFieldName } from '@/lib/utils';

interface OrganizationAutosaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  hasUnsavedChanges: boolean;
}

interface UseOrganizationAutosaveOptions {
  organizationId?: string;
  enabled?: boolean;
  debounceMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  displayName?: string;
}

export function useOrganizationAutosave(
  fieldName: string,
  options: UseOrganizationAutosaveOptions = {}
) {
  const {
    organizationId,
    enabled = true,
    debounceMs = 1500,
    onSuccess,
    onError,
    showToast = false,
    displayName
  } = options;

  const [state, setState] = useState<OrganizationAutosaveState>({
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

  // For existing organizations, mark fields as already persisted so green ticks
  // appear on load for fields that have data (instead of only after an in-session save)
  useEffect(() => {
    if (organizationId && enabled) {
      setState(prev => {
        if (!prev.lastSaved) {
          return { ...prev, lastSaved: new Date() };
        }
        return prev;
      });
    }
  }, [organizationId, enabled]);

  // Perform the actual save
  const performSave = useCallback(async (value: any) => {
    if (!enabled || !organizationId || isSavingRef.current) {
      if (isSavingRef.current) {
        pendingValueRef.current = value;
      }
      return;
    }

    // Skip if value hasn't changed from last saved value
    if (JSON.stringify(value) === JSON.stringify(lastSavedValueRef.current)) {
      return;
    }

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, isSaving: true, error: null }));

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Build the update payload - only include the field being updated
      const updatePayload: Record<string, any> = {
        [fieldName]: value
      };

      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

      // Process any pending value
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
      console.error(`[OrgAutosave] Field ${fieldName} save failed:`, err);
      
      isSavingRef.current = false;
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err,
        hasUnsavedChanges: true
      }));

      onError?.(err);
    }
  }, [fieldName, organizationId, enabled, onSuccess, onError, showToast, displayName]);

  // Trigger save with debouncing
  const triggerSave = useCallback((value: any) => {
    if (!enabled || !organizationId) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update state immediately
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // If already saving, queue the value
    if (isSavingRef.current) {
      pendingValueRef.current = value;
      return;
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave(value);
    }, debounceMs);
  }, [enabled, organizationId, debounceMs, performSave]);

  // Save immediately (bypass debounce)
  const saveNow = useCallback(async (value: any) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(value);
  }, [performSave]);

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
    saveNow
  };
}

// Convenience hooks for specific fields
export function useOrgNameAutosave(organizationId?: string) {
  return useOrganizationAutosave('name', { 
    organizationId,
    debounceMs: 1000
  });
}

export function useOrgAcronymAutosave(organizationId?: string) {
  return useOrganizationAutosave('acronym', { 
    organizationId,
    debounceMs: 1000
  });
}

export function useOrgDescriptionAutosave(organizationId?: string) {
  return useOrganizationAutosave('description', { 
    organizationId,
    debounceMs: 2000
  });
}

export function useOrgTypeAutosave(organizationId?: string) {
  return useOrganizationAutosave('organisation_type', { 
    organizationId,
    debounceMs: 500,
    showToast: true
  });
}

export function useOrgCountryAutosave(organizationId?: string) {
  return useOrganizationAutosave('country', { 
    organizationId,
    debounceMs: 500,
    showToast: true
  });
}

export function useOrgWebsiteAutosave(organizationId?: string) {
  return useOrganizationAutosave('website', { 
    organizationId,
    debounceMs: 1500
  });
}

export function useOrgEmailAutosave(organizationId?: string) {
  return useOrganizationAutosave('email', { 
    organizationId,
    debounceMs: 1500
  });
}

export function useOrgPhoneAutosave(organizationId?: string) {
  return useOrganizationAutosave('phone', { 
    organizationId,
    debounceMs: 1500
  });
}

export function useOrgAddressAutosave(organizationId?: string) {
  return useOrganizationAutosave('address', { 
    organizationId,
    debounceMs: 2000
  });
}

export function useOrgIatiIdAutosave(organizationId?: string) {
  return useOrganizationAutosave('iati_org_id', { 
    organizationId,
    debounceMs: 1000
  });
}

export function useOrgDefaultCurrencyAutosave(organizationId?: string) {
  return useOrganizationAutosave('default_currency', { 
    organizationId,
    debounceMs: 500,
    showToast: true
  });
}

export function useOrgDefaultLanguageAutosave(organizationId?: string) {
  return useOrganizationAutosave('default_language', { 
    organizationId,
    debounceMs: 500,
    showToast: true
  });
}

// Social media hooks
export function useOrgTwitterAutosave(organizationId?: string) {
  return useOrganizationAutosave('twitter', { organizationId, debounceMs: 1500 });
}

export function useOrgFacebookAutosave(organizationId?: string) {
  return useOrganizationAutosave('facebook', { organizationId, debounceMs: 1500 });
}

export function useOrgLinkedinAutosave(organizationId?: string) {
  return useOrganizationAutosave('linkedin', { organizationId, debounceMs: 1500 });
}

export function useOrgInstagramAutosave(organizationId?: string) {
  return useOrganizationAutosave('instagram', { organizationId, debounceMs: 1500 });
}

export function useOrgYoutubeAutosave(organizationId?: string) {
  return useOrganizationAutosave('youtube', { organizationId, debounceMs: 1500 });
}

