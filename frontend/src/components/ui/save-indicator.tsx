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
  children,
  className = ""
}: {
  isSaving: boolean;
  isSaved: boolean;
  hasValue?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  // Show green tick when:
  // 1. Field has been saved AND still has content (isSaved && hasValue)
  // 2. Field has prefilled content but not yet saved (!isSaved && hasValue)
  // This ensures that if a user deletes content, the tick disappears even if it was previously saved
  const showGreenTick = hasValue;
  
  return (
    <label className={`text-sm font-medium flex items-center ${className}`}>
      {children}
      {/* Show save indicator (orange when saving, green when saved or has data) */}
      {isSaving && (
        <CircleDashed className="w-4 h-4 text-orange-600 animate-spin ml-2" />
      )}
      {!isSaving && showGreenTick && (
        <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
      )}
    </label>
  );
} 