"use client"

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Link2,
  X,
  Star,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditOrganizationModal } from "@/components/organizations/EditOrganizationModal";
import { getOrganizationTypeName } from "@/data/iati-organization-types";
import { getActivityStatusByCode } from "@/data/activity-status-types";

interface DuplicatePair {
  id: string;
  entity_type: 'activity' | 'organization';
  entity_id_1: string;
  entity_id_2: string;
  detection_type: string;
  confidence: 'high' | 'medium' | 'low';
  similarity_score: number | null;
  match_details: Record<string, any>;
  is_suggested_link: boolean;
  detected_at: string;
  entity1: any;
  entity2: any;
  recommendedPrimaryId?: string;
}

interface DuplicatePairCardProps {
  pair: DuplicatePair;
  onDismiss: (pair: DuplicatePair, action: 'not_duplicate' | 'linked' | 'merged') => void;
  isSuperUser: boolean;
}

// Detection type labels
const DETECTION_TYPE_LABELS: Record<string, string> = {
  exact_iati_id: 'Exact IATI ID Match',
  exact_crs_id: 'Exact CRS ID Match',
  exact_name: 'Exact Name Match',
  exact_acronym: 'Exact Acronym Match',
  similar_name: 'Similar Name',
  cross_org: 'Cross-Organization Match',
};

