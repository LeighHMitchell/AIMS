'use client';

import React, { useState } from 'react';
import { Building2, User, Users, X, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { WizardFormData } from '../useTaskWizard';
import type { TaskUser, TaskOrganization } from '@/types/task';

interface TaskAudienceStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  errors: string[];
  users: TaskUser[];
  organizations: TaskOrganization[];
  orgMemberCounts: Record<string, number>;
  isLoading: boolean;
}

const AVAILABLE_ROLES = [
  { value: 'dev_partner_tier_1', label: 'Development Partner (Tier 1)' },
  { value: 'dev_partner_tier_2', label: 'Development Partner (Tier 2)' },
  { value: 'gov_partner_tier_1', label: 'Government Partner (Tier 1)' },
  { value: 'gov_partner_tier_2', label: 'Government Partner (Tier 2)' },
  { value: 'super_user', label: 'Super User' },
];

export function TaskAudienceStep({
  formData,
  updateFormData,
  errors,
  users,
  organizations,
  orgMemberCounts,
  isLoading,
}: TaskAudienceStepProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Split organizations into those with members and those without
  const orgsWithMembers = organizations.filter(org => (orgMemberCounts[org.id] || 0) > 0);
  const orgsWithoutMembers = organizations.filter(org => (orgMemberCounts[org.id] || 0) === 0);

  const hasError = errors.length > 0;

  const selectedUserIds = formData.assignees.user_ids || [];
  const selectedOrgIds = formData.assignees.organization_ids || [];
  const selectedRoles = formData.assignees.roles || [];

  const toggleUser = (userId: string) => {
    const current = [...selectedUserIds];
    const index = current.indexOf(userId);
    if (index === -1) {
      current.push(userId);
    } else {
      current.splice(index, 1);
    }
    updateFormData({
      assignees: { ...formData.assignees, user_ids: current },
      target_scope: 'user',
    });
  };

  const toggleOrg = (orgId: string) => {
    const current = [...selectedOrgIds];
    const index = current.indexOf(orgId);
    if (index === -1) {
      current.push(orgId);
    } else {
      current.splice(index, 1);
    }
    updateFormData({
      assignees: { ...formData.assignees, organization_ids: current },
      target_scope: 'organisation',
    });
  };

  const toggleRole = (role: string) => {
    const current = [...selectedRoles];
    const index = current.indexOf(role);
    if (index === -1) {
      current.push(role);
    } else {
      current.splice(index, 1);
    }
    updateFormData({
      assignees: { ...formData.assignees, roles: current },
      target_scope: 'role',
    });
  };

  const removeUser = (userId: string) => {
    updateFormData({
      assignees: {
        ...formData.assignees,
        user_ids: selectedUserIds.filter(id => id !== userId),
      },
    });
  };

  const removeOrg = (orgId: string) => {
    updateFormData({
      assignees: {
        ...formData.assignees,
        organization_ids: selectedOrgIds.filter(id => id !== orgId),
      },
    });
  };

  const removeRole = (role: string) => {
    updateFormData({
      assignees: {
        ...formData.assignees,
        roles: selectedRoles.filter(r => r !== role),
      },
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return userId;
    return user.first_name || user.last_name
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : user.email;
  };

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || orgId;
  };

  const getRoleLabel = (role: string) => {
    const found = AVAILABLE_ROLES.find(r => r.value === role);
    return found?.label || role;
  };

  const filteredUsers = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''} ${u.email}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredOrgsWithMembers = orgsWithMembers.filter(o => {
    const name = `${o.name} ${o.acronym || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredOrgsWithoutMembers = orgsWithoutMembers.filter(o => {
    const name = `${o.name} ${o.acronym || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const totalSelected = selectedUserIds.length + selectedOrgIds.length + selectedRoles.length;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {hasError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {errors[0]}
        </div>
      )}

      {/* Selection Summary */}
      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Selected Recipients</span>
          <Badge variant="secondary">{totalSelected} selected</Badge>
        </div>

        {totalSelected === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recipients selected. Use the tabs below to add users, organizations, or roles.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedUserIds.map(id => {
              const user = users.find(u => u.id === id);
              const displayName = getUserName(id);
              const initials = displayName.slice(0, 2).toUpperCase();
              return (
                <Badge key={id} variant="outline" className="gap-1.5 pl-1 pr-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  {displayName}
                  <button onClick={() => removeUser(id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {selectedOrgIds.map(id => {
              const org = organizations.find(o => o.id === id);
              const displayName = getOrgName(id);
              const initials = org?.acronym
                ? org.acronym.slice(0, 2).toUpperCase()
                : displayName.slice(0, 2).toUpperCase();
              return (
                <Badge key={id} variant="outline" className="gap-1.5 pl-1 pr-2 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={org?.logo || undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
                  </Avatar>
                  {displayName}
                  <button onClick={() => removeOrg(id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            {selectedRoles.map(role => (
              <Badge key={role} variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {getRoleLabel(role)}
                <button onClick={() => removeRole(role)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs for Users, Organizations, Roles */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <User className="h-4 w-4" />
            Users
            {selectedUserIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedUserIds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organisations
            {selectedOrgIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedOrgIds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Users className="h-4 w-4" />
            Roles
            {selectedRoles.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selectedRoles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select specific users to assign this task to.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => {
                  const displayName = user.first_name || user.last_name
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : user.email;
                  const initials = displayName.slice(0, 2).toUpperCase();
                  return (
                    <label
                      key={user.id}
                      className={cn(
                        'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                        selectedUserIds.includes(user.id)
                          ? 'bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} alt={displayName} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{displayName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select organisations to assign this task to all their members.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Organizations List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {filteredOrgsWithMembers.length === 0 && filteredOrgsWithoutMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No organisations found
                </div>
              ) : (
                <>
                  {/* Organizations with members */}
                  {filteredOrgsWithMembers.length > 0 && (
                    <div className="divide-y">
                      {filteredOrgsWithMembers.map(org => {
                        const initials = org.acronym
                          ? org.acronym.slice(0, 2).toUpperCase()
                          : org.name.slice(0, 2).toUpperCase();
                        const memberCount = orgMemberCounts[org.id] || 0;
                        return (
                          <label
                            key={org.id}
                            className={cn(
                              'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                              selectedOrgIds.includes(org.id)
                                ? 'bg-primary/5'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              checked={selectedOrgIds.includes(org.id)}
                              onCheckedChange={() => toggleOrg(org.id)}
                            />
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={org.logo || undefined} alt={org.name} />
                              <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{org.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {org.acronym && `${org.acronym} · `}
                                {memberCount} member{memberCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Divider and organizations without members */}
                  {filteredOrgsWithoutMembers.length > 0 && (
                    <>
                      <div className="border-t-2 border-dashed border-muted-foreground/30 mx-3 my-2" />
                      <div className="px-3 py-2 bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          These organisations have no members and cannot be selected
                        </p>
                      </div>
                      <div className="divide-y opacity-50">
                        {filteredOrgsWithoutMembers.map(org => {
                          const initials = org.acronym
                            ? org.acronym.slice(0, 2).toUpperCase()
                            : org.name.slice(0, 2).toUpperCase();
                          return (
                            <div
                              key={org.id}
                              className="flex items-center gap-3 p-3 cursor-not-allowed"
                            >
                              <Checkbox disabled checked={false} />
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={org.logo || undefined} alt={org.name} />
                                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{org.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {org.acronym && `${org.acronym} · `}
                                  0 members
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Select roles to assign this task to all users with those roles.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {AVAILABLE_ROLES.map(role => (
              <label
                key={role.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedRoles.includes(role.value)
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                )}
              >
                <Checkbox
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => toggleRole(role.value)}
                />
                <span className="text-sm">{role.label}</span>
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
