"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, Loader2, ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ParticipatingOrgModal, ParticipatingOrgData } from '@/components/modals/ParticipatingOrgModal';
import { useParticipatingOrganizations } from '@/hooks/use-participating-organizations';
import { toast } from 'sonner';
import { getOrganizationRoleName } from '@/data/iati-organization-roles';
import { getOrganizationTypeName } from '@/data/iati-organization-types';
import Image from 'next/image';
import Link from 'next/link';

interface OrganisationsSectionProps {
  activityId?: string;
  onParticipatingOrganizationsChange?: (count: number) => void;
  // Legacy props for backward compatibility (not used in new design)
  extendingPartners?: any[];
  implementingPartners?: any[];
  governmentPartners?: any[];
  fundingPartners?: any[];
  onChange?: (field: string, value: any[]) => void;
  canNominateContributors?: boolean;
}

export default function OrganisationsSection({
  activityId,
  onParticipatingOrganizationsChange,
}: OrganisationsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);
  const [sortField, setSortField] = useState<string | null>('organization');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    participatingOrganizations,
    loading,
    addParticipatingOrganization,
    removeParticipatingOrganization,
    refetch
  } = useParticipatingOrganizations({
    activityId,
    onError: (error) => toast.error(error)
  });

  // Track organization count changes
  const stableOrgsCount = useRef(participatingOrganizations.length);
  const notifyTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any pending notification
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }

    // Only proceed if activityId exists and we have participating orgs data
    if (!activityId || !onParticipatingOrganizationsChange) return;

    const currentCount = participatingOrganizations.length;
    
    // Only notify if count has actually changed
    if (stableOrgsCount.current !== currentCount) {
      // Debounce the notification to prevent rapid updates
      notifyTimeoutRef.current = setTimeout(() => {
        console.log('[OrganisationsSection] Notifying parent of organization count change:', stableOrgsCount.current, '->', currentCount);
        onParticipatingOrganizationsChange(currentCount);
        stableOrgsCount.current = currentCount;
      }, 300);
    }

    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, [participatingOrganizations.length, onParticipatingOrganizationsChange, activityId]);

  const handleAdd = () => {
    setEditingOrg(null);
    setModalOpen(true);
  };

  const handleEdit = (org: any) => {
    console.log('[OrganisationsSection] Editing org data:', org);
    setEditingOrg({
      id: org.id,
      organization_id: org.organization_id,
      role_type: org.role_type,
      iati_role_code: org.iati_role_code,
      iati_org_ref: org.iati_org_ref,
      org_type: org.org_type,
      activity_id_ref: org.activity_id_ref,
      crs_channel_code: org.crs_channel_code,
      narrative: org.narrative,
      narrative_lang: org.narrative_lang,
      narratives: org.narratives || [],
      org_activity_id: org.org_activity_id,
      reporting_org_ref: org.reporting_org_ref,
      secondary_reporter: org.secondary_reporter || false
    });
    setModalOpen(true);
  };

  const handleSave = async (data: ParticipatingOrgData) => {
    try {
      if (editingOrg) {
        // Update existing organization
        const response = await fetch(`/api/activities/${activityId}/participating-organizations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participating_org_id: editingOrg.id,
            ...data
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update organization');
        }

        toast.success('Organization updated successfully');
      } else {
        // Add new organization
        await addParticipatingOrganization(data.organization_id, data.role_type, data);
        toast.success('Organization added successfully');
      }
      
      // Refresh the list
      await refetch();
      setModalOpen(false);
      setEditingOrg(null);
    } catch (error) {
      console.error('Error saving organization:', error);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDelete = async (org: any) => {
    if (!confirm(`Are you sure you want to remove ${org.organization?.name || org.narrative || 'this organization'}?`)) {
      return;
    }

    // Validate required data
    if (!activityId) {
      toast.error('Activity ID is missing. Cannot delete organization.');
      console.error('[Delete] Missing activityId');
      return;
    }

    if (!org.id) {
      toast.error('Organization ID is missing. Cannot delete organization.');
      console.error('[Delete] Missing org.id. Org data:', org);
      return;
    }

    console.log('[Delete] Deleting participating organization:', {
      activityId,
      participatingOrgId: org.id,
      organizationName: org.organization?.name || org.narrative
    });

    try {
      // Delete using the participating org ID
      const response = await fetch(
        `/api/activities/${activityId}/participating-organizations?id=${org.id}`,
        { method: 'DELETE' }
      );

      console.log('[Delete] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Delete] Error response:', errorData);
        throw new Error(errorData.error || `Failed to remove organization (${response.status})`);
      }

      toast.success('Organization removed successfully');
      
      // Refresh the list
      await refetch();
    } catch (error) {
      console.error('[Delete] Error removing organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove organization');
    }
  };

  const getRoleBadgeColor = (roleCode: number) => {
    const colors: Record<number, string> = {
      1: 'bg-yellow-100 text-yellow-800 border-yellow-300',     // Funding
      2: 'bg-purple-100 text-purple-800 border-purple-300',     // Accountable/Government
      3: 'bg-blue-100 text-blue-800 border-blue-300',           // Extending
      4: 'bg-green-100 text-green-800 border-green-300'         // Implementing
    };
    return colors[roleCode] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrganizations = useMemo(() => {
    if (!sortField) return participatingOrganizations;

    return [...participatingOrganizations].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'organization':
          aValue = (a.narrative || a.organization?.name || '').toLowerCase();
          bValue = (b.narrative || b.organization?.name || '').toLowerCase();
          break;
        case 'role':
          aValue = getOrganizationRoleName(a.iati_role_code || 0);
          bValue = getOrganizationRoleName(b.iati_role_code || 0);
          break;
        case 'type':
          aValue = getOrganizationTypeName(a.org_type || '');
          bValue = getOrganizationTypeName(b.org_type || '');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [participatingOrganizations, sortField, sortDirection]);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end">
            <div className="h-9 w-40 bg-gray-200 animate-pulse rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[40%]">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[26%]">
                    <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[14%] text-right">
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 animate-pulse rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                          <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-24 bg-gray-200 animate-pulse rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-28 bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                        <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end">
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participatingOrganizations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 font-medium mb-2">No participating organizations added yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Add organizations to define who is funding, implementing, or managing this activity
              </p>
              <Button onClick={handleAdd} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Organization
              </Button>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead
                        className="w-[40%] font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('organization')}
                      >
                        <div className="flex items-center">
                          Organization
                          {getSortIcon('organization')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[20%] font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center">
                          Role
                          {getSortIcon('role')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[26%] font-semibold cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center">
                          Organisation Type
                          {getSortIcon('type')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[14%] text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrganizations.map((participatingOrg: any) => (
                      <TableRow key={participatingOrg.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {participatingOrg.organization?.logo ? (
                                <Image
                                  src={participatingOrg.organization.logo}
                                  alt={participatingOrg.organization.name}
                                  width={32}
                                  height={32}
                                  className="rounded object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  <Building2 className="h-4 w-4 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">
                                {participatingOrg.organization_id ? (
                                  <Link
                                    href={`/organizations/${participatingOrg.organization_id}`}
                                    className="hover:text-gray-700 transition-colors"
                                  >
                                    {participatingOrg.narrative ||
                                     participatingOrg.organization?.name ||
                                     'Unknown Organization'}
                                    {participatingOrg.organization?.acronym &&
                                     ` (${participatingOrg.organization.acronym})`}
                                  </Link>
                                ) : (
                                  <span>
                                    {participatingOrg.narrative ||
                                     participatingOrg.organization?.name ||
                                     'Unknown Organization'}
                                    {participatingOrg.organization?.acronym &&
                                     ` (${participatingOrg.organization.acronym})`}
                                  </span>
                                )}
                              </div>
                              {(participatingOrg.iati_org_ref || participatingOrg.organization?.iati_org_id) && (
                                <div className="text-xs text-gray-500 font-mono mt-1">
                                  {participatingOrg.iati_org_ref || participatingOrg.organization?.iati_org_id}
                                </div>
                              )}
          </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getRoleBadgeColor(participatingOrg.iati_role_code)} border`}
                          >
                            {getOrganizationRoleName(participatingOrg.iati_role_code)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {participatingOrg.organization?.Organisation_Type_Name || 
                             (participatingOrg.organization?.Organisation_Type_Code ? getOrganizationTypeName(participatingOrg.organization.Organisation_Type_Code) : null) || 
                             <span className="text-gray-400">Not set</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(participatingOrg)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(participatingOrg)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ParticipatingOrgModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingOrg(null);
        }}
        onSave={handleSave}
        editingOrg={editingOrg}
        activityId={activityId || ''}
      />
    </>
  );
} 