import { useCallback, useRef, useState, useEffect, useMemo, MutableRefObject } from 'react';
import { setFieldSaved, isFieldSaved, clearFieldSaved } from '@/utils/persistentSave';
import { toast } from 'sonner';
import { invalidateActivityCache } from '@/lib/activity-cache';
import { apiFetch } from '@/lib/api-fetch';

// Utility function to check if HTML content is effectively empty
function isEmptyHtmlContent(content: any): boolean {
  if (!content) return true;
  if (typeof content !== 'string') return false;
  
  // Remove all HTML tags and check if there's actual text content
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  
  // Also handle common "empty" rich text patterns
  const emptyPatterns = [
    '', // completely empty
    '<p></p>', // empty paragraph
    '<p><br></p>', // paragraph with line break
    '<p> </p>', // paragraph with just space
    '<p><br/></p>', // paragraph with self-closing br
    '<div></div>', // empty div
    '<div><br></div>', // div with line break
  ];
  
  return textOnly === '' || emptyPatterns.includes(content.trim());
}

// Global lock to prevent multiple simultaneous activity creations
const globalActivityCreationLock = {
  isCreating: false,
  pendingRequests: new Map<string, any>()
};

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
  onSuccess?: (data: any, isUserInitiated?: boolean) => void;
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
    // Don't check saved state for NEW activities to prevent false positives
    if (activityId && activityId !== 'NEW' && userId) {
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
  const isUserInitiatedRef = useRef(false);

  // Stable refs for callbacks and data to avoid recreating performFieldSave every render
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const additionalDataRef = useRef(additionalData);
  additionalDataRef.current = additionalData;

  // Re-check localStorage when activityId or userId become available after initial mount
  // This fixes the race condition where the hook mounts before these values are ready
  useEffect(() => {
    if (activityId && activityId !== 'NEW' && userId) {
      const saved = isFieldSaved(activityId, userId, fieldName);
      if (saved && !isPersistentlySaved) {
        setIsPersistentlySaved(true);
      }
    }
  }, [activityId, userId, fieldName, isPersistentlySaved]);

  // Reset persistent saved state when switching to NEW activity
  useEffect(() => {
    if (activityId === 'NEW' && isPersistentlySaved) {
      setIsPersistentlySaved(false);
    }

    // Clear any stale localStorage entries for NEW activities
    if (activityId === 'NEW' && userId) {
      const savedKey = `saved_NEW_${userId}_${fieldName}`;
      if (typeof window !== 'undefined' && localStorage.getItem(savedKey)) {
        localStorage.removeItem(savedKey);
        setIsPersistentlySaved(false);
      }
    }
  }, [activityId, fieldName, isPersistentlySaved, userId]);

  // Enhanced save function with proper queue handling and retry logic
  const performFieldSave = useCallback(async (value: any, isRetry = false) => {
    
    if (!enabled || isSavingRef.current) {
      // If already saving, queue the latest value
      pendingValueRef.current = value;
      return;
    }

    // For new activity creation, use global lock to prevent duplicates
    const isNewActivity = !activityId || activityId === 'NEW';
    const isImageField = fieldName === 'banner' || fieldName === 'icon';
    if (isNewActivity && globalActivityCreationLock.isCreating) {
      globalActivityCreationLock.pendingRequests.set(fieldName, value);
      return;
    }
    

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, isSaving: true, error: null }));

      // Set global lock for new activity creation
      if (isNewActivity) {
        globalActivityCreationLock.isCreating = true;
      }

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();


      let endpoint = '/api/activities/field';
      let requestBody: any = {
        field: fieldName,
        value: value,
        activityId: activityId,
        userId: userId,
        ...additionalDataRef.current
      };

      // Handle activity creation vs update
      if (!activityId || activityId === 'NEW') {
        endpoint = '/api/activities';
        // For new activities, always include title field (required)
        // Map field names to their database equivalents
        const fieldMappings: Record<string, string> = {
          'title': 'title',
          'acronym': 'acronym',
          'description': 'description',
          'descriptionObjectives': 'description_objectives',
          'descriptionTargetGroups': 'description_target_groups',
          'descriptionOther': 'description_other',
          'collaborationType': 'collaborationType',
          'activityScope': 'activityScope',
          'language': 'language',
          'activityStatus': 'activityStatus',
          'publicationStatus': 'publicationStatus',
          'plannedStartDate': 'plannedStartDate',
          'plannedEndDate': 'plannedEndDate',
          'actualStartDate': 'actualStartDate',
          'actualEndDate': 'actualEndDate',
          'otherIdentifier': 'partnerId',
          'iatiIdentifier': 'iatiId',
          'banner': 'banner',
          'bannerPosition': 'banner_position',
          'icon': 'icon',
          'iconScale': 'icon_scale',
          'uuid': 'uuid'
        };
        
        const mappedField = fieldMappings[fieldName] || fieldName;
        
        requestBody = {
          title: fieldName === 'title' ? value : (additionalDataRef.current.title || 'New Activity'),
          [mappedField]: value,
          activityStatus: '1',
          publicationStatus: 'draft',
          submissionStatus: 'draft',
          user: { id: userId },
          ...additionalDataRef.current
        };
      }


      // Note: We no longer cancel all read requests before saves.
      // The lazy loading and request queue priority system should prevent overload.
      // Aggressive cancellation was causing "Fetch is aborted" errors and data corruption.

      // Create a timeout promise that rejects after 60 seconds for image uploads, 10s for new activities, 20s for updates
      const timeoutDuration = isImageField ? 60000 : (isNewActivity ? 10000 : 20000);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutDuration/1000} seconds`));
        }, timeoutDuration);
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


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FieldAutosave] HTTP error details:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
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

      // Clear global lock for new activity creation
      if (isNewActivity) {
        globalActivityCreationLock.isCreating = false;
        globalActivityCreationLock.pendingRequests.clear();
      }

      // Set persistent saved flag
      // For NEW activities, the field that created the activity should also be marked as saved
      if (userId) {
        if (activityId && activityId !== 'NEW') {
          // Regular field save with real activity ID
          setFieldSaved(activityId, userId, fieldName);
          setIsPersistentlySaved(true);
        } else if (isNewActivity && responseData?.id) {
          // NEW activity creation - use the returned activity ID
          setFieldSaved(responseData.id, userId, fieldName);
          setIsPersistentlySaved(true);
        }
      }

      // Reset retry counter on successful save
      retryCountRef.current = 0;
      
      // OPTIMIZATION: Invalidate activity cache when field is updated
      // FIXED: Invalidate immediately to prevent stale data on refresh
      if (activityId && activityId !== 'NEW') {
        invalidateActivityCache(activityId);
      }

      onSuccessRef.current?.(responseData, isUserInitiatedRef.current);

      // Process any pending value that was queued during this save
      // FIXED: Prevent infinite loops by checking if we've already processed this value
      if (pendingValueRef.current !== null && pendingValueRef.current !== value) {
        const pendingValue = pendingValueRef.current;
        pendingValueRef.current = null;
        
        // Additional safety check to prevent infinite recursion
        if (JSON.stringify(pendingValue) !== JSON.stringify(value)) {
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
        // CRITICAL FIX: Reset saving state on abort
        isSavingRef.current = false;
        setState(prev => ({ ...prev, isSaving: false }));
        
        // Clear global lock for new activity creation
        if (isNewActivity) {
          globalActivityCreationLock.isCreating = false;
          globalActivityCreationLock.pendingRequests.clear();
        }
        return;
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[FieldAutosave] Field ${fieldName} save failed:`, err);
      
      isSavingRef.current = false;
      
      // For new activity creation timeouts, don't set error state yet - let polling determine outcome
      const isNewActivityTimeout = isNewActivity && fieldName === 'title' && err.message.includes('timeout');
      
      if (!isNewActivityTimeout) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: err,
          hasUnsavedChanges: true // Mark as unsaved since save failed
        }));
      } else {
        // Keep isSaving state until polling completes
        setState(prev => ({ ...prev, isSaving: true }));
      }

      // Clear global lock for new activity creation on error (except for timeouts with polling)
      if (isNewActivity && !isNewActivityTimeout) {
        globalActivityCreationLock.isCreating = false;
        globalActivityCreationLock.pendingRequests.clear();
      }

      // Handle timeout errors differently for new activity creation and image uploads
      if (err.message.includes('timeout')) {
        if (isImageField) {
          console.error(`[FieldAutosave] Image upload timeout for ${fieldName} - image may be too large`);
          // For image timeouts, show a more specific error message
          setState(prev => ({
            ...prev,
            isSaving: false,
            error: new Error(`Image upload failed - file may be too large. Please try a smaller image.`),
            hasUnsavedChanges: true
          }));
          onErrorRef.current?.(new Error(`Image upload failed - file may be too large. Please try a smaller image.`));
          return;
        }
        console.error(`[FieldAutosave] Save timeout - server may be unresponsive`);
        
        // For new activity creation that times out, try to poll for the created activity
        if (isNewActivity && fieldName === 'title') {
          
          // Don't show error toast yet - let polling determine the outcome
          setTimeout(async () => {
            try {
              // Try to fetch activities to see if one was created with our title
              const response = await apiFetch('/api/activities-simple?limit=5');
              if (response.ok) {
                const data = await response.json();
                
                // Handle both array response and object with data property
                let activities = [];
                if (Array.isArray(data)) {
                  activities = data;
                } else if (data && typeof data === 'object') {
                  activities = data.data || data.activities || data.results || [];
                }
                
                
                if (!Array.isArray(activities)) {
                  console.error(`[FieldAutosave] Activities is not an array:`, activities);
                  // Polling failed, show timeout error
                  isSavingRef.current = false;
                  setState(prev => ({
                    ...prev,
                    isSaving: false,
                    error: new Error('Failed to create activity - please try again'),
                    hasUnsavedChanges: true
                  }));
                  globalActivityCreationLock.isCreating = false;
                  globalActivityCreationLock.pendingRequests.clear();
                  onErrorRef.current?.(new Error('Failed to create activity - please try again'));
                  return;
                }
                
                const createdActivity = activities.find((activity: any) => 
                  activity.title_narrative === value && 
                  Math.abs(new Date(activity.created_at).getTime() - Date.now()) < 5 * 60 * 1000 // Created within last 5 minutes
                );
                
                if (createdActivity) {
                  // Clear the error state and call success
                  isSavingRef.current = false;
                  setState(prev => ({
                    ...prev,
                    isSaving: false,
                    lastSaved: new Date(),
                    hasUnsavedChanges: false,
                    error: null
                  }));
                  
                  globalActivityCreationLock.isCreating = false;
                  // Clear pending requests to prevent duplicate activity creation
                  globalActivityCreationLock.pendingRequests.clear();
                  
                  onSuccessRef.current?.({
                    id: createdActivity.id,
                    uuid: createdActivity.id,
                    ...createdActivity
                  }, isUserInitiatedRef.current);
                  return;
                } else {
                  // No activity found, show timeout error
                  isSavingRef.current = false;
                  setState(prev => ({
                    ...prev,
                    isSaving: false,
                    error: new Error('Failed to create activity - please try again'),
                    hasUnsavedChanges: true
                  }));
                  globalActivityCreationLock.isCreating = false;
                  globalActivityCreationLock.pendingRequests.clear();
                  onErrorRef.current?.(new Error('Failed to create activity - please try again'));
                }
              } else {
                console.error(`[FieldAutosave] Polling request failed with status:`, response.status);
                // Polling failed, show timeout error
                isSavingRef.current = false;
                setState(prev => ({
                  ...prev,
                  isSaving: false,
                  error: new Error('Failed to create activity - please try again'),
                  hasUnsavedChanges: true
                }));
                globalActivityCreationLock.isCreating = false;
                globalActivityCreationLock.pendingRequests.clear();
                onErrorRef.current?.(new Error('Failed to create activity - please try again'));
              }
            } catch (pollError) {
              console.error(`[FieldAutosave] Error polling for created activity:`, pollError);
              // Polling failed, show timeout error
              isSavingRef.current = false;
              setState(prev => ({
                ...prev,
                isSaving: false,
                error: new Error('Failed to create activity - please try again'),
                hasUnsavedChanges: true
              }));
              globalActivityCreationLock.isCreating = false;
              globalActivityCreationLock.pendingRequests.clear();
              onErrorRef.current?.(new Error('Failed to create activity - please try again'));
            }
          }, 2000); // Poll after 2 seconds
          
          // Return early to avoid showing error toast immediately
          return;
        }
      } else if (err.message.includes('fetch')) {
        console.error(`[FieldAutosave] Network error - check connection`);
      }

      // Retry logic - retry up to 2 times for timeout or network errors
      // But skip retry for new activity creation timeouts (they use polling instead)
      if (!isRetry && retryCountRef.current < 2 && 
          (err.message.includes('timeout') || err.message.includes('fetch') || err.message.includes('NetworkError')) &&
          !(isNewActivity && fieldName === 'title' && err.message.includes('timeout'))) {
        retryCountRef.current += 1;
        
        // Wait 2 seconds before retry
        setTimeout(() => {
          performFieldSave(value, true);
        }, 2000);
        return;
      }

      // Reset retry counter on final failure
      retryCountRef.current = 0;
      onErrorRef.current?.(err);
    }
  }, [fieldName, activityId, userId, enabled]);

  // Enhanced trigger function with better handling of rapid typing
  const triggerFieldSave = useCallback((value: any, userInitiated = true) => {
    if (!enabled) {
      return;
    }

    // Skip saving for effectively empty content (like <p></p> from rich text editors)
    if (isEmptyHtmlContent(value)) {
      // Clear any existing saved state for empty content
      if (activityId && activityId !== 'NEW' && userId) {
        clearFieldSaved(activityId, userId, fieldName);
      }
      setIsPersistentlySaved(false);
      return;
    }


    // Set the user-initiated flag
    isUserInitiatedRef.current = userInitiated;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If already saving, just queue the value and return
    if (isSavingRef.current) {
      pendingValueRef.current = value;
      return;
    }

    // Update state immediately
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Clear persistent saved flag on edit
    if (activityId && userId) {
      clearFieldSaved(activityId, userId, fieldName);
      setIsPersistentlySaved(false);
    }

    // For new activities, always use debouncing to prevent multiple drafts
    const isNewActivity = !activityId || activityId === 'NEW';
    const shouldDebounce = !immediate || isNewActivity;
    
    
    if (shouldDebounce) {
      const debounceTime = isNewActivity ? Math.max(debounceMs, 2000) : debounceMs; // Increased to 2s for new activities
      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        performFieldSave(value);
      }, debounceTime);
    } else {
      // For existing activities with immediate flag, handle rapid typing properly
      if (isSavingRef.current) {
        // If already saving, queue the latest value
        pendingValueRef.current = value;
      } else {
        // Save immediately
        performFieldSave(value);
      }
    }
  }, [enabled, immediate, debounceMs, performFieldSave, activityId, userId, fieldName]);

  // Save immediately (bypass debounce)
  const saveNow = useCallback(async (value: any, userInitiated = true) => {
    
    // Set the user-initiated flag
    isUserInitiatedRef.current = userInitiated;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    await performFieldSave(value);
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

  return useMemo(() => ({
    state: mergedState,
    triggerFieldSave,
    saveNow
  }), [mergedState, triggerFieldSave, saveNow]);
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
      toast.success('Default Aid Type saved', { position: 'top-center' });
    },
  });
}

