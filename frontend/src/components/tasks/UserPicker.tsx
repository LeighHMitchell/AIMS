"use client";

import React, { useState, useEffect, useRef, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Building2, Shield, X, Check, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TaskUser, TaskOrganization, TaskAssignees } from '@/types/task';
import { getTaskUserDisplayName } from '@/types/task';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';

interface UserPickerProps {
  userId: string;
  selectedAssignees: TaskAssignees;
  onSelectionChange: (assignees: TaskAssignees) => void;
  singleSelect?: boolean;
  /** Pre-loaded user data for existing assignees (used when editing) */
  existingUsers?: TaskUser[];
}

// Static role list
const AVAILABLE_ROLES = [
  'super_user',
  'dev_partner_tier_1',
  'dev_partner_tier_2',
  'gov_partner_tier_1',
  'gov_partner_tier_2',
];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  super_user: 'Super User',
  dev_partner_tier_1: 'Dev Partner (Tier 1)',
  dev_partner_tier_2: 'Dev Partner (Tier 2)',
  gov_partner_tier_1: 'Gov Partner (Tier 1)',
  gov_partner_tier_2: 'Gov Partner (Tier 2)',
};

// Memoized row components to prevent re-renders
const UserRow = memo(function UserRow({
  user,
  isSelected,
  onToggle
}: {
  user: TaskUser;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const displayName = getTaskUserDisplayName(user);
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
      )}
      onClick={onToggle}
    >
      <div className={cn(
        'w-4 h-4 border rounded flex items-center justify-center',
        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
      )}>
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{displayName}</div>
        {user.organization && (
          <div className="text-xs text-muted-foreground truncate">
            {user.organization.name}
            {user.organization.acronym && ` (${user.organization.acronym})`}
          </div>
        )}
      </div>
    </div>
  );
});

const OrgRow = memo(function OrgRow({
  org,
  isSelected,
  memberCount,
  onToggle
}: {
  org: TaskOrganization;
  isSelected: boolean;
  memberCount: number;
  onToggle: () => void;
}) {
  const hasNoMembers = memberCount === 0;
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted',
        hasNoMembers && 'opacity-50 cursor-not-allowed'
      )}
      onClick={hasNoMembers ? undefined : onToggle}
    >
      <div className={cn(
        'w-4 h-4 border rounded flex items-center justify-center',
        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
      )}>
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={org.logo || undefined} />
        <AvatarFallback>
          <Building2 className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          {org.name}
          {org.acronym && <span className="ml-1">({org.acronym})</span>}
        </div>
        <div className={cn('text-xs', hasNoMembers ? 'text-gray-500' : 'text-muted-foreground')}>
          {hasNoMembers ? 'No members - cannot assign' : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
});

const RoleRow = memo(function RoleRow({
  role,
  isSelected,
  userCount,
  onToggle
}: {
  role: string;
  isSelected: boolean;
  userCount: number;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
      )}
      onClick={onToggle}
    >
      <div className={cn(
        'w-4 h-4 border rounded flex items-center justify-center',
        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
      )}>
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
      <Shield className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="font-medium">{ROLE_DISPLAY_NAMES[role] || role}</div>
        <div className="text-xs text-muted-foreground">
          {userCount} user{userCount !== 1 ? 's' : ''} with this role
        </div>
      </div>
    </div>
  );
});

