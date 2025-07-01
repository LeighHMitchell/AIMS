"use client";

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, Leaf, Users, Wrench } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
}

const SCORE_LABELS = {
  0: 'Not targeted',
  1: 'Significant objective',
  2: 'Principal objective'
};

const SCORE_DESCRIPTIONS = {
  0: 'The activity does not target this policy objective',
  1: 'The policy objective is an important and deliberate objective, but not the principal reason for undertaking the activity',
  2: 'The policy objective is the principal reason for undertaking the activity'
};

const MARKER_TYPE_ICONS = {
  environmental: <Leaf className="w-4 h-4" />,
  social_governance: <Users className="w-4 h-4" />,
  other: <Wrench className="w-4 h-4" />
};

const MARKER_TYPE_LABELS = {
  environmental: 'Environmental (Rio Markers)',
  social_governance: 'Social & Governance',
  other: 'Other Cross-Cutting Issues'
};

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

export default function PolicyMarkersSection({ activityId, policyMarkers, onChange }: PolicyMarkersSectionProps) {
  const [availableMarkers, setAvailableMarkers] = useState<PolicyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['environmental', 'social_governance', 'other']);
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
    
    setSelectedMarkers(newMarkers);
    onChange(Array.from(newMarkers.values()));
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
      setSelectedMarkers(newMarkers);
      onChange(Array.from(newMarkers.values()));
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
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Policy Markers</h3>
        <p className="text-sm text-gray-600 mt-1">
          Assign OECD DAC and IATI-compliant policy markers to indicate how this activity addresses cross-cutting issues
        </p>
      </div>

      <TooltipProvider>
        <div className="space-y-4">
          {Object.entries(MARKER_TYPE_LABELS).map(([type, label]) => (
            <Collapsible
              key={type}
              open={expandedSections.includes(type)}
              onOpenChange={() => toggleSection(type)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  {MARKER_TYPE_ICONS[type as keyof typeof MARKER_TYPE_ICONS]}
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary" className="ml-2">
                    {markersByType[type]?.length || 0} markers
                  </Badge>
                </div>
                {expandedSections.includes(type) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-2 space-y-4">
                {markersByType[type]?.map((marker) => {
                  const selected = selectedMarkers.get(marker.id);
                  const score = selected?.score || 0;
                  
                  return (
                    <div
                      key={marker.id}
                      className={`p-4 border rounded-lg ${
                        score > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Marker Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                              {marker.name}
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-4 h-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{marker.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </h4>
                          </div>
                        </div>

                        {/* Score Selection */}
                        <RadioGroup
                          value={score.toString()}
                          onValueChange={(value) => updateMarkerScore(marker.id, parseInt(value) as 0 | 1 | 2)}
                        >
                          <div className="space-y-2">
                            {([0, 1, 2] as const).map((scoreValue) => (
                              <div key={scoreValue} className="flex items-start gap-3">
                                <RadioGroupItem
                                  value={scoreValue.toString()}
                                  id={`${marker.id}-${scoreValue}`}
                                  className="mt-1"
                                />
                                <Label
                                  htmlFor={`${marker.id}-${scoreValue}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {scoreValue} - {SCORE_LABELS[scoreValue]}
                                    </span>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      {SCORE_DESCRIPTIONS[scoreValue]}
                                    </p>
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>

                        {/* Rationale Field - Only show when score > 0 */}
                        {score > 0 && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor={`${marker.id}-rationale`} className="text-sm">
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
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </TooltipProvider>

      {/* Summary of Selected Markers */}
      {selectedMarkers.size > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">
            Selected Policy Markers ({selectedMarkers.size})
          </h4>
          <div className="space-y-1">
            {Array.from(selectedMarkers.entries()).map(([markerId, marker]) => {
              const markerInfo = availableMarkers.find(m => m.id === markerId);
              return markerInfo ? (
                <div key={markerId} className="text-sm text-green-800">
                  • {markerInfo.name}: {SCORE_LABELS[marker.score]}
                  {marker.rationale && (
                    <span className="text-xs text-green-600 ml-1">
                      (with rationale)
                    </span>
                  )}
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Policy Markers</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Policy markers indicate how activities address cross-cutting development issues</li>
          <li>• Scores reflect the importance of each objective to the activity</li>
          <li>• Rio Markers track environmental objectives per OECD DAC guidelines</li>
          <li>• Providing rationale helps explain and justify the scoring</li>
        </ul>
      </div>
    </div>
  );
}