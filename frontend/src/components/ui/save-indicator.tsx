import React from 'react';
import { CircleDashed, CheckCircle } from 'lucide-react';

interface SaveIndicatorProps {
  isSaving: boolean;
  isSaved: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SaveIndicator({ 
  isSaving, 
  isSaved, 
  className = "ml-2",
  size = 'sm' 
}: SaveIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4', // Match help text icon size
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  if (isSaving) {
    return (
      <CircleDashed 
        className={`${iconSize} text-orange-600 animate-spin ${className}`} 
      />
    );
  }

  if (isSaved) {
    return (
      <CheckCircle 
        className={`${iconSize} text-green-600 ${className}`} 
      />
    );
  }

  return null;
}

// Convenience components for common use cases
export function FieldSaveIndicator({ 
  isSaving, 
  isSaved 
}: {
  isSaving: boolean;
  isSaved: boolean;
}) {
  return (
    <SaveIndicator 
      isSaving={isSaving} 
      isSaved={isSaved} 
      size="sm"
      className="ml-2"
    />
  );
}

export function LabelSaveIndicator({ 
  isSaving, 
  isSaved,
  hasValue = false,
  isFocused = false,
  children,
  className = ""
}: {
  isSaving: boolean;
  isSaved: boolean;
  hasValue?: boolean;
  isFocused?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  // Determine what indicator to show based on state
  const showIndicator = () => {
    // Never show indicators when field is focused (user is typing)
    if (isFocused) {
      return null;
    }
    
    // Show orange circle while saving
    if (isSaving) {
      return <CircleDashed className="w-4 h-4 text-orange-600 animate-spin ml-2" />;
    }
    
    // Show green tick only if:
    // 1. Field has been saved (isSaved = true)
    // 2. Field has a non-empty value (hasValue = true)
    if (isSaved && hasValue) {
      return <CheckCircle className="w-4 h-4 text-green-600 ml-2" />;
    }
    
    // No indicator for idle state or saved with empty value
    return null;
  };
  
  return (
    <label className={`text-sm font-medium flex items-center ${className}`}>
      {children}
      {showIndicator()}
    </label>
  );
} 