function UserPickerInner({
  userId,
  selectedAssignees,
  onSelectionChange,
  singleSelect = false,
  existingUsers = [],
}: UserPickerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [fetchedUsers, setFetchedUsers] = useState<TaskUser[]>([]);
  const [organizations, setOrganizations] = useState<TaskOrganization[]>([]);
  const [usersByOrg, setUsersByOrg] = useState<Record<string, TaskUser[]>>({});
  const [orgMemberCounts, setOrgMemberCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('users');
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  // Merge fetched users with existing users (for editing existing tasks)
  const users = React.useMemo(() => {
    const userMap = new Map<string, TaskUser>();
    // Add fetched users first
    fetchedUsers.forEach(u => userMap.set(u.id, u));
    // Add existing users (won't overwrite if already present)
    existingUsers.forEach(u => {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    });
    return Array.from(userMap.values());
  }, [fetchedUsers, existingUsers]);

  // Fetch data once on mount
  useEffect(() => {
    mountedRef.current = true;

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadData() {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/users/taskable?userId=${userId}`);

        if (!mountedRef.current) return;

        const data = await response.json();

        if (!mountedRef.current) return;

        if (response.ok) {
          setFetchedUsers(data.users || []);
          setOrganizations(data.organizations || []);
          setUsersByOrg(data.usersByOrg || {});
          setOrgMemberCounts(data.orgMemberCounts || {});
        } else {
          setError(data.error || 'Failed to load users');
        }
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Failed to load users');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [userId]);

  // Create stable handlers using current values
  const handleUserToggle = (targetUserId: string) => {
    const currentIds = selectedAssignees.user_ids || [];
    const isSelected = currentIds.includes(targetUserId);

    if (singleSelect) {
      onSelectionChange({
        user_ids: isSelected ? [] : [targetUserId],
        organization_ids: [],
        roles: [],
      });
    } else {
      onSelectionChange({
        ...selectedAssignees,
        user_ids: isSelected
          ? currentIds.filter(id => id !== targetUserId)
          : [...currentIds, targetUserId],
      });
    }
  };

  const handleOrgToggle = (orgId: string) => {
    const currentIds = selectedAssignees.organization_ids || [];
    const isSelected = currentIds.includes(orgId);

    if (singleSelect) {
      onSelectionChange({
        user_ids: [],
        organization_ids: isSelected ? [] : [orgId],
        roles: [],
      });
    } else {
      onSelectionChange({
        ...selectedAssignees,
        organization_ids: isSelected
          ? currentIds.filter(id => id !== orgId)
          : [...currentIds, orgId],
      });
    }
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = selectedAssignees.roles || [];
    const isSelected = currentRoles.includes(role);

    if (singleSelect) {
      onSelectionChange({
        user_ids: [],
        organization_ids: [],
        roles: isSelected ? [] : [role],
      });
    } else {
      onSelectionChange({
        ...selectedAssignees,
        roles: isSelected
          ? currentRoles.filter(r => r !== role)
          : [...currentRoles, role],
      });
    }
  };

  const handleRemove = (type: 'user' | 'org' | 'role', id: string) => {
    if (type === 'user') {
      onSelectionChange({
        ...selectedAssignees,
        user_ids: (selectedAssignees.user_ids || []).filter(uid => uid !== id),
      });
    } else if (type === 'org') {
      onSelectionChange({
        ...selectedAssignees,
        organization_ids: (selectedAssignees.organization_ids || []).filter(oid => oid !== id),
      });
    } else {
      onSelectionChange({
        ...selectedAssignees,
        roles: (selectedAssignees.roles || []).filter(r => r !== id),
      });
    }
  };

  // Count selections
  const totalSelected =
    (selectedAssignees.user_ids?.length || 0) +
    (selectedAssignees.organization_ids?.length || 0) +
    (selectedAssignees.roles?.length || 0);

  // Filter users by search
  const filteredUsers = search
    ? users.filter(u =>
        getTaskUserDisplayName(u).toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  // Filter and sort organizations - orgs with members first (A-Z), then orgs without members (A-Z)
  const filteredOrgs = React.useMemo(() => {
    let orgs = orgSearch
      ? organizations.filter(o =>
          o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
          (o.acronym && o.acronym.toLowerCase().includes(orgSearch.toLowerCase()))
        )
      : organizations;

    return [...orgs].sort((a, b) => {
      const aHasMembers = (orgMemberCounts[a.id] || 0) > 0;
      const bHasMembers = (orgMemberCounts[b.id] || 0) > 0;

      // Orgs with members come first
      if (aHasMembers && !bHasMembers) return -1;
      if (!aHasMembers && bHasMembers) return 1;

      // Within same category, sort A-Z
      return a.name.localeCompare(b.name);
    });
  }, [organizations, orgSearch, orgMemberCounts]);

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Selected Items - Avatar Group */}
      {totalSelected > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {selectedAssignees.user_ids?.slice(0, 6).map((uid, idx) => {
              const user = users.find(u => u.id === uid);
              const name = user ? getTaskUserDisplayName(user) : '?';
              return (
                <Avatar
                  key={uid}
                  className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                  style={{ zIndex: 6 - idx }}
                  onClick={() => handleRemove('user', uid)}
                  title={`${name} (click to remove)`}
                >
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {selectedAssignees.organization_ids?.slice(0, 3).map((oid, idx) => {
              const org = organizations.find(o => o.id === oid);
              return (
                <Avatar
                  key={oid}
                  className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110 bg-purple-100"
                  style={{ zIndex: 3 - idx }}
                  onClick={() => handleRemove('org', oid)}
                  title={`${org?.name || 'Organization'} (click to remove)`}
                >
                  <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                    <Building2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {selectedAssignees.roles?.slice(0, 2).map((role, idx) => (
              <Avatar
                key={role}
                className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110 bg-amber-100"
                style={{ zIndex: 2 - idx }}
                onClick={() => handleRemove('role', role)}
                title={`${ROLE_DISPLAY_NAMES[role] || role} (click to remove)`}
              >
                <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                  <Shield className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ))}
            {totalSelected > 8 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">
                  +{totalSelected - 8}
                </span>
              </div>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help underline decoration-dotted">
                  {totalSelected} selected
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  {selectedAssignees.user_ids && selectedAssignees.user_ids.length > 0 && (
                    <div>
                      <span className="font-medium">Users:</span>{' '}
                      {selectedAssignees.user_ids.map(uid => {
                        const user = users.find(u => u.id === uid);
                        return user ? getTaskUserDisplayName(user) : 'Loading...';
                      }).join(', ')}
                    </div>
                  )}
                  {selectedAssignees.organization_ids && selectedAssignees.organization_ids.length > 0 && (
                    <div>
                      <span className="font-medium">Organizations:</span>{' '}
                      {selectedAssignees.organization_ids.map(oid => {
                        const org = organizations.find(o => o.id === oid);
                        return org?.name || 'Loading...';
                      }).join(', ')}
                    </div>
                  )}
                  {selectedAssignees.roles && selectedAssignees.roles.length > 0 && (
                    <div>
                      <span className="font-medium">Roles:</span>{' '}
                      {selectedAssignees.roles.map(r => ROLE_DISPLAY_NAMES[r] || r).join(', ')}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="gap-1">
            <User className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-1">
            <Building2 className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="p-2">
                  {filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelected={selectedAssignees.user_ids?.includes(user.id) ?? false}
                      onToggle={() => handleUserToggle(user.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px] border rounded-lg">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {organizations.length === 0 ? 'No organizations available' : 'No organizations match your search'}
                </div>
              ) : (
                <div className="p-2">
                  {/* Orgs with members */}
                  {filteredOrgs.filter(org => (orgMemberCounts[org.id] || 0) > 0).map((org) => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      isSelected={selectedAssignees.organization_ids?.includes(org.id) ?? false}
                      memberCount={orgMemberCounts[org.id] || 0}
                      onToggle={() => handleOrgToggle(org.id)}
                    />
                  ))}

                  {/* Separator if there are both types */}
                  {filteredOrgs.some(org => (orgMemberCounts[org.id] || 0) > 0) &&
                   filteredOrgs.some(org => (orgMemberCounts[org.id] || 0) === 0) && (
                    <div className="my-3 flex items-center gap-2">
                      <div className="flex-1 border-t border-dashed" />
                      <span className="text-xs text-muted-foreground px-2">No members</span>
                      <div className="flex-1 border-t border-dashed" />
                    </div>
                  )}

                  {/* Orgs without members */}
                  {filteredOrgs.filter(org => (orgMemberCounts[org.id] || 0) === 0).map((org) => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      isSelected={selectedAssignees.organization_ids?.includes(org.id) ?? false}
                      memberCount={0}
                      onToggle={() => handleOrgToggle(org.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Selecting an organization will assign the task to all its members.
          </p>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="p-2">
                {AVAILABLE_ROLES.map((role) => (
                  <RoleRow
                    key={role}
                    role={role}
                    isSelected={selectedAssignees.roles?.includes(role) ?? false}
                    userCount={users.filter(u => u.role === role).length}
                    onToggle={() => handleRoleToggle(role)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
          <p className="text-xs text-muted-foreground mt-2">
            Selecting a role will assign the task to all users with that role.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export memoized version
export const UserPicker = memo(UserPickerInner);
