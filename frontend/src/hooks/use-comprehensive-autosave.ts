import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { autosaveDebugger } from '@/utils/autosave-debugger';

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
    intervalMs = 15000, // Save every 15 seconds (much more frequent)
    debounceMs = 3000, // Wait 3 seconds after last change (more responsive)
    maxRetries = 3, // More retries for reliability
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

  // Circuit breaker for repeated failures
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const consecutiveFailuresRef = useRef(0);

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
    // 🔧 DEBUG: Log save attempt
    autosaveDebugger.logStateChange('performSave', { enabled, isAutoSaving: state.isAutoSaving }, { enabled, isAutoSaving: true });
    
    if (!enabled || (!isManual && state.isAutoSaving)) {
      autosaveDebugger.log('info', '🚫 Save skipped', { 
        reason: !enabled ? 'disabled' : 'already_saving',
        enabled, 
        isAutoSaving: state.isAutoSaving,
        isManual 
      });
      return false;
    }

    // Circuit breaker: Stop autosave attempts if too many consecutive failures
    if (!isManual && circuitBreakerOpen && consecutiveFailuresRef.current >= 3) {
      autosaveDebugger.log('warn', '🚫 Circuit breaker active - skipping autosave', {
        consecutiveFailures: consecutiveFailuresRef.current
      });
      return false;
    }

    // 🔧 DEBUG: Validate data before save
    const validation = autosaveDebugger.validateActivityData(data);
    if (!validation.isValid) {
      autosaveDebugger.log('error', '❌ Save blocked by validation errors', validation);
      validation.errors.forEach(error => {
        toast.error(`Save Error: ${error}`);
      });
      return false;
    }

    // Check minimum requirements
    if (requiresTitle && !data.general?.title?.trim()) {
      autosaveDebugger.log('warn', '🚫 Save skipped - no title', { hasGeneral: !!data.general });
      return false;
    }

    setState(prev => ({ ...prev, isAutoSaving: true, lastError: null }));

    try {
      autosaveDebugger.log('info', '🚀 Starting save operation', {
        timestamp: new Date().toISOString(),
        activityId: data.general?.id,
        isManual,
        retry: retryCountRef.current,
        validation
      });

      // Build payload with size-conscious approach
      const isLargeDataset = (
        (data.sectors?.length || 0) > 20 ||
        (data.transactions?.length || 0) > 50 ||
        (data.contacts?.length || 0) > 30 ||
        ((data.extendingPartners?.length || 0) + (data.implementingPartners?.length || 0) + (data.governmentPartners?.length || 0)) > 40
      );

      let payload;
      
      if (isLargeDataset && !isManual) {
        // For autosave with large datasets, start with a reduced payload
        console.log('[ComprehensiveAutosave] Large dataset detected, using reduced autosave payload');
        payload = {
          ...data.general,
          created_by_org_name: data.general?.created_by_org_name || userRef.current?.organisation || userRef.current?.organization?.name || "",
          created_by_org_acronym: data.general?.created_by_org_acronym || "",
          // Include only essential arrays with size limits
          sectors: (data.sectors || []).slice(0, 10), // Limit to first 10 sectors
          transactions: (data.transactions || []).slice(0, 20), // Limit to first 20 transactions
          extendingPartners: (data.extendingPartners || []).slice(0, 10),
          implementingPartners: (data.implementingPartners || []).slice(0, 10),
          governmentPartners: (data.governmentPartners || []).slice(0, 10),
          contacts: (data.contacts || []).slice(0, 15),
          // Skip heavy optional data for autosave
          governmentInputs: [],
          contributors: [],
          sdgMappings: [],
          tags: [],
          workingGroups: [],
          policyMarkers: [],
          locations: {
            specificLocations: (data.specificLocations || []).slice(0, 5),
            coverageAreas: (data.coverageAreas || []).slice(0, 5)
          },
          activityScope: data.activityScope,
          user: userRef.current ? {
            id: userRef.current.id,
            name: userRef.current.name,
            role: userRef.current.role,
            organizationId: userRef.current.organizationId
          } : null,
          _isReducedSave: true
        };
      } else {
        // Full payload for manual saves or small datasets
        payload = {
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
      }

      autosaveDebugger.log('info', '📦 Payload prepared', {
        id: payload.id,
        title: payload.title,
        sectorsCount: payload.sectors.length,
        transactionsCount: payload.transactions.length,
        contactsCount: payload.contacts.length
      });

      // 🔧 DEBUG: Analyze payload size with detailed breakdown
      const payloadAnalysis = autosaveDebugger.analyzePayload(payload);
      const payloadString = JSON.stringify(payload);
      const payloadSizeKB = payloadAnalysis.sizeKB;

      // Use much more conservative limits for autosave
      // Vercel has 4.5MB limit, but we'll use 1MB for autosave to be extra safe
      if (payloadSizeKB > 1024) {
        console.warn('[ComprehensiveAutosave] Payload too large for autosave, using minimal payload');
        
        // Create ultra-minimal payload for autosave - only core activity data
        const minimalPayload = {
          // Only include essential activity fields
          id: data.general?.id,
          title: data.general?.title || '',
          description: data.general?.description ? 
            (data.general.description.length > 500 ? 
              data.general.description.substring(0, 500) + '...' : 
              data.general.description) : '',
          activity_status: data.general?.activity_status || '',
          start_date: data.general?.start_date || null,
          end_date: data.general?.end_date || null,
          collaboration_type: data.general?.collaboration_type || '',
          default_flow_type: data.general?.default_flow_type || '',
          default_finance_type: data.general?.default_finance_type || '',
          default_aid_type: data.general?.default_aid_type || '',
          default_tied_status: data.general?.default_tied_status || '',
          default_currency: data.general?.default_currency || 'USD',
          created_by_org_name: data.general?.created_by_org_name || userRef.current?.organisation || userRef.current?.organization?.name || "",
          created_by_org_acronym: data.general?.created_by_org_acronym || "",
          
          // Include only counts for complex data
          _autosave_metadata: {
            sectorsCount: payload.sectors?.length || 0,
            transactionsCount: payload.transactions?.length || 0,
            contactsCount: payload.contacts?.length || 0,
            partnersCount: (payload.extendingPartners?.length || 0) + 
                          (payload.implementingPartners?.length || 0) + 
                          (payload.governmentPartners?.length || 0),
            timestamp: new Date().toISOString()
          },
          
          // Empty arrays to prevent API errors
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
          
          user: userRef.current ? {
            id: userRef.current.id,
            name: userRef.current.name,
            role: userRef.current.role,
            organizationId: userRef.current.organizationId
          } : null,
          _isPartialSave: true,
          _autosaveOnly: true
        };
        
        // Double-check the minimal payload size
        const minimalPayloadString = JSON.stringify(minimalPayload);
        const minimalSizeKB = new TextEncoder().encode(minimalPayloadString).length / 1024;
        
        console.log('[ComprehensiveAutosave] Minimal payload size:', {
          sizeKB: minimalSizeKB.toFixed(2),
          reduction: `${((payloadSizeKB - minimalSizeKB) / payloadSizeKB * 100).toFixed(1)}%`
        });
        
        // If even the minimal payload is too large, skip autosave
        if (minimalSizeKB > 500) { // 500KB limit for minimal payload
          console.warn('[ComprehensiveAutosave] Even minimal payload too large, skipping autosave');
          if (showErrorToast) {
            toast.warning('Activity too large for autosave. Please save manually.', {
              duration: 5000
            });
          }
          return false;
        }
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: minimalPayloadString
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const responseData = await response.json();
        
        // Show user-friendly message about partial save
        if (showSuccessToast && isManual) {
          toast.success('Core activity data saved. Save manually for complete data.', {
            duration: 3000,
            position: 'top-right'
          });
        } else if (!isManual) {
          // For autosave, show a less intrusive message
          console.log('[ComprehensiveAutosave] Partial autosave completed successfully');
        }
        
        onSaveSuccess?.(responseData);
        return true;
      }

      // 🔧 DEBUG: Log network request
      autosaveDebugger.logNetworkRequest('/api/activities', 'POST', payload);
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        autosaveDebugger.logNetworkRequest('/api/activities', 'POST', payload, response, error);
        throw error;
      }

      const responseData = await response.json();
      autosaveDebugger.logNetworkRequest('/api/activities', 'POST', payload, response);

      // Update saved data reference
      lastSavedDataRef.current = JSON.stringify(data);
      retryCountRef.current = 0;
      
      // Reset circuit breaker on successful save
      consecutiveFailuresRef.current = 0;
      setCircuitBreakerOpen(false);

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
        toast.success('Changes saved successfully', { position: 'top-right' });
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

      // Increment consecutive failures for circuit breaker
      consecutiveFailuresRef.current++;
      
      // Open circuit breaker after 3 consecutive failures
      if (consecutiveFailuresRef.current >= 3) {
        setCircuitBreakerOpen(true);
        console.warn('[ComprehensiveAutosave] Circuit breaker activated - stopping autosave attempts');
      }

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
          // Check if it's a 413 error specifically
          if (err.message.includes('413') || err.message.includes('payload too large')) {
            toast.error('Activity too large for autosave. Please save manually.', {
              action: {
                label: 'Save Now',
                onClick: () => {
                  retryCountRef.current = 0;
                  performSave(data, true); // Force manual save
                }
              },
              duration: 8000,
              position: 'top-right'
            });
          } else {
            toast.error(`Autosave failed: ${err.message.includes('HTTP') ? 'Connection issue' : 'Unknown error'}`, {
              action: {
                label: 'Save Manually',
                onClick: () => {
                  retryCountRef.current = 0;
                  performSave(data, true);
                }
              },
              duration: 6000,
              position: 'top-right'
            });
          }
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