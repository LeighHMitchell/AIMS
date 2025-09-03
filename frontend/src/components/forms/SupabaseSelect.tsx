import React, { useState, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupabaseSelectProps {
  // Basic select props
  id?: string;
  value: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  
  // Supabase integration props
  activityId: string | null;
  fieldName: string;
  tableName?: string;
  
  // Options
  showStatus?: boolean;
  enableOptimisticUpdates?: boolean;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  
  // Callbacks
  onUpdateSuccess?: (field: string, value: string | null) => void;
  onUpdateError?: (field: string, error: Error) => void;
}

export function SupabaseSelect({
  id,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  children,
  className,
  activityId,
  fieldName,
  tableName = 'activities',
  showStatus = true,
  enableOptimisticUpdates = true,
  showSuccessToast = false,
  showErrorToast = true,
  onUpdateSuccess,
  onUpdateError,
}: SupabaseSelectProps) {
  // Local state for optimistic updates
  const [localValue, setLocalValue] = useState<string | null>(value || null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  // Supabase field update hook
  const { updateField, state } = useSupabaseFieldUpdate(activityId, {
    tableName,
    onSuccess: (field, value) => {
      console.log(`[SupabaseSelect] Successfully updated ${field}:`, value);
      setIsOptimistic(false);
      onUpdateSuccess?.(field, value);
    },
    onError: (field, error) => {
      console.error(`[SupabaseSelect] Failed to update ${field}:`, error);
      // Revert optimistic update on error
      if (enableOptimisticUpdates) {
        setLocalValue(value || null);
        setIsOptimistic(false);
      }
      onUpdateError?.(field, error);
    },
    showSuccessToast,
    showErrorToast
  });

  // Update the local value when prop changes
  React.useEffect(() => {
    if (!isOptimistic) {
      setLocalValue(value || null);
    }
  }, [value, isOptimistic]);

  const handleValueChange = useCallback(async (newValue: string) => {
    const finalValue = newValue === '' ? null : newValue;
    
    console.log(`[SupabaseSelect] ${fieldName} changing from "${localValue}" to "${finalValue}"`);

    // Call the original onValueChange if provided
    onValueChange?.(finalValue);

    // Optimistic update
    if (enableOptimisticUpdates) {
      setLocalValue(finalValue);
      setIsOptimistic(true);
    }

    // Update in database
    if (activityId) {
      await updateField(fieldName, finalValue);
    } else {
      console.warn(`[SupabaseSelect] No activityId provided for ${fieldName} update`);
      setIsOptimistic(false);
    }
  }, [localValue, fieldName, onValueChange, enableOptimisticUpdates, activityId, updateField]);

  const getStatusIcon = () => {
    if (!showStatus) return null;
    
    if (state.isUpdating) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (state.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (state.lastUpdated && !isOptimistic) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const displayValue = enableOptimisticUpdates ? localValue : value;

  return (
    <div className="relative">
      <Select
        value={displayValue || ''}
        onValueChange={handleValueChange}
        disabled={disabled || state.isUpdating}
      >
        <SelectTrigger
          id={id}
          className={cn(
            className,
            state.isUpdating && 'opacity-50',
            state.error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            isOptimistic && 'border-blue-300'
          )}
        >
          <div className="flex items-center justify-between w-full">
            <SelectValue placeholder={placeholder} />
            {getStatusIcon()}
          </div>
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>

      {/* Error message */}
      {state.error && showStatus && (
        <div className="mt-1 text-xs text-red-600">
          Update failed: {state.error}
        </div>
      )}

      {/* Success message */}
      {state.lastUpdated && !state.error && !state.isUpdating && !isOptimistic && showStatus && (
        <div className="mt-1 text-xs text-green-600">
          Saved at {state.lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Optimistic update indicator */}
      {isOptimistic && showStatus && (
        <div className="mt-1 text-xs text-blue-600">
          Saving...
        </div>
      )}
    </div>
  );
}

// Higher-order component to wrap existing Select components
export function withSupabaseIntegration<P extends Record<string, any>>(
  Component: React.ComponentType<P & {
    value?: string | null | undefined;
    onValueChange?: (value: string | null) => void;
  }>
) {
  return React.forwardRef<
    any,
    P & {
      value?: string | null | undefined;
      onValueChange?: (value: string | null) => void;
      activityId: string | null;
      fieldName: string;
      tableName?: string;
      showStatus?: boolean;
      enableOptimisticUpdates?: boolean;
      onUpdateSuccess?: (field: string, value: string | null) => void;
      onUpdateError?: (field: string, error: Error) => void;
    }
  >((props, ref) => {
    const {
      activityId,
      fieldName,
      tableName = 'activities',
      showStatus = true,
      enableOptimisticUpdates = true,
      onUpdateSuccess,
      onUpdateError,
      onValueChange,
      value: propValue,
      ...componentProps
    } = props;

    // Local state to manage the display value with optimistic updates
    const [localValue, setLocalValue] = useState<string | null | undefined>(propValue);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync local value with prop value, but prioritize local state during updates
    useEffect(() => {
      if (!isUpdating) {
        setLocalValue(propValue);
      }
    }, [propValue, isUpdating]);

    // Force sync after a delay if updating takes too long
    useEffect(() => {
      if (isUpdating) {
        const timeout = setTimeout(() => {
          console.log(`[withSupabaseIntegration] Force sync after timeout for ${fieldName}`);
          setIsUpdating(false);
          setLocalValue(propValue);
        }, 3000); // 3 second timeout
        
        return () => clearTimeout(timeout);
      }
    }, [isUpdating, propValue, fieldName]);

    // Supabase field update hook
    const { updateField, state } = useSupabaseFieldUpdate(activityId, {
      tableName,
      onSuccess: (field, value) => {
        console.log(`[withSupabaseIntegration] Successfully saved ${field}:`, value);
        // Ensure local value matches the saved value
        setLocalValue(value);
        setIsUpdating(false);
        onUpdateSuccess?.(field, value);
      },
      onError: (field, error) => {
        console.error(`[withSupabaseIntegration] Failed to save ${field}:`, error);
        // Revert to original value on error
        setLocalValue(propValue);
        setIsUpdating(false);
        onUpdateError?.(field, error);
      },
      showSuccessToast: false,
      showErrorToast: true
    });

    const handleValueChange = useCallback(async (value: string | null) => {
      console.log(`[withSupabaseIntegration] ${fieldName} changing to:`, value);
      
      // Optimistic update - immediately show the new value
      setLocalValue(value);
      setIsUpdating(true);
      
      // Call original handler
      onValueChange?.(value);

      // Update in database
      if (activityId) {
        await updateField(fieldName, value);
      } else {
        // No activity ID, just update local state
        setIsUpdating(false);
      }
    }, [fieldName, onValueChange, activityId, updateField, propValue]);

    return (
      <Component
        {...(componentProps as any)}
        ref={ref}
        value={localValue}
        onValueChange={handleValueChange}
        key={`${fieldName}-${localValue}`} // Force re-render when local value changes
      />
    );
  });
}