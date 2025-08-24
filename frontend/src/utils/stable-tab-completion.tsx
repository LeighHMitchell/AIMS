import React, { useRef } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { TabCompletionStatus } from "./tab-completion"

interface StableTabCompletionCache {
  [tabId: string]: {
    status: TabCompletionStatus | null;
    lastUpdated: number;
  };
}

/**
 * Stable tab completion indicator that prevents flickering during navigation
 * Maintains previous completion state during loading to provide smooth UX
 */
export function StableTabCompletionIndicator({ 
  tabId, 
  currentStatus, 
  isLoading = false 
}: { 
  tabId: string; 
  currentStatus: TabCompletionStatus | null; 
  isLoading?: boolean;
}) {
  const cacheRef = useRef<StableTabCompletionCache>({});
  
  // Update cache with current status if not loading or if it's a meaningful change
  if (!isLoading || (currentStatus?.isComplete && !cacheRef.current[tabId]?.status?.isComplete)) {
    cacheRef.current[tabId] = {
      status: currentStatus,
      lastUpdated: Date.now()
    };
  }
  
  // Use cached status if loading and we have a previous complete status
  const displayStatus = isLoading && cacheRef.current[tabId]?.status?.isComplete
    ? cacheRef.current[tabId].status
    : currentStatus;

  if (displayStatus?.isComplete) {
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }
  
  if (displayStatus?.isInProgress || isLoading) {
    return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
  }
  
  return null
}

/**
 * Hook for managing stable tab completion status
 * Prevents completion status from flickering during data loading
 */
export function useStableTabCompletion() {
  const stableCache = useRef<StableTabCompletionCache>({});
  
  const getStableStatus = (tabId: string, currentStatus: TabCompletionStatus | null, isLoading = false) => {
    // If we're loading and had a complete status before, keep showing complete
    if (isLoading && 
        stableCache.current[tabId]?.status?.isComplete && 
        (!currentStatus || !currentStatus.isComplete)) {
      return stableCache.current[tabId].status;
    }
    
    // Update cache with new status
    if (currentStatus) {
      stableCache.current[tabId] = {
        status: currentStatus,
        lastUpdated: Date.now()
      };
    }
    
    return currentStatus;
  };
  
  const clearCache = (tabId?: string) => {
    if (tabId) {
      delete stableCache.current[tabId];
    } else {
      stableCache.current = {};
    }
  };
  
  return {
    getStableStatus,
    clearCache
  };
}
