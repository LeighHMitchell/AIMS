import React, { useState } from 'react';
import { RolodexPerson } from '@/app/api/rolodex/route';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar, getInitials } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Printer,
  Edit,
  User,
  Trash2
} from 'lucide-react';
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';
import { EditContactModal } from './EditContactModal';
import { UserEditModal } from './UserEditModal';

interface PersonCardProps {
  person: RolodexPerson;
  onOrganizationClick?: (organizationId: string) => void;
  onActivityClick?: (activityId: string) => void;
  onDelete?: (person: RolodexPerson) => void;
  compact?: boolean;
}

export function PersonCard({ 
  person, 
  onOrganizationClick, 
  onActivityClick,
  onDelete,
  compact = false 
}: PersonCardProps) {
  const { isSuperUser } = useUserRole();
  const router = useRouter();
  const [isContactEditModalOpen, setIsContactEditModalOpen] = useState(false);
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  // Use unified role utilities for consistent styling
  
  // Generate initials for avatar (keeping for backward compatibility)
  const getInitialsLocal = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if phone number is just a country code
  const isValidPhoneNumber = (phone: string) => {
    if (!phone) return false;
    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's just a country code (1-4 digits)
    return cleanPhone.length > 4;
  };

  // Check if this person is a super user
  const isPersonSuperUser = person.source === 'user' && (person.role === 'super_user' || person.role_label === 'super_user');

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

  const handleEditContact = () => {
    if (person.source === 'activity_contact' && person.activity_id) {
      // Navigate to Activity Editor's Contact tab
      router.push(`/activities/${person.activity_id}/edit?tab=contacts`);
    } else if (person.source === 'user') {
      // Open edit modal for users
      setIsUserEditModalOpen(true);
    }
  };

  const handleUpdateUser = (updatedPerson: RolodexPerson) => {
    // This would typically trigger a refresh of the rolodex data
    // For now, we'll just close the modal
    setIsUserEditModalOpen(false);
    // You might want to call a parent function to refresh the data
    // In a real app, you'd probably want to update the local state or refetch
  };

  const handleUpdateContact = (updatedPerson: RolodexPerson) => {
    // This would typically trigger a refresh of the rolodex data
    // For now, we'll just close the modal
    setIsContactEditModalOpen(false);
    // You might want to call a parent function to refresh the data
  };

  const handleDeleteContact = () => {
    if (onDelete && person.source === 'activity_contact') {
      onDelete(person);
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
      // For Users: Just Job Title (department will be shown separately)
      return person.job_title || person.position;
    }
  };

  const getDepartmentInfo = () => {
    if (person.source === 'user') {
      return person.department;
    }
    return null;
  };

  const getOrganizationInfo = () => {
    if (person.organization_name && person.organization_acronym) {
      return `${person.organization_name} (${person.organization_acronym})`;
    }
    return person.organization_name || '';
  };

  const displayName = getDisplayName();
  const jobInfo = getJobInfo();
  const departmentInfo = getDepartmentInfo();
  const organizationInfo = getOrganizationInfo();

  if (compact) {
    return (
      <div className="flex items-start justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <UserAvatar
            src={person.profile_photo}
            seed={person.id || person.email || displayName}
            name={displayName}
            size="sm"
            initials={getInitials(displayName)}
          />
          
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-900 break-words leading-tight">
                {displayName}
              </p>
              <div className="flex items-center space-x-1 ml-2">
                {/* Super User Badge - only for super users */}
                {isPersonSuperUser && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs flex-shrink-0 bg-red-100 text-red-700"
                  >
                    Super User
                  </Badge>
                )}
                
                <Badge
                  variant="secondary"
                  className="text-xs flex-shrink-0"
                  style={{
                    backgroundColor: person.source === 'user' ? '#4C5568' : '#DC2625',
                    color: 'white'
                  }}
                >
                  {person.source === 'user' ? 'User' : 'Activity'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-1">
              {/* Role Pill - only for Users (but not super users since they have their own badge) */}
              {person.source === 'user' && person.role && !isPersonSuperUser && (
                <div>
                  <Badge 
                    variant={getRoleBadgeVariant(person.role)} 
                    className="text-xs"
                  >
                    {getRoleDisplayLabel(person.role)}
                  </Badge>
                </div>
              )}
              
              {jobInfo && (
                <div className="text-xs text-slate-500 break-words">
                  {jobInfo}
                </div>
              )}
              
              {departmentInfo && (
                <div className="text-xs text-slate-500 break-words">
                  {departmentInfo}
                </div>
              )}
              
              {organizationInfo && (
                <div className="text-xs text-slate-500 break-words" title={organizationInfo}>
                  {organizationInfo}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
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
              <Button variant="outline" size="icon" className="h-8 w-8">
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
              {onDelete && person.source === 'activity_contact' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDeleteContact}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Contact
                  </DropdownMenuItem>
                </>
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
        <div className="flex flex-col space-y-3">
          {/* Top row: Avatar (top-left) and Source Badge (top-right) */}
          <div className="flex items-start justify-between">
            <UserAvatar
              src={person.profile_photo}
              seed={person.id || person.email || displayName}
              name={displayName}
              size="md"
              initials={getInitials(displayName)}
            />
            
            {/* Source Badge in top-right */}
            <div className="flex items-center space-x-2">
              {/* Super User Badge - only for super users */}
              {isPersonSuperUser && (
                <Badge 
                  variant="secondary" 
                  className="text-xs flex-shrink-0 bg-red-100 text-red-700"
                >
                  Super User
                </Badge>
              )}
              
              <Badge
                variant="secondary"
                className="text-xs flex-shrink-0"
                style={{
                  backgroundColor: person.source === 'user' ? '#4C5568' : '#DC2625',
                  color: 'white'
                }}
              >
                {person.source === 'user' ? 'User Contact' : 'Activity Contact'}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
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
                  {onDelete && person.source === 'activity_contact' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleDeleteContact}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Contact
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Content area with proper text wrapping */}
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-slate-900 leading-tight break-words">
              {displayName}
            </h3>
            
            {/* Job/Position Info */}
            {jobInfo && (
              <div className="text-xs text-slate-600">
                <span className="break-words">{jobInfo}</span>
              </div>
            )}

            {/* Department Info - separate line for users */}
            {departmentInfo && (
              <div className="text-xs text-slate-600">
                <span className="break-words">{departmentInfo}</span>
              </div>
            )}

            {/* Organization Info */}
            {organizationInfo && (
              <div className="text-xs text-slate-600">
                <button
                  onClick={handleOrganizationClick}
                  className="hover:text-blue-600 transition-colors text-left break-words w-full"
                  disabled={!person.organization_id}
                  title={organizationInfo}
                >
                  <span className="break-words">{organizationInfo}</span>
                  {person.organization_id && (
                    <ExternalLink className="h-3 w-3 ml-1 inline text-slate-400 flex-shrink-0" />
                  )}
                </button>
              </div>
            )}

            {/* Role Badge - only for Users (but not super users since they have their own badge) */}
            {person.source === 'user' && person.role && !isPersonSuperUser && (
              <div className="flex items-center space-x-2 flex-wrap">
                <Badge 
                  variant={getRoleBadgeVariant(person.role)} 
                  className="text-xs"
                >
                  {getRoleDisplayLabel(person.role)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Contact Information */}
        <div className="space-y-1">
          {/* Email Section */}
          {(person.email || person.secondary_email) && (
            <div className="space-y-1">
              {person.email && (
                <div className="flex items-center space-x-2 text-xs">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <button
                    onClick={() => handleEmailClick(person.email)}
                    className="text-slate-600 hover:text-blue-600 transition-colors truncate"
                  >
                    {person.email}
                  </button>
                </div>
              )}
              {person.secondary_email && (
                <div className="flex items-center space-x-2 text-xs ml-4">
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
          {((person.phone && isValidPhoneNumber(person.phone)) || person.fax) && (
            <div className="space-y-1">
              {person.phone && isValidPhoneNumber(person.phone) && (
                <div className="flex items-center space-x-2 text-xs">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <button
                    onClick={handlePhoneClick}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    {person.phone}
                  </button>
                </div>
              )}
              {person.fax && (
                <div className="flex items-center space-x-2 text-xs ml-4">
                  <span className="text-slate-400">|</span>
                  <button
                    onClick={handleFaxClick}
                    className="text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Printer className="h-3 w-3 mr-1 inline" />
                    {person.fax}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes if available */}
        {person.notes && (
          <div className="pt-1 border-t border-slate-100">
            <div className="text-xs">
              <p className="text-slate-600 text-xs leading-snug">{person.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}