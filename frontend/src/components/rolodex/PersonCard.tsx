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
  Pencil,
  User,
  Trash2,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useRouter } from 'next/navigation';
import { EditContactModal } from './EditContactModal';
import { UserEditModal } from './UserEditModal';
import { CardShell, CardShellRipLine } from '@/components/ui/card-shell';

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
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
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

  const handleCopyEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 1500);
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
      <div className="flex items-start justify-between p-3 border border-border rounded-lg hover:bg-muted transition-colors">
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
              <p className="text-body font-medium text-foreground break-words leading-tight">
                {displayName}
              </p>
              <div className="flex items-center space-x-1 ml-2">
                {/* Super User Badge - only for super users */}
                {isPersonSuperUser && (
                  <Badge
                    variant="secondary"
                    className="text-helper flex-shrink-0 text-white border-0"
                    style={{ backgroundColor: '#DC2625' }}
                  >
                    Super User
                  </Badge>
                )}
                
                <Badge
                  variant="secondary"
                  className="text-helper flex-shrink-0"
                  style={{
                    backgroundColor: person.source === 'user' ? '#4C5568' : '#DC2625',
                    color: 'white'
                  }}
                >
                  {person.source === 'user' ? 'User' : 'Activity'}
                </Badge>
                {(person.activity_count ?? 0) > 1 && (
                  <Badge variant="outline" className="text-helper flex-shrink-0">
                    <Layers className="h-3 w-3 mr-1" />
                    {person.activity_count} activities
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {/* Role Pill - only for Users (but not super users since they have their own badge) */}
              {person.source === 'user' && person.role && !isPersonSuperUser && (
                <div>
                  <Badge 
                    variant={getRoleBadgeVariant(person.role)} 
                    className="text-helper"
                  >
                    {getRoleDisplayLabel(person.role)}
                  </Badge>
                </div>
              )}
              
              {jobInfo && (
                <div className="text-helper text-muted-foreground break-words">
                  {jobInfo}
                </div>
              )}
              
              {departmentInfo && (
                <div className="text-helper text-muted-foreground break-words">
                  {departmentInfo}
                </div>
              )}
              
              {organizationInfo && (
                <div className="text-helper text-muted-foreground break-words" title={organizationInfo}>
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
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Person actions">
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
              {person.activity_ids && person.activity_ids.length > 1 ? (
                person.activity_ids.map((actId, idx) => (
                  <DropdownMenuItem key={actId} onClick={() => onActivityClick?.(actId)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Activity {idx + 1}
                  </DropdownMenuItem>
                ))
              ) : person.activity_id ? (
                <DropdownMenuItem onClick={handleActivityClick}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Activity
                </DropdownMenuItem>
              ) : null}
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
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
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

  // Color palette — matches org/activity cards
  const colors = {
    paleSlate: 'hsl(var(--brand-pale-slate))',
    blueSlate: 'hsl(var(--brand-blue-slate))',
    coolSteel: 'hsl(var(--brand-cool-steel))',
  };

  // Action menu (shared between banner and dropdown contexts)
  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20">
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
        {person.activity_ids && person.activity_ids.length > 1 ? (
          person.activity_ids.map((actId, idx) => (
            <DropdownMenuItem key={actId} onClick={() => onActivityClick?.(actId)}>
              <FileText className="mr-2 h-4 w-4" />
              View Activity {idx + 1}
            </DropdownMenuItem>
          ))
        ) : person.activity_id ? (
          <DropdownMenuItem onClick={handleActivityClick}>
            <FileText className="mr-2 h-4 w-4" />
            View Activity
          </DropdownMenuItem>
        ) : null}
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Delete Contact
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <CardShell
      ariaLabel={`Contact: ${displayName}`}
      bannerImage={person.profile_photo}
      bannerIcon={User}
      bannerActions={actionMenu}
      bannerOverlay={
        <>
          <h2 className="text-lg font-bold text-white mb-1 line-clamp-2">
            {displayName}
          </h2>
          <div className="flex items-center gap-2 text-helper flex-wrap" style={{ color: colors.paleSlate }}>
            {jobInfo && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {jobInfo}
              </span>
            )}
            {jobInfo && departmentInfo && <span>•</span>}
            {departmentInfo && (
              <span className="flex items-center gap-1">
                {departmentInfo}
              </span>
            )}
            {person.source === 'user' && person.role && (
              <>
                {(jobInfo || departmentInfo) && <span>•</span>}
                <Badge
                  variant={getRoleBadgeVariant(person.role)}
                  className="text-[10px] px-1.5 py-0"
                >
                  {getRoleDisplayLabel(person.role)}
                </Badge>
              </>
            )}
          </div>
        </>
      }
    >
      {/* Body */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <div className="flex-1">
          {/* Role badge */}
          {person.source === 'user' && person.role && (
            <div className="mb-3">
              <Badge
                variant={getRoleBadgeVariant(person.role)}
                className="text-helper"
              >
                {getRoleDisplayLabel(person.role)}
              </Badge>
            </div>
          )}

          {/* Contact details — single column */}
          <div className="space-y-2">
            <div className="group/email flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" style={{ color: colors.coolSteel }} />
              {person.email ? (
                <>
                  <button
                    onClick={() => handleEmailClick(person.email)}
                    className="font-medium text-body break-all hover:underline text-left"
                    style={{ color: colors.blueSlate }}
                  >
                    {person.email}
                  </button>
                  <button
                    onClick={(e) => handleCopyEmail(e, person.email!)}
                    className="opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0"
                    title="Copy email"
                  >
                    {copiedEmail === person.email ? (
                      <Check className="h-3 w-3 text-[hsl(var(--success-icon))]" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </>
              ) : (
                <span className="text-body" style={{ color: colors.coolSteel }}>—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0" style={{ color: colors.coolSteel }} />
              {person.phone && isValidPhoneNumber(person.phone) ? (
                <button
                  onClick={handlePhoneClick}
                  className="font-medium text-body break-all hover:underline text-left"
                  style={{ color: colors.blueSlate }}
                >
                  {person.phone}
                </button>
              ) : (
                <span className="text-body" style={{ color: colors.coolSteel }}>—</span>
              )}
            </div>
            {(person.activity_count ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" style={{ color: colors.coolSteel }} />
                <span className="font-medium text-body" style={{ color: colors.blueSlate }}>
                  {person.activity_count} {person.activity_count === 1 ? 'activity' : 'activities'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rip Line */}
        <div className="my-4">
          <CardShellRipLine />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: colors.coolSteel }}>
            {person.organization_logo && (
              <img
                src={person.organization_logo}
                alt=""
                className="w-4 h-4 rounded-full object-contain"
              />
            )}
            {person.organization_acronym || person.organization_name || (person.source === 'user' ? 'System User' : 'Activity Contact')}
          </span>
          {person.organization_id && organizationInfo && (
            <a
              href={`/organizations/${person.organization_id}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="flex items-center gap-1 text-[10px] hover:underline relative z-10"
              style={{ color: colors.blueSlate }}
            >
              <ExternalLink className="w-3 h-3" />
              View Organization
            </a>
          )}
        </div>
      </div>
    </CardShell>
  );
}