const CONFIDENCE_BADGES: Record<string, { variant: string; icon: React.ReactNode }> = {
  high: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
  medium: { variant: 'warning', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  low: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
};

export function DuplicatePairCard({ pair, onDismiss, isSuperUser }: DuplicatePairCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<any>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  const isActivity = pair.entity_type === 'activity';
  const isPrimaryEntity1 = pair.recommendedPrimaryId === pair.entity_id_1;

  // Handle opening org edit modal for merge
  const handleEditAndMerge = (primaryOrg: any, sourceOrgId: string) => {
    setSelectedOrgForEdit(primaryOrg);
    setMergeSourceId(sourceOrgId);
    setEditModalOpen(true);
  };

  // Render activity entity
  const renderActivityEntity = (entity: any, isPrimary: boolean) => (
    <div className="flex-1 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          <div className="min-w-0">
            <Link
              href={`/activities/${entity.id}`}
              className="font-medium text-sm hover:underline line-clamp-2"
            >
              {entity.title_narrative || 'Untitled Activity'}
            </Link>
            {entity.acronym && (
              <span className="text-xs text-muted-foreground ml-2">({entity.acronym})</span>
            )}
          </div>
        </div>
        <Link href={`/activities/${entity.id}`}>
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Button>
        </Link>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {entity.iati_identifier && (
          <div>
            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{entity.iati_identifier}</span>
          </div>
        )}
        {entity.other_identifier && !entity.iati_identifier && (
          <div>
            <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{entity.other_identifier}</span>
          </div>
        )}
        {entity.created_by_org_name && (
          <div>
            {entity.created_by_org_name}
            {entity.created_by_org_acronym && ` (${entity.created_by_org_acronym})`}
          </div>
        )}
        {entity.activity_status && (
          <div>
            {getActivityStatusByCode(entity.activity_status)?.name || entity.activity_status}
          </div>
        )}
      </div>
    </div>
  );

  // Render organization entity
  const renderOrganizationEntity = (entity: any, isPrimary: boolean) => (
    <div className="flex-1 p-4">
      {isPrimary && (
        <div className="flex items-center gap-1 text-xs text-blue-600 mb-2">
          <Star className="h-3 w-3 fill-current" />
          Recommended Primary (Score: {entity.score})
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          {entity.logo ? (
            <img 
              src={entity.logo} 
              alt="" 
              className="h-8 w-8 rounded object-cover flex-shrink-0"
            />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
          <div className="min-w-0">
            <Link
              href={`/organizations/${entity.id}`}
              className="font-medium text-sm hover:underline line-clamp-2"
            >
              {entity.name || 'Unknown Organization'}
            </Link>
            {entity.acronym && (
              <span className="text-xs text-muted-foreground ml-2">({entity.acronym})</span>
            )}
          </div>
        </div>
        <Link href={`/organizations/${entity.id}`}>
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Button>
        </Link>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {entity.iati_org_id && (
          <div>
            <code className="bg-muted px-1 rounded">{entity.iati_org_id}</code>
          </div>
        )}
        {entity.Organisation_Type_Code && (
          <div>
            {getOrganizationTypeName(entity.Organisation_Type_Code)}
          </div>
        )}
        {entity.country_represented && (
          <div>
            {entity.country_represented}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span>
            <span className="font-medium">{entity.activityCount || 0}</span> activities
          </span>
          <span>
            <span className="font-medium">{entity.transactionCount || 0}</span> transactions
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="border">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Badge 
                variant={pair.confidence === 'high' ? 'destructive' : pair.confidence === 'medium' ? 'outline' : 'secondary'}
                className="flex items-center"
              >
                {CONFIDENCE_BADGES[pair.confidence].icon}
                {pair.confidence.charAt(0).toUpperCase() + pair.confidence.slice(1)} Confidence
              </Badge>
              
              <span className="text-sm font-medium text-foreground">
                {DETECTION_TYPE_LABELS[pair.detection_type]}
              </span>

              {pair.similarity_score && pair.similarity_score < 1 && (
                <span className="text-xs text-muted-foreground">
                  ({Math.round(pair.similarity_score * 100)}% similar)
                </span>
              )}

              {pair.is_suggested_link && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Link2 className="h-3 w-3 mr-1" />
                        Suggested Link
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        These activities appear to be reported by different organizations 
                        (e.g., funder and implementer). Consider linking them as related 
                        activities rather than treating as duplicates.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Match Details (collapsed by default) */}
          {expanded && pair.match_details && (
            <div className="px-4 py-2 bg-muted/30 text-xs border-b">
              <span className="font-medium">Match Details: </span>
              {pair.match_details.field && (
                <span>Field: <code>{pair.match_details.field}</code></span>
              )}
              {pair.match_details.value && (
                <span className="ml-2">Value: <code>{pair.match_details.value}</code></span>
              )}
            </div>
          )}

          {/* Side-by-side comparison */}
          <div className="flex divide-x">
            {isActivity 
              ? renderActivityEntity(pair.entity1, false)
              : renderOrganizationEntity(pair.entity1, isPrimaryEntity1)
            }
            
            <div className="flex items-center justify-center px-2 bg-muted/20">
              <div className="text-muted-foreground text-xs font-medium rotate-90 whitespace-nowrap">
                vs
              </div>
            </div>
            
            {isActivity 
              ? renderActivityEntity(pair.entity2, false)
              : renderOrganizationEntity(pair.entity2, !isPrimaryEntity1)
            }
          </div>

          {/* Actions */}
          <Separator />
          <div className="px-4 py-3 flex items-center justify-between bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Detected: {new Date(pair.detected_at).toLocaleDateString()}
            </div>

            <div className="flex items-center gap-2">
              {isActivity && pair.is_suggested_link && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDismiss(pair, 'linked')}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Link as Related
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Link these as related activities (co-funded)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {!isActivity && isSuperUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const primaryOrg = isPrimaryEntity1 ? pair.entity1 : pair.entity2;
                    const sourceOrgId = isPrimaryEntity1 ? pair.entity_id_2 : pair.entity_id_1;
                    handleEditAndMerge(primaryOrg, sourceOrgId);
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Pencil className="h-4 w-4 mr-1 text-slate-500" />
                  Edit & Merge
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(pair, 'not_duplicate')}
              >
                <X className="h-4 w-4 mr-1" />
                Not a Duplicate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Organization Modal for Merge */}
      {selectedOrgForEdit && (
        <EditOrganizationModal
          organization={selectedOrgForEdit}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setSelectedOrgForEdit(null);
              setMergeSourceId(null);
            }
          }}
          onSuccess={() => {
            // After successful merge, dismiss this pair
            onDismiss(pair, 'merged');
            setEditModalOpen(false);
            setSelectedOrgForEdit(null);
            setMergeSourceId(null);
          }}
          initialMergeSourceOrgId={mergeSourceId || undefined}
          initialTab="aliases"
        />
      )}
    </>
  );
}






