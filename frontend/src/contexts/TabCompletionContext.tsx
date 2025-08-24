"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { TabCompletionStatus } from '@/utils/tab-completion';

interface TabCompletionState {
  [tabId: string]: TabCompletionStatus | null;
}

interface TabCompletionContextType {
  getTabCompletion: (tabId: string) => TabCompletionStatus | null;
  setTabCompletion: (tabId: string, completion: TabCompletionStatus | null, preventFlicker?: boolean) => void;
  resetTabCompletion: (tabId: string) => void;
  resetAllCompletions: () => void;
}

const TabCompletionContext = createContext<TabCompletionContextType | null>(null);

export function TabCompletionProvider({ children }: { children: React.ReactNode }) {
  const [completions, setCompletions] = useState<TabCompletionState>({});
  const stableCompletions = useRef<TabCompletionState>({});

  const getTabCompletion = useCallback((tabId: string): TabCompletionStatus | null => {
    return completions[tabId] || null;
  }, [completions]);

  const setTabCompletion = useCallback((
    tabId: string, 
    completion: TabCompletionStatus | null, 
    preventFlicker = true
  ) => {
    setCompletions(prev => {
      // If preventing flicker and we had a complete status before, don't change to incomplete
      if (preventFlicker && 
          stableCompletions.current[tabId]?.isComplete && 
          completion && !completion.isComplete) {
        return prev; // Keep the previous state
      }

      const newState = { ...prev, [tabId]: completion };
      stableCompletions.current = newState;
      return newState;
    });
  }, []);

  const resetTabCompletion = useCallback((tabId: string) => {
    setCompletions(prev => {
      const newState = { ...prev };
      delete newState[tabId];
      delete stableCompletions.current[tabId];
      return newState;
    });
  }, []);

  const resetAllCompletions = useCallback(() => {
    setCompletions({});
    stableCompletions.current = {};
  }, []);

  return (
    <TabCompletionContext.Provider value={{
      getTabCompletion,
      setTabCompletion,
      resetTabCompletion,
      resetAllCompletions
    }}>
      {children}
    </TabCompletionContext.Provider>
  );
}

export function useTabCompletion() {
  const context = useContext(TabCompletionContext);
  if (!context) {
    throw new Error('useTabCompletion must be used within a TabCompletionProvider');
  }
  return context;
}
