import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, UserPlus, Info, HelpCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { ActivityContributor } from "@/lib/activity-permissions";
import { useExtendingPartnersAutosave, useImplementingPartnersAutosave, useGovernmentPartnersAutosave } from '@/hooks/use-field-autosave-new';
import { useUser } from '@/hooks/useUser';
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Partner {
  orgId: string;
  name: string;
  acronym?: string;
  iatiOrgId?: string;
  code?: string;
  logo?: string;
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

// Organization Combobox Component
interface OrganizationComboboxProps {
  partners: Partner[];
  onSelect: (partner: Partner) => void;
  placeholder: string;
  disabled?: boolean;
}

function OrganizationCombobox({ partners, onSelect, placeholder, disabled = false }: OrganizationComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Filter partners based on search
  const filteredPartners = React.useMemo(() => {
    if (!search) return partners;
    
    const query = search.toLowerCase();
    return partners.filter(partner => 
      partner.name.toLowerCase().includes(query) ||
      (partner.acronym && partner.acronym.toLowerCase().includes(query)) ||
      (partner.iatiOrgId && partner.iatiOrgId.toLowerCase().includes(query)) ||
      (partner.code && partner.code.toLowerCase().includes(query))
    );
  }, [partners, search]);

  // Helper function to format organization name with acronym
  const formatOrganizationName = (partner: Partner) => {
    if (partner.acronym) {
      return `${partner.name} (${partner.acronym})`;
    }
    return partner.name;
  };

  const handleSelect = (partner: Partner) => {
    onSelect(partner);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal px-4 py-2 text-sm h-auto",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="text-muted-foreground">{placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full" align="start" sideOffset={4}>
        <Command>
          <CommandInput
            placeholder="Search organizations by name, acronym, or IATI ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <CommandList>
            {search && filteredPartners.length === 0 && (
              <CommandEmpty>No organization found.</CommandEmpty>
            )}
            {filteredPartners.length > 0 && (
              <ScrollArea className="max-h-60 overflow-x-hidden overflow-y-auto">
                <CommandGroup>
                  {filteredPartners.map(partner => (
                    <CommandItem
                      key={partner.orgId}
                      onSelect={() => handleSelect(partner)}
                      className="py-3"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {partner.code && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {partner.code}
                            </span>
                          )}
                          <span className="font-medium text-foreground">{formatOrganizationName(partner)}</span>
                        </div>
                        {partner.iatiOrgId && (
                          <div className="text-sm text-muted-foreground mt-1">
                            <span className="font-mono">{partner.iatiOrgId}</span>
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
        
        // Format all partners for extending/implementing dropdowns with enhanced data
        const formattedPartners = data.map((partner: any) => ({
          orgId: partner.id,
          name: partner.name,
          acronym: partner.acronym,
          iatiOrgId: partner.iatiOrgId,
          code: partner.code,
          logo: partner.logo
        }));
        setAvailablePartners(formattedPartners);
        
        // Filter only government partners for government dropdown
        const govPartners = data
          .filter((partner: any) => partner.type === 'partner_government')
          .map((partner: any) => ({
            orgId: partner.id,
            name: partner.name,
            acronym: partner.acronym,
            iatiOrgId: partner.iatiOrgId,
            code: partner.code,
            logo: partner.logo
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

  const addPartner = (type: 'extending' | 'implementing' | 'government', partner: Partner) => {
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

  // Helper function to format organization name with acronym
  const formatOrganizationName = (partner: Partner) => {
    if (partner.acronym) {
      return `${partner.name} (${partner.acronym})`;
    }
    return partner.name;
  };

  return (
    <TooltipProvider>
      <div className="max-w-4xl space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Participating Organisations</h2>
      </div>

      {/* Help Text */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-700">
          Organisations listed here define their official roles in this activity for reporting purposes (e.g. implementing, extending, or government partner). 
          This does not affect who can contribute data in the system — that is managed in the Contributors tab.
        </p>
      </div>

      {/* Extending Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Extending Partners
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-normal">This is the government entity or development partner agency receiving funds from financing partner(s) for channeling to implementing partner(s).</p>
              </TooltipContent>
            </Tooltip>
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


          <div className="space-y-3">
            {extendingPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                {partner.logo ? (
                  <img 
                    src={partner.logo} 
                    alt={`${partner.name} logo`}
                    className="h-8 w-8 object-contain rounded"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {partner.code && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {partner.code}
                      </span>
                    )}
                    <p className="font-medium">{formatOrganizationName(partner)}</p>
                  </div>
                  {partner.iatiOrgId && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{partner.iatiOrgId}</span>
                    </div>
                  )}
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

          <OrganizationCombobox
            partners={availablePartners.filter(p => !extendingPartners.some(ep => ep.orgId === p.orgId))}
            onSelect={(partner) => addPartner('extending', partner)}
            placeholder="Select an extending partner"
            disabled={loading}
          />
        </CardContent>
      </Card>

      {/* Implementing Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Implementing Partners
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-normal">The implementer of the activity is the organisation(s) which is/are principally responsible for delivering this activity.</p>
              </TooltipContent>
            </Tooltip>
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


          <div className="space-y-3">
            {implementingPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                {partner.logo ? (
                  <img 
                    src={partner.logo} 
                    alt={`${partner.name} logo`}
                    className="h-8 w-8 object-contain rounded"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {partner.code && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {partner.code}
                      </span>
                    )}
                    <p className="font-medium">{formatOrganizationName(partner)}</p>
                  </div>
                  {partner.iatiOrgId && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{partner.iatiOrgId}</span>
                    </div>
                  )}
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

          <OrganizationCombobox
            partners={availablePartners.filter(p => !implementingPartners.some(ip => ip.orgId === p.orgId))}
            onSelect={(partner) => addPartner('implementing', partner)}
            placeholder="Select an implementing partner"
            disabled={loading}
          />
        </CardContent>
      </Card>

      {/* Government Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            Government Partners
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-normal">This is the government entity or development partner agency receiving funds from financing partner(s) for channeling to implementing partner(s).</p>
              </TooltipContent>
            </Tooltip>
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


          <div className="space-y-3">
            {governmentPartners.map((partner) => (
              <div key={partner.orgId} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                {partner.logo ? (
                  <img 
                    src={partner.logo} 
                    alt={`${partner.name} logo`}
                    className="h-8 w-8 object-contain rounded"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-600" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {partner.code && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {partner.code}
                      </span>
                    )}
                    <p className="font-medium">{formatOrganizationName(partner)}</p>
                  </div>
                  {partner.iatiOrgId && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{partner.iatiOrgId}</span>
                    </div>
                  )}
                </div>
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

          <OrganizationCombobox
            partners={governmentOnlyPartners.filter(p => !governmentPartners.some(gp => gp.orgId === p.orgId))}
            onSelect={(partner) => addPartner('government', partner)}
            placeholder="Select a government partner"
            disabled={loading}
          />
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
    </TooltipProvider>
  );
} 