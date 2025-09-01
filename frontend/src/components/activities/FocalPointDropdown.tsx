"use client";

import React, { useState, useEffect } from 'react';
import { ChevronsUpDown, Check, Search, X, User, CheckCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils";

// User Avatar Component
const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "xs" | "sm" | "md" }) => {
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm", 
    md: "h-10 w-10 text-base"
  };

  // Debug: Uncomment to diagnose avatar issues
  // console.log(`[UserAvatar] User: ${user.name}, Avatar URL: ${user.avatar_url}`);

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${user.name} avatar`}
        className={cn("rounded-full object-cover", sizeClasses[size])}
        onError={(e) => {
          console.error(`[UserAvatar] Failed to load avatar for ${user.name}: ${user.avatar_url}`);
          // Hide the broken image and show fallback
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to initials - improve initials extraction
  let initials = '';
  if (user.name && user.name.trim()) {
    initials = user.name
      .trim()
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  // If no name, use email initials as last resort
  if (!initials && user.email) {
    const emailPart = user.email.split('@')[0];
    initials = emailPart.slice(0, 2).toUpperCase();
  }

  return (
    <div className={cn(
      "rounded-full bg-gray-600 flex items-center justify-center font-medium text-white",
      sizeClasses[size]
    )}>
      {initials || <User className="h-4 w-4" />}
    </div>
  );
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organisation?: string;
  job_title?: string;
  avatar_url?: string;
  phone?: string;
  website?: string;
  bio?: string;
  title?: string; // Title (Mr., Mrs., Dr., Daw, U, etc.)
  // Enhanced organization details
  organization?: {
    id: string;
    name: string;
    acronym?: string;
    iati_org_id?: string;
    country?: string;
  };
}

interface FocalPointDropdownProps {
  activityId: string;
  type: 'government_focal_point' | 'development_partner_focal_point';
  currentAssignments: any[];
  allFocalPointAssignments?: any[]; // All focal point assignments (both government and development partner)
  onAssignmentChange: () => void;
  onAssignmentAdded?: (newAssignment: any) => void;
  onAssignmentRemoved?: (removedContactId: string) => void;
  placeholder?: string;
  className?: string;
}

export function FocalPointDropdown({
  activityId,
  type,
  currentAssignments,
  allFocalPointAssignments,
  onAssignmentChange,
  onAssignmentAdded,
  onAssignmentRemoved,
  placeholder = "Select focal point...",
  className,
}: FocalPointDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [assigning, setAssigning] = React.useState<string | null>(null);

  const fetchUsers = async (search: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      // Add role filter based on focal point type
      if (type === 'government_focal_point') {
        // Government focal points: super_user, gov_partner_tier_1, gov_partner_tier_2
        params.append('roles', 'super_user,gov_partner_tier_1,gov_partner_tier_2');
      } else if (type === 'development_partner_focal_point') {
        // Development partner focal points: super_user, dev_partner_tier_1, dev_partner_tier_2
        params.append('roles', 'super_user,dev_partner_tier_1,dev_partner_tier_2');
      }
      
      const response = await fetch(`/api/users/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      fetchUsers(searchQuery);
    }
  }, [searchQuery, open]);

  const handleAssignUser = async (user: User) => {
    try {
      setAssigning(user.id);
      
      const response = await fetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          type: type,
          action: 'assign'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${formatUserName(user)} assigned as focal point`);
        
        // If we have the optimized callback, use it to update state directly
        if (onAssignmentAdded) {
          const newAssignment = {
            id: result.assignment?.id || `temp-${Date.now()}`,
            name: user.name,
            email: user.email,
            role: user.role,
            title: user.title,
            job_title: user.job_title,
            organisation: user.organisation,
            type: type,
            avatar_url: user.avatar_url,
            organization: user.organization
          };
          onAssignmentAdded(newAssignment);
        } else {
          // Fallback to full refresh
          onAssignmentChange();
        }
        
        setOpen(false);
        setSearchQuery("");
      } else {
        toast.error(result.error || 'Failed to assign user');
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveUser = async (contactId: string, userName: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/focal-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: contactId, // API expects user_id but this is actually the contact_id
          type: type,
          action: 'remove'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${userName} removed from focal points`);
        
        // If we have the optimized callback, use it to update state directly
        if (onAssignmentRemoved) {
          onAssignmentRemoved(contactId);
        } else {
          // Fallback to full refresh
          onAssignmentChange();
        }
      } else {
        toast.error(result.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  // Filter out already assigned users by email (since assignments don't have user_id)
  // Use allFocalPointAssignments if provided, otherwise fall back to currentAssignments
  const assignmentsToCheck = allFocalPointAssignments || currentAssignments;
  const assignedEmails = assignmentsToCheck.map(a => a.email);
  const availableUsers = users.filter(user => !assignedEmails.includes(user.email));

     const filteredUsers = React.useMemo(() => {
     if (!searchQuery) return availableUsers;
     
     const query = searchQuery.toLowerCase();
     return availableUsers.filter(user => 
       user.name.toLowerCase().includes(query) ||
       user.email.toLowerCase().includes(query) ||
       user.role.toLowerCase().includes(query) ||
       user.organisation?.toLowerCase().includes(query) ||
       user.organization?.name?.toLowerCase().includes(query) ||
       user.organization?.acronym?.toLowerCase().includes(query) ||
       user.organization?.iati_org_id?.toLowerCase().includes(query) ||
       user.job_title?.toLowerCase().includes(query)
     );
   }, [availableUsers, searchQuery]);

  // Removed local getRoleLabel and getRoleColor functions - now using unified utilities

  const formatUserName = (user: User): string => {
    const parts = [];
    if (user.title) parts.push(user.title);
    parts.push(user.name);
    return parts.join(' ');
  };

   const formatOrganizationInfo = (user: User): { orgDisplay: string; iatiJobDisplay: string } => {
     const org = user.organization;
     let orgDisplay = '';
     let iatiJobDisplay = '';
     
     if (org) {
       // Organization name with acronym (without IATI ID)
       let orgParts = [];
       
       if (org.name) {
         orgParts.push(org.name);
       }
       
       if (org.acronym) {
         orgParts.push(`(${org.acronym})`);
       }
       
       orgDisplay = orgParts.join(' ');
       
       // IATI ID and job title on separate line
       let iatiJobParts = [];
       
       if (org.iati_org_id) {
         iatiJobParts.push(org.iati_org_id);
       }
       
       if (user.job_title) {
         iatiJobParts.push(user.job_title);
       }
       
       iatiJobDisplay = iatiJobParts.join(' | ');
     } else {
       // Fallback to user's organisation field
       orgDisplay = user.organisation || '';
       iatiJobDisplay = user.job_title || '';
     }
     
     return { orgDisplay, iatiJobDisplay };
   };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Assignments */}
      {currentAssignments.length > 0 && (
        <div className="space-y-2">
          {currentAssignments.map((assignment, index) => {
            const { orgDisplay, iatiJobDisplay } = formatOrganizationInfo(assignment);
            return (
              <div
                key={assignment.id || index}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border"
              >
                <UserAvatar user={assignment} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{formatUserName(assignment)}</span>
                    <Badge variant={getRoleBadgeVariant(assignment.role)} className="text-xs">
                      {getRoleDisplayLabel(assignment.role)}
                    </Badge>
                    {/* Green tick to show focal point is saved */}
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  </div>

                  {orgDisplay && (
                    <div className="text-xs text-muted-foreground truncate">
                      {orgDisplay}
                    </div>
                  )}
                  
                  {iatiJobDisplay && (
                    <div className="text-xs text-muted-foreground">
                      {iatiJobDisplay}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(assignment.id, assignment.name)}
                  className="h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-600 hover:text-gray-700"
                  aria-label="Remove focal point"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Focal Point Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent/50 transition-colors",
            "text-muted-foreground"
          )}
        >
          <span className="truncate">{placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[500px] p-0 shadow-lg border z-50"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search by name, organization, IATI ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>
            <CommandList>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No users found matching your search' : 'No available users'}
                  </div>
                  {searchQuery && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search terms
                    </div>
                  )}
                </div>
              ) : (
                <CommandGroup>
                  {filteredUsers.map((user) => {
                    const { orgDisplay, iatiJobDisplay } = formatOrganizationInfo(user);
                    
                    return (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleAssignUser(user)}
                        className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <UserAvatar user={user} size="sm" />
                        <div className="flex-1 ml-3 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{formatUserName(user)}</span>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {getRoleDisplayLabel(user.role)}
                            </Badge>
                          </div>

                          {orgDisplay && (
                            <div className="text-xs text-muted-foreground truncate">
                              {orgDisplay}
                            </div>
                          )}
                          
                          {iatiJobDisplay && (
                            <div className="text-xs text-muted-foreground">
                              {iatiJobDisplay}
                            </div>
                          )}
                        </div>
                        {assigning === user.id && (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 ml-2" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
