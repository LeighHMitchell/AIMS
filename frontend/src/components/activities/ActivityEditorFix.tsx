import React, { useCallback, useRef, useState, useEffect } from 'react';

// Fixed autosave implementation for activity editor
export function createActivityAutosave() {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSavePromiseRef = useRef<Promise<void> | null>(null);
  
  // Create a stable save function that doesn't depend on state
  const createStableSaveFunction = (
    getActivityData: () => any,
    getUser: () => any,
    setAutoSaving: (saving: boolean) => void,
    setLastSaved: (date: Date) => void,
    setHasUnsavedChanges: (has: boolean) => void,
    updateActivityId?: (id: string) => void
  ) => {
    return async () => {
      const activityData = getActivityData();
      const user = getUser();
      
      // Validation
      if (!activityData.general?.title?.trim()) {
        console.log('[ActivityAutosave] Skipping save - no title');
        return;
      }
      
      console.log('[ActivityAutosave] Starting save...');
      setAutoSaving(true);
      
      try {
        const payload = {
          ...activityData.general,
          created_by_org_name: activityData.general.created_by_org_name || user?.organisation || user?.organization?.name || "",
          created_by_org_acronym: activityData.general.created_by_org_acronym || "",
          sectors: activityData.sectors || [],
          transactions: activityData.transactions || [],
          extendingPartners: activityData.extendingPartners || [],
          implementingPartners: activityData.implementingPartners || [],
          governmentPartners: activityData.governmentPartners || [],
          contacts: activityData.contacts || [],
          governmentInputs: activityData.governmentInputs || [],
          contributors: activityData.contributors || [],
          sdgMappings: activityData.sdgMappings || [],
          tags: activityData.tags || [],
          workingGroups: activityData.workingGroups || [],
          policyMarkers: activityData.policyMarkers || [],
          locations: {
            specificLocations: activityData.specificLocations || [],
            coverageAreas: activityData.coverageAreas || []
          },
          activityScope: activityData.activityScope,
          activityStatus: activityData.general.activityStatus || "planning",
          publicationStatus: activityData.general.publicationStatus || "draft",
          createdByOrg: activityData.general.createdByOrg || user?.organizationId,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId
          } : null
        };
        
        if (activityData.general.id) {
          payload.id = activityData.general.id;
        }
        
        console.log('[ActivityAutosave] Payload prepared:', {
          id: payload.id,
          title: payload.title,
          fieldsCount: Object.keys(payload).length
        });
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Save failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Update ID if this was a new activity
        if (!activityData.general.id && data.id && updateActivityId) {
          updateActivityId(data.id);
        }
        
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('[ActivityAutosave] Save successful');
        
      } catch (error) {
        console.error('[ActivityAutosave] Save error:', error);
      } finally {
        setAutoSaving(false);
      }
    };
  };
  
  // Create trigger function that properly debounces
  const createTriggerFunction = (saveFunction: () => Promise<void>) => {
    return () => {
      console.log('[ActivityAutosave] Trigger called');
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        console.log('[ActivityAutosave] Cleared existing timeout');
      }
      
      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[ActivityAutosave] Timeout fired, executing save');
        autoSavePromiseRef.current = saveFunction();
      }, 2000);
    };
  };
  
  return {
    createStableSaveFunction,
    createTriggerFunction,
    autoSaveTimeoutRef,
    autoSavePromiseRef
  };
}

// Enhanced select component that ensures autosave is triggered
export function AutosaveSelectField({
  id,
  label,
  value,
  onChange,
  onAutosave,
  SelectComponent,
  placeholder,
  required = false,
  helpText
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAutosave: () => void;
  SelectComponent: React.ComponentType<any>;
  placeholder?: string;
  required?: boolean;
  helpText?: React.ReactNode;
}) {
  const previousValueRef = useRef(value);
  
  const handleValueChange = useCallback((newValue: string) => {
    console.log(`[AutosaveSelect] ${id} changing from "${previousValueRef.current}" to "${newValue}"`);
    
    // Update state
    onChange(newValue);
    
    // Always trigger autosave, even for the same value
    // This ensures the debounce timer is properly managed
    onAutosave();
    
    // Update ref for next comparison
    previousValueRef.current = newValue;
  }, [id, onChange, onAutosave]);
  
  return (
    <div className="w-full space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 flex items-center">
        {label}
        {helpText}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <SelectComponent
        id={id}
        value={value}
        onValueChange={handleValueChange}
        placeholder={placeholder}
      />
    </div>
  );
}