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
  MapPin,
  Calendar,
  User,
  Briefcase,
  StickyNote
} from 'lucide-react';
import { getRoleLabel, getSourceLabel, getCountryName } from './utils/roleLabels';
import { format } from 'date-fns';

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
  const roleInfo = getRoleLabel(person.role_label);
  const sourceInfo = getSourceLabel(person.source);
  
  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEmailClick = () => {
    if (person.email) {
      window.location.href = `mailto:${person.email}`;
    }
  };

  const handlePhoneClick = () => {
    if (person.phone) {
      window.location.href = `tel:${person.phone}`;
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

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            {person.profile_photo && (
              <AvatarImage src={person.profile_photo} alt={person.name} />
            )}
            <AvatarFallback className="text-xs font-medium">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {person.name}
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {roleInfo.label}
              </Badge>
              {person.position && (
                <span className="text-xs text-slate-500 truncate">
                  {person.position}
                </span>
              )}
              {person.organization_name && (
                <span className="text-xs text-slate-500 truncate">
                  @ {person.organization_name}
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
                    onClick={handleEmailClick}
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
                <DropdownMenuItem onClick={handleEmailClick}>
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
            <Avatar className="h-10 w-10">
              {person.profile_photo && (
                <AvatarImage src={person.profile_photo} alt={person.name} />
              )}
              <AvatarFallback className="text-sm font-medium bg-slate-100">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900 truncate">
                {person.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${roleInfo.color}`}
                >
                  {roleInfo.label}
                </Badge>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                >
                  {sourceInfo.icon} {sourceInfo.label}
                </Badge>
              </div>
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
                <DropdownMenuItem onClick={handleEmailClick}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Position if available */}
        {person.position && (
          <div className="flex items-center space-x-2 text-sm">
            <Briefcase className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">{person.position}</span>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2">
          {person.email && (
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <button
                onClick={handleEmailClick}
                className="text-slate-600 hover:text-blue-600 transition-colors truncate"
              >
                {person.email}
              </button>
            </div>
          )}
          
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
        </div>

        {/* Organization/Activity Links */}
        <div className="space-y-2">
          {person.organization_name && (
            <div className="flex items-center space-x-2 text-sm">
              <Building2 className="h-4 w-4 text-slate-400" />
              <button
                onClick={handleOrganizationClick}
                className="text-slate-600 hover:text-blue-600 transition-colors truncate flex-1 text-left"
                disabled={!person.organization_id}
              >
                {person.organization_name}
              </button>
              {person.organization_id && (
                <ExternalLink className="h-3 w-3 text-slate-400" />
              )}
            </div>
          )}

          {person.activity_title && (
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-slate-400" />
              <button
                onClick={handleActivityClick}
                className="text-slate-600 hover:text-blue-600 transition-colors truncate flex-1 text-left"
                disabled={!person.activity_id}
              >
                {person.activity_title}
              </button>
              {person.activity_id && (
                <ExternalLink className="h-3 w-3 text-slate-400" />
              )}
            </div>
          )}
        </div>

        {/* Notes if available */}
        {person.notes && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-start space-x-2 text-sm">
              <StickyNote className="h-4 w-4 text-slate-400 mt-0.5" />
              <p className="text-slate-600 text-xs leading-relaxed">{person.notes}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          {person.country_code && (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              <span>{getCountryName(person.country_code)}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>Added {format(new Date(person.created_at), 'MMM dd, yyyy')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}