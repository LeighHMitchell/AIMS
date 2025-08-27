import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ActivityCardSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm relative group ${className}`}>
      {/* Banner skeleton - matches actual card height */}
      <div className="relative">
        <Skeleton className="w-full h-48" />
        
        {/* Activity icon skeleton */}
        <div className="absolute right-6 bottom-0 translate-y-1/2">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-6 pb-16 space-y-4">
        {/* Title and IDs */}
        <div className="space-y-3">
          <div className="pt-8">
            <Skeleton className="h-6 w-3/4 mb-2" />
          </div>
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Status pills */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Activity Details section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-t border-b border-gray-200">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        
        {/* Date section */}
        <div className="pt-3 border-t border-gray-200 space-y-1">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      {/* Last updated skeleton */}
      <div className="absolute bottom-4 left-4">
        <Skeleton className="h-3 w-24" />
      </div>
      
      {/* Action menu skeleton */}
      <div className="absolute bottom-4 right-4">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}; 