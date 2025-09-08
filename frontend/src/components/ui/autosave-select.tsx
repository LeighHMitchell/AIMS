import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';

interface AutosaveSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  autosaveState: {
    isSaving: boolean;
    isPersistentlySaved?: boolean;
    error?: Error | null;
  };
  triggerSave?: (value: string) => void;
  initialHasValue?: boolean; // For prefilled fields like Activity Status
}

export function AutosaveSelect({
  id,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  label,
  helpText,
  required,
  options,
  autosaveState,
  triggerSave,
  initialHasValue = false
}: AutosaveSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Determine if field has a value
  const hasValue = value && value.trim().length > 0;
  
  // For prefilled fields (Activity Status, Activity Scope), we want to show the green tick
  // immediately on initial render since they have default values
  const shouldShowSaved = () => {
    // If field is focused (dropdown open), never show indicator
    if (isFocused) {
      return false;
    }
    
    // If this is a prefilled field and user hasn't interacted yet,
    // show it as saved (green tick) since it has a default value
    if (initialHasValue && !hasInteracted && hasValue) {
      return true;
    }
    
    // Otherwise, use the actual saved state from autosave
    return autosaveState.isPersistentlySaved || false;
  };
  
  // Debug: Log the state for troubleshooting
  if (typeof window !== 'undefined' && id && (id.includes('activityStatus') || id.includes('activityScope'))) {
    console.log(`[${id}] AutosaveSelect state:`, {
      value,
      hasValue,
      initialHasValue,
      hasInteracted,
      isFocused,
      shouldShowSaved: shouldShowSaved(),
      isPersistentlySaved: autosaveState.isPersistentlySaved,
    });
  }
  
  const handleOpenChange = (open: boolean) => {
    setIsFocused(open);
    // Mark as interacted when user opens the dropdown
    if (open && !hasInteracted) {
      setHasInteracted(true);
    }
  };
  
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);
    setHasInteracted(true);
    
    // Immediately save on selection
    if (triggerSave) {
      // Add small delay to show orange indicator briefly
      setTimeout(() => {
        triggerSave(newValue);
      }, 100);
    }
  };
  
  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={autosaveState.isSaving}
        isSaved={shouldShowSaved()}
        hasValue={hasValue}
        isFocused={isFocused}
        className="text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {helpText}
        </div>
      </LabelSaveIndicator>
      <div>
        <Select
          value={value}
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
          disabled={disabled}
        >
          <SelectTrigger id={id} className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {autosaveState.error && (
          <p className="text-xs text-red-600 mt-1">{autosaveState.error.toString()}</p>
        )}
      </div>
    </div>
  );
}