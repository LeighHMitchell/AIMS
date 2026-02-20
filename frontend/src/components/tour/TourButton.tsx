'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTour } from './TourProvider';
import { cn } from '@/lib/utils';

/**
 * Navbar button to start the page tour. Shows a pulse when a tour is available but not yet completed.
 * Only visible when the current page has a tour.
 */
export function TourButton() {
  const {
    currentTour,
    hasAvailableTour,
    isCompleted,
    isDismissed,
    startTour,
    resetTours,
    isLoading,
  } = useTour();

  const showPulse = hasAvailableTour && !isCompleted && !isDismissed;

  if (!currentTour || isLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Page tour"
          title={currentTour.title}
        >
          <GraduationCap className="h-5 w-5 text-neutral-600" />
          {showPulse && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary',
                'animate-pulse'
              )}
              aria-hidden
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => startTour()}>
          Take page tour
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => resetTours()}
          className="text-muted-foreground"
        >
          Reset all tours
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
