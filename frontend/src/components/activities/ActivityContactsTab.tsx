'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Grid3X3, 
  List, 
  Mail, 
  Phone, 
  Globe, 
  Users, 
  AlertCircle,
  MailPlus,
  Building2,
  UserCheck
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatar, getInitials } from '@/components/ui/user-avatar';
import { validateIatiContactType } from '@/lib/contact-utils';

type ViewMode = 'grid' | 'table';

interface Contact {
  id?: string;
  type: string;
  title?: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  position?: string;
  department?: string;
  organisation?: string;
  organisationId?: string;
  organisationAcronym?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  website?: string;
  mailingAddress?: string;
  profilePhoto?: string;
  isFocalPoint?: boolean;
  importedFromIati?: boolean;
}

interface FocalPoint {
  id: string;
  name: string;
  email: string;
  type: 'government_focal_point' | 'development_partner_focal_point';
  status: string;
  job_title?: string;
  avatar_url?: string;
  organisation?: string;
  organization?: {
    id: string;
    name: string;
    acronym?: string;
  } | null;
}

interface ActivityContactsTabProps {
  activityId: string;
}

export default function ActivityContactsTab({ activityId }: ActivityContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [focalPoints, setFocalPoints] = useState<{ government: FocalPoint[], development_partner: FocalPoint[] }>({
    government: [],
    development_partner: []
  });
  const [loading, setLoading] = useState(true);
  const [focalPointsLoading, setFocalPointsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Fetch contacts
  useEffect(() => {
    async function fetchContacts() {
      if (!activityId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/activities/${activityId}/contacts`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        
        const data = await response.json();
        setContacts(data || []);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContacts();
  }, [activityId]);

  // Fetch focal points
  useEffect(() => {
    async function fetchFocalPoints() {
      if (!activityId) return;
      
      try {
        setFocalPointsLoading(true);
        const response = await fetch(`/api/activities/${activityId}/focal-points`);
        
        if (!response.ok) {
          console.error('Failed to fetch focal points');
          return;
        }
        
        const data = await response.json();
        setFocalPoints({
          government: data.government_focal_points || [],
          development_partner: data.development_partner_focal_points || []
        });
      } catch (err) {
        console.error('Error fetching focal points:', err);
      } finally {
        setFocalPointsLoading(false);
      }
    }
    
    fetchFocalPoints();
  }, [activityId]);

  // Using getInitials from UserAvatar component

  // Get full name from contact
  const getFullName = (contact: Contact) => {
    return `${contact.title ? contact.title + ' ' : ''}${contact.firstName} ${contact.lastName}`.trim();
  };

  // Get job line (job title + department)
  const getJobLine = (contact: Contact) => {
    return [contact.jobTitle || contact.position, contact.department].filter(Boolean).join(' • ');
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
          <div className="h-9 bg-slate-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-slate-200 rounded-2xl p-6 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-4/5 animate-pulse"></div>
                <div className="h-4 bg-slate-200 rounded w-3/5 animate-pulse"></div>
              </div>
              <div className="mt-4">
                <div className="h-6 bg-slate-200 rounded-full w-24 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-medium">Error loading contacts</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No contacts found</h3>
          <p className="text-slate-600">
            No contacts have been added to this activity yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render contact card
  const renderContactCard = (contact: Contact) => {
    const fullName = getFullName(contact);
    const jobLine = getJobLine(contact);
    const typeInfo = validateIatiContactType(contact.type);

    return (
      <div 
        key={contact.id} 
        className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
      >
        {/* Left-aligned layout with avatar on left */}
        <div className="flex items-start gap-4">
          {/* Profile Photo - left side */}
          <UserAvatar
            src={contact.profilePhoto}
            seed={contact.id || contact.email || fullName}
            name={fullName}
            size="lg"
            initials={getInitials(fullName)}
          />

          {/* Content - right side */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Line 1: Title, First Name, Last Name */}
            <h3 className="text-lg font-semibold text-slate-900 leading-tight break-words">
              {fullName}
              {contact.isFocalPoint && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">
                        <MailPlus className="h-4 w-4 ml-2 inline text-slate-600" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
                      <p className="text-sm text-gray-600 font-normal">This contact is designated as the focal point for this activity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h3>

            {/* Line 2: Job Title • Department */}
            {jobLine && (
              <p className="text-sm text-slate-600 break-words">
                {jobLine}
              </p>
            )}

            {/* Line 3: Organization */}
            {contact.organisation && (
              <p className="text-sm text-slate-600 break-words">
                {contact.organisation}
                {contact.organisationAcronym && (
                  <span className="text-slate-500 ml-1">({contact.organisationAcronym})</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-4 space-y-2">
          {contact.email && (
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <a 
                href={`mailto:${contact.email}`} 
                className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
              >
                {contact.email}
              </a>
            </div>
          )}

          {(contact.phone || contact.phoneNumber) && (
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">
                {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
              </span>
            </div>
          )}

          {contact.website && (
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <a 
                href={contact.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-slate-700 hover:text-blue-600 transition-colors truncate"
              >
                {contact.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>

        {/* Contact Type at bottom */}
        <div className="mt-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {typeInfo.label}
          </span>
        </div>
      </div>
    );
  };

  // Render table view
  const renderTableView = () => {
    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Position</TableHead>
              <TableHead className="font-semibold">Organization</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const fullName = getFullName(contact);
              const jobLine = getJobLine(contact);
              const typeInfo = validateIatiContactType(contact.type);
              
              return (
                <TableRow key={contact.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={contact.profilePhoto}
                        seed={contact.id || contact.email || fullName}
                        name={fullName}
                        size="sm"
                        initials={getInitials(fullName)}
                      />
                      <div>
                        <span className="font-medium text-slate-900">{fullName}</span>
                        {contact.isFocalPoint && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">
                                  <MailPlus className="h-3 w-3 ml-1 inline text-slate-600" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
                                <p className="text-sm text-gray-600 font-normal">Focal Point</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {jobLine || '-'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {contact.organisation ? (
                      <>
                        {contact.organisation}
                        {contact.organisationAcronym && (
                          <span className="text-slate-400 ml-1">({contact.organisationAcronym})</span>
                        )}
                      </>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        {contact.email}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {contact.phone || contact.phoneNumber ? (
                      <span>
                        {contact.countryCode ? `${contact.countryCode} ` : ''}{contact.phoneNumber || contact.phone}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {typeInfo.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Helper to get initials for focal point avatars
  const getFocalPointInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render focal point card
  const renderFocalPointCard = (focalPoint: FocalPoint, type: 'government' | 'development_partner') => {
    const orgName = focalPoint.organization?.name || focalPoint.organisation;
    const orgAcronym = focalPoint.organization?.acronym;
    
    return (
      <div 
        key={focalPoint.id}
        className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg"
      >
        <UserAvatar
          src={focalPoint.avatar_url}
          seed={focalPoint.id || focalPoint.email || focalPoint.name}
          name={focalPoint.name}
          size="md"
          initials={getInitials(focalPoint.name)}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-slate-900">{focalPoint.name}</h4>
            <Badge variant="outline" className={
              type === 'government' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }>
              {type === 'government' ? 'Government' : 'Development Partner'}
            </Badge>
          </div>
          
          <p className="text-sm text-slate-600 mt-0.5">{focalPoint.email}</p>
          
          {focalPoint.job_title && (
            <p className="text-sm text-slate-500">{focalPoint.job_title}</p>
          )}
          
          {orgName && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              {orgName}
              {orgAcronym && ` (${orgAcronym})`}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Render focal points section
  const renderFocalPointsSection = () => {
    const hasFocalPoints = focalPoints.government.length > 0 || focalPoints.development_partner.length > 0;
    
    if (focalPointsLoading) {
      return (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-slate-600" />
              Activity Focal Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (!hasFocalPoints) {
      return null;
    }
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-5 w-5 text-slate-600" />
            Activity Focal Points
          </CardTitle>
          <CardDescription className="text-xs">
            Key contacts responsible for this activity. Reach out to them for project information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {focalPoints.government.map(fp => renderFocalPointCard(fp, 'government'))}
            {focalPoints.development_partner.map(fp => renderFocalPointCard(fp, 'development_partner'))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Focal Points Section */}
      {renderFocalPointsSection()}

      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Activity Contacts ({contacts.length})
        </h3>
        
        <div className="flex border border-slate-200 rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contacts.map(renderContactCard)}
        </div>
      ) : (
        renderTableView()
      )}
    </div>
  );
}






