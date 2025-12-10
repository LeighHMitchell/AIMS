'use client';

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface OrganizationInfo {
  name: string;
  acronym?: string | null;
  logo?: string | null;
}

interface OrganizationAvatarGroupProps {
  organizations: OrganizationInfo[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showNameForSingle?: boolean;
  label?: string; // Label for the tooltip header (e.g., "Funding Organisations")
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

/**
 * Get initials from organization name or acronym
 */
function getInitials(org: OrganizationInfo): string {
  if (org.acronym) {
    return org.acronym.slice(0, 2).toUpperCase();
  }
  // Get first two letters of each word, max 2 letters
  const words = org.name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return org.name.slice(0, 2).toUpperCase();
}

/**
 * Generate a consistent color based on organization name
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
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function OrganizationAvatarGroup({
  organizations,
  maxDisplay = 3,
  size = 'sm',
  showNameForSingle = true,
  label,
}: OrganizationAvatarGroupProps) {
  if (!organizations || organizations.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const sizeClass = sizeClasses[size];
  const displayOrgs = organizations.slice(0, maxDisplay);
  const remainingCount = organizations.length - maxDisplay;

  // Single organization - show avatar with name
  if (organizations.length === 1 && showNameForSingle) {
    const org = organizations[0];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className={`${sizeClass} ring-2 ring-white`}>
                {org.logo ? (
                  <AvatarImage src={org.logo} alt={org.name} className="object-cover" />
                ) : null}
                <AvatarFallback className={`${getColorFromName(org.name)} font-medium`}>
                  {getInitials(org)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[150px]">{org.name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-white border shadow-lg p-3">
            <p className="text-sm font-medium">{org.name}</p>
            {org.acronym && <p className="text-xs text-muted-foreground">{org.acronym}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Multiple organizations - show stacked avatars with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-pointer">
            <div className="flex -space-x-2">
              {displayOrgs.map((org, index) => (
                <Avatar
                  key={index}
                  className={`${sizeClass} ring-2 ring-white`}
                  style={{ zIndex: displayOrgs.length - index }}
                >
                  {org.logo ? (
                    <AvatarImage src={org.logo} alt={org.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`${getColorFromName(org.name)} font-medium`}>
                    {getInitials(org)}
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
                {label} ({organizations.length})
              </p>
            )}
            {organizations.map((org, index) => (
              <div key={index} className="flex items-center gap-2">
                <Avatar className="h-5 w-5 text-[9px] ring-1 ring-gray-200">
                  {org.logo ? (
                    <AvatarImage src={org.logo} alt={org.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`${getColorFromName(org.name)} font-medium`}>
                    {getInitials(org)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{org.name}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
