"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, Check, AlertCircle, UserPlus } from "lucide-react";
import { ActivityContributor } from "@/lib/activity-permissions";
import { Partner } from "@/app/api/partners/route";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

interface ContributorsSectionProps {
  contributors: ActivityContributor[];
  onChange: (contributors: ActivityContributor[]) => void;
  permissions: {
    canNominateContributors: boolean;
    canApproveJoinRequests: boolean;
  };
  activityId?: string;
}

export default function ContributorsSection({ 
  contributors, 
  onChange, 
  permissions,
  activityId
}: ContributorsSectionProps) {
  const { user } = useUser();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [loading, setLoading] = useState(false);

  // Load partners for selection
  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const res = await fetch('/api/partners');
      const data = await res.json();
      setPartners(data);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

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
      nominatedBy: user.id,
      nominatedByName: user.name,
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onChange([...contributors, newContributor]);
    setSelectedPartnerId("");
    toast.success(`${partner.name} has been nominated as a contributor`);
  };

  const removeContributor = (contributorId: string) => {
    const contributor = contributors.find(c => c.id === contributorId);
    if (contributor && contributor.status === 'accepted') {
      if (!confirm("This contributor has already accepted. Are you sure you want to remove them?")) {
        return;
      }
    }
    onChange(contributors.filter(c => c.id !== contributorId));
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

    onChange(contributors.map(c => c.id === contributorId ? updatedContributor : c));
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
          <Users className="h-5 w-5" />
          Activity Contributors
        </CardTitle>
        <CardDescription>
          Organizations contributing to this activity can add their own financial data and results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Nominate a Contributor</label>
            <div className="flex gap-2">
              <Select
                value={selectedPartnerId}
                onValueChange={setSelectedPartnerId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an organization to nominate" />
                </SelectTrigger>
                <SelectContent>
                  {partners
                    .filter(p => 
                      p.id !== user?.organizationId && 
                      !contributors.some(c => c.organizationId === p.id)
                    )
                    .map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.acronym || partner.code || partner.id} - {partner.fullName || partner.name}{partner.countryRepresented ? ` (${partner.countryRepresented})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={nominateContributor}
                disabled={!selectedPartnerId}
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {(() => {
                          // Find the partner details for formatting
                          const partner = partners.find(p => p.id === contributor.organizationId);
                          if (partner) {
                            // Format: [Acronym/Code] - [Full Name] (Country)
                            let display = `${partner.acronym || partner.code || partner.id} - ${partner.fullName || partner.name}`;
                            if (partner.countryRepresented) {
                              display += ` (${partner.countryRepresented})`;
                            }
                            return display;
                          }
                          return contributor.organizationName;
                        })()}
                      </p>
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

        {/* Info about contributor permissions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Contributors can add and edit their own financial transactions, results, and implementation details. 
            Only the activity creator and government validators can view all contributions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 