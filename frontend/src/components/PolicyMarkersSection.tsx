"use client";

import React, { useState, useEffect } from 'react';
import { Info, Leaf, Users, Wrench, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('environmental');
  const [selectedMarkers, setSelectedMarkers] = useState<Map<string, ActivityPolicyMarker>>(new Map());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  // Toggle card expansion
  const toggleCard = (markerId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(markerId)) {
        newSet.delete(markerId);
      } else {
        newSet.add(markerId);
      }
      return newSet;
    });
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
      <TooltipProvider>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="environmental" className="flex items-center gap-2">
              {MARKER_TYPE_ICONS.environmental}
              <span className="hidden sm:inline">Environmental (Rio Markers)</span>
              <span className="sm:hidden">Environmental</span>
              <Badge variant="secondary" className="ml-auto">
                {markersByType.environmental?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="social_governance" className="flex items-center gap-2">
              {MARKER_TYPE_ICONS.social_governance}
              <span className="hidden sm:inline">Social & Governance</span>
              <span className="sm:hidden">Social</span>
              <Badge variant="secondary" className="ml-auto">
                {markersByType.social_governance?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-2">
              {MARKER_TYPE_ICONS.other}
              <span className="hidden sm:inline">Other Cross-Cutting Issues</span>
              <span className="sm:hidden">Other</span>
              <Badge variant="secondary" className="ml-auto">
                {markersByType.other?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Environmental (Rio Markers) Tab */}
          <TabsContent value="environmental" className="mt-6 space-y-4">
            <div className="space-y-4">
              {markersByType.environmental?.map((marker) => {
                const selected = selectedMarkers.get(marker.id);
                const score = selected?.score || 0;
                const isExpanded = expandedCards.has(marker.id);
                
                return (
                  <div
                    key={marker.id}
                    className={`border rounded-lg transition-all ${
                      score > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Card Header - Clickable to expand/collapse */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCard(marker.id)}
                    >
                      <div className="flex items-center justify-between">
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
                            {score > 0 && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </h4>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                        {/* Score Selection Dropdown */}
                        <div className="space-y-2 pt-4">
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
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Social & Governance Tab */}
          <TabsContent value="social_governance" className="mt-6 space-y-4">
            <div className="space-y-4">
              {markersByType.social_governance?.map((marker) => {
                const selected = selectedMarkers.get(marker.id);
                const score = selected?.score || 0;
                const isExpanded = expandedCards.has(marker.id);
                
                return (
                  <div
                    key={marker.id}
                    className={`border rounded-lg transition-all ${
                      score > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Card Header - Clickable to expand/collapse */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCard(marker.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {marker.name}
                            {score > 0 && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{marker.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </h4>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                        {/* Score Selection Dropdown */}
                        <div className="space-y-2 pt-4">
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
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Other Cross-Cutting Issues Tab */}
          <TabsContent value="other" className="mt-6 space-y-4">
            <div className="space-y-4">
              {markersByType.other?.map((marker) => {
                const selected = selectedMarkers.get(marker.id);
                const score = selected?.score || 0;
                const isExpanded = expandedCards.has(marker.id);
                
                return (
                  <div
                    key={marker.id}
                    className={`border rounded-lg transition-all ${
                      score > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Card Header - Clickable to expand/collapse */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCard(marker.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {marker.name}
                            {score > 0 && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{marker.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </h4>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                        {/* Score Selection Dropdown */}
                        <div className="space-y-2 pt-4">
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
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}