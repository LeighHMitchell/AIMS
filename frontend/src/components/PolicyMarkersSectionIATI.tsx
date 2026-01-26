"use client";

import React, { useState, useEffect } from 'react';
import { Info, Leaf, Users, Wrench, CheckCircle, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { PolicyMarkerScoreSelectIATI } from '@/components/forms/PolicyMarkerScoreSelectIATI';
import { HelpText } from '@/components/ui/help-text';
import { toast } from 'sonner';
import { usePolicyMarkersAutosave } from '@/hooks/use-policy-markers-autosave';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api-fetch';

interface IATIPolicyMarker {
  id: string;
  code: string;
  name: string;
  description: string;
  marker_type: 'environmental' | 'social_governance' | 'other';
  vocabulary: string;
  vocabulary_uri?: string;
  iati_code: string;
  is_iati_standard: boolean;
}

interface ActivityPolicyMarker {
  policy_marker_id: string;
  significance: 0 | 1 | 2 | 3 | 4; // IATI supports 0-4 range
  rationale?: string;
}

interface PolicyMarkersSectionProps {
  activityId?: string;
  policyMarkers: ActivityPolicyMarker[];
  onChange: (markers: ActivityPolicyMarker[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

// IATI-compliant significance labels
const IATI_SIGNIFICANCE_LABELS = {
  0: 'Not targeted',
  1: 'Significant objective',
  2: 'Principal objective',
  3: 'Principal objective (alternative)',
  4: 'Explicit primary objective (RMNCH only)'
};

const MARKER_TYPE_ICONS = {
  environmental: <Leaf className="w-4 h-4 text-green-600" />,
  social_governance: <Users className="w-4 h-4 text-blue-600" />,
  other: <Wrench className="w-4 h-4 text-purple-600" />
};

const MARKER_TYPE_LABELS = {
  environmental: 'Environmental (Rio Markers)',
  social_governance: 'Social & Governance',
  other: 'Other Cross-Cutting Issues'
};

const VOCABULARY_LABELS = {
  '1': 'OECD DAC CRS',
  '99': 'Custom Organization'
};

const HELP_CONTENT = [
  "Policy markers follow IATI standards and OECD DAC CRS guidelines",
  "Significance levels indicate the importance of each cross-cutting theme",
  "OECD DAC markers are internationally standardized policy classifications",
  "Significance 4 (Explicit primary objective) is only valid for RMNCH marker",
  "Custom markers (vocabulary 99) allow organization-specific classifications"
];

// IATI-compliant fallback markers based on official codelist
const FALLBACK_IATI_MARKERS: IATIPolicyMarker[] = [
  // Environmental (Rio Markers)
  { id: 'iati-6', code: 'iati_climate_mitigation', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', description: 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', marker_type: 'environmental', vocabulary: '1', iati_code: '6', is_iati_standard: true },
  { id: 'iati-7', code: 'iati_climate_adaptation', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', description: 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', marker_type: 'environmental', vocabulary: '1', iati_code: '7', is_iati_standard: true },
  { id: 'iati-5', code: 'iati_biodiversity', name: 'Aid Targeting the Objectives of the Convention on Biological Diversity', description: 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', marker_type: 'environmental', vocabulary: '1', iati_code: '5', is_iati_standard: true },
  { id: 'iati-2', code: 'iati_aid_environment', name: 'Aid to Environment', description: 'Activities that support environmental protection or enhancement', marker_type: 'environmental', vocabulary: '1', iati_code: '2', is_iati_standard: true },
  { id: 'iati-8', code: 'iati_desertification', name: 'Aid Targeting the Objectives of the Convention to Combat Desertification', description: 'Activities that combat desertification or mitigate effects of drought', marker_type: 'environmental', vocabulary: '1', iati_code: '8', is_iati_standard: true },
  
  // Social & Governance
  { id: 'iati-1', code: 'iati_gender_equality', name: 'Gender Equality', description: 'Activities that have gender equality and women\'s empowerment as policy objectives', marker_type: 'social_governance', vocabulary: '1', iati_code: '1', is_iati_standard: true },
  { id: 'iati-3', code: 'iati_good_governance', name: 'Participatory Development/Good Governance', description: 'Activities that support democratic governance, civil society and participatory development', marker_type: 'social_governance', vocabulary: '1', iati_code: '3', is_iati_standard: true },
  { id: 'iati-9', code: 'iati_rmnch', name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', description: 'Activities that target reproductive, maternal, newborn and child health objectives', marker_type: 'social_governance', vocabulary: '1', iati_code: '9', is_iati_standard: true },
  { id: 'iati-11', code: 'iati_disability', name: 'Disability', description: 'Activities that promote the rights and inclusion of persons with disabilities', marker_type: 'social_governance', vocabulary: '1', iati_code: '11', is_iati_standard: true },
  { id: 'iati-12', code: 'iati_nutrition', name: 'Nutrition', description: 'Activities that address nutrition objectives and food security', marker_type: 'social_governance', vocabulary: '1', iati_code: '12', is_iati_standard: true },
  
  // Other
  { id: 'iati-4', code: 'iati_trade_development', name: 'Trade Development', description: 'Activities that support trade development and trade capacity building', marker_type: 'other', vocabulary: '1', iati_code: '4', is_iati_standard: true },
  { id: 'iati-10', code: 'iati_drr', name: 'Disaster Risk Reduction (DRR)', description: 'Activities that reduce disaster risk and build resilience to natural and human-induced hazards', marker_type: 'other', vocabulary: '1', iati_code: '10', is_iati_standard: true }
];

export default function PolicyMarkersSectionIATI({ activityId, policyMarkers, onChange, setHasUnsavedChanges }: PolicyMarkersSectionProps) {
  const { user } = useUser();
  const policyMarkersAutosave = usePolicyMarkersAutosave(activityId, user?.id);
  
  const [availableMarkers, setAvailableMarkers] = useState<IATIPolicyMarker[]>([]);
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

  // Fetch available IATI policy markers
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await apiFetch('/api/policy-markers');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        setAvailableMarkers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching IATI policy markers:', error);
        console.log('Using fallback IATI policy markers...');
        setAvailableMarkers(FALLBACK_IATI_MARKERS);
        toast.warning('Using offline IATI policy markers. Database connection may be required for full functionality.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, []);

  // Update marker significance
  const updateMarkerSignificance = (markerId: string, significance: 0 | 1 | 2 | 3 | 4) => {
    const marker = availableMarkers.find(m => m.id === markerId);
    if (!marker) return;

    // Validate significance 4 is only for RMNCH (IATI code 9)
    if (significance === 4 && marker.iati_code !== '9') {
      toast.error('Significance level 4 (Explicit primary objective) is only valid for RMNCH marker');
      return;
    }

    const newMarkers = new Map(selectedMarkers);
    
    if (significance === 0) {
      // Remove marker when set to "Not targeted"
      newMarkers.delete(markerId);
    } else {
      // Add or update marker
      const existing = newMarkers.get(markerId);
      newMarkers.set(markerId, {
        policy_marker_id: markerId,
        significance,
        rationale: existing?.rationale || ''
      });
    }
    
    setSelectedMarkers(newMarkers);
    
    // Convert to array and trigger onChange
    const markersArray = Array.from(newMarkers.values());
    onChange(markersArray);
    
    // Trigger autosave
    if (policyMarkersAutosave && activityId) {
      policyMarkersAutosave.triggerFieldSave(markersArray);
    }
    
    setHasUnsavedChanges?.(true);
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
      
      const markersArray = Array.from(newMarkers.values());
      onChange(markersArray);
      
      if (policyMarkersAutosave && activityId) {
        policyMarkersAutosave.triggerFieldSave(markersArray);
      }
      
      setHasUnsavedChanges?.(true);
    }
  };

  // Toggle card expansion
  const toggleCardExpansion = (markerId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(markerId)) {
      newExpanded.delete(markerId);
    } else {
      newExpanded.add(markerId);
    }
    setExpandedCards(newExpanded);
  };

  // Get markers by type
  const getMarkersByType = (type: string) => {
    return availableMarkers.filter(marker => marker.marker_type === type);
  };

  // Get current significance for a marker
  const getMarkerSignificance = (markerId: string): 0 | 1 | 2 | 3 | 4 => {
    return selectedMarkers.get(markerId)?.significance || 0;
  };

  // Get current rationale for a marker
  const getMarkerRationale = (markerId: string): string => {
    return selectedMarkers.get(markerId)?.rationale || '';
  };

  // Render marker card
  const renderMarkerCard = (marker: IATIPolicyMarker) => {
    const significance = getMarkerSignificance(marker.id);
    const rationale = getMarkerRationale(marker.id);
    const isExpanded = expandedCards.has(marker.id);
    const isSelected = significance > 0;

    return (
      <div key={marker.id} className={`border rounded-lg p-4 transition-all ${
        isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1">
                {MARKER_TYPE_ICONS[marker.marker_type]}
                <h4 className="font-medium text-sm">{marker.name}</h4>
                
                {/* IATI Standard Badge */}
                {marker.is_iati_standard && (
                  <Badge variant="outline" className="text-xs border-green-400 text-green-700">
                    <Globe className="h-3 w-3 mr-1" />
                    IATI {marker.iati_code}
                  </Badge>
                )}
              </div>
              
              {/* Vocabulary Badge - moved to the right */}
              <Badge variant="outline" className="text-xs border-gray-400 text-gray-600">
                {VOCABULARY_LABELS[marker.vocabulary as keyof typeof VOCABULARY_LABELS] || `Vocab ${marker.vocabulary}`}
              </Badge>
            </div>
            
            <p className="text-xs text-gray-600 mb-3">{marker.description}</p>
            
            {/* Significance Selection */}
            <div className="mb-3">
              <Label className="text-xs font-medium mb-1 block">Significance Level</Label>
              <PolicyMarkerScoreSelectIATI
                value={significance}
                onValueChange={(value) => updateMarkerSignificance(marker.id, value as 0 | 1 | 2 | 3 | 4)}
                policyMarker={marker} // Use new IATI-compliant validation
              />
            </div>
            
            {/* Rationale (only show if marker is selected) */}
            {isSelected && (
              <div className="mb-3">
                <button
                  onClick={() => toggleCardExpansion(marker.id)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 mb-2"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Rationale (Optional)
                </button>
                
                {isExpanded && (
                  <Textarea
                    value={rationale}
                    onChange={(e) => updateMarkerRationale(marker.id, e.target.value)}
                    placeholder="Explain why this marker applies and its significance level..."
                    className="text-xs"
                    rows={3}
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Selection Status */}
          {isSelected && (
            <div className="ml-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">IATI Policy Markers</h3>
          <HelpText content={HELP_CONTENT} />
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const selectedCount = selectedMarkers.size;
  const totalMarkers = availableMarkers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">IATI Policy Markers</h3>
          <HelpText content={HELP_CONTENT} />
        </div>
        <div className="text-sm text-gray-600">
          {selectedCount} of {totalMarkers} markers selected
        </div>
      </div>


      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(MARKER_TYPE_LABELS).map(([type, label]) => {
            const typeMarkers = getMarkersByType(type);
            const selectedInType = typeMarkers.filter(m => selectedMarkers.has(m.id)).length;
            
            return (
              <TabsTrigger key={type} value={type} className="relative">
                <div className="flex items-center gap-2">
                  {MARKER_TYPE_ICONS[type as keyof typeof MARKER_TYPE_ICONS]}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </div>
                {selectedInType > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {selectedInType}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(MARKER_TYPE_LABELS).map(type => (
          <TabsContent key={type} value={type} className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {MARKER_TYPE_ICONS[type as keyof typeof MARKER_TYPE_ICONS]}
                <h4 className="font-medium">
                  {MARKER_TYPE_LABELS[type as keyof typeof MARKER_TYPE_LABELS]}
                </h4>
              </div>
              
              <div className="grid gap-4">
                {getMarkersByType(type).map(renderMarkerCard)}
              </div>
              
              {getMarkersByType(type).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No {MARKER_TYPE_LABELS[type as keyof typeof MARKER_TYPE_LABELS].toLowerCase()} markers available</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
