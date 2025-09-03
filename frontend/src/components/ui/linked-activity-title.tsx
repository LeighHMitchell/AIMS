"use client";

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedActivityTitleProps {
  title: string;
  activityId?: string;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  fallbackElement?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
}

export function LinkedActivityTitle({
  title,
  activityId,
  className,
  showIcon = true,
  children,
  fallbackElement = 'span'
}: LinkedActivityTitleProps) {
  const displayTitle = title || 'Untitled Activity';
  
  // If we have an activity ID, render as a link
  if (activityId) {
    return (
      <Link 
        href={`/activities/${activityId}`}
        className={cn(
          "cursor-pointer transition-opacity duration-200 hover:opacity-80",
          className
        )}
        title={`View activity profile: ${displayTitle}`}
      >
        {displayTitle}{" "}{showIcon && (
          <ExternalLink className="inline h-5 w-5" style={{ verticalAlign: "middle" }} aria-hidden="true" />
        )}
        {children}
      </Link>
    );
  }
  
  // If no activity ID, render as a regular element
  const Element = fallbackElement;
  return (
    <Element className={className}>
      {displayTitle}
      {children}
    </Element>
  );
}
