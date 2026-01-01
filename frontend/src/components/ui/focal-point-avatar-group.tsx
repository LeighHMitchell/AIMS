'use client';

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FocalPointInfo {
  name: string;
  email?: string;
  avatar_url?: string | null;
}

interface FocalPointAvatarGroupProps {
  focalPoints: FocalPointInfo[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

/**
 * Get initials from person name
 */
function getInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generate a consistent color based on name
 */
function getColorFromName(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-cyan-100 text-cyan-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function FocalPointAvatarGroup({
  focalPoints,
  maxDisplay = 3,
  size = 'sm',
  label,
}: FocalPointAvatarGroupProps) {
  if (!focalPoints || focalPoints.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const sizeClass = sizeClasses[size];
  const displayFPs = focalPoints.slice(0, maxDisplay);
  const remainingCount = focalPoints.length - maxDisplay;

  // Single focal point - show avatar with name
  if (focalPoints.length === 1) {
    const fp = focalPoints[0];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className={`${sizeClass} ring-2 ring-white`}>
                {fp.avatar_url ? (
                  <AvatarImage src={fp.avatar_url} alt={fp.name} className="object-cover" />
                ) : null}
                <AvatarFallback className={`${getColorFromName(fp.name)} font-medium`}>
                  {getInitials(fp.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px] text-sm">{fp.name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-white border shadow-lg p-3">
            <p className="text-sm font-medium">{fp.name}</p>
            {fp.email && <p className="text-xs text-muted-foreground">{fp.email}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Multiple focal points - show stacked avatars with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="flex -space-x-2">
              {displayFPs.map((fp, index) => (
                <Avatar
                  key={index}
                  className={`${sizeClass} ring-2 ring-white`}
                  style={{ zIndex: displayFPs.length - index }}
                >
                  {fp.avatar_url ? (
                    <AvatarImage src={fp.avatar_url} alt={fp.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`${getColorFromName(fp.name)} font-medium`}>
                    {getInitials(fp.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <Avatar
                  className={`${sizeClass} ring-2 ring-white bg-gray-100`}
                  style={{ zIndex: 0 }}
                >
                  <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm bg-white border shadow-lg p-3">
          <div className="space-y-2">
            {label && (
              <p className="font-medium text-xs text-muted-foreground mb-2">
                {label} ({focalPoints.length})
              </p>
            )}
            {focalPoints.map((fp, index) => (
              <div key={index} className="flex items-center gap-2">
                <Avatar className="h-5 w-5 text-[9px] ring-1 ring-gray-200">
                  {fp.avatar_url ? (
                    <AvatarImage src={fp.avatar_url} alt={fp.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`${getColorFromName(fp.name)} font-medium`}>
                    {getInitials(fp.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{fp.name}</span>
                  {fp.email && (
                    <span className="text-xs text-muted-foreground">{fp.email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


