import { useState, useEffect, useRef } from 'react';
import { TabCompletionStatus } from '@/utils/tab-completion';

interface StableTabCompletionState {
  [tabId: string]: TabCompletionStatus | null;
}

/**
 * Hook to provide stable tab completion status that doesn't flicker during loading states
 * Maintains previous completion status when data is temporarily unavailable
 */
export function useStableTabCompletion() {
  const [stableCompletions, setStableCompletions] = useState<StableTabCompletionState>({});
  const previousCompletions = useRef<StableTabCompletionState>({});

  const updateTabCompletion = (tabId: string, completion: TabCompletionStatus | null, isLoading = false) => {
    // If we're loading and had a previous completion, keep the previous one to prevent flicker
    if (isLoading && previousCompletions.current[tabId]?.isComplete) {
      return;
    }

    // Update both current and previous state
    setStableCompletions(prev => {
      const newState = { ...prev, [tabId]: completion };
      previousCompletions.current = newState;
      return newState;
    });
  };

  const getTabCompletion = (tabId: string): TabCompletionStatus | null => {
    return stableCompletions[tabId] || null;
  };

  const resetTabCompletion = (tabId: string) => {
    setStableCompletions(prev => {
      const newState = { ...prev };
      delete newState[tabId];
      delete previousCompletions.current[tabId];
      return newState;
    });
  };

  const resetAllCompletions = () => {
    setStableCompletions({});
    previousCompletions.current = {};
  };

  return {
    updateTabCompletion,
    getTabCompletion,
    resetTabCompletion,
    resetAllCompletions,
    stableCompletions
  };
}
