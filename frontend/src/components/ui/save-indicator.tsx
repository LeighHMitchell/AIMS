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
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
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
  children,
  className = ""
}: {
  isSaving: boolean;
  isSaved: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-sm font-medium flex items-center ${className}`}>
      {children}
      <SaveIndicator 
        isSaving={isSaving} 
        isSaved={isSaved} 
        size="sm"
        className="ml-2"
      />
    </label>
  );
} 