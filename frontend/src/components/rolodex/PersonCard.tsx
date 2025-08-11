import React from 'react';
import { RolodexPerson } from '@/app/api/rolodex/route';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Mail, 
  Phone, 
  Building2, 
  FileText, 
  ExternalLink, 
  MoreVertical,
  Briefcase,
  Fax
} from 'lucide-react';
import { getRoleLabel } from './utils/roleLabels';

interface PersonCardProps {
  person: RolodexPerson;
  onOrganizationClick?: (organizationId: string) => void;
  onActivityClick?: (activityId: string) => void;
  compact?: boolean;
}

export function PersonCard({ 
  person, 
  onOrganizationClick, 
  onActivityClick,
  compact = false 
}: PersonCardProps) {
  const roleInfo = getRoleLabel(person.role_label || '');
  
  // Generate initials for avatar
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEmailClick = (email?: string) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const handlePhoneClick = () => {
    if (person.phone) {
      window.location.href = `tel:${person.phone}`;
    }
  };

  const handleFaxClick = () => {
    if (person.fax) {
      window.location.href = `tel:${person.fax}`;
    }
  };

  const handleOrganizationClick = () => {
    if (person.organization_id && onOrganizationClick) {
      onOrganizationClick(person.organization_id);
    }
  };

  const handleActivityClick = () => {
    if (person.activity_id && onActivityClick) {
      onActivityClick(person.activity_id);
    }
  };

  // Helper functions for display formatting
  const getDisplayName = () => {
    if (person.source === 'activity_contact') {
      // For Activity Contacts: Title, First Name, Middle Name, Last Name
      const nameParts = [
        person.title,
        person.first_name,
        person.middle_name,
        person.last_name
      ].filter(Boolean);
      return nameParts.length > 0 ? nameParts.join(' ') : person.email || 'Unknown Contact';
    } else {
      // For Users: First Name, Last Name
      const nameParts = [person.first_name, person.last_name].filter(Boolean);
      return nameParts.length > 0 ? nameParts.join(' ') : person.email || 'Unknown User';
    }
  };

  const getJobInfo = () => {
    if (person.source === 'activity_contact') {
      // For Activity Contacts: Position/Role
      return person.position || person.role;
    } else {
      // For Users: Job Title, Department
      const jobParts = [person.job_title, person.department].filter(Boolean);
      return jobParts.join(', ') || person.position;
    }
  };

  const getOrganizationInfo = () => {
    if (person.organization_name && person.organization_acronym) {
      return `${person.organization_name}, ${person.organization_acronym}`;
    }
    return person.organization_name || '';
  };

  const displayName = getDisplayName();
  const jobInfo = getJobInfo();
  const organizationInfo = getOrganizationInfo();

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            {person.profile_photo && (
              <AvatarImage src={person.profile_photo} alt={displayName} />
            )}
            <AvatarFallback className="text-xs font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {displayName}
            </p>
            <div className="flex items-center space-x-2">
              {jobInfo && (
                <span className="text-xs text-slate-500 truncate">
                  {jobInfo}
                </span>
              )}
              
              {organizationInfo && (
                <span className="text-xs text-slate-500 truncate">
                  • {organizationInfo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {person.email && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEmailClick(person.email)}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Email: {person.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {person.organization_id && (
                <DropdownMenuItem onClick={handleOrganizationClick}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Organization
                </DropdownMenuItem>
              )}
              {person.activity_id && (
                <DropdownMenuItem onClick={handleActivityClick}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Activity
                </DropdownMenuItem>
              )}
              {person.email && (
                <DropdownMenuItem onClick={() => handleEmailClick(person.email)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              {person.profile_photo && (
                <AvatarImage src={person.profile_photo} alt={displayName} />
              )}
              <AvatarFallback className="text-sm font-medium bg-slate-100">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {displayName}
              </h3>
              
              {/* Job/Position Info */}
              {jobInfo && (
                <div className="flex items-center space-x-2 text-sm text-slate-600 mb-1">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span>{jobInfo}</span>
                </div>
              )}

              {/* Organization Info */}
              {organizationInfo && (
                <div className="flex items-center space-x-2 text-sm text-slate-600 mb-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <button
                    onClick={handleOrganizationClick}
                    className="hover:text-blue-600 transition-colors truncate"
                    disabled={!person.organization_id}
                  >
                    {organizationInfo}
                  </button>
                  {person.organization_id && (
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  )}
                </div>
              )}

              {/* User Role Badge for System Users */}
              {person.source === 'user' && person.role && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${roleInfo.color}`}
                >
                  {roleInfo.label}
                </Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {person.organization_id && (
                <DropdownMenuItem onClick={handleOrganizationClick}>
                  <Building2 className="mr-2 h-4 w-4" />
                  View Organization
                </DropdownMenuItem>
              )}
              {person.activity_id && (
                <DropdownMenuItem onClick={handleActivityClick}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Activity
                </DropdownMenuItem>
              )}
              {person.email && (
                <DropdownMenuItem onClick={() => handleEmailClick(person.email)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Contact Information */}
        <div className="space-y-2">
          {/* Email Section */}
          {(person.email || person.secondary_email) && (
            <div className="space-y-1">
              {person.email && (
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <button
                    onClick={() => handleEmailClick(person.email)}
                    className="text-slate-600 hover:text-blue-600 transition-colors truncate"
                  >
                    {person.email}
                  </button>
                </div>
              )}
              {person.secondary_email && (
                <div className="flex items-center space-x-2 text-sm ml-6">
                  <span className="text-slate-400">|</span>
                  <button
                    onClick={() => handleEmailClick(person.secondary_email)}
                    className="text-slate-600 hover:text-blue-600 transition-colors truncate"
                  >
                    {person.secondary_email}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Phone Section */}
          {(person.phone || person.fax) && (
            <div className="space-y-1">
              {person.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <button
                    onClick={handlePhoneClick}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    {person.phone}
                  </button>
                </div>
              )}
              {person.fax && (
                <div className="flex items-center space-x-2 text-sm ml-6">
                  <span className="text-slate-400">|</span>
                  <button
                    onClick={handleFaxClick}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Fax className="h-3 w-3 mr-1 inline" />
                    {person.fax}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes if available */}
        {person.notes && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-sm">
              <p className="text-slate-600 text-xs leading-relaxed">{person.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}