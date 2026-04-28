"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Plus, 
  Trash2, 
  Building2, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { OrganizationCombobox } from '@/components/ui/organization-combobox';
import { useOrganizations } from '@/hooks/use-organizations';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

interface ParticipatingOrganization {
  id: string;
  activity_id: string;
  organization_id: string;
  role_type: 'extending' | 'implementing' | 'government' | 'funding';
  display_order: number;
  created_at: string;
  updated_at: string;
  iati_role_code?: number;
  organization?: {
    id: string;
    name: string;
    acronym?: string;
    iati_org_id?: string;
    logo?: string;
    country?: string;
    Organisation_Type_Code?: string;
    Organisation_Type_Name?: string;
  };
}

interface OrganizationsTabProps {
  activityId: string;
}

const ROLE_LABELS = {
  extending: 'Extending',
  implementing: 'Implementing',
  government: 'Government',
  funding: 'Funding'
};

const ROLE_COLORS = {
  extending: 'bg-blue-100 text-blue-800',
  implementing: 'bg-[hsl(var(--success-bg))] text-[hsl(var(--success-text))]',
  government: 'bg-purple-100 text-purple-800',
  funding: 'bg-yellow-100 text-yellow-800'
};

export default function OrganizationsTab({ activityId }: OrganizationsTabProps) {
  const [participatingOrgs, setParticipatingOrgs] = useState<ParticipatingOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingOrg, setAddingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'extending' | 'implementing' | 'government' | 'funding'>('implementing');
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const { organizations, loading: orgsLoading } = useOrganizations();

  // Fetch participating organizations
  const fetchParticipatingOrgs = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/activities/${activityId}/participating-organizations`);
      if (!response.ok) {
        throw new Error('Failed to fetch participating organizations');
      }
      const data = await response.json();
      setParticipatingOrgs(data);
    } catch (error) {
      console.error('Error fetching participating organizations:', error);
      toast.error('Failed to load participating organizations');
    } finally {
      setLoading(false);
    }
  };

  // Add participating organization
  const addParticipatingOrg = async () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }

    try {
      setAddingOrg(true);
      const response = await apiFetch(`/api/activities/${activityId}/participating-organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: selectedOrgId,
          role_type: selectedRole,
          display_order: participatingOrgs.length
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add organization');
      }

      const newOrg = await response.json();
      setParticipatingOrgs([...participatingOrgs, newOrg]);
      setSelectedOrgId('');
      toast.success('Organization added successfully');
    } catch (error) {
      console.error('Error adding organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add organization');
    } finally {
      setAddingOrg(false);
    }
  };

  // Re-add an organization (used by Undo)
  const restoreParticipatingOrg = async (snapshot: ParticipatingOrganization) => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/participating-organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: snapshot.organization_id,
          role_type: snapshot.role_type,
          iati_role_code: snapshot.iati_role_code,
        }),
      });
      if (!response.ok) throw new Error('Failed to restore organization');
      toast.success('Organisation restored');
      await fetchParticipatingOrgs();
    } catch (error) {
      console.error('Error restoring organization:', error);
      toast.error("Couldn't restore the organisation. Please add it again manually.");
    }
  };

  // Remove participating organization
  const removeParticipatingOrg = async (organizationId: string, roleType: string) => {
    const snapshot = participatingOrgs.find(
      org => org.organization_id === organizationId && org.role_type === roleType
    );
    const orgName = snapshot?.organization?.name || 'this organisation';
    const ok = await confirm({
      title: 'Remove this organisation?',
      description: `"${orgName}" will be removed from this activity (${ROLE_LABELS[roleType as keyof typeof ROLE_LABELS]} role). You can add it again anytime.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/activities/${activityId}/participating-organizations?organization_id=${organizationId}&role_type=${roleType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove organization');
      }

      setParticipatingOrgs(participatingOrgs.filter(
        org => !(org.organization_id === organizationId && org.role_type === roleType)
      ));
      toast(`Removed "${orgName}"`, snapshot ? {
        action: { label: 'Undo', onClick: () => restoreParticipatingOrg(snapshot) },
      } : undefined);
    } catch (error) {
      console.error('Error removing organization:', error);
      toast.error("Couldn't remove the organisation. Please try again in a moment.");
    }
  };

  useEffect(() => {
    fetchParticipatingOrgs();
  }, [activityId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participating Organisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participating Organisations
            <HelpTextTooltip>
              Organisations that play a role in this activity — funders, implementers,
              government departments, and extending partners.
            </HelpTextTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-body text-muted-foreground mb-4">
            Manage organizations that participate in this activity, including funding, implementing, and other partner roles.
          </div>

          {/* Add Organization Form */}
          <div className="border border-border rounded-lg p-4 bg-muted">
            <h3 className="text-body font-medium text-foreground mb-3 flex items-center gap-2">
              Add Organisation
              <HelpTextTooltip>
                Pick an organisation and choose its role. You can add the same
                organisation with multiple roles (e.g. both funder and implementer).
              </HelpTextTooltip>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <OrganizationCombobox
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                  organizations={organizations}
                  placeholder="Select organization..."
                  disabled={orgsLoading}
                />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-helper font-medium text-muted-foreground">Role</span>
                  <HelpTextTooltip>
                    <div className="text-helper space-y-1">
                      <p><strong>Funding:</strong> Provides the money for the activity.</p>
                      <p><strong>Implementing:</strong> Delivers the activity on the ground.</p>
                      <p><strong>Extending:</strong> Passes funds through to the implementer.</p>
                      <p><strong>Government:</strong> A government partner involved in delivery or oversight.</p>
                    </div>
                  </HelpTextTooltip>
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-input rounded-md text-body"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <Button
                onClick={addParticipatingOrg}
                disabled={addingOrg || !selectedOrgId || orgsLoading}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {addingOrg ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      {participatingOrgs.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <img
                src="/images/empty-puzzle-piece.webp"
                alt="No organisations"
                className="h-32 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg font-medium mb-2 text-foreground">No organisations added yet</p>
              <p className="text-body">Select an organisation above and choose its role (funder, implementer, etc.) to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {participatingOrgs.map((org) => (
            <Card key={`${org.organization_id}-${org.role_type}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">
                          {org.organization?.name ? (
                            <Link 
                              href={`/organizations/${org.organization.id}`}
                              className="hover:text-foreground transition-colors"
                            >
                              {org.organization.name}
                              {org.organization.acronym && ` (${org.organization.acronym})`}
                            </Link>
                          ) : (
                            <>
                              Unknown Organization
                              {org.organization?.acronym && ` (${org.organization.acronym})`}
                            </>
                          )}
                        </div>
                        {org.organization?.iati_org_id && (
                          <div className="text-helper text-muted-foreground">
                            IATI ID: {org.organization.iati_org_id}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={ROLE_COLORS[org.role_type]}>
                      {ROLE_LABELS[org.role_type]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParticipatingOrg(org.organization_id, org.role_type)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Status Alert */}
      {participatingOrgs.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Found {participatingOrgs.length} participating organization{participatingOrgs.length !== 1 ? 's' : ''} for this activity.
            Organizations imported from IATI XML should appear here automatically.
          </AlertDescription>
        </Alert>
      )}
      <ConfirmDialog />
    </div>
  );
}
