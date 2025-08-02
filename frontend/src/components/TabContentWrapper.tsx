'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TabContentWrapperProps {
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  showNavigation?: boolean;
}

export default function TabContentWrapper({
  children,
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Next',
  showNavigation = true
}: TabContentWrapperProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Navigation buttons at the top */}
      {showNavigation && (onBack || onNext) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-2"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            )}
          </div>
          <div>
            {onNext && (
              <Button
                variant="outline"
                onClick={onNext}
                className="flex items-center gap-2"
                size="sm"
              >
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Tab content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}