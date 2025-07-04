import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AutosaveState {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  lastError: Error | null;
  saveCount: number;
  errorCount: number;
  hasUnsavedChanges: boolean;
}

interface AutosaveOptions {
  enabled?: boolean;
  intervalMs?: number; // Interval for periodic saves
  debounceMs?: number; // Debounce for change-triggered saves
  maxRetries?: number;
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  requiresTitle?: boolean;
}

export function useComprehensiveAutosave(
  activityData: any,
  user: any,
  options: AutosaveOptions = {}
) {
  const {
    enabled = true,
    intervalMs = 30000, // Save every 30 seconds (reduced from 5)
    debounceMs = 5000, // Wait 5 seconds after last change (increased from 2)
    maxRetries = 3,
    onSaveSuccess,
    onSaveError,
    showSuccessToast = false,
    showErrorToast = true,
    requiresTitle = true
  } = options;

  const [state, setState] = useState<AutosaveState>({
    isAutoSaving: false,
    lastSaved: null,
    lastError: null,
    saveCount: 0,
    errorCount: 0,
    hasUnsavedChanges: false
  });

  // Refs to avoid stale closures
  const activityDataRef = useRef(activityData);
  const userRef = useRef(user);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSavedDataRef = useRef<string>('');

  // Update refs when data changes
  useEffect(() => {
    activityDataRef.current = activityData;
    userRef.current = user;
    
    // Check if data has actually changed
    const currentDataStr = JSON.stringify(activityData);
    if (currentDataStr !== lastSavedDataRef.current) {
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
    }
  }, [activityData, user]);

  // Core save function
  const performSave = useCallback(async (data: any, isManual = false): Promise<boolean> => {
    if (!enabled || (!isManual && state.isAutoSaving)) {
      return false;
    }

    // Check minimum requirements
    if (requiresTitle && !data.general?.title?.trim()) {
      console.log('[ComprehensiveAutosave] Skipping save - no title');
      return false;
    }

    setState(prev => ({ ...prev, isAutoSaving: true, lastError: null }));

    try {
      console.log('[ComprehensiveAutosave] Starting save operation:', {
        timestamp: new Date().toISOString(),
        activityId: data.general?.id,
        isManual,
        retry: retryCountRef.current
      });

      // Build comprehensive payload
      const payload = {
        ...data.general,
        created_by_org_name: data.general?.created_by_org_name || userRef.current?.organisation || userRef.current?.organization?.name || "",
        created_by_org_acronym: data.general?.created_by_org_acronym || "",
        sectors: data.sectors?.map((s: any) => ({
          code: s.code,
          name: s.name,
          percentage: s.percentage,
          categoryCode: s.categoryCode || s.code?.substring(0, 3),
          categoryName: s.categoryName || `Category ${s.code?.substring(0, 3)}`,
          categoryPercentage: s.categoryPercentage || s.percentage,
          type: s.type || 'secondary'
        })) || [],
        transactions: data.transactions || [],
        extendingPartners: data.extendingPartners || [],
        implementingPartners: data.implementingPartners || [],
        governmentPartners: data.governmentPartners || [],
        contacts: data.contacts || [],
        governmentInputs: data.governmentInputs || [],
        contributors: data.contributors || [],
        sdgMappings: data.sdgMappings || [],
        tags: data.tags || [],
        workingGroups: data.workingGroups || [],
        policyMarkers: data.policyMarkers || [],
        locations: {
          specificLocations: data.specificLocations || [],
          coverageAreas: data.coverageAreas || []
        },
        activityScope: data.activityScope,
        user: userRef.current ? {
          id: userRef.current.id,
          name: userRef.current.name,
          role: userRef.current.role,
          organizationId: userRef.current.organizationId
        } : null
      };

      console.log('[ComprehensiveAutosave] Payload prepared:', {
        id: payload.id,
        title: payload.title,
        sectorsCount: payload.sectors.length,
        transactionsCount: payload.transactions.length,
        contactsCount: payload.contacts.length
      });

      // Check payload size to prevent 413 errors
      const payloadString = JSON.stringify(payload);
      const payloadSizeKB = new Blob([payloadString]).size / 1024;
      
      console.log('[ComprehensiveAutosave] Payload size:', {
        sizeKB: payloadSizeKB.toFixed(2),
        sizeMB: (payloadSizeKB / 1024).toFixed(2)
      });

      // Vercel has a 4.5MB limit for function payloads
      // We'll use a conservative 2MB limit to be safe
      if (payloadSizeKB > 2048) {
        console.warn('[ComprehensiveAutosave] Payload too large, reducing size');
        
        // Create a minimal payload with just essential fields
        const minimalPayload = {
          ...data.general,
          created_by_org_name: data.general?.created_by_org_name || userRef.current?.organisation || userRef.current?.organization?.name || "",
          created_by_org_acronym: data.general?.created_by_org_acronym || "",
          // Only include counts for large arrays
          sectorsCount: payload.sectors.length,
          transactionsCount: payload.transactions.length,
          contactsCount: payload.contacts.length,
          // Include empty arrays to prevent errors
          sectors: [],
          transactions: [],
          extendingPartners: [],
          implementingPartners: [],
          governmentPartners: [],
          contacts: [],
          governmentInputs: [],
          contributors: [],
          sdgMappings: [],
          tags: [],
          workingGroups: [],
          policyMarkers: [],
          locations: {
            specificLocations: [],
            coverageAreas: []
          },
          activityScope: data.activityScope,
          user: userRef.current ? {
            id: userRef.current.id,
            name: userRef.current.name,
            role: userRef.current.role,
            organizationId: userRef.current.organizationId
          } : null,
          _isPartialSave: true
        };
        
        console.log('[ComprehensiveAutosave] Using minimal payload for autosave');
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalPayload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseData = await response.json();
        
        // After minimal save, show warning to user
        if (showErrorToast) {
          toast.warning('Autosave: Only basic fields saved due to large data size. Please save manually for complete data.');
        }
        
        onSaveSuccess?.(responseData);
        return true;
      }

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      // Update saved data reference
      lastSavedDataRef.current = JSON.stringify(data);
      retryCountRef.current = 0;

      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        lastSaved: new Date(),
        lastError: null,
        saveCount: prev.saveCount + 1,
        hasUnsavedChanges: false
      }));

      console.log('[ComprehensiveAutosave] Save successful:', {
        timestamp: new Date().toISOString(),
        saveCount: state.saveCount + 1
      });

      if (showSuccessToast && isManual) {
        toast.success('Changes saved successfully');
      }

      onSaveSuccess?.(responseData);
      return true;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown save error');
      
      console.error('[ComprehensiveAutosave] Save failed:', {
        error: err.message,
        retry: retryCountRef.current,
        timestamp: new Date().toISOString()
      });

      setState(prev => ({
        ...prev,
        isAutoSaving: false,
        lastError: err,
        errorCount: prev.errorCount + 1
      }));

      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[ComprehensiveAutosave] Retrying save (attempt ${retryCountRef.current}/${maxRetries})`);
        
        setTimeout(() => {
          performSave(data, isManual);
        }, 1000 * retryCountRef.current); // Exponential backoff
      } else {
        // Max retries reached
        if (showErrorToast) {
          toast.error(`Failed to save changes: ${err.message}`, {
            action: {
              label: 'Retry',
              onClick: () => {
                retryCountRef.current = 0;
                performSave(data, true);
              }
            },
            duration: 10000 // Keep error visible longer
          });
        }
        
        onSaveError?.(err);
      }

      return false;
    }
  }, [enabled, requiresTitle, maxRetries, showSuccessToast, showErrorToast, onSaveSuccess, onSaveError, state.saveCount]);

  // Debounced save trigger
  const triggerSave = useCallback((immediate = false) => {
    if (!enabled) return;

    console.log('[ComprehensiveAutosave] Save triggered:', { immediate });

    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (immediate) {
      performSave(activityDataRef.current, true);
    } else {
      // Set new debounce timeout
      debounceTimeoutRef.current = setTimeout(() => {
        performSave(activityDataRef.current, false);
      }, debounceMs);
    }
  }, [enabled, debounceMs, performSave]);

  // Periodic save interval
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    intervalRef.current = setInterval(() => {
      if (state.hasUnsavedChanges && !state.isAutoSaving) {
        console.log('[ComprehensiveAutosave] Periodic save triggered');
        performSave(activityDataRef.current, false);
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, state.hasUnsavedChanges, state.isAutoSaving, performSave]);

  // Manual save function
  const saveNow = useCallback(() => {
    console.log('[ComprehensiveAutosave] Manual save requested');
    return performSave(activityDataRef.current, true);
  }, [performSave]);

  // Force save on critical data changes
  const forceSave = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    triggerSave(true);
  }, [triggerSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    
    // Actions
    triggerSave,
    saveNow,
    forceSave,
    
    // Utilities
    clearError: useCallback(() => {
      setState(prev => ({ ...prev, lastError: null }));
    }, []),
    
    resetStats: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        saveCount: 0, 
        errorCount: 0,
        lastError: null 
      }));
    }, [])
  };
}