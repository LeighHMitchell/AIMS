import React from 'react';
import { CircleDashed, CheckCircle, XCircle } from 'lucide-react';
import { SaveStatus } from '@/hooks/useSaveIndicator';

interface FieldSaveStatusProps {
  status: SaveStatus;
  hasValue: boolean;
  error?: Error | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component to display save status indicators for form fields
 * 
 * Display logic:
 * - idle: no icon
 * - saving: orange spinning circle
 * - saved: green tick (only if hasValue is true)
 * - error: red X icon
 */
export function FieldSaveStatus({
  status,
  hasValue,
  error,
  className = '',
  size = 'sm'
}: FieldSaveStatusProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];
  
  // Don't show any indicator when idle
  if (status === 'idle') {
    return null;
  }
  
  // Show orange spinning circle while saving
  if (status === 'saving') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <CircleDashed 
          className={`${iconSize} text-orange-600 animate-spin`} 
          aria-label="Saving..."
        />
      </div>
    );
  }
  
  // Show green tick only if saved AND has value
  if (status === 'saved' && hasValue) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <CheckCircle 
          className={`${iconSize} text-green-600`} 
          aria-label="Saved"
        />
      </div>
    );
  }
  
  // Show error indicator
  if (status === 'error') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <XCircle 
          className={`${iconSize} text-red-600`} 
          aria-label={error?.message || 'Save failed'}
          title={error?.message}
        />
        {error?.message && (
          <span className="text-xs text-red-600">{error.message}</span>
        )}
      </div>
    );
  }
  
  // No icon for saved state with empty value
  return null;
}

/**
 * Label component with integrated save status indicator
 */
interface LabelWithSaveStatusProps {
  status: SaveStatus;
  hasValue: boolean;
  error?: Error | null;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export function LabelWithSaveStatus({
  status,
  hasValue,
  error,
  children,
  htmlFor,
  className = '',
  required = false
}: LabelWithSaveStatusProps) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`flex items-center gap-2 text-sm font-medium ${className}`}
    >
      <span>
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <FieldSaveStatus 
        status={status}
        hasValue={hasValue}
        error={error}
        size="sm"
      />
    </label>
  );
}