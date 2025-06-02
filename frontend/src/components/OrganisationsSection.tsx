import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Partner {
  orgId: string;
  name: string;
}

interface OrganisationsSectionProps {
  extendingPartners: Partner[];
  implementingPartners: Partner[];
  governmentPartners: Partner[];
  onChange: (field: string, value: Partner[]) => void;
}

export default function OrganisationsSection({
  extendingPartners,
  implementingPartners,
  governmentPartners,
  onChange,
}: OrganisationsSectionProps) {
  const [availablePartners, setAvailablePartners] = useState<Partner[]>([]);
  const [governmentOnlyPartners, setGovernmentOnlyPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch partners from API
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) {
        const data = await res.json();
        
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
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners");
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
    onChange(fieldName, currentPartners);
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

    onChange(fieldName, currentPartners);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">PARTICIPATING ORGANISATIONS</h2>
      </div>

      {/* Extending Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Extending Partners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle className="text-xl">Implementing Partners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle className="text-xl">Government Partners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
    </div>
  );
} 