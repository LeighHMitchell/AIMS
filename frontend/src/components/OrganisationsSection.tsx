import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, ChevronDown, UserPlus, Info } from "lucide-react";
import { toast } from "sonner";
import { ActivityContributor } from "@/lib/activity-permissions";
import { useExtendingPartnersAutosave, useImplementingPartnersAutosave, useGovernmentPartnersAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';

interface Partner {
  orgId: string;
  name: string;
}

interface OrganisationsSectionProps {
  extendingPartners: Partner[];
  implementingPartners: Partner[];
  governmentPartners: Partner[];
  onChange: (field: string, value: Partner[]) => void;
  contributors: ActivityContributor[];
  onContributorAdd: (contributor: ActivityContributor) => void;
  canNominateContributors?: boolean;
  activityId?: string;
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
}: OrganisationsSectionProps) {
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [governmentOnlyPartners, setGovernmentOnlyPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [nominationModal, setNominationModal] = useState<{open: boolean, partner: Partner | null}>({open: false, partner: null});
  const { user } = useUser();

  // Field-level autosave hooks
  const extendingPartnersAutosave = useExtendingPartnersAutosave(activityId, user?.id);
  const implementingPartnersAutosave = useImplementingPartnersAutosave(activityId, user?.id);
  const governmentPartnersAutosave = useGovernmentPartnersAutosave(activityId, user?.id);

  // Enhanced onChange that triggers autosave
  const handleChange = (field: string, value: Partner[]) => {
    onChange(field, value);
    if (activityId) {
      switch (field) {
        case 'extendingPartners':
          extendingPartnersAutosave.triggerFieldSave(value);
          break;
        case 'implementingPartners':
          implementingPartnersAutosave.triggerFieldSave(value);
          break;
        case 'governmentPartners':
          governmentPartnersAutosave.triggerFieldSave(value);
          break;
      }
    }
  };

  // Fetch partners from API
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      console.log('[OrganisationsSection] Fetching partners...');
      const res = await fetch("/api/partners");
      console.log('[OrganisationsSection] Partners API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[OrganisationsSection] Partners API response data:', data?.length || 0, 'partners');
        
        // Format all partners for extending/implementing dropdowns
        const formattedPartners = data.map((partner: any) => ({
          orgId: partner.id,
          name: `${partner.name} ${partner.code || ''}`.trim()
        }));
        setAvailablePartners(formattedPartners);
        
        // Filter only government partners for government dropdown
        const govPartners = data
          .filter((partner: any) => partner.type === 'partner_government')
          .map((partner: any) => ({
            orgId: partner.id,
            name: `${partner.name} ${partner.code || ''}`.trim()
          }));
        setGovernmentOnlyPartners(govPartners);
      } else {
        console.error('[OrganisationsSection] Partners API error:', res.status, res.statusText);
        // Retry once after a delay
        setTimeout(() => {
          console.log('[OrganisationsSection] Retrying partners fetch...');
          fetchPartners();
        }, 1000);
      }
    } catch (error) {
      console.error('[OrganisationsSection] Error fetching partners:', error);
      toast.error("Failed to load partners - retrying...");
      // Retry once after a delay
      setTimeout(() => {
        console.log('[OrganisationsSection] Retrying partners fetch after error...');
        fetchPartners();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const addPartner = (type: 'extending' | 'implementing' | 'government', partnerId: string) => {
    const partner = availablePartners.find(p => p.orgId === partnerId);
    if (!partner) return;

    let currentPartners: Partner[] = [];
    let fieldName = '';

    switch (type) {
      case 'extending':
        currentPartners = [...extendingPartners];
        fieldName = 'extendingPartners';
        break;
      case 'implementing':
        currentPartners = [...implementingPartners];
        fieldName = 'implementingPartners';
        break;
      case 'government':
        currentPartners = [...governmentPartners];
        fieldName = 'governmentPartners';
        break;
    }

    // Check if partner already exists
    if (currentPartners.some(p => p.orgId === partner.orgId)) {
      toast.error("Partner already added");
      return;
    }

    currentPartners.push(partner);
    handleChange(fieldName, currentPartners);
  };

  const removePartner = (type: 'extending' | 'implementing' | 'government', orgId: string) => {
    let currentPartners: Partner[] = [];
    let fieldName = '';

    switch (type) {
      case 'extending':
        currentPartners = extendingPartners.filter(p => p.orgId !== orgId);
        fieldName = 'extendingPartners';
        break;
      case 'implementing':
        currentPartners = implementingPartners.filter(p => p.orgId !== orgId);
        fieldName = 'implementingPartners';
        break;
      case 'government':
        currentPartners = governmentPartners.filter(p => p.orgId !== orgId);
        fieldName = 'governmentPartners';
        break;
    }

    handleChange(fieldName, currentPartners);
  };

  const nominateAsContributor = (partner: Partner) => {
    setNominationModal({open: true, partner});
  };

  const confirmNomination = () => {
    if (!nominationModal.partner) return;
    
    const partner = nominationModal.partner;
    
    // Check if already a contributor
    if (contributors.some(c => c.organizationId === partner.orgId)) {
      toast.error("This organization is already a contributor");
      setNominationModal({open: false, partner: null});
      return;
    }

    const newContributor: ActivityContributor = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      organizationId: partner.orgId,
      organizationName: partner.name,
      status: 'nominated',
      role: 'partner', // Default role for nominated contributors
      nominatedBy: 'current-user', // Would be actual user ID
      nominatedByName: 'Activity Creator', // Would be actual user name
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onContributorAdd(newContributor);
    setNominationModal({open: false, partner: null});
    toast.success(`${partner.name} has been nominated as a contributor`);
  };

  const isAlreadyContributor = (orgId: string) => {
    return contributors.some(c => c.organizationId === orgId);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">PARTICIPATING ORGANISATIONS</h2>
      </div>

      {/* Clarifying Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Organisations listed here define their official roles in this activity for reporting purposes (e.g. implementing, extending, or government partner). 
          This does not affect who can contribute data in the system — that is managed in the Contributors tab.
        </AlertDescription>
      </Alert>

      {/* Extending Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Extending Partners
            {extendingPartnersAutosave.state.isSaving && (
              <span className="text-xs text-blue-600">Saving...</span>
            )}
            {extendingPartnersAutosave.state.lastSaved && !extendingPartnersAutosave.state.isSaving && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            {extendingPartnersAutosave.state.error && (
              <span className="text-xs text-red-600">Save failed</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {extendingPartnersAutosave.state.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to save extending partners: {extendingPartnersAutosave.state.error.message}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-gray-600">
            This is the government entity or development partner agency receiving funds from financing partner(s) for
            channeling to implementing partner(s).
          </p>

          <div className="space-y-3">
            {extendingPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{partner.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePartner('extending', partner.orgId)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {extendingPartners.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No extending partners added</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) => addPartner('extending', value)}
              disabled={loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an extending partner" />
              </SelectTrigger>
              <SelectContent>
                {availablePartners
                  .filter(p => !extendingPartners.some(ep => ep.orgId === p.orgId))
                  .map((partner) => (
                    <SelectItem key={partner.orgId} value={partner.orgId}>
                      {partner.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="link"
            className="text-blue-600 p-0"
            onClick={() => {
              // Trigger the select dropdown
              const selectTrigger = document.querySelector('[data-state="closed"]') as HTMLElement;
              selectTrigger?.click();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another extending partner
          </Button>
        </CardContent>
      </Card>

      {/* Implementing Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Implementing Partners
            {implementingPartnersAutosave.state.isSaving && (
              <span className="text-xs text-blue-600">Saving...</span>
            )}
            {implementingPartnersAutosave.state.lastSaved && !implementingPartnersAutosave.state.isSaving && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            {implementingPartnersAutosave.state.error && (
              <span className="text-xs text-red-600">Save failed</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {implementingPartnersAutosave.state.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to save implementing partners: {implementingPartnersAutosave.state.error.message}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-gray-600">
            The implementer of the activity is the organisation(s) which is/are principally responsible for delivering this
            activity.
          </p>

          <div className="space-y-3">
            {implementingPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{partner.name}</p>
                </div>
                {canNominateContributors && !isAlreadyContributor(partner.orgId) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nominateAsContributor(partner)}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Nominate as Data Contributor
                  </Button>
                )}
                {isAlreadyContributor(partner.orgId) && (
                  <span className="text-xs text-green-600 font-medium">✓ Data Contributor</span>
                )}
                <ChevronDown className="h-4 w-4 text-gray-400" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePartner('implementing', partner.orgId)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {implementingPartners.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No implementing partners added</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) => addPartner('implementing', value)}
              disabled={loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an implementing partner" />
              </SelectTrigger>
              <SelectContent>
                {availablePartners
                  .filter(p => !implementingPartners.some(ip => ip.orgId === p.orgId))
                  .map((partner) => (
                    <SelectItem key={partner.orgId} value={partner.orgId}>
                      {partner.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="link"
            className="text-blue-600 p-0"
            onClick={() => {
              // Trigger the select dropdown
              const selectTriggers = document.querySelectorAll('[data-state="closed"]');
              const targetTrigger = selectTriggers[1] as HTMLElement;
              targetTrigger?.click();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another implementing partner
          </Button>
        </CardContent>
      </Card>

      {/* Government Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Government Partners
            {governmentPartnersAutosave.state.isSaving && (
              <span className="text-xs text-blue-600">Saving...</span>
            )}
            {governmentPartnersAutosave.state.lastSaved && !governmentPartnersAutosave.state.isSaving && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            {governmentPartnersAutosave.state.error && (
              <span className="text-xs text-red-600">Save failed</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {governmentPartnersAutosave.state.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to save government partners: {governmentPartnersAutosave.state.error.message}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-gray-600">
            The government entity or entities responsible for oversight or maintenance of the activity. Often this will be
            the government entity with which a MoU or similar agreement is signed. In many cases, the MoU will be
            signed directly with the implementing partner.
          </p>

          <div className="space-y-3">
            {governmentPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{partner.name}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePartner('government', partner.orgId)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {governmentPartners.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-center">No government partners added</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) => addPartner('government', value)}
              disabled={loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a government partner" />
              </SelectTrigger>
              <SelectContent>
                {governmentOnlyPartners
                  .filter(p => !governmentPartners.some(gp => gp.orgId === p.orgId))
                  .map((partner) => (
                    <SelectItem key={partner.orgId} value={partner.orgId}>
                      {partner.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="link"
            className="text-blue-600 p-0"
            onClick={() => {
              // Trigger the select dropdown
              const selectTriggers = document.querySelectorAll('[data-state="closed"]');
              const targetTrigger = selectTriggers[2] as HTMLElement;
              targetTrigger?.click();
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another government partner
          </Button>
        </CardContent>
      </Card>

      {/* Nomination Confirmation Modal */}
      <Dialog open={nominationModal.open} onOpenChange={(open) => setNominationModal({open, partner: nominationModal.partner})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate as Data Contributor</DialogTitle>
            <DialogDescription>
              Do you want to allow <strong>{nominationModal.partner?.name}</strong> to contribute transactions, results, or implementation data?
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
              onClick={() => setNominationModal({open: false, partner: null})}
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