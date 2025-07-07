/**
 * Autosave Status Indicator - Shows real-time autosave status
 */
"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  WifiOff, 
  Clock,
  Save
} from 'lucide-react';

interface AutosaveStatusProps {
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  lastError: Error | null;
  saveCount?: number;
  className?: string;
}

export function AutosaveStatus({
  isAutoSaving,
  hasUnsavedChanges,
  lastSaved,
  lastError,
  saveCount = 0,
  className = ""
}: AutosaveStatusProps) {
  
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

  // Determine status and appearance
  const getStatus = () => {
    if (isAutoSaving) {
      return {
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        text: 'Saving...',
        variant: 'outline' as const,
        className: 'text-blue-600 border-blue-300 bg-blue-50'
      };
    }

    if (lastError) {
      return {
        icon: <AlertCircle className="h-3 w-3" />,
        text: 'Save Failed',
        variant: 'outline' as const,
        className: 'text-red-600 border-red-300 bg-red-50'
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: <Clock className="h-3 w-3" />,
        text: 'Unsaved Changes',
        variant: 'outline' as const,
        className: 'text-orange-600 border-orange-300 bg-orange-50'
      };
    }

    if (lastSaved) {
      return {
        icon: <CheckCircle className="h-3 w-3" />,
        text: `Saved ${formatTimeAgo(lastSaved)}`,
        variant: 'outline' as const,
        className: 'text-green-600 border-green-300 bg-green-50'
      };
    }

    return {
      icon: <Save className="h-3 w-3" />,
      text: '',
      variant: 'outline' as const,
      className: 'text-gray-600 border-gray-300 bg-gray-50'
    };
  };

  const status = getStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={status.variant} 
        className={`${status.className} flex items-center gap-1 text-xs`}
      >
        {status.icon}
        {status.text}
      </Badge>
      
      {/* Save count indicator */}
      {saveCount > 0 && (
        <span className="text-xs text-gray-500">
          ({saveCount} saves)
        </span>
      )}
      
      {/* Error details on hover */}
      {lastError && (
        <span 
          className="text-xs text-red-500 cursor-help" 
          title={lastError.message}
        >
          ⚠️
        </span>
      )}
    </div>
  );
}

// Compact version for tight spaces
export function AutosaveStatusCompact({
  isAutoSaving,
  hasUnsavedChanges,
  lastSaved,
  lastError
}: Omit<AutosaveStatusProps, 'saveCount' | 'className'>) {
  
  if (isAutoSaving) {
    return (
      <div className="flex items-center gap-1 text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Saving</span>
      </div>
    );
  }

  if (lastError) {
    return (
      <div className="flex items-center gap-1 text-red-600" title={lastError.message}>
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs">Error</span>
      </div>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center gap-1 text-orange-600">
        <Clock className="h-3 w-3" />
        <span className="text-xs">Unsaved</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span className="text-xs">Saved</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Save className="h-3 w-3" />
      <span className="text-xs">Draft</span>
    </div>
  );
}