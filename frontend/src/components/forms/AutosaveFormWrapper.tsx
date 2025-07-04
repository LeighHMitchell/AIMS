import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useComprehensiveAutosave } from '@/hooks/use-comprehensive-autosave';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, WifiOff } from 'lucide-react';

interface AutosaveContextType {
  triggerSave: (immediate?: boolean) => void;
  saveNow: () => Promise<boolean>;
  forceSave: () => void;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  lastError: Error | null;
  clearError: () => void;
}

const AutosaveContext = createContext<AutosaveContextType | null>(null);

export const useAutosaveContext = () => {
  const context = useContext(AutosaveContext);
  if (!context) {
    throw new Error('useAutosaveContext must be used within AutosaveFormWrapper');
  }
  return context;
};

interface AutosaveFormWrapperProps {
  children: React.ReactNode;
  activityData: any;
  user: any;
  onDataUpdate?: (field: string, value: any) => void;
  enabled?: boolean;
  showStatusIndicator?: boolean;
  showErrorAlerts?: boolean;
  className?: string;
}

export function AutosaveFormWrapper({
  children,
  activityData,
  user,
  onDataUpdate,
  enabled = true,
  showStatusIndicator = true,
  showErrorAlerts = true,
  className = ''
}: AutosaveFormWrapperProps) {
  const {
    state,
    triggerSave,
    saveNow,
    forceSave,
    clearError
  } = useComprehensiveAutosave(activityData, user, {
    enabled,
    intervalMs: 5000, // Save every 5 seconds if changes exist
    debounceMs: 2000, // Wait 2 seconds after last change
    maxRetries: 3,
    showSuccessToast: false, // We'll handle UI feedback ourselves
    showErrorToast: false,   // We'll show custom error alerts
    onSaveSuccess: (data) => {
      console.log('[AutosaveFormWrapper] Save successful:', data);
    },
    onSaveError: (error) => {
      console.error('[AutosaveFormWrapper] Save error:', error);
    }
  });

  // Enhanced error handling with user-friendly messages
  useEffect(() => {
    if (state.lastError && showErrorAlerts) {
      const errorMessage = getErrorMessage(state.lastError);
      
      toast.error('Failed to save changes', {
        description: errorMessage,
        action: {
          label: 'Retry Now',
          onClick: () => {
            clearError();
            forceSave();
          }
        },
        duration: 10000
      });
    }
  }, [state.lastError, showErrorAlerts, clearError, forceSave]);

  // Get user-friendly error message
  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'You are not authorized to save changes. Please log in again.';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'You do not have permission to edit this activity.';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'Activity not found. It may have been deleted.';
    }
    if (message.includes('500') || message.includes('internal server')) {
      return 'Server error. Please try again in a few moments.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    return `Save failed: ${error.message}`;
  };

  // Status indicator component
  const StatusIndicator = () => {
    if (!showStatusIndicator) return null;

    if (state.isAutoSaving) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-300">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Saving...
        </Badge>
      );
    }

    if (state.lastError) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Save Failed
        </Badge>
      );
    }

    if (state.hasUnsavedChanges) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          <WifiOff className="h-3 w-3 mr-1" />
          Unsaved Changes
        </Badge>
      );
    }

    if (state.lastSaved) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Saved {formatTimeAgo(state.lastSaved)}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-gray-600">
        Ready to Save
      </Badge>
    );
  };

  // Format time ago helper
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  };

  const contextValue: AutosaveContextType = {
    triggerSave,
    saveNow,
    forceSave,
    isAutoSaving: state.isAutoSaving,
    lastSaved: state.lastSaved,
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastError: state.lastError,
    clearError
  };

  return (
    <AutosaveContext.Provider value={contextValue}>
      <div className={`relative ${className}`}>
        {/* Status indicator */}
        {showStatusIndicator && (
          <div className="fixed top-4 right-4 z-50">
            <StatusIndicator />
          </div>
        )}

        {/* Error alert */}
        {state.lastError && showErrorAlerts && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{getErrorMessage(state.lastError)}</span>
                <button
                  onClick={() => {
                    clearError();
                    forceSave();
                  }}
                  className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Form content */}
        {children}

        {/* Debug info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black text-green-400 p-2 rounded text-xs font-mono z-50 max-w-xs">
            <div>Saves: {state.saveCount}</div>
            <div>Errors: {state.errorCount}</div>
            <div>Auto-saving: {state.isAutoSaving ? 'Yes' : 'No'}</div>
            <div>Unsaved: {state.hasUnsavedChanges ? 'Yes' : 'No'}</div>
            {state.lastSaved && (
              <div>Last: {state.lastSaved.toLocaleTimeString()}</div>
            )}
          </div>
        )}
      </div>
    </AutosaveContext.Provider>
  );
}

// Enhanced form field components that automatically trigger autosave
export function AutosaveInput(props: React.InputHTMLAttributes<HTMLInputElement> & { 
  onValueChange?: (value: string) => void;
}) {
  const { triggerSave } = useAutosaveContext();
  const { onValueChange, onChange, ...inputProps } = props;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onValueChange?.(value);
    onChange?.(e);
    triggerSave(); // Trigger autosave on every change
  }, [onValueChange, onChange, triggerSave]);

  return <input {...inputProps} onChange={handleChange} />;
}

export function AutosaveTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onValueChange?: (value: string) => void;
}) {
  const { triggerSave } = useAutosaveContext();
  const { onValueChange, onChange, ...textareaProps } = props;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onValueChange?.(value);
    onChange?.(e);
    triggerSave(); // Trigger autosave on every change
  }, [onValueChange, onChange, triggerSave]);

  return <textarea {...textareaProps} onChange={handleChange} />;
}

export function AutosaveCheckbox(props: React.InputHTMLAttributes<HTMLInputElement> & {
  onCheckedChange?: (checked: boolean) => void;
}) {
  const { triggerSave } = useAutosaveContext();
  const { onCheckedChange, onChange, ...checkboxProps } = props;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onCheckedChange?.(checked);
    onChange?.(e);
    triggerSave(); // Trigger autosave on every change
  }, [onCheckedChange, onChange, triggerSave]);

  return <input type="checkbox" {...checkboxProps} onChange={handleChange} />;
}

// HOC to wrap any component with autosave functionality
export function withAutosave<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.forwardRef<any, P & { triggerAutosave?: boolean }>((props, ref) => {
    const { triggerAutosave = true, ...componentProps } = props;
    const { triggerSave } = useAutosaveContext();

    // Trigger autosave when component unmounts or specific props change
    useEffect(() => {
      if (triggerAutosave) {
        triggerSave();
      }
    }, [triggerAutosave, triggerSave]);

    return <Component {...(componentProps as P)} ref={ref} />;
  });
}