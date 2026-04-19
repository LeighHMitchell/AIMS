'use client';

import { TextShimmer } from '@/components/motion-primitives/text-shimmer';
import { cn } from '@/lib/utils';

interface LoadingTextProps {
  children: string;
  className?: string;
  duration?: number;
}

export function LoadingText({
  children,
  className,
  duration = 1.5
}: LoadingTextProps) {
  return (
    <TextShimmer
      className={cn('text-body', className)}
      duration={duration}
    >
      {children}
    </TextShimmer>
  );
}

const CHART_SKELETON_HEIGHTS = [32, 58, 44, 72, 50, 84, 40, 66, 52, 38];

export function ChartLoadingPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-full w-full flex items-end gap-2 px-4 pb-6 pt-8',
        className,
      )}
      role="status"
      aria-label="Loading chart data"
    >
      {CHART_SKELETON_HEIGHTS.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-muted/70 animate-pulse"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 90}ms`,
            animationDuration: '1.6s',
          }}
        />
      ))}
      <span className="sr-only">Loading chart data</span>
    </div>
  );
}



