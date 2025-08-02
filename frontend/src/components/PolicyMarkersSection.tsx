"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, Leaf, Users, Wrench } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { PolicyMarkerScoreSelect } from '@/components/forms/PolicyMarkerScoreSelect';
import { HelpText } from '@/components/ui/help-text';
import { toast } from 'sonner';
import { usePolicyMarkersAutosave } from '@/hooks/use-policy-markers-autosave';
import { useUser } from '@/hooks/useUser';

interface PolicyMarker {
  id: string;
  code: string;
  name: string;
  description: string;
  marker_type: 'environmental' | 'social_governance' | 'other';
}

interface ActivityPolicyMarker {
  policy_marker_id: string;
  score: 0 | 1 | 2;
  rationale?: string;
}

interface PolicyMarkersSectionProps {
  activityId?: string;
  policyMarkers: ActivityPolicyMarker[];
  onChange: (markers: ActivityPolicyMarker[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

const SCORE_LABELS = {
  0: 'Not targeted',
  1: 'Significant objective',
  2: 'Principal objective'
};

const MARKER_TYPE_ICONS = {
  environmental: <Leaf className="w-4 h-4 text-gray-600" />,
  social_governance: <Users className="w-4 h-4 text-gray-600" />,
  other: <Wrench className="w-4 h-4 text-gray-600" />
};

const MARKER_TYPE_LABELS = {
  environmental: 'Environmental (Rio Markers)',
  social_governance: 'Social & Governance',
  other: 'Other Cross-Cutting Issues'
};

const HELP_CONTENT = [
  "Policy markers indicate how activities address cross-cutting development issues",
  "Scores reflect the importance of each objective to the activity",
  "Rio Markers track environmental objectives per OECD DAC guidelines",
  "Providing rationale helps explain and justify the scoring"
];

// Fallback policy markers in case API fails
const FALLBACK_POLICY_MARKERS: PolicyMarker[] = [
  // Environmental
  { id: 'fallback-1', code: 'climate_mitigation', name: 'Climate Change Mitigation', description: 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', marker_type: 'environmental' },
  { id: 'fallback-2', code: 'climate_adaptation', name: 'Climate Change Adaptation', description: 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', marker_type: 'environmental' },
  { id: 'fallback-3', code: 'biodiversity', name: 'Biodiversity', description: 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', marker_type: 'environmental' },
  { id: 'fallback-4', code: 'environment', name: 'Aid to Environment', description: 'Activities that support environmental protection or enhancement', marker_type: 'environmental' },
  
  // Social & Governance
  { id: 'fallback-5', code: 'gender_equality', name: 'Gender Equality', description: 'Activities that have gender equality and women\'s empowerment as policy objectives', marker_type: 'social_governance' },
  { id: 'fallback-6', code: 'good_governance', name: 'Good Governance', description: 'Activities that support democratic governance and civil society', marker_type: 'social_governance' },
  { id: 'fallback-7', code: 'human_rights', name: 'Human Rights', description: 'Activities that support or promote human rights', marker_type: 'social_governance' },
  
  // Other
  { id: 'fallback-8', code: 'disability', name: 'Disability Inclusion', description: 'Activities that promote inclusion of persons with disabilities', marker_type: 'other' },
  { id: 'fallback-9', code: 'nutrition', name: 'Nutrition', description: 'Activities that address nutrition outcomes', marker_type: 'other' },
  { id: 'fallback-10', code: 'peacebuilding', name: 'Peacebuilding / Conflict Sensitivity', description: 'Activities that contribute to peace and conflict prevention', marker_type: 'other' }
];

export default function PolicyMarkersSection({ activityId, policyMarkers, onChange, setHasUnsavedChanges }: PolicyMarkersSectionProps) {
  const { user } = useUser();
  const policyMarkersAutosave = usePolicyMarkersAutosave(activityId, user?.id);
  
  const [availableMarkers, setAvailableMarkers] = useState<PolicyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedMarkers, setSelectedMarkers] = useState<Map<string, ActivityPolicyMarker>>(new Map());

  // Initialize selected markers from props
  useEffect(() => {
    const markersMap = new Map<string, ActivityPolicyMarker>();
    policyMarkers.forEach(marker => {
      markersMap.set(marker.policy_marker_id, marker);
    });
    setSelectedMarkers(markersMap);
  }, [policyMarkers]);

  // Fetch available policy markers
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch('/api/policy-markers');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        setAvailableMarkers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching policy markers:', error);
        console.log('Using fallback policy markers...');
        setAvailableMarkers(FALLBACK_POLICY_MARKERS);
        toast.warning('Using offline policy markers. Database connection may be required for full functionality.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, []);

  // Update marker score
  const updateMarkerScore = (markerId: string, score: 0 | 1 | 2) => {
    const newMarkers = new Map(selectedMarkers);
    
    if (score === 0) {
      // Remove marker if score is 0
      newMarkers.delete(markerId);
    } else {
      // Add or update marker
      const existing = newMarkers.get(markerId);
      newMarkers.set(markerId, {
        policy_marker_id: markerId,
        score,
        rationale: existing?.rationale
      });
    }
    
    const updatedPolicyMarkers = Array.from(newMarkers.values());
    setSelectedMarkers(newMarkers);
    onChange(updatedPolicyMarkers);
    setHasUnsavedChanges?.(true);
    
    // Trigger autosave
    if (activityId && user?.id) {
      policyMarkersAutosave.triggerFieldSave(updatedPolicyMarkers);
    }
  };

  // Update marker rationale
  const updateMarkerRationale = (markerId: string, rationale: string) => {
    const newMarkers = new Map(selectedMarkers);
    const existing = newMarkers.get(markerId);
    
    if (existing) {
      newMarkers.set(markerId, {
        ...existing,
        rationale
      });
      const updatedPolicyMarkers = Array.from(newMarkers.values());
      setSelectedMarkers(newMarkers);
      onChange(updatedPolicyMarkers);
      setHasUnsavedChanges?.(true);
      
      // Trigger autosave
      if (activityId && user?.id) {
        policyMarkersAutosave.triggerFieldSave(updatedPolicyMarkers);
      }
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionType: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionType)
        ? prev.filter(s => s !== sectionType)
        : [...prev, sectionType]
    );
  };

  // Group markers by type
  const markersByType = availableMarkers.reduce((acc, marker) => {
    if (!acc[marker.marker_type]) {
      acc[marker.marker_type] = [];
    }
    acc[marker.marker_type].push(marker);
    return acc;
  }, {} as Record<string, PolicyMarker[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Policy Markers</h3>
          <p className="text-sm text-gray-600 mt-1">
            Assign OECD DAC and IATI-compliant policy markers to indicate how this activity addresses cross-cutting issues
          </p>
        </div>
        <HelpText 
          title="About Policy Markers"
          content={HELP_CONTENT}
          className="mt-1"
        />
      </div>

      <TooltipProvider>
        <div className="space-y-3">
          {Object.entries(MARKER_TYPE_LABELS).map(([type, label]) => (
            <Collapsible
              key={type}
              open={expandedSections.includes(type)}
              onOpenChange={() => toggleSection(type)}
            >
              <CollapsibleTrigger className="flex items-center gap-3 w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group">
                <div className="flex items-center gap-3 flex-1">
                  {MARKER_TYPE_ICONS[type as keyof typeof MARKER_TYPE_ICONS]}
                  <span className="font-medium text-gray-900">{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {markersByType[type]?.length || 0}
                  </Badge>
                </div>
                {expandedSections.includes(type) ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="grid gap-4 pl-4 border-l-2 border-gray-100">
                  {markersByType[type]?.map((marker) => {
                    const selected = selectedMarkers.get(marker.id);
                    const score = selected?.score || 0;
                    
                    return (
                      <div
                        key={marker.id}
                        className={`p-5 border rounded-lg transition-all ${
                          score > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Marker Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                {marker.name}
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>{marker.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">Code: {marker.code}</p>
                            </div>
                          </div>

                          {/* Score Selection Dropdown */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Policy Marker Score
                            </Label>
                            <PolicyMarkerScoreSelect
                              value={score}
                              onValueChange={(newScore) => updateMarkerScore(marker.id, newScore as 0 | 1 | 2)}
                              placeholder="Select relevance score..."
                            />
                          </div>

                          {/* Rationale Field - Only show when score > 0 */}
                          {score > 0 && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <Label htmlFor={`${marker.id}-rationale`} className="text-sm font-medium text-gray-700">
                                Rationale for Scoring (Optional)
                              </Label>
                              <Textarea
                                id={`${marker.id}-rationale`}
                                placeholder="Explain how this activity addresses this policy marker..."
                                value={selected?.rationale || ''}
                                onChange={(e) => updateMarkerRationale(marker.id, e.target.value)}
                                rows={3}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </TooltipProvider>

      {/* Summary of Selected Markers */}
      {selectedMarkers.size > 0 && (
        <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span>Selected Policy Markers</span>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              {selectedMarkers.size}
            </Badge>
          </h4>
          <div className="space-y-2">
            {Array.from(selectedMarkers.entries()).map(([markerId, marker]) => {
              const markerInfo = availableMarkers.find(m => m.id === markerId);
              return markerInfo ? (
                <div key={markerId} className="flex items-center justify-between text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                  <span className="font-medium">{markerInfo.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {SCORE_LABELS[marker.score]}
                    </span>
                    {marker.rationale && (
                      <span className="text-xs text-gray-600">
                        (with rationale)
                      </span>
                    )}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}