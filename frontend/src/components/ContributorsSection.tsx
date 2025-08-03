"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, Check, AlertCircle, UserPlus, ChevronsUpDown, Building2 } from "lucide-react";
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
import { ActivityContributor } from "@/lib/activity-permissions";
import { Partner } from "@/app/api/partners/route";
import { useUser } from "@/hooks/useUser";
import { useContributorsAutosave } from "@/hooks/use-field-autosave-new";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContributorsSectionProps {
  contributors: ActivityContributor[];
  onChange: (contributors: ActivityContributor[]) => void;
  permissions: {
    canNominateContributors: boolean;
    canApproveJoinRequests: boolean;
  };
  activityId?: string;
  availablePartners?: Partner[]; // Optional pre-loaded partners to avoid API call
}

export default function ContributorsSection({ 
  contributors, 
  onChange, 
  permissions,
  activityId,
  availablePartners
}: ContributorsSectionProps) {
  const { user } = useUser();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Field-level autosave for contributors
  // Pass 'NEW' if activityId is empty to trigger activity creation
  const effectiveActivityId = activityId && activityId !== '' ? activityId : 'NEW';
  const contributorsAutosave = useContributorsAutosave(effectiveActivityId, user?.id);

  // Enhanced onChange that triggers autosave
  const handleContributorsChange = (newContributors: ActivityContributor[]) => {
    onChange(newContributors);
    // Always trigger autosave - the hook will handle new activity creation if needed
    contributorsAutosave.triggerFieldSave(newContributors);
  };

  // Load partners for selection
  useEffect(() => {
    if (availablePartners && availablePartners.length > 0) {
      // Use pre-loaded partners if available (no loading needed)
      setPartners(availablePartners);
      setLoading(false);
    } else {
      // Fetch partners from API if not provided
      loadPartners();
    }
  }, [availablePartners]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/partners');
      const data = await res.json();
      setPartners(data);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get display name for organization (e.g., "Asian Development Bank (ADB)")
  const getOrganizationDisplay = (partner: Partner) => {
    if (partner.name && partner.acronym && partner.name !== partner.acronym) {
      return `${partner.name} (${partner.acronym})`;
    }
    return partner.name || partner.acronym || 'Unknown';
  };

  // Helper to get IATI identifier and country info
  const getIatiCountryLine = (partner: Partner) => {
    const iati = partner.iatiOrgId || partner.code;
    const country = partner.countryRepresented;
    if (iati && country) {
      return `${iati} · ${country}`;
    } else if (iati) {
      return iati;
    } else if (country) {
      return country;
    }
    return null;
  };

  // Filter partners based on search
  const filteredPartners = useMemo(() => {
    const availablePartners = partners.filter(p => 
      p.id !== user?.organizationId && 
      !contributors.some(c => c.organizationId === p.id)
    );
    
    if (!search) return availablePartners;
    
    const term = search.toLowerCase();
    return availablePartners.filter(partner =>
      partner.name.toLowerCase().includes(term) ||
      (partner.acronym && partner.acronym.toLowerCase().includes(term)) ||
      (partner.iatiOrgId && partner.iatiOrgId.toLowerCase().includes(term)) ||
      (partner.code && partner.code.toLowerCase().includes(term)) ||
      (partner.countryRepresented && partner.countryRepresented.toLowerCase().includes(term))
    );
  }, [partners, search, user?.organizationId, contributors]);

  const nominateContributor = () => {
    if (!selectedPartnerId || !user) return;

    const partner = partners.find(p => p.id === selectedPartnerId);
    if (!partner) return;

    // Check if already nominated
    if (contributors.some(c => c.organizationId === selectedPartnerId)) {
      toast.error("This organization is already a contributor");
      return;
    }

    const newContributor: ActivityContributor = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      organizationId: selectedPartnerId,
      organizationName: partner.name,
      status: 'nominated',
      role: 'contributor',
      nominatedBy: user.id,
      nominatedByName: user.name,
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[CONTRIBUTORS DEBUG] Nominating contributor:', newContributor);
    console.log('[CONTRIBUTORS DEBUG] Current contributors before:', contributors);
    
    const updatedContributors = [...contributors, newContributor];
    console.log('[CONTRIBUTORS DEBUG] Updated contributors:', updatedContributors);
    
    handleContributorsChange(updatedContributors);
    setSelectedPartnerId("");
    setSearch("");
    setOpen(false);
    toast.success(`${partner.name} has been nominated as a contributor`);
    
    // Log contributor nomination
    try {
      import('@/lib/activity-logger').then(({ ActivityLogger }) => {
        ActivityLogger.contactAdded(
          newContributor,
          { id: activityId || 'current-activity', title: 'Current Activity' },
          { id: user?.id || 'current-user', name: user?.name || 'Current User', role: user?.role || 'user' }
        );
      });
    } catch (error) {
      console.error('Failed to log contributor nomination:', error);
    }
    
    console.log('[CONTRIBUTORS DEBUG] onChange called with', updatedContributors.length, 'contributors');
  };

  const removeContributor = (contributorId: string) => {
    const contributor = contributors.find(c => c.id === contributorId);
    if (contributor && contributor.status === 'accepted') {
      if (!confirm("This contributor has already accepted. Are you sure you want to remove them?")) {
        return;
      }
    }
    handleContributorsChange(contributors.filter(c => c.id !== contributorId));
  };

  const respondToNomination = async (contributorId: string, accept: boolean) => {
    if (!user || !user.organizationId) return;

    const contributor = contributors.find(c => c.id === contributorId);
    if (!contributor || contributor.organizationId !== user.organizationId) return;

    const updatedContributor = {
      ...contributor,
      status: accept ? 'accepted' : 'declined' as any,
      respondedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    handleContributorsChange(contributors.map(c => c.id === contributorId ? updatedContributor : c));
    toast.success(accept ? "You are now a contributor to this activity" : "Nomination declined");
  };

  // Check if current user has a pending nomination
  const pendingNomination = user?.organizationId 
    ? contributors.find(c => c.organizationId === user.organizationId && c.status === 'nominated')
    : null;

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Activity Contributors
        </CardTitle>
        <CardDescription>
          Organizations contributing to this activity can add their own financial data and results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consolidated Help Text */}
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
                You have been nominated as a contributor to this activity by {pendingNomination.nominatedByName}
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
          <div className="space-y-3">
            <label className="text-sm font-medium">Nominate a Contributor</label>
            <div className="flex flex-col gap-3">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-auto px-3 py-2 text-left"
                  >
                    {(() => {
                      const selected = partners.find((p) => p.id === selectedPartnerId);
                      if (selected) {
                        return (
                          <span className="flex flex-col min-w-0 text-left">
                            <span className="truncate font-medium">
                              {getOrganizationDisplay(selected)}
                            </span>
                            {getIatiCountryLine(selected) && (
                              <span className="text-xs text-gray-500 truncate">
                                {getIatiCountryLine(selected)}
                              </span>
                            )}
                          </span>
                        );
                      }
                      return <span className="text-gray-400">Select an organization to nominate</span>;
                    })()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 w-full min-w-[400px]">
                  <Command>
                    <CommandInput
                      placeholder="Search organizations..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <CommandList>
                      {search && filteredPartners.length === 0 && (
                        <CommandEmpty>No organization found.</CommandEmpty>
                      )}
                      {filteredPartners.length > 0 && (
                        <ScrollArea className="max-h-60">
                          <CommandGroup>
                            {filteredPartners.map(partner => (
                              <CommandItem
                                key={partner.id}
                                onSelect={() => {
                                  setSelectedPartnerId(partner.id);
                                  setOpen(false);
                                }}
                                className="py-3"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">
                                    {getOrganizationDisplay(partner)}
                                  </span>
                                  {getIatiCountryLine(partner) && (
                                    <span className="text-xs text-gray-500 truncate">
                                      {getIatiCountryLine(partner)}
                                    </span>
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
              <Button 
                onClick={nominateContributor}
                disabled={!selectedPartnerId}
                className="w-full"
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
                      // Show loading placeholder while partners are being fetched
                      if (loading) {
                        return (
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        );
                      }
                      
                      const partner = partners.find(p => p.id === contributor.organizationId);
                      if (partner?.logo) {
                        return (
                          <img 
                            src={partner.logo} 
                            alt={`${partner.name} logo`}
                            className="h-8 w-8 object-contain rounded"
                          />
                        );
                      }
                      
                      // Only show Building2 when loading is complete and no logo found
                      return <Building2 className="h-5 w-5 text-gray-600" />;
                    })()}
                    <div>
                      <div className="flex flex-col">
                        <p className="font-medium">
                          {(() => {
                            // Find the partner details for formatting
                            const partner = partners.find(p => p.id === contributor.organizationId);
                            if (partner) {
                              return getOrganizationDisplay(partner);
                            }
                            return contributor.organizationName;
                          })()}
                        </p>
                        {(() => {
                          const partner = partners.find(p => p.id === contributor.organizationId);
                          const iatiCountryLine = partner ? getIatiCountryLine(partner) : null;
                          if (iatiCountryLine) {
                            return (
                              <p className="text-xs text-gray-500 truncate">
                                {iatiCountryLine}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Nominated by {contributor.nominatedByName} on{' '}
                        {new Date(contributor.nominatedAt).toLocaleDateString()}
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
                        onClick={() => removeContributor(contributor.id)}
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