export function useDefaultFinanceTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFinanceType', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Finance Type saved', { position: 'top-center' });
    },
  });
}

export function useDefaultCurrencyAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultCurrency', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Currency saved', { position: 'top-center' });
    },
  });
}

export function useDefaultTiedStatusAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultTiedStatus', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Tied Status saved', { position: 'top-center' });
    },
  });
}

export function useDefaultFlowTypeAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultFlowType', { 
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Flow Type saved', { position: 'top-center' });
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

export function useDefaultModalityAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultModality', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Modality saved', { position: 'top-center' });
    },
  });
}

export function useDefaultModalityOverrideAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultModalityOverride', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Modality Override saved', { position: 'top-center' });
    },
  });
}

export function useDefaultAidModalityAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidModality', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Aid Modality saved', { position: 'top-center' });
    },
  });
}

export function useDefaultAidModalityAutosaveSilent(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidModality', {
    activityId,
    userId,
    debounceMs: 1000,
    // No onSuccess callback = no toast notification
  });
}

export function useDefaultAidModalityOverrideAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultAidModalityOverride', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Aid Modality Override saved', { position: 'top-center' });
    },
  });
}

export function useDefaultDisbursementChannelAutosave(activityId?: string, userId?: string) {
  return useFieldAutosave('defaultDisbursementChannel', {
    activityId,
    userId,
    debounceMs: 1000,
    onSuccess: () => {
      toast.success('Default Disbursement Channel saved', { position: 'top-center' });
    },
  });
}

// useFieldAutosave is already exported in the function declaration above 