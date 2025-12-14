"use client";

import React, { useState, useEffect } from 'react';
import { Info, Leaf, Users, Wrench, CheckCircle, ChevronDown, ChevronRight, Globe, Plus, X, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PolicyMarkerScoreSelectIATI } from '@/components/forms/PolicyMarkerScoreSelectIATI';
import { HelpText } from '@/components/ui/help-text';
import { toast } from 'sonner';
import { usePolicyMarkersAutosave } from '@/hooks/use-policy-markers-autosave';
import { useUser } from '@/hooks/useUser';

// Types
interface IATIPolicyMarker {
  id: string; // Keep for backward compatibility
  uuid: string; // The actual UUID used for references
  code: string;
  name: string;
  description: string;
  marker_type: 'environmental' | 'social_governance' | 'other' | 'custom';
  vocabulary: string;
  iati_code: string;
  is_iati_standard: boolean;
}

interface ActivityPolicyMarker {
  policy_marker_id: string;
  significance: 0 | 1 | 2 | 3 | 4;
  rationale?: string;
}

interface PolicyMarkersSectionProps {
  activityId: string;
  policyMarkers: ActivityPolicyMarker[];
  onChange: (markers: ActivityPolicyMarker[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
  readOnly?: boolean;
}

// Helper function to get significance label based on marker type
const getSignificanceLabel = (isRMNCH: boolean, significance: number): string => {
  if (isRMNCH) {
    switch (significance) {
      case 0: return "Negligible or no funding";
      case 1: return "At least a quarter of funding";
      case 2: return "Half of the funding";
      case 3: return "Most funding targeted";
      case 4: return "Explicit primary objective";
      default: return "Unknown";
    }
  } else {
    switch (significance) {
      case 0: return "Not targeted";
      case 1: return "Significant objective";
      case 2: return "Principal objective";
      case 3: return "Most funding targeted"; // IATI level 3
      case 4: return "Explicit primary objective"; // IATI level 4 (should only be for RMNCH)
      default: return "Unknown";
    }
  }
};

const MARKER_TYPE_ICONS = {
  environmental: <Leaf className="w-4 h-4 text-gray-600" />,
  social_governance: <Users className="w-4 h-4 text-gray-600" />,
  other: <Wrench className="w-4 h-4 text-gray-600" />,
  custom: <Plus className="w-4 h-4 text-gray-600" />
};

const MARKER_TYPE_LABELS = {
  environmental: 'Environmental',
  social_governance: 'Social & Governance', 
  other: 'Other Cross-Cutting Issues',
  custom: 'Custom Policy Markers'
};

const VOCABULARY_LABELS = {
  '1': 'OECD DAC CRS',
  '99': 'Custom Organization'
};

const HELP_CONTENT = {
  title: "IATI Policy Markers",
  description: "Policy markers flag cross-cutting themes such as gender, environment, and reproductive health. Each marker includes its significance rating according to IATI standards.",
  examples: [
    "Gender equality (principal objective)",
    "RMNCH health (explicit primary objective)", 
    "Custom organisation-defined marker"
  ]
};

// Fallback IATI markers (12 official ones)
const FALLBACK_IATI_MARKERS: IATIPolicyMarker[] = [
  // Environmental (Rio Markers)
  { id: '2', code: '2', name: 'Aid to Environment', description: 'Activities that support environmental protection or enhancement', marker_type: 'environmental', vocabulary: '1', iati_code: '2', is_iati_standard: true },
  { id: '5', code: '5', name: 'Aid Targeting the Objectives of the Convention on Biological Diversity', description: 'Activities that target biodiversity conservation objectives', marker_type: 'environmental', vocabulary: '1', iati_code: '5', is_iati_standard: true },
  { id: '6', code: '6', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', description: 'Activities that contribute to climate change mitigation', marker_type: 'environmental', vocabulary: '1', iati_code: '6', is_iati_standard: true },
  { id: '7', code: '7', name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', description: 'Activities that contribute to climate change adaptation', marker_type: 'environmental', vocabulary: '1', iati_code: '7', is_iati_standard: true },
  { id: '8', code: '8', name: 'Aid Targeting the Objectives of the Convention to Combat Desertification', description: 'Activities that target desertification objectives', marker_type: 'environmental', vocabulary: '1', iati_code: '8', is_iati_standard: true },
  
  // Social & Governance
  { id: '1', code: '1', name: 'Gender Equality', description: 'Activities that promote gender equality and women\'s empowerment', marker_type: 'social_governance', vocabulary: '1', iati_code: '1', is_iati_standard: true },
  { id: '3', code: '3', name: 'Participatory Development/Good Governance', description: 'Activities that promote participatory development and good governance', marker_type: 'social_governance', vocabulary: '1', iati_code: '3', is_iati_standard: true },
  
  // Other Cross-Cutting Issues
  { id: '4', code: '4', name: 'Trade Development', description: 'Activities that promote trade development', marker_type: 'other', vocabulary: '1', iati_code: '4', is_iati_standard: true },
  { id: '9', code: '9', name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', description: 'Activities that address reproductive, maternal, newborn and child health', marker_type: 'other', vocabulary: '1', iati_code: '9', is_iati_standard: true },
  { id: '10', code: '10', name: 'Disaster Risk Reduction (DRR)', description: 'Activities that address disaster risk reduction', marker_type: 'other', vocabulary: '1', iati_code: '10', is_iati_standard: true },
  { id: '11', code: '11', name: 'Disability', description: 'Activities that promote inclusion of persons with disabilities', marker_type: 'other', vocabulary: '1', iati_code: '11', is_iati_standard: true },
  { id: '12', code: '12', name: 'Nutrition', description: 'Activities that address nutrition outcomes', marker_type: 'other', vocabulary: '1', iati_code: '12', is_iati_standard: true }
];

export default function PolicyMarkersSectionIATIWithCustom({ activityId, policyMarkers, onChange, setHasUnsavedChanges, readOnly = false }: PolicyMarkersSectionProps) {
  const { user } = useUser();
  const policyMarkersAutosave = usePolicyMarkersAutosave(activityId, user?.id);
  
  const [availableMarkers, setAvailableMarkers] = useState<IATIPolicyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('environmental');
  const [selectedMarkers, setSelectedMarkers] = useState<Map<string, ActivityPolicyMarker>>(new Map());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAddCustomDialog, setShowAddCustomDialog] = useState(false);
  const [showEditCustomDialog, setShowEditCustomDialog] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [customMarkerForm, setCustomMarkerForm] = useState({
    name: '',
    description: '',
    marker_type: 'other' as 'environmental' | 'social_governance' | 'other',
    vocabulary: '99',
    vocabulary_name: '',
    code: '',
    significance: 0,
    vocabulary_uri: ''
  });

  // Initialize selected markers from props
  useEffect(() => {
    const markersMap = new Map<string, ActivityPolicyMarker>();
    policyMarkers.forEach(marker => {
      markersMap.set(marker.policy_marker_id, marker);
    });
    setSelectedMarkers(markersMap);
  }, [policyMarkers]);

  // Fetch available IATI policy markers (including activity-specific custom markers)
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        // Pass activity_id to get activity-scoped custom markers
        const response = await fetch(`/api/policy-markers?activity_id=${activityId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log('[PolicyMarkers] API data received:', data);
        // Add default IATI fields for markers that don't have them yet
        const markersWithDefaults = (Array.isArray(data) ? data : []).map((marker: any) => ({
          ...marker,
          uuid: marker.uuid || marker.id, // Ensure UUID is present
          vocabulary: marker.vocabulary || '1',
          iati_code: marker.iati_code || marker.code,
          is_iati_standard: marker.is_iati_standard !== undefined ? marker.is_iati_standard : true
        }));
        console.log('[PolicyMarkers] Processed markers:', markersWithDefaults);
        setAvailableMarkers(markersWithDefaults);
      } catch (error) {
        console.error('Error fetching IATI policy markers:', error);
        console.log('API call failed, using fallback markers...');
        console.log('[PolicyMarkers] Fallback markers:', FALLBACK_IATI_MARKERS);
        setAvailableMarkers(FALLBACK_IATI_MARKERS);
        toast.error(`Failed to load policy markers: ${error.message}. Using offline markers.`);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkers();
  }, []);

  // Update marker significance
  const updateMarkerSignificance = (markerUuid: string, significance: 0 | 1 | 2 | 3 | 4) => {
    const marker = availableMarkers.find(m => (m.uuid || m.id) === markerUuid);
    if (!marker) return;

    // Validate significance 4 is only for RMNCH (IATI code 9)
    if (significance === 4 && marker.iati_code !== '9') {
      toast.error('Significance level 4 (Explicit primary objective) is only valid for RMNCH marker');
      return;
    }

    const newSelectedMarkers = new Map(selectedMarkers);

    if (significance === 0) {
      newSelectedMarkers.delete(markerUuid);
    } else {
      const existingMarker = newSelectedMarkers.get(markerUuid) || {
        policy_marker_id: markerUuid, // Use UUID as the policy_marker_id
        significance: 0,
        rationale: ''
      };
      newSelectedMarkers.set(markerUuid, {
        ...existingMarker,
        significance
      });
    }

    setSelectedMarkers(newSelectedMarkers);

    // Convert to array for parent component
    const updatedMarkers = Array.from(newSelectedMarkers.values());
    onChange(updatedMarkers);

    // Trigger autosave - only save markers with valid significance (not 0)
    if (policyMarkersAutosave) {
      const validMarkers = updatedMarkers.filter(m => m.significance && m.significance > 0);
      policyMarkersAutosave.triggerFieldSave(validMarkers);
    }
    
    setHasUnsavedChanges?.(true);
  };

  // Update marker rationale
  const updateMarkerRationale = (markerUuid: string, rationale: string) => {
    const newSelectedMarkers = new Map(selectedMarkers);
    const existingMarker = newSelectedMarkers.get(markerUuid);
    
    if (existingMarker) {
      newSelectedMarkers.set(markerUuid, {
        ...existingMarker,
        rationale
      });
      
      setSelectedMarkers(newSelectedMarkers);
      
      const markersArray = Array.from(newSelectedMarkers.values());
      onChange(markersArray);
      
      if (policyMarkersAutosave) {
        const validMarkers = markersArray.filter(m => m.significance && m.significance > 0);
        policyMarkersAutosave.triggerFieldSave(validMarkers);
      }
      
      setHasUnsavedChanges?.(true);
    }
  };

  // Add custom policy marker
  const addCustomMarker = async () => {
    if (!customMarkerForm.name.trim()) {
      toast.error('Please enter a name for the custom policy marker');
      return;
    }
    if (!customMarkerForm.code.trim()) {
      toast.error('Please enter a code for the custom policy marker');
      return;
    }
    
    // Check if code already exists
    const existingMarker = availableMarkers.find(m => m.code === customMarkerForm.code.trim());
    if (existingMarker) {
      toast.error(`Code "${customMarkerForm.code.trim()}" is already taken. Please choose a different code.`);
      return;
    }

    // Validate significance 4 is only for RMNCH markers
    const isRMNCH = customMarkerForm.name.toLowerCase().includes('reproductive') || 
                    customMarkerForm.name.toLowerCase().includes('maternal') || 
                    customMarkerForm.name.toLowerCase().includes('newborn') || 
                    customMarkerForm.name.toLowerCase().includes('child') ||
                    customMarkerForm.name.toLowerCase().includes('rmnch');
    
    if (customMarkerForm.significance === 4 && !isRMNCH) {
      toast.error('Significance level 4 (Explicit primary objective) is only valid for RMNCH markers');
      return;
    }

    try {
      const response = await fetch('/api/policy-markers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customMarkerForm.name.trim(),
          description: customMarkerForm.description.trim(),
          marker_type: customMarkerForm.marker_type,
          code: customMarkerForm.code.trim(),
          vocabulary: customMarkerForm.vocabulary,
          vocabulary_name: customMarkerForm.vocabulary_name.trim(),
          iati_code: customMarkerForm.code.trim(),
          is_iati_standard: false,
          is_active: true,
          vocabulary_uri: customMarkerForm.vocabulary_uri.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating policy marker:', errorData);
        
        // Handle specific error cases
        if (errorData.message?.includes('duplicate key') || errorData.message?.includes('already exists')) {
          toast.error(`Code "${customMarkerForm.code.trim()}" is already taken. Please choose a different code.`);
        } else {
          toast.error(errorData.message || 'Failed to create custom policy marker');
        }
        return;
      }

      const newMarker = await response.json();
      
      // Add default IATI fields to the new marker
      const markerWithDefaults = {
        ...newMarker,
        vocabulary: customMarkerForm.vocabulary,
        iati_code: customMarkerForm.code.trim(),
        is_iati_standard: false,
        vocabulary_uri: customMarkerForm.vocabulary_uri.trim() || null,
        vocabulary_name: customMarkerForm.vocabulary_name.trim()
      };

      // Add to available markers
      setAvailableMarkers(prev => [...prev, markerWithDefaults]);
      
      // Reset form
      setCustomMarkerForm({
        name: '',
        description: '',
        marker_type: 'other',
        vocabulary: '99',
        vocabulary_name: '',
        code: '',
        significance: 0,
        vocabulary_uri: ''
      });
      
      setShowAddCustomDialog(false);
      toast.success('Custom policy marker created successfully');
    } catch (error) {
      console.error('Error creating custom policy marker:', error);
      toast.error('Failed to create custom policy marker');
    }
  };

  // Edit custom policy marker
  const editCustomMarker = (markerId: string) => {
    const marker = availableMarkers.find(m => m.id === markerId);
    if (!marker) return;

    setEditingMarkerId(markerId);
    setCustomMarkerForm({
      name: marker.name,
      description: marker.description || '',
      marker_type: marker.marker_type,
      vocabulary: marker.vocabulary || '99',
      vocabulary_name: marker.vocabulary_name || '',
      code: marker.code.startsWith('CUSTOM_') ? marker.code.substring(7) : marker.code, // Remove CUSTOM_ prefix for display
      significance: 0,
      vocabulary_uri: marker.vocabulary_uri || ''
    });
    setShowEditCustomDialog(true);
  };

  // Update custom policy marker
  const updateCustomMarker = async () => {
    if (!editingMarkerId) return;
    
    if (!customMarkerForm.name.trim()) {
      toast.error('Please enter a name for the custom policy marker');
      return;
    }
    if (!customMarkerForm.code.trim()) {
      toast.error('Please enter a code for the custom policy marker');
      return;
    }
    
    // Check if code already exists (excluding current marker)
    const existingMarker = availableMarkers.find(m => m.code === customMarkerForm.code.trim() && m.id !== editingMarkerId);
    if (existingMarker) {
      toast.error(`Code "${customMarkerForm.code.trim()}" is already taken. Please choose a different code.`);
      return;
    }

    try {
      const response = await fetch('/api/policy-markers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingMarkerId,
          name: customMarkerForm.name.trim(),
          description: customMarkerForm.description.trim(),
          marker_type: customMarkerForm.marker_type,
          code: customMarkerForm.code.trim(),
          vocabulary_name: customMarkerForm.vocabulary_name.trim(),
          vocabulary_uri: customMarkerForm.vocabulary_uri.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating policy marker:', errorData);
        
        // Handle specific error cases
        if (errorData.message?.includes('duplicate key') || errorData.message?.includes('already exists')) {
          toast.error(`Code "${customMarkerForm.code.trim()}" is already taken. Please choose a different code.`);
        } else {
          toast.error(errorData.message || 'Failed to update custom policy marker');
        }
        return;
      }

      const updatedMarker = await response.json();
      
      // Update the marker in available markers
      setAvailableMarkers(prev => prev.map(marker => 
        marker.id === editingMarkerId ? updatedMarker : marker
      ));
      
      // Reset form and close dialog
      setCustomMarkerForm({
        name: '',
        description: '',
        marker_type: 'other',
        vocabulary: '99',
        vocabulary_name: '',
        code: '',
        significance: 0,
        vocabulary_uri: ''
      });
      setShowEditCustomDialog(false);
      setEditingMarkerId(null);
      
      toast.success('Custom policy marker updated successfully');
    } catch (error) {
      console.error('Error updating custom policy marker:', error);
      toast.error('Failed to update custom policy marker');
    }
  };

  // Delete custom policy marker
  const deleteCustomMarker = async (markerId: string) => {
    if (!confirm('Are you sure you want to delete this custom policy marker? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/policy-markers?id=${markerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting policy marker:', errorData);
        throw new Error(errorData.message || 'Failed to delete custom policy marker');
      }

      // Remove from available markers
      setAvailableMarkers(prev => prev.filter(marker => marker.id !== markerId));
      
      // Remove from selected markers if it was selected
      const newSelectedMarkers = new Map(selectedMarkers);
      newSelectedMarkers.delete(markerId);
      setSelectedMarkers(newSelectedMarkers);
      
      // Update the parent component
      const updatedMarkers = Array.from(newSelectedMarkers.values());
      onChange(updatedMarkers);
      
      toast.success('Custom policy marker deleted successfully');
    } catch (error) {
      console.error('Error deleting custom policy marker:', error);
      toast.error('Failed to delete custom policy marker');
    }
  };

  // Get markers by type
  const getMarkersByType = (type: string) => {
    if (type === 'custom') {
      return availableMarkers.filter(marker => !marker.is_iati_standard);
    }
    return availableMarkers.filter(marker => marker.marker_type === type && marker.is_iati_standard);
  };

  // Get current significance for a marker
  const getMarkerSignificance = (markerUuid: string): 0 | 1 | 2 | 3 | 4 => {
    // Find the selected marker by UUID
    const selectedMarker = selectedMarkers.get(markerUuid);
    return selectedMarker?.significance || 0;
  };

  // Get current rationale for a marker
  const getMarkerRationale = (markerUuid: string): string => {
    // Find the selected marker by UUID
    const selectedMarker = selectedMarkers.get(markerUuid);
    return selectedMarker?.rationale || '';
  };

  // Render marker card
  const renderMarkerCard = (marker: IATIPolicyMarker) => {
    const markerUuid = marker.uuid || marker.id; // Use UUID, fallback to ID
    const significance = getMarkerSignificance(markerUuid);
    const rationale = getMarkerRationale(markerUuid);
    const isSelected = significance > 0;

    return (
      <div key={markerUuid} className={`border rounded-lg p-3 transition-all ${
        isSelected ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'
      }`}>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                  {marker.is_iati_standard ? marker.iati_code : marker.code.startsWith('CUSTOM_') ? marker.code.substring(7) : marker.code}
                </span>
                {!marker.is_iati_standard && (
                  <Badge variant="outline" className="text-xs border-slate-400 text-slate-600">
                    Custom
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-xs text-slate-900 leading-tight">{marker.name}</h4>
            </div>
            
            {isSelected && (
              <CheckCircle className="h-4 w-4 text-slate-600 flex-shrink-0" />
            )}
          </div>
          
          {/* Significance Level */}
          {readOnly ? (
            <div className="text-xs">
              <span className="text-slate-600">Significance: </span>
              <span className="font-medium text-slate-900">
                {getSignificanceLabel(marker.code === '8', significance)}
              </span>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-medium mb-1 block text-slate-700">Significance</Label>
              <PolicyMarkerScoreSelectIATI
                value={significance}
                onValueChange={(value) => updateMarkerSignificance(markerUuid, value as 0 | 1 | 2 | 3 | 4)}
                policyMarker={marker}
              />
            </div>
          )}
          
          {/* Rationale */}
          {isSelected && (
            <div>
              <Label className="text-xs font-medium mb-1 block text-slate-700">
                Rationale {readOnly ? '' : '(Optional)'}
              </Label>
              {readOnly ? (
                rationale ? (
                  <p className="text-xs text-slate-600 line-clamp-2">{rationale}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No rationale provided</p>
                )
              ) : (
                <Textarea
                  value={rationale}
                  onChange={(e) => updateMarkerRationale(markerUuid, e.target.value)}
                  placeholder="Provide a short description or rationale for the selected degree of significance..."
                  className="text-xs min-h-[60px]"
                  rows={2}
                />
              )}
            </div>
          )}
          
          {/* Edit/Delete for custom markers */}
          {!marker.is_iati_standard && !readOnly && (
            <div className="flex gap-1 pt-2 border-t border-slate-200">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2 text-slate-600 border-slate-300 hover:bg-slate-100"
                onClick={(e) => {
                  e.stopPropagation();
                  editCustomMarker(marker.id);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2 text-slate-600 border-slate-300 hover:bg-slate-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCustomMarker(marker.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
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
  const iatiMarkers = availableMarkers.filter(m => m.is_iati_standard);
  const customMarkers = availableMarkers.filter(m => !m.is_iati_standard);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">IATI Policy Markers</h3>
          <HelpText content={HELP_CONTENT} />
        </div>
        <div className="flex items-center gap-4">
          {!readOnly && (
            <Dialog open={showAddCustomDialog} onOpenChange={setShowAddCustomDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Custom Policy Marker
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Custom Policy Marker</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="custom-vocabulary">Vocabulary</Label>
                    <Input
                      id="custom-vocabulary"
                      value={customMarkerForm.vocabulary}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fixed to 99 for custom markers</p>
                  </div>
                  <div>
                    <Label htmlFor="custom-vocabulary-name">Vocabulary Name</Label>
                    <Input
                      id="custom-vocabulary-name"
                      value={customMarkerForm.vocabulary_name}
                      onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, vocabulary_name: e.target.value }))}
                      placeholder="Enter vocabulary name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="custom-code">Code</Label>
                  <Input
                    id="custom-code"
                    value={customMarkerForm.code}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Enter custom code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="custom-name">Name</Label>
                  <Input
                    id="custom-name"
                    value={customMarkerForm.name}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter policy marker name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="custom-significance">Significance</Label>
                  <Select
                    value={customMarkerForm.significance.toString()}
                    onValueChange={(value) => setCustomMarkerForm(prev => ({ ...prev, significance: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      {customMarkerForm.name.toLowerCase().includes('reproductive') || 
                       customMarkerForm.name.toLowerCase().includes('maternal') || 
                       customMarkerForm.name.toLowerCase().includes('newborn') || 
                       customMarkerForm.name.toLowerCase().includes('child') ||
                       customMarkerForm.name.toLowerCase().includes('rmnch') ? (
                        // RMNCH-specific significance levels
                        <>
                          <SelectItem value="0">0 - Negligible or no funding</SelectItem>
                          <SelectItem value="1">1 - At least a quarter of funding</SelectItem>
                          <SelectItem value="2">2 - Half of the funding</SelectItem>
                          <SelectItem value="3">3 - Most funding targeted</SelectItem>
                          <SelectItem value="4">4 - Explicit primary objective</SelectItem>
                        </>
                      ) : (
                        // Standard significance levels for other markers (including IATI levels 3 and 4)
                        <>
                          <SelectItem value="0">0 - Not targeted</SelectItem>
                          <SelectItem value="1">1 - Significant objective</SelectItem>
                          <SelectItem value="2">2 - Principal objective</SelectItem>
                          <SelectItem value="3">3 - Most funding targeted</SelectItem>
                          <SelectItem value="4">4 - Explicit primary objective</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="custom-vocabulary-uri">Vocabulary URI</Label>
                  <Input
                    id="custom-vocabulary-uri"
                    value={customMarkerForm.vocabulary_uri}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, vocabulary_uri: e.target.value }))}
                    placeholder="http://example.com/vocab.html"
                  />
                </div>
                
                <div>
                  <Label htmlFor="custom-description">Description</Label>
                  <Textarea
                    id="custom-description"
                    value={customMarkerForm.description}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description (optional)"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddCustomDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addCustomMarker}>
                    Add Marker
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}

          {/* Edit Custom Marker Dialog */}
          {!readOnly && (
            <Dialog open={showEditCustomDialog} onOpenChange={setShowEditCustomDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Custom Policy Marker</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-custom-vocabulary">Vocabulary</Label>
                    <Input
                      id="edit-custom-vocabulary"
                      value={customMarkerForm.vocabulary}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Fixed to 99 for custom markers</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-custom-vocabulary-name">Vocabulary Name</Label>
                    <Input
                      id="edit-custom-vocabulary-name"
                      value={customMarkerForm.vocabulary_name}
                      onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, vocabulary_name: e.target.value }))}
                      placeholder="Enter vocabulary name"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-custom-code">Code</Label>
                  <Input
                    id="edit-custom-code"
                    value={customMarkerForm.code}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Enter custom code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-custom-name">Name</Label>
                  <Input
                    id="edit-custom-name"
                    value={customMarkerForm.name}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter policy marker name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-custom-significance">Significance</Label>
                  <Select
                    value={customMarkerForm.significance.toString()}
                    onValueChange={(value) => setCustomMarkerForm(prev => ({ ...prev, significance: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      {customMarkerForm.name.toLowerCase().includes('reproductive') || 
                       customMarkerForm.name.toLowerCase().includes('maternal') || 
                       customMarkerForm.name.toLowerCase().includes('newborn') || 
                       customMarkerForm.name.toLowerCase().includes('child') ||
                       customMarkerForm.name.toLowerCase().includes('rmnch') ? (
                        // RMNCH-specific significance levels
                        <>
                          <SelectItem value="0">0 - Negligible or no funding</SelectItem>
                          <SelectItem value="1">1 - At least a quarter of funding</SelectItem>
                          <SelectItem value="2">2 - Half of the funding</SelectItem>
                          <SelectItem value="3">3 - Most funding targeted</SelectItem>
                          <SelectItem value="4">4 - Explicit primary objective</SelectItem>
                        </>
                      ) : (
                        // Standard significance levels for other markers (including IATI levels 3 and 4)
                        <>
                          <SelectItem value="0">0 - Not targeted</SelectItem>
                          <SelectItem value="1">1 - Significant objective</SelectItem>
                          <SelectItem value="2">2 - Principal objective</SelectItem>
                          <SelectItem value="3">3 - Most funding targeted</SelectItem>
                          <SelectItem value="4">4 - Explicit primary objective</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-custom-vocabulary-uri">Vocabulary URI</Label>
                  <Input
                    id="edit-custom-vocabulary-uri"
                    value={customMarkerForm.vocabulary_uri}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, vocabulary_uri: e.target.value }))}
                    placeholder="http://example.com/vocab.html"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-custom-description">Description</Label>
                  <Textarea
                    id="edit-custom-description"
                    value={customMarkerForm.description}
                    onChange={(e) => setCustomMarkerForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description (optional)"
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowEditCustomDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={updateCustomMarker}>
                    Update Marker
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Single View - All Targeted Policy Markers */}
      {readOnly ? (
        <div className="space-y-4">
          {/* Filter to show only targeted markers (significance > 0) */}
          {(() => {
            const targetedMarkers = availableMarkers.filter(marker => {
              const markerUuid = marker.uuid || marker.id;
              const significance = getMarkerSignificance(markerUuid);
              return significance > 0;
            });

            if (targetedMarkers.length === 0) {
              return (
                <div className="text-center py-12 text-slate-500">
                  <p>No policy markers have been selected for this activity.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {targetedMarkers.map(renderMarkerCard)}
              </div>
            );
          })()}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(MARKER_TYPE_LABELS).map(([type, label]) => {
              const typeMarkers = getMarkersByType(type);
              const selectedInType = typeMarkers.filter(m => selectedMarkers.has(m.id)).length;
              const totalInType = typeMarkers.length;
              
              return (
                <TabsTrigger key={type} value={type} className="relative">
                  <div className="flex items-center gap-2">
                    {MARKER_TYPE_ICONS[type as keyof typeof MARKER_TYPE_ICONS]}
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.split(' ')[0]}</span>
                  </div>
                  <Badge 
                    variant={selectedInType > 0 ? "default" : "secondary"} 
                    className={`ml-2 text-xs ${
                      selectedInType > 0 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {selectedInType}/{totalInType}
                  </Badge>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}
    </div>
  );
}
