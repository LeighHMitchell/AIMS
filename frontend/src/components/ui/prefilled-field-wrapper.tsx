import React from 'react';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';

interface PrefilledFieldWrapperProps {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  
  // Force green tick display for prefilled fields
  showGreenByDefault?: boolean;
  
  // Optional autosave state for when field is actually being saved
  autosaveState?: {
    isSaving: boolean;
    isPersistentlySaved?: boolean;
    error?: Error | null;
  };
  
  // Value state for determining if field has content
  hasValue?: boolean;
  
  // Focus state (optional, for hiding indicators during interaction)
  isFocused?: boolean;
}

/**
 * Wrapper for prefilled fields that should show green ticks by default
 * (UUID, Activity Status with "Pipeline", Activity Scope with "National")
 */
export function PrefilledFieldWrapper({
  label,
  helpText,
  required,
  children,
  className = '',
  showGreenByDefault = true,
  autosaveState,
  hasValue = true,
  isFocused = false
}: PrefilledFieldWrapperProps) {
  
  // Determine save state:
  // 1. If currently saving, show orange
  // 2. If focused, show no indicator
  // 3. If showGreenByDefault and has value, show green
  // 4. Otherwise use autosave state
  
  const isSaving = autosaveState?.isSaving || false;
  const isPersistentlySaved = autosaveState?.isPersistentlySaved || false;
  
  const shouldShowSaved = () => {
    if (isFocused) return false; // Hide during interaction
    if (showGreenByDefault && hasValue) return true; // Show green for prefilled
    return isPersistentlySaved; // Use autosave state
  };
  
  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={isSaving}
        isSaved={shouldShowSaved()}
        hasValue={hasValue}
        isFocused={isFocused}
        className="text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />}
          </span>
          {helpText}
        </div>
      </LabelSaveIndicator>
      
      <div className={className}>
        {children}
      </div>
      
      {autosaveState?.error && (
        <p className="text-xs text-red-600 mt-1">{autosaveState.error.toString()}</p>
      )}
    </div>
  );
}