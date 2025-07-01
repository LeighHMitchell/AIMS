import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'shimmer-blush' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
  ...props
}: SkeletonProps) {
  const baseClasses = cn(
    animation === 'shimmer-blush' ? "bg-rose-100/50" : "bg-gray-200/50",
    animation === 'pulse' && "animate-pulse",
    animation === 'shimmer' && "skeleton-shimmer",
    animation === 'shimmer-blush' && "skeleton-shimmer-blush",
    {
      'rounded-md': variant === 'text' || variant === 'rectangular',
      'rounded-full': variant === 'circular',
      'rounded-xl': variant === 'rounded',
    },
    className
  );

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
    ...props.style,
  };

  return <div className={baseClasses} style={style} {...props} />;
}

// Skeleton Card Component
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4 rounded-xl bg-white shadow-sm", className)}>
      <Skeleton variant="text" width="75%" height="1rem" />
      <Skeleton variant="text" width="90%" height="1rem" />
      <Skeleton variant="text" width="60%" height="1rem" />
    </div>
  );
}

// Activity List Skeleton
export function ActivityListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" height="1.5rem" />
              <Skeleton variant="text" width="60%" height="1rem" />
            </div>
            <Skeleton variant="rounded" width="80px" height="32px" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton variant="text" width="120px" height="0.875rem" />
            <Skeleton variant="text" width="100px" height="0.875rem" />
            <Skeleton variant="text" width="140px" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Organisation Card Skeleton
export function OrganisationCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="1.25rem" />
          <Skeleton variant="text" width="40%" height="0.875rem" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton variant="text" width="80%" height="0.75rem" />
          <Skeleton variant="text" width="60%" height="1rem" />
        </div>
        <div className="space-y-1">
          <Skeleton variant="text" width="80%" height="0.75rem" />
          <Skeleton variant="text" width="60%" height="1rem" />
        </div>
      </div>
    </div>
  );
}

// Dashboard Stats Skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton variant="circular" width="40px" height="40px" />
            <Skeleton variant="text" width="60px" height="0.75rem" />
          </div>
          <div className="space-y-1">
            <Skeleton variant="text" width="80%" height="2rem" />
            <Skeleton variant="text" width="60%" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex gap-4">
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} variant="text" width={`${100 / columns}%`} height="1rem" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  variant="text" 
                  width={`${100 / columns}%`} 
                  height="0.875rem" 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = "300px" }: { height?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width="200px" height="1.5rem" />
          <Skeleton variant="rounded" width="120px" height="32px" />
        </div>
        <div className="relative" style={{ height }}>
          <div className="absolute inset-0 flex items-end justify-between gap-2 px-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton 
                key={i} 
                variant="rectangular" 
                width="100%" 
                height={`${Math.random() * 80 + 20}%`} 
                className="opacity-30"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 