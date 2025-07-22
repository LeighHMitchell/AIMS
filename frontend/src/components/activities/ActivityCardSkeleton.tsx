import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ActivityCardSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Banner skeleton */}
      <Skeleton className="w-full h-20 sm:h-24 lg:h-28" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title and ID */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        
        {/* Description */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Status badges */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        {/* Date */}
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}; 