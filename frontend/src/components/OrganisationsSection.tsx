"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Plus, Pencil, Trash2, Users, Loader2, ChevronUp, ChevronDown, Building2, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ParticipatingOrgModal, ParticipatingOrgData } from '@/components/modals/ParticipatingOrgModal';
import { useParticipatingOrganizations } from '@/hooks/use-participating-organizations';
import { toast } from 'sonner';
import { getOrganizationRoleName } from '@/data/iati-organization-roles';
import { getOrganizationTypeName } from '@/data/iati-organization-types';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

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
  const { confirm, ConfirmDialog } = useConfirmDialog();
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

  // Track organization count changes - notify parent immediately
  const prevCountRef = useRef(participatingOrganizations.length);

  useEffect(() => {
    if (!activityId || !onParticipatingOrganizationsChange) return;

    const currentCount = participatingOrganizations.length;

    if (prevCountRef.current !== currentCount) {
      prevCountRef.current = currentCount;
      onParticipatingOrganizationsChange(currentCount);
    }
  }, [participatingOrganizations.length, onParticipatingOrganizationsChange, activityId]);

  const handleAdd = () => {
    setEditingOrg(null);
    setModalOpen(true);
  };

  const handleEdit = (org: any) => {
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
        const response = await apiFetch(`/api/activities/${activityId}/participating-organizations`, {
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
    if (!(await confirm({ title: 'Remove organisation?', description: `Are you sure you want to remove ${org.organization?.name || org.narrative || 'this organization'}?`, confirmLabel: 'Remove', cancelLabel: 'Cancel' }))) {
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

    try {
      // Delete using the participating org ID
      const response = await apiFetch(`/api/activities/${activityId}/participating-organizations?id=${org.id}`,
        { method: 'DELETE' }
      );


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
          {/*
            The parent SectionHeader (rendered by StakeholdersGroup) already
            titles this tab as "Participating Organisations", so we don't
            render it a second time inside the Card. The card header now
            carries only the Add button (mirrored by the loaded state).
          */}
          <div className="flex items-center justify-end">
            <div className="h-9 w-40 bg-muted animate-pulse rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[40%]">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[20%]">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[26%]">
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-[14%] text-right">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-28 bg-muted animate-pulse rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
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
          {/*
            Tab title + help text live on the parent SectionHeader
            (see StakeholdersGroup). Keeping a second CardTitle here
            duplicated the heading at a different font size, which is
            what surfaced the reported mismatch with the Contacts tab.
            The card now opens with just the Add Organization button.
          */}
          <div className="flex items-center justify-end">
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {participatingOrganizations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-card">
              {/*
                Empty-state illustration harmonized across the Stakeholders
                group: a single thematic lucide icon at ~48px / 40% opacity
                replaces the previous puzzle-piece image.
              */}
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" aria-hidden="true" />
              <h3 className="text-base font-medium mb-2">No participating organisations</h3>
              <p className="text-sm text-muted-foreground">
                Use the button above to add your first organisation.
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead
                        className="w-[40%] font-medium cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('organization')}
                      >
                        <div className="flex items-center">
                          Organization
                          {getSortIcon('organization')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[20%] font-medium cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center">
                          Role
                          {getSortIcon('role')}
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-[26%] font-medium cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('type')}
                      >
                        <div className="flex items-center">
                          Organisation Type
                          {getSortIcon('type')}
                        </div>
                      </TableHead>
                      <TableHead className="w-[14%] text-right font-medium" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrganizations.map((participatingOrg: any) => (
                      <TableRow key={participatingOrg.id} className="hover:bg-muted">
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
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                                {participatingOrg.organization_id ? (
                                  <Link
                                    href={`/organizations/${participatingOrg.organization_id}`}
                                    className="text-sm hover:text-foreground transition-colors"
                                  >
                                    {participatingOrg.narrative ||
                                     participatingOrg.organization?.name ||
                                     'Unknown Organization'}
                                    {participatingOrg.organization?.acronym &&
                                     ` (${participatingOrg.organization.acronym})`}
                                  </Link>
                                ) : (
                                  <span className="text-sm">
                                    {participatingOrg.narrative ||
                                     participatingOrg.organization?.name ||
                                     'Unknown Organization'}
                                    {participatingOrg.organization?.acronym &&
                                     ` (${participatingOrg.organization.acronym})`}
                                  </span>
                                )}
                              {' '}
                              {(participatingOrg.iati_org_ref || participatingOrg.organization?.iati_org_id) && (
                                <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded whitespace-nowrap inline-block align-middle">
                                  {participatingOrg.iati_org_ref || participatingOrg.organization?.iati_org_id}
                                </span>
                              )}
                              {' '}
                              {participatingOrg.id && (
                                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success-icon))] inline-block align-middle" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {getOrganizationRoleName(participatingOrg.iati_role_code)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {participatingOrg.organization?.Organisation_Type_Name || 
                             (participatingOrg.organization?.Organisation_Type_Code ? getOrganizationTypeName(participatingOrg.organization.Organisation_Type_Code) : null) || 
                             <span className="text-muted-foreground">Not set</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(participatingOrg)}
                              className="hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(participatingOrg)}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

      <ConfirmDialog />

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