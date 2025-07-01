import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type SyncStatus = 'live' | 'outdated' | 'never' | 'error';

interface IATISyncStatusIndicatorProps {
  syncStatus?: string;
  lastSyncTime?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IATISyncStatusIndicator({
  syncStatus,
  lastSyncTime,
  showLabel = true,
  size = 'md'
}: IATISyncStatusIndicatorProps) {
  // Calculate sync status based on last sync time if not provided
  const calculateSyncStatus = (): SyncStatus => {
    if (syncStatus === 'error') return 'error';
    if (!lastSyncTime) return 'never';
    
    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync <= 24) return 'live';
    return 'outdated';
  };

  const status = syncStatus as SyncStatus || calculateSyncStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return {
          icon: CheckCircle2,
          label: 'Synced',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          description: lastSyncTime 
            ? `Last synced ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
            : 'Synced with IATI'
        };
      case 'outdated':
        return {
          icon: AlertCircle,
          label: 'Outdated',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          description: lastSyncTime
            ? `Last synced ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
            : 'Sync needed (>24h)'
        };
      case 'error':
        return {
          icon: XCircle,
          label: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          description: 'Sync failed - check IATI identifier'
        };
      case 'never':
      default:
        return {
          icon: Clock,
          label: 'Not synced',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          description: 'Never synced with IATI'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      icon: 'h-3 w-3',
      text: 'text-xs',
      padding: 'px-1.5 py-0.5',
      gap: 'gap-1'
    },
    md: {
      icon: 'h-4 w-4',
      text: 'text-sm',
      padding: 'px-2 py-1',
      gap: 'gap-1.5'
    },
    lg: {
      icon: 'h-5 w-5',
      text: 'text-base',
      padding: 'px-3 py-1.5',
      gap: 'gap-2'
    }
  };

  const sizeClass = sizeClasses[size];

  const indicator = (
    <div 
      className={`inline-flex items-center ${sizeClass.gap} ${sizeClass.padding} rounded-full ${config.bgColor} border ${config.borderColor}`}
    >
      <Icon className={`${sizeClass.icon} ${config.color}`} />
      {showLabel && (
        <span className={`${sizeClass.text} font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for table cells
export function IATISyncStatusBadge({
  syncStatus,
  lastSyncTime
}: {
  syncStatus?: string;
  lastSyncTime?: string;
}) {
  const calculateSyncStatus = (): SyncStatus => {
    if (syncStatus === 'error') return 'error';
    if (!lastSyncTime) return 'never';
    
    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync <= 24) return 'live';
    return 'outdated';
  };

  const status = syncStatus as SyncStatus || calculateSyncStatus();

  const getStatusIcon = () => {
    switch (status) {
      case 'live':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case 'outdated':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      case 'never':
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case 'live':
        return lastSyncTime 
          ? `IATI: Last synced ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
          : 'IATI: Synced';
      case 'outdated':
        return lastSyncTime
          ? `IATI: Last synced ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })} (outdated)`
          : 'IATI: Sync needed (>24h)';
      case 'error':
        return 'IATI: Sync failed';
      case 'never':
      default:
        return 'IATI: Never synced';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            {getStatusIcon()}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 