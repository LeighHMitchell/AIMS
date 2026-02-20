'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export interface TourStep {
  id: string;
  step_order: number;
  target_selector: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  spotlight_padding?: number;
  disable_beacon?: boolean;
}

export interface Tour {
  id: string;
  slug: string;
  route_pattern: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface TourContextType {
  currentTour: Tour | null;
  steps: TourStep[];
  isRunning: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  hasAvailableTour: boolean;
  startTour: () => void;
  stopTour: () => void;
  /** Call when user completes all steps (dismissed: false). */
  completeTour: () => void;
  /** Call when user skips/closes the tour (dismissed: true). */
  dismissTour: () => void;
  resetTours: (tourSlug?: string) => Promise<void>;
  isLoading: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const AUTO_START_DELAY_MS = 2000;

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const autoStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAvailableTour = !!currentTour && steps.length > 0;

  const fetchTour = useCallback(async () => {
    if (!user?.id || !pathname) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tours?route=${encodeURIComponent(pathname)}&locale=en`);
      if (!res.ok) throw new Error('Failed to fetch tour');
      const data = await res.json();
      setCurrentTour(data.tour || null);
      setSteps(data.steps || []);
      setIsCompleted(!!data.isCompleted);
      setIsDismissed(!!data.isDismissed);
    } catch (err) {
      console.error('[TourProvider] Error fetching tour:', err);
      setCurrentTour(null);
      setSteps([]);
      setIsCompleted(false);
      setIsDismissed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, pathname]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const startTour = useCallback(() => {
    if (hasAvailableTour) setIsRunning(true);
  }, [hasAvailableTour]);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const completeOrDismiss = useCallback(
    async (dismissed: boolean) => {
      if (!currentTour?.slug) return;
      try {
        await fetch('/api/tours/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tourSlug: currentTour.slug, dismissed }),
        });
        if (dismissed) setIsDismissed(true);
        else setIsCompleted(true);
      } catch (err) {
        console.error('[TourProvider] Error saving completion:', err);
      }
      setIsRunning(false);
    },
    [currentTour?.slug]
  );

  const completeTour = useCallback(() => {
    completeOrDismiss(false);
  }, [completeOrDismiss]);

  const dismissTour = useCallback(() => {
    completeOrDismiss(true);
  }, [completeOrDismiss]);

  const resetTours = useCallback(async (tourSlug?: string) => {
    try {
      await fetch('/api/tours/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tourSlug ? { tourSlug } : {}),
      });
      await fetchTour();
    } catch (err) {
      console.error('[TourProvider] Error resetting tours:', err);
    }
  }, [fetchTour]);

  // Auto-start tour when: user is set, tour exists, not completed, not dismissed, not already running
  useEffect(() => {
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
    if (!user?.id || !currentTour || isCompleted || isDismissed || isRunning || steps.length === 0) return;
    autoStartTimeoutRef.current = setTimeout(() => {
      autoStartTimeoutRef.current = null;
      setIsRunning(true);
    }, AUTO_START_DELAY_MS);
    return () => {
      if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
    };
  }, [user?.id, currentTour, isCompleted, isDismissed, isRunning, steps.length]);

  const value: TourContextType = {
    currentTour,
    steps,
    isRunning,
    isCompleted,
    isDismissed,
    hasAvailableTour,
    startTour,
    stopTour,
    completeTour,
    dismissTour,
    resetTours,
    isLoading,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (ctx === undefined) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
