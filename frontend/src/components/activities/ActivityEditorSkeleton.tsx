import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ActivityEditorSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden gap-x-6 lg:gap-x-8">
      {/* Activity Editor Navigation Panel Skeleton */}
      <aside className="w-80 flex-shrink-0 bg-white overflow-y-auto animate-pulse">
        {/* Activity Metadata Summary Skeleton */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4 bg-gray-200" />
            <Skeleton className="h-5 w-24 bg-gray-100" />
            
            <div className="space-y-2 mt-4">
              <div>
                <Skeleton className="h-3 w-20 bg-gray-100 mb-1" />
                <Skeleton className="h-4 w-full bg-gray-200" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 bg-gray-100 mb-1" />
                <Skeleton className="h-4 w-32 bg-gray-200" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 bg-gray-100 mb-1" />
                <Skeleton className="h-4 w-24 bg-gray-200" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 bg-gray-100 mb-1" />
                <Skeleton className="h-4 w-24 bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Items Skeleton */}
        <div className="p-4">
          <Skeleton className="h-4 w-32 bg-gray-200 mb-4" />
          
          {/* Navigation sections */}
          <div className="space-y-6">
            {/* General Section */}
            <div>
              <Skeleton className="h-3 w-24 bg-gray-100 mb-2" />
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-gray-50 rounded" />
                ))}
              </div>
            </div>
            
            {/* Stakeholders Section */}
            <div>
              <Skeleton className="h-3 w-24 bg-gray-100 mb-2" />
              <div className="space-y-1">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-gray-50 rounded" />
                ))}
              </div>
            </div>
            
            {/* Finances Section */}
            <div>
              <Skeleton className="h-3 w-24 bg-gray-100 mb-2" />
              <div className="space-y-1">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-gray-50 rounded" />
                ))}
              </div>
            </div>
          </div>
          
          {/* Activity Completion Rating Widget Skeleton */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <Skeleton className="h-4 w-32 bg-gray-200 mb-2" />
            <Skeleton className="h-2 w-full bg-gray-200 rounded-full mb-2" />
            <Skeleton className="h-3 w-16 bg-gray-100" />
          </div>
        </div>
      </aside>

      {/* Main Content Panel Skeleton */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white">
        <div className="activity-editor pl-0 pr-6 md:pr-8 py-6">
          {/* Page Title */}
          <Skeleton className="h-9 w-48 bg-gray-200 mb-8" />
          
          {/* Comments Button */}
          <Skeleton className="h-9 w-32 bg-gray-100 mb-6 rounded" />
          
          {/* Section Title */}
          <Skeleton className="h-7 w-64 bg-gray-200 mb-6" />
          
          {/* Content Area - General Information Tab Example */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
            {/* Banner and Icon Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Skeleton className="h-4 w-24 bg-gray-100 mb-2" />
                <Skeleton className="h-48 w-full bg-gray-100 rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 bg-gray-100 mb-2" />
                <Skeleton className="h-32 w-32 bg-gray-100 rounded-lg" />
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-gray-100" />
                  <Skeleton className="h-10 w-full bg-gray-50 rounded" />
                </div>
              ))}
            </div>

            {/* Title Field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-gray-100" />
              <Skeleton className="h-10 w-full bg-gray-50 rounded" />
            </div>

            {/* Text Areas */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32 bg-gray-100" />
                <Skeleton className="h-24 w-full bg-gray-50 rounded" />
              </div>
            ))}

            {/* Dropdowns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-gray-100" />
                  <Skeleton className="h-10 w-full bg-gray-50 rounded" />
                </div>
              ))}
            </div>

            {/* Date Fields */}
            <div>
              <Skeleton className="h-4 w-24 bg-gray-200 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-gray-100" />
                    <Skeleton className="h-10 w-full bg-gray-50 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Status Line */}
            <div className="pt-4 border-t">
              <Skeleton className="h-4 w-64 bg-gray-100" />
            </div>
          </div>
        </div>
        
        {/* Sticky Footer Skeleton */}
        <footer className="sticky bottom-0 bg-white border-t border-gray-200 py-4 mt-12 flex justify-between gap-4 z-10 px-6 md:px-8">
          <div className="flex gap-2">
            {/* Validation buttons placeholder */}
          </div>
          
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 bg-gray-200 rounded" />
            <Skeleton className="h-10 w-32 bg-blue-200 rounded" />
            <Skeleton className="h-10 w-24 bg-green-200 rounded" />
          </div>
        </footer>
      </main>
    </div>
  );
}

// Skeleton for specific tab content
export function TabContentSkeleton({ variant = 'form' }: { variant?: 'form' | 'table' | 'cards' }) {
  if (variant === 'table') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48 bg-gray-100" />
        </div>
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 bg-gray-100 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 bg-gray-200" />
                <Skeleton className="h-3 w-1/2 bg-gray-100" />
              </div>
              <Skeleton className="h-8 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4 bg-gray-200" />
                <Skeleton className="h-4 w-full bg-gray-100" />
                <Skeleton className="h-4 w-2/3 bg-gray-100" />
              </div>
              <Skeleton className="h-6 w-16 bg-gray-100 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 bg-gray-100 rounded" />
              <Skeleton className="h-8 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default form variant
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32 bg-gray-100" />
          <Skeleton className="h-10 w-full bg-gray-50 rounded" />
        </div>
      ))}
    </div>
  );
}

// Minimal skeleton for tab switching
export function TabTransitionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-48 bg-gray-200" />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-4">
        <Skeleton className="h-4 w-full bg-gray-100" />
        <Skeleton className="h-4 w-3/4 bg-gray-100" />
        <Skeleton className="h-4 w-1/2 bg-gray-100" />
      </div>
    </div>
  );
} 