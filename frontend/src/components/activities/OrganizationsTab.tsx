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
  implementing: 'bg-green-100 text-green-800',
  government: 'bg-purple-100 text-purple-800',
  funding: 'bg-yellow-100 text-yellow-800'
};

export default function OrganizationsTab({ activityId }: OrganizationsTabProps) {
  const [participatingOrgs, setParticipatingOrgs] = useState<ParticipatingOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingOrg, setAddingOrg] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'extending' | 'implementing' | 'government' | 'funding'>('implementing');
  
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

  // Remove participating organization
  const removeParticipatingOrg = async (organizationId: string, roleType: string) => {
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
      toast.success('Organization removed successfully');
    } catch (error) {
      console.error('Error removing organization:', error);
      toast.error('Failed to remove organization');
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            Manage organizations that participate in this activity, including funding, implementing, and other partner roles.
          </div>

          {/* Add Organization Form */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Add Organization</h3>
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
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No participating organizations</p>
              <p className="text-sm">Add organizations to track their roles in this activity.</p>
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
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {org.organization?.name ? (
                            <Link 
                              href={`/organizations/${org.organization.id}`}
                              className="hover:text-gray-700 transition-colors"
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
                          <div className="text-xs text-gray-400">
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
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
    </div>
  );
}
