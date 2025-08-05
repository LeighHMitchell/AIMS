"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, Check, AlertCircle, UserPlus } from "lucide-react";
import { Partner } from "@/app/api/partners/route";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { OrganizationSearchableSelect } from "@/components/ui/organization-searchable-select";
import { useOrganizations } from "@/hooks/use-organizations";
import { useContributors, ActivityContributor } from "@/hooks/use-contributors";

interface ContributorsSectionProps {
  contributors: ActivityContributor[];
  onChange: (contributors: ActivityContributor[]) => void;
  permissions: {
    canNominateContributors: boolean;
    canApproveJoinRequests: boolean;
  };
  activityId?: string;
  onContributorsChange?: (count: number) => void;
}

export default function ContributorsSection({ 
  contributors: propsContributors, 
  onChange, 
  permissions,
  activityId,
  onContributorsChange
}: ContributorsSectionProps) {
  const { user } = useUser();
  const { organizations, loading: organizationsLoading } = useOrganizations();
  const { 
    contributors: dbContributors, 
    loading: contributorsLoading, 
    addContributor, 
    updateContributor, 
    removeContributor 
  } = useContributors(activityId);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  // Use database contributors if available, otherwise fall back to props
  const contributors = dbContributors.length > 0 ? dbContributors : propsContributors;

  // Notify parent when contributors count changes
  useEffect(() => {
    onContributorsChange?.(contributors.length);
  }, [contributors.length, onContributorsChange]);

  const nominateContributor = async () => {
    if (!selectedOrganizationId || !user || !activityId) return;

    const organization = organizations.find(o => o.id === selectedOrganizationId);
    if (!organization) return;

    // Check if already nominated
    if (contributors.some(c => c.organization_id === selectedOrganizationId)) {
      toast.error("This organization is already a contributor");
      return;
    }

    try {
      await addContributor({
        organizationId: selectedOrganizationId,
        organizationName: organization.name,
        status: 'nominated',
        role: 'contributor',
        nominatedBy: user.id,
        nominatedByName: user.name,
        canEditOwnData: true,
        canViewOtherDrafts: false
      });

      setSelectedOrganizationId("");
    } catch (error) {
      console.error('[CONTRIBUTORS] Error nominating contributor:', error);
    }
    
    // Log contributor nomination
    try {
      import('@/lib/activity-logger').then(({ ActivityLogger }) => {
        const newContributorForLog = {
          id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          organization_id: selectedOrganizationId,
          organization_name: organization.name,
          activity_id: activityId || '',
          status: 'nominated' as const,
          role: 'contributor',
          nominated_by: user.id,
          nominated_by_name: user.name,
          nominated_at: new Date().toISOString(),
          responded_at: null,
          can_edit_own_data: true,
          can_view_other_drafts: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        ActivityLogger.contactAdded(
          newContributorForLog,
          { id: activityId || 'current-activity', title: 'Current Activity' },
          { id: user?.id || 'current-user', name: user?.name || 'Current User', role: user?.role || 'user' }
        );
      });
    } catch (error) {
      console.error('Failed to log contributor nomination:', error);
    }
  };

  const handleRemoveContributor = async (contributorId: string) => {
    const contributor = contributors.find(c => c.id === contributorId);
    if (contributor && contributor.status === 'accepted') {
      if (!confirm("This contributor has already accepted. Are you sure you want to remove them?")) {
        return;
      }
    }

    try {
      await removeContributor(contributorId);
    } catch (error) {
      console.error('[CONTRIBUTORS] Error removing contributor:', error);
    }
  };

  const respondToNomination = async (contributorId: string, accept: boolean) => {
    if (!user || !user.organizationId) return;

    const contributor = contributors.find(c => c.id === contributorId);
    if (!contributor || contributor.organization_id !== user.organizationId) return;

    try {
      await updateContributor(contributorId, {
        status: accept ? 'accepted' : 'declined'
      });

      // Also update the parent state for backward compatibility
      const updatedContributor = {
        ...contributor,
        status: accept ? 'accepted' : 'declined' as any,
        respondedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      onChange(propsContributors.map(c => c.id === contributorId ? updatedContributor : c));
      
      toast.success(accept ? "You are now a contributor to this activity" : "Nomination declined");
    } catch (error) {
      console.error('[CONTRIBUTORS] Error responding to nomination:', error);
    }
  };

  // Check if current user has a pending nomination
  const pendingNomination = user?.organizationId 
    ? contributors.find(c => c.organization_id === user.organizationId && c.status === 'nominated')
    : null;

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Activity Contributors
        </CardTitle>
        <CardDescription>
          Organizations contributing to this activity can add their own financial data and results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Merged Help Text */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Contributors are organisations that can edit or add financial transactions, results, and implementation records. 
            This does not change their official role in the activity — roles are defined in the Organisations tab. 
            Contributors can add and edit their own financial transactions, results, and implementation details. 
            Only the activity creator and government validators can view all contributions.
          </AlertDescription>
        </Alert>
        {/* Pending Nomination Alert */}
        {pendingNomination && (
          <Alert>
            <UserPlus className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                You have been nominated as a contributor to this activity by {pendingNomination.nominated_by_name}
              </span>
              <div className="flex gap-2 ml-4">
                <Button 
                  size="sm" 
                  onClick={() => respondToNomination(pendingNomination.id, true)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => respondToNomination(pendingNomination.id, false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Nominate New Contributor */}
        {permissions.canNominateContributors && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Nominate a Contributor</label>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50" style={{ minHeight: '68px' }}>
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <OrganizationSearchableSelect
                    organizations={organizations.filter(org => 
                      org.id !== user?.organizationId && 
                      !contributors.some(c => c.organization_id === org.id)
                    )}
                    value={selectedOrganizationId}
                    onValueChange={setSelectedOrganizationId}
                    placeholder="Search organizations to nominate..."
                    disabled={organizationsLoading}
                    className="w-full border-0 bg-transparent shadow-none"
                  />
                </div>
              </div>
              <Button 
                onClick={nominateContributor}
                disabled={!selectedOrganizationId || organizationsLoading || contributorsLoading}
                className="h-10 shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nominate
              </Button>
            </div>
          </div>
        )}

        {/* Contributors List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Contributors</label>
          {contributors.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              No contributors have been nominated yet
            </div>
          ) : (
            <div className="space-y-2">
              {contributors.map((contributor) => (
                <div 
                  key={contributor.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const organization = organizations.find(o => o.id === contributor.organization_id);
                      console.log('[ContributorsSection] Organization:', organization?.name, 'Logo:', organization?.logo);
                      return organization?.logo ? (
                        <img 
                          src={organization.logo} 
                          alt={organization.name}
                          className="h-8 w-8 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            // Fallback to Users icon if logo fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <Users className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      );
                    })()}
                    <Users className="h-8 w-8 text-muted-foreground flex-shrink-0 hidden" />
                    <div>
                      <p className="font-medium">
                        {(() => {
                          // Find the organization details for formatting
                          const organization = organizations.find(o => o.id === contributor.organization_id);
                          if (organization) {
                            // Format: [Name] ([Acronym]) - IATI: [identifier]
                            let display = organization.name;
                            if (organization.acronym) {
                              display += ` (${organization.acronym})`;
                            }
                            if (organization.iati_org_id) {
                              display += ` - IATI: ${organization.iati_org_id}`;
                            }
                            return display;
                          }
                          return contributor.organization_name;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nominated by {contributor.nominated_by_name} on{' '}
                        {new Date(contributor.nominated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      contributor.status === 'accepted' ? 'default' :
                      contributor.status === 'declined' ? 'secondary' :
                      'outline'
                    }>
                      {contributor.status}
                    </Badge>
                    {permissions.canNominateContributors && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveContributor(contributor.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


      </CardContent>
    </Card>
  );
} 