"use client"

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityContributor } from "@/lib/activity-permissions";

interface ContributorDisplayProps {
  contributors?: ActivityContributor[];
  maxDisplay?: number;
  showRoles?: boolean;
  className?: string;
}

export function ContributorDisplay({ 
  contributors = [], 
  maxDisplay = 2, 
  showRoles = false,
  className = "" 
}: ContributorDisplayProps) {
  // Filter only accepted contributors and sort by display order and role priority
  const acceptedContributors = contributors
    .filter(c => c.status === 'accepted')
    .sort((a, b) => {
      // Sort by display order first, then by role priority
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 999) - (b.displayOrder || 999);
      }
      
      // Role priority: funder > implementer > coordinator > partner > contributor
      const rolePriority = {
        'funder': 1,
        'implementer': 2,
        'coordinator': 3,
        'partner': 4,
        'contributor': 5
      };
      
      return (rolePriority[a.role] || 5) - (rolePriority[b.role] || 5);
    });

  if (acceptedContributors.length === 0) {
    return (
      <span className={`text-xs text-muted-foreground/70 ${className}`}>
        No contributors listed
      </span>
    );
  }

  const displayContributors = acceptedContributors.slice(0, maxDisplay);
  const remainingCount = acceptedContributors.length - maxDisplay;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'funder': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'implementer': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'coordinator': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'partner': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const formatOrganizationName = (contributor: ActivityContributor) => {
    if (contributor.organizationAcronym && contributor.organizationAcronym.trim()) {
      return contributor.organizationAcronym;
    }
    return contributor.organizationName;
  };

  const renderContributorTooltip = () => {
    if (acceptedContributors.length <= maxDisplay) {
      return null; // No tooltip needed if all contributors are shown
    }

    return (
      <TooltipContent className="max-w-sm">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">All Contributing Organizations:</h4>
          <div className="space-y-1">
            {acceptedContributors.map((contributor, index) => (
              <div key={contributor.id} className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {contributor.organizationAcronym && contributor.organizationAcronym.trim() 
                    ? `${contributor.organizationAcronym} • ${contributor.organizationName}`
                    : contributor.organizationName
                  }
                </span>
                <Badge 
                  variant="outline" 
                  className={`ml-2 text-xs ${getRoleBadgeColor(contributor.role)}`}
                >
                  {contributor.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-muted-foreground font-medium">
        {displayContributors.map((contributor, index) => (
          <React.Fragment key={contributor.id}>
            {index > 0 && ", "}
            <span className="text-gray-900">
              {formatOrganizationName(contributor)}
            </span>
            {showRoles && (
              <Badge 
                variant="outline" 
                className={`ml-1 text-xs ${getRoleBadgeColor(contributor.role)}`}
              >
                {contributor.role}
              </Badge>
            )}
          </React.Fragment>
        ))}
        
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-blue-600 hover:text-blue-800 cursor-help">
                {" "}+{remainingCount} more
              </span>
            </TooltipTrigger>
            {renderContributorTooltip()}
          </Tooltip>
        )}
      </span>
    </div>
  );
}

// Alternative compact version for very limited space
export function ContributorDisplayCompact({ 
  contributors = [], 
  className = "" 
}: ContributorDisplayProps) {
  const acceptedContributors = contributors.filter(c => c.status === 'accepted');
  
  if (acceptedContributors.length === 0) {
    return (
      <span className={`text-xs text-muted-foreground/70 ${className}`}>
        No contributors
      </span>
    );
  }

  if (acceptedContributors.length === 1) {
    const contributor = acceptedContributors[0];
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>
        {contributor.organizationAcronym || contributor.organizationName}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-xs text-blue-600 hover:text-blue-800 cursor-help ${className}`}>
          {acceptedContributors.length} organizations
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Contributing Organizations:</h4>
          <div className="space-y-1">
            {acceptedContributors.map((contributor) => (
              <div key={contributor.id} className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {contributor.organizationAcronym && contributor.organizationAcronym.trim() 
                    ? `${contributor.organizationAcronym} • ${contributor.organizationName}`
                    : contributor.organizationName
                  }
                </span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {contributor.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
} 