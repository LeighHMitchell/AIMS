"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users,
  Building2,
  Activity,
  ArrowRight,
  Network
} from "lucide-react";

interface PartnerOrganization {
  id: string;
  name: string;
  acronym?: string;
  organisation_type: string;
  country?: string;
}

interface ActivityData {
  id: string;
  title: string;
  activity_status: string;
  extendingPartners?: Array<{ orgId: string; name: string }>;
  implementingPartners?: Array<{ orgId: string; name: string }>;
  governmentPartners?: Array<{ orgId: string; name: string }>;
  fundingPartners?: Array<{ orgId: string; name: string }>;
}

interface PartnershipNetworkProps {
  organizationId: string;
  activities: ActivityData[];
  allOrganizations: PartnerOrganization[];
}

interface PartnershipData {
  organization: PartnerOrganization;
  collaborationCount: number;
  relationshipTypes: Set<string>;
  sharedActivities: Array<{
    id: string;
    title: string;
    status: string;
    partnerRole: string;
  }>;
}

export const PartnershipNetwork: React.FC<PartnershipNetworkProps> = ({
  organizationId,
  activities,
  allOrganizations
}) => {
  const partnershipData = useMemo(() => {
    const partnerMap = new Map<string, PartnershipData>();

    activities.forEach(activity => {
      const allPartners = [
        ...(activity.extendingPartners || []).map(p => ({ ...p, role: 'extending' })),
        ...(activity.implementingPartners || []).map(p => ({ ...p, role: 'implementing' })),
        ...(activity.governmentPartners || []).map(p => ({ ...p, role: 'government' })),
        ...(activity.fundingPartners || []).map(p => ({ ...p, role: 'funding' }))
      ];

      allPartners.forEach(partner => {
        if (partner.orgId !== organizationId) {
          const org = allOrganizations.find(o => o.id === partner.orgId);
          if (org) {
            if (!partnerMap.has(partner.orgId)) {
              partnerMap.set(partner.orgId, {
                organization: org,
                collaborationCount: 0,
                relationshipTypes: new Set(),
                sharedActivities: []
              });
            }

            const partnerData = partnerMap.get(partner.orgId)!;
            partnerData.collaborationCount++;
            partnerData.relationshipTypes.add(partner.role);
            partnerData.sharedActivities.push({
              id: activity.id,
              title: activity.title,
              status: activity.activity_status,
              partnerRole: partner.role
            });
          }
        }
      });
    });

    const partnerships = Array.from(partnerMap.values())
      .sort((a, b) => b.collaborationCount - a.collaborationCount);

    return {
      partnerships,
      totalPartners: partnerships.length,
      totalCollaborations: partnerships.reduce((sum, p) => sum + p.collaborationCount, 0)
    };
  }, [organizationId, activities, allOrganizations]);

  const getRelationshipColor = () => {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getOrgTypeColor = () => {
    return 'bg-slate-50 border-slate-200';
  };

  const getStatusColor = () => {
    return 'text-slate-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Partnership Network
          <Badge variant="outline" className="ml-2">
            {partnershipData.totalPartners} Partners
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Users className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{partnershipData.totalPartners}</p>
              <p className="text-sm text-slate-600">Partner Organizations</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Activity className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">{partnershipData.totalCollaborations}</p>
              <p className="text-sm text-slate-600">Total Collaborations</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-slate-500" />
              <p className="text-2xl font-bold text-slate-900">
                {partnershipData.partnerships.length > 0
                  ? Math.round(partnershipData.totalCollaborations / partnershipData.partnerships.length * 10) / 10
                  : 0}
              </p>
              <p className="text-sm text-slate-600">Avg. Collaborations</p>
            </div>
          </div>

          {/* Partnership List */}
          {partnershipData.partnerships.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Key Partners</h4>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {partnershipData.partnerships.map((partnership) => (
                    <div 
                      key={partnership.organization.id} 
                      className={`border rounded-lg p-4 ${getOrgTypeColor(partnership.organization.organisation_type)}`}
                    >
                      {/* Partner Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-gray-500" />
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {partnership.organization.name}
                              {partnership.organization.acronym && (
                                <span className="text-gray-600 ml-1">
                                  ({partnership.organization.acronym})
                                </span>
                              )}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {partnership.organization.organisation_type}
                              </Badge>
                              {partnership.organization.country && (
                                <span className="text-xs text-gray-500">
                                  {partnership.organization.country}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {partnership.collaborationCount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {partnership.collaborationCount === 1 ? 'Collaboration' : 'Collaborations'}
                          </p>
                        </div>
                      </div>

                      {/* Relationship Types */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-1">Partnership Types:</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(partnership.relationshipTypes).map(type => (
                            <Badge 
                              key={type} 
                              variant="outline" 
                              className={`text-xs ${getRelationshipColor(type)}`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Shared Activities */}
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Recent Collaborations:</p>
                        <div className="space-y-1">
                          {partnership.sharedActivities.slice(0, 3).map(activity => (
                            <div key={activity.id} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                              <span className="flex-1 truncate" title={activity.title}>
                                {activity.title}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {activity.partnerRole}
                              </Badge>
                            </div>
                          ))}
                          {partnership.sharedActivities.length > 3 && (
                            <p className="text-xs text-gray-500 italic">
                              +{partnership.sharedActivities.length - 3} more activities
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No partnerships found</p>
              <p className="text-sm">Partner organizations will appear here when activities include multiple organizations</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};