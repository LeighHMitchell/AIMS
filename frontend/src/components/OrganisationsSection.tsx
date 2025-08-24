import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, ChevronDown, UserPlus, Info, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActivityContributor } from "@/lib/activity-permissions";
import { useUser } from '@/hooks/useUser';
import { OrganizationSearchableSelect, Organization } from "@/components/ui/organization-searchable-select";
import { useParticipatingOrganizations } from "@/hooks/use-participating-organizations";
import { useOrganizations } from "@/hooks/use-organizations";
import Image from "next/image";

interface OrganisationsSectionProps {
  extendingPartners: any[];
  implementingPartners: any[];
  governmentPartners: any[];
  onChange: (field: string, value: any[]) => void;
  contributors: ActivityContributor[];
  onContributorAdd: (contributor: ActivityContributor) => void;
  canNominateContributors?: boolean;
  activityId?: string;
  onParticipatingOrganizationsChange?: (count: number) => void;
}

export default function OrganisationsSection({
  extendingPartners,
  implementingPartners,
  governmentPartners,
  onChange,
  contributors,
  onContributorAdd,
  canNominateContributors = false,
  activityId,
  onParticipatingOrganizationsChange,
}: OrganisationsSectionProps) {
  const { user } = useUser();
  const [nominationModal, setNominationModal] = useState<{open: boolean, organization: Organization | null}>({open: false, organization: null});
  const [openDropdown, setOpenDropdown] = useState<'extending' | 'implementing' | 'government' | null>(null);
  const [savingState, setSavingState] = useState<{extending: boolean, implementing: boolean, government: boolean}>({
    extending: false,
    implementing: false, 
    government: false
  });

  // Use the new hooks
  const { organizations, loading: organizationsLoading } = useOrganizations({
    onError: (error) => toast.error(`Failed to load organizations: ${error}`)
  });

  const {
    participatingOrganizations,
    loading: participatingLoading,
    addParticipatingOrganization,
    removeParticipatingOrganization,
    getOrganizationsByRole,
    isOrganizationParticipating,
  } = useParticipatingOrganizations({
    activityId,
    onError: (error) => toast.error(`Failed to manage participating organizations: ${error}`)
  });

  // Debug logging (after all hooks are defined)
  // Early return if no activityId to prevent errors
  if (!activityId) {
    return (
      <div className="max-w-4xl space-y-8 bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center text-gray-500">
          Loading activity data...
        </div>
      </div>
    );
  }

  console.log('[OrganisationsSection] organizationsLoading:', organizationsLoading, 'organizations:', organizations.length);
  console.log('[OrganisationsSection] activityId:', activityId);
  console.log('[OrganisationsSection] participatingOrganizations:', participatingOrganizations.length);

  // Notify parent of participating organizations count changes (with debouncing to prevent flicker)
  const stableOrgsCount = useRef(participatingOrganizations.length);
  const notifyTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any pending notification
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }

    // Only notify if the count has actually changed and stabilized
    if (stableOrgsCount.current !== participatingOrganizations.length) {
      notifyTimeoutRef.current = setTimeout(() => {
        stableOrgsCount.current = participatingOrganizations.length;
        if (onParticipatingOrganizationsChange) {
          console.log('[OrganisationsSection] Notifying parent of count change:', participatingOrganizations.length);
          onParticipatingOrganizationsChange(participatingOrganizations.length);
        }
      }, 100); // Small delay to prevent flicker during loading
    }

    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
      }
    };
  }, [participatingOrganizations.length, onParticipatingOrganizationsChange]);

  // Get organizations by role type
  const extendingOrgs = getOrganizationsByRole('extending');
  const implementingOrgs = getOrganizationsByRole('implementing');
  const governmentOrgs = getOrganizationsByRole('government');

  // Helper function to determine if an organization is classified as Partner Government
  const isPartnerGovernment = (org: Organization): boolean => {
    const typeCode = parseInt(org.organisation_type || '') || 0;
    const orgTypeText = (org.organisation_type || '').toLowerCase();
    const isMyanmar = org.country?.toLowerCase() === "myanmar";
    
    // Partner Government: Organizations in Myanmar with government-related types
    if (!isMyanmar) return false;
    
    // Check IATI codes: Government (10), Local Government (11), Other Public Sector (15)
    if ([10, 11, 15].includes(typeCode)) return true;
    
    // Check text-based organization types
    if (orgTypeText.includes('government') || 
        orgTypeText.includes('local government') ||
        orgTypeText.includes('other public sector') ||
        orgTypeText.includes('public sector')) {
      return true;
    }
    
    return false;
  };

  // Filter organizations that are not already participating in each role
  const getAvailableOrganizations = (roleType: 'extending' | 'implementing' | 'government') => {
    let filteredOrgs = organizations;
    
    // For government partners, only show organizations classified as Partner Government
    if (roleType === 'government') {
      filteredOrgs = organizations.filter(org => isPartnerGovernment(org));
    }
    
    return filteredOrgs.filter(org => !isOrganizationParticipating(org.id, roleType));
  };

  const handleAddOrganization = async (organizationId: string, roleType: 'extending' | 'implementing' | 'government') => {
    try {
      console.log('[OrganisationsSection] Adding organization:', organizationId, 'role:', roleType);
      console.log('[OrganisationsSection] Activity ID for add:', activityId);
      
      // Set saving state for this role type
      setSavingState(prev => ({ ...prev, [roleType]: true }));
      
      const result = await addParticipatingOrganization(organizationId, roleType);
      console.log('[OrganisationsSection] Add result:', result);
      toast.success('Organization added successfully');
    } catch (error) {
      console.error('[OrganisationsSection] Error adding organization:', error);
      toast.error('Failed to add organization');
    } finally {
      // Clear saving state for this role type
      setSavingState(prev => ({ ...prev, [roleType]: false }));
    }
  };

  const handleRemoveOrganization = async (organizationId: string, roleType: 'extending' | 'implementing' | 'government') => {
    try {
      await removeParticipatingOrganization(organizationId, roleType);
      toast.success('Organization removed successfully');
    } catch (error) {
      toast.error('Failed to remove organization');
    }
  };

  const nominateAsContributor = (organization: Organization) => {
    setNominationModal({open: true, organization});
  };

  const confirmNomination = () => {
    if (!nominationModal.organization) return;
    
    const organization = nominationModal.organization;
    
    // Check if already a contributor
    if (contributors.some(c => c.organizationId === organization.id)) {
      toast.error("This organization is already a contributor");
      setNominationModal({open: false, organization: null});
      return;
    }

    // Build the user's display name with fallbacks
    let nominatedByName = 'Unknown User';
    if (user) {
      if (user.name && user.name.trim() !== '') {
        nominatedByName = user.name.trim();
      } else if (user.firstName || user.lastName) {
        const nameParts = [user.firstName, user.lastName].filter(Boolean);
        nominatedByName = nameParts.join(' ').trim();
      } else if (user.email) {
        nominatedByName = user.email.split('@')[0]; // Use part before @
      }
    }

    const newContributor: ActivityContributor = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      organizationId: organization.id,
      organizationName: organization.name,
      status: 'nominated',
      role: 'partner', // Default role for nominated contributors
      nominatedBy: user?.id || 'unknown-user',
      nominatedByName: nominatedByName,
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onContributorAdd(newContributor);
    setNominationModal({open: false, organization: null});
    toast.success(`${organization.name} has been nominated as a contributor`);
  };

  const isAlreadyContributor = (orgId: string) => {
    return contributors.some(c => c.organizationId === orgId);
  };

  const renderOrganizationCard = (participatingOrg: any, roleType: 'extending' | 'implementing' | 'government') => {
    const org = participatingOrg.organization;
    if (!org) return null;

    return (
      <div key={participatingOrg.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
        {org.logo && (
          <div className="flex-shrink-0">
            <Image
              src={org.logo}
              alt={`${org.name} logo`}
              width={32}
              height={32}
              className="rounded-sm object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {org.name}
            </span>
                         {org.acronym && (
               <span className="font-medium text-foreground">
                 ({org.acronym})
               </span>
             )}
          </div>
          {(org.iati_org_id || org.country) && (
            <div className="flex items-center gap-1 mt-0.5">
              {org.iati_org_id && (
                <span className="text-xs text-muted-foreground">
                  {org.iati_org_id}
                </span>
              )}
              {org.iati_org_id && org.country && (
                <span className="text-xs text-muted-foreground">•</span>
              )}
              {org.country && (
                <span className="text-xs text-muted-foreground">
                  {org.country}
                </span>
              )}
            </div>
          )}
        </div>
        {roleType === 'implementing' && canNominateContributors && !isAlreadyContributor(org.id) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => nominateAsContributor(org)}
            className="text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Nominate as Data Contributor
          </Button>
        )}
        {roleType === 'implementing' && isAlreadyContributor(org.id) && (
          <span className="text-xs text-green-600 font-medium">✓ Data Contributor</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveOrganization(org.id, roleType)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl space-y-8 bg-white border border-gray-200 rounded-lg p-6">




      {/* Extending Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Extending Partners
            {savingState.extending ? (
              <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
            ) : extendingOrgs.length > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This is the government entity or development partner agency receiving funds from financing partner(s) for
            channeling to implementing partner(s).
          </p>

          <div className="space-y-3">
            {extendingOrgs.map((participatingOrg) => 
              renderOrganizationCard(participatingOrg, 'extending')
            )}

            {extendingOrgs.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No extending partners added</p>
              </div>
            )}
          </div>

          <OrganizationSearchableSelect
            organizations={getAvailableOrganizations('extending')}
            value=""
            onValueChange={(organizationId) => {
              console.log('[OrganisationsSection] Extending partner selected:', organizationId);
              if (organizationId) {
                handleAddOrganization(organizationId, 'extending');
              }
            }}
            placeholder="Select an extending partner"
            searchPlaceholder="Search extending partners..."
            disabled={organizationsLoading}
            className="w-full"
            open={openDropdown === 'extending'}
            onOpenChange={(open) => setOpenDropdown(open ? 'extending' : null)}
          />
        </CardContent>
      </Card>

      {/* Implementing Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Implementing Partners
            {savingState.implementing ? (
              <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
            ) : implementingOrgs.length > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            The implementer of the activity is the organisation(s) which is/are principally responsible for delivering this
            activity.
          </p>

          <div className="space-y-3">
            {implementingOrgs.map((participatingOrg) => 
              renderOrganizationCard(participatingOrg, 'implementing')
            )}

            {implementingOrgs.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No implementing partners added</p>
              </div>
            )}
          </div>

          <OrganizationSearchableSelect
            organizations={getAvailableOrganizations('implementing')}
            value=""
            onValueChange={(organizationId) => {
              console.log('[OrganisationsSection] Implementing partner selected:', organizationId);
              if (organizationId) {
                handleAddOrganization(organizationId, 'implementing');
              }
            }}
            placeholder="Select an implementing partner"
            searchPlaceholder="Search implementing partners..."
            disabled={organizationsLoading}
            className="w-full"
            open={openDropdown === 'implementing'}
            onOpenChange={(open) => setOpenDropdown(open ? 'implementing' : null)}
          />
        </CardContent>
      </Card>

      {/* Government Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Government Partners
            {savingState.government ? (
              <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
            ) : governmentOrgs.length > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            The government entity or entities responsible for oversight or maintenance of the activity. Often this will be
            the government entity with which a MoU or similar agreement is signed. In many cases, the MoU will be
            signed directly with the implementing partner.
          </p>

          <div className="space-y-3">
            {governmentOrgs.map((participatingOrg) => 
              renderOrganizationCard(participatingOrg, 'government')
            )}

            {governmentOrgs.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No government partners added</p>
              </div>
            )}
          </div>

          <OrganizationSearchableSelect
            organizations={getAvailableOrganizations('government')}
            value=""
            onValueChange={(organizationId) => {
              console.log('[OrganisationsSection] Government partner selected:', organizationId);
              if (organizationId) {
                handleAddOrganization(organizationId, 'government');
              }
            }}
            placeholder="Select a government partner"
            searchPlaceholder="Search government partners..."
            disabled={organizationsLoading}
            className="w-full"
            open={openDropdown === 'government'}
            onOpenChange={(open) => setOpenDropdown(open ? 'government' : null)}
            forceDirection="up"
          />
        </CardContent>
      </Card>

      {/* Nomination Confirmation Modal */}
      <Dialog open={nominationModal.open} onOpenChange={(open) => setNominationModal({open, organization: nominationModal.organization})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate as Data Contributor</DialogTitle>
            <DialogDescription>
              Do you want to allow <strong>{nominationModal.organization?.name}</strong> to contribute transactions, results, or implementation data?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will allow them to add and edit their own financial data, results, and implementation records in the system. 
                It does not change their official role as an implementing partner.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNominationModal({open: false, organization: null})}
            >
              Cancel
            </Button>
            <Button onClick={confirmNomination}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nominate as Contributor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 