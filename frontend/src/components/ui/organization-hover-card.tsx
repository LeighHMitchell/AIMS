"use client"

import React from 'react';
import Link from 'next/link';
import { Building2, Globe, MapPin, ExternalLink } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
import { OrganizationLogo } from './organization-logo';

export interface OrganizationDisplayData {
  name: string;
  acronym: string;
  logo: string | null;
  id: string | null;
  type?: string | null;
  country?: string | null;
  iati_org_id?: string | null;
  description?: string | null;
  website?: string | null;
}

interface OrganizationHoverCardProps {
  organization: OrganizationDisplayData;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function OrganizationHoverCard({ 
  organization, 
  children,
  side = 'top',
  align = 'center'
}: OrganizationHoverCardProps) {
  // If there's no additional info to show, just render children
  const hasAdditionalInfo = organization.id || organization.type || organization.country || organization.iati_org_id || organization.description;
  
  if (!hasAdditionalInfo) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-80">
        <div className="space-y-3">
          {/* Header with logo and name */}
          <div className="flex items-start gap-3">
            <OrganizationLogo 
              logo={organization.logo} 
              name={organization.name} 
              size="lg" 
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {organization.name}
              </p>
              {organization.acronym && organization.acronym !== organization.name && (
                <p className="text-xs text-muted-foreground">
                  ({organization.acronym})
                </p>
              )}
            </div>
          </div>

          {/* Organization details */}
          <div className="space-y-2 text-xs">
            {organization.type && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>{organization.type}</span>
              </div>
            )}
            
            {organization.country && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{organization.country}</span>
              </div>
            )}
            
            {organization.iati_org_id && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {organization.iati_org_id}
                </span>
              </div>
            )}

            {organization.description && (
              <p className="text-muted-foreground line-clamp-4 pt-1 border-t border-border">
                {organization.description}
              </p>
            )}
          </div>

          {/* Footer with links */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            {organization.id && (
              <Link
                href={`/organizations/${organization.id}`}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                View profile
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {organization.website && (
              <a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

