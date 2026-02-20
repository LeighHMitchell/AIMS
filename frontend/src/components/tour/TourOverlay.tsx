'use client';

import React, { useMemo } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useTour } from './TourProvider';
import { Button } from '@/components/ui/button';
import type { TourStep as TourStepType } from './TourProvider';

// Custom tooltip to match shadcn styling; props match react-joyride TooltipRenderProps
function CustomTooltip(props: {
  continuous: boolean;
  index: number;
  isLastStep: boolean;
  size: number;
  step: Step & { title?: React.ReactNode };
  backProps: React.HTMLAttributes<HTMLButtonElement>;
  closeProps: React.HTMLAttributes<HTMLButtonElement>;
  primaryProps: React.HTMLAttributes<HTMLButtonElement>;
  skipProps: React.HTMLAttributes<HTMLButtonElement>;
  tooltipProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const {
    continuous,
    index,
    isLastStep,
    size,
    step,
    backProps,
    primaryProps,
    skipProps,
    tooltipProps,
  } = props;
  return (
    <div
      {...tooltipProps}
      className="rounded-lg border border-border bg-background p-4 shadow-lg"
      style={{ maxWidth: 380 }}
    >
      {step.title && (
        <h3 className="mb-2 font-semibold text-base text-foreground">{step.title}</h3>
      )}
      <div className="text-sm text-muted-foreground [&_p]:mb-2 last:[&_p]:mb-0">
        {step.content}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Step {index + 1} of {size}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" {...skipProps}>
            Skip
          </Button>
          {continuous && index > 0 && (
            <Button variant="outline" size="sm" {...backProps}>
              Back
            </Button>
          )}
          <Button size="sm" {...primaryProps}>
            {isLastStep ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TourOverlay() {
  const { steps: rawSteps, isRunning, completeTour, dismissTour, stopTour } = useTour();

  const joyrideSteps: Step[] = useMemo(
    () =>
      rawSteps.map((s: TourStepType) => ({
        target: s.target_selector,
        content: s.content,
        title: s.title,
        placement: s.placement || 'bottom',
        disableBeacon: s.disable_beacon ?? true,
        spotlightPadding: s.spotlight_padding ?? 10,
      })),
    [rawSteps]
  );

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED) {
      completeTour();
      stopTour();
    } else if (status === STATUS.SKIPPED) {
      dismissTour();
      stopTour();
    }
  };

  if (joyrideSteps.length === 0) return null;

  return (
    <Joyride
      steps={joyrideSteps}
      run={isRunning}
      continuous
      showProgress={false}
      showSkipButton
      disableOverlayClose={false}
      spotlightClicks={false}
      callback={handleCallback}
      tooltipComponent={(props) => <CustomTooltip {...props} />}
      styles={{
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        spotlight: { borderRadius: 8 },
      }}
      scrollToFirstStep
      scrollOffset={100}
    />
  );
}
