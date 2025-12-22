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
      className={cn('text-sm', className)} 
      duration={duration}
    >
      {children}
    </TextShimmer>
  );
}
