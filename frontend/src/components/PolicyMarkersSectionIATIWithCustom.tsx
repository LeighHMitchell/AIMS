"use client";

import React, { useState, useEffect } from 'react';
import { Leaf, Users, Wrench, Plus, Trash2, Pencil, Building2, EyeOff, Globe, ChevronsUpDown, Check, HelpCircle, LayoutGrid, List, Activity } from 'lucide-react';
import { CardShell } from '@/components/ui/card-shell';
import { getIconForMarker } from '@/lib/policy-marker-utils';

const GROUP_COLORS: Record<string, string> = {
  environmental: '#16a34a',
  social_governance: '#2563eb',
  other: '#7c3aed',
  custom: '#64748b',
};
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { RequiredDot } from '@/components/ui/required-dot';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usePolicyMarkersAutosave } from '@/hooks/use-policy-markers-autosave';
import { useUser } from '@/hooks/useUser';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

// Types
type VisibilityLevel = 'public' | 'organization' | 'hidden';

interface IATIPolicyMarker {
  id: string;
  uuid: string;
  code: string;
  name: string;
  description: string;
  marker_type: 'environmental' | 'social_governance' | 'other' | 'custom';
  vocabulary: string;
  iati_code: string;
  is_iati_standard: boolean;
  default_visibility?: VisibilityLevel;
  vocabulary_name?: string;
  vocabulary_uri?: string;
}

interface ActivityPolicyMarker {
  policy_marker_id: string;
  significance: 0 | 1 | 2 | 3 | 4;
  rationale?: string;
  visibility?: VisibilityLevel | null;
}

interface PolicyMarkersSectionProps {
  activityId: string;
  policyMarkers: ActivityPolicyMarker[];
  onChange: (markers: ActivityPolicyMarker[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
  readOnly?: boolean;
}

// Significance labels
const getSignificanceLabel = (markerCode: string, significance: number): string => {
  if (markerCode === '9') {
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
      case 3: return "Most funding targeted";
      case 4: return "Explicit primary objective";
      default: return "Unknown";
    }
  }
};

// Get max significance allowed for a marker
const getMaxSignificance = (marker: IATIPolicyMarker): number => {
  if (marker.iati_code === '9' || !marker.is_iati_standard) return 4;
  if (marker.iati_code === '8') return 3;
  return 2;
};

const MARKER_TYPE_ICONS: Record<string, React.ReactNode> = {
  environmental: <Leaf className="w-4 h-4 text-muted-foreground" />,
  social_governance: <Users className="w-4 h-4 text-muted-foreground" />,
  other: <Wrench className="w-4 h-4 text-muted-foreground" />,
  custom: <Plus className="w-4 h-4 text-muted-foreground" />
};

const MARKER_TYPE_LABELS: Record<string, string> = {
  environmental: 'Environmental',
  social_governance: 'Social & Governance',
  other: 'Other Cross-Cutting Issues',
  custom: 'Custom Policy Markers'
};

const VISIBILITY_OPTIONS: { value: VisibilityLevel; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone including external viewers' },
  { value: 'organization', label: 'Organization-only', description: 'Visible to logged-in users only' },
  { value: 'hidden', label: 'Hidden', description: 'Visible to activity editors and admins only' }
];

const VisibilityIcon = ({ visibility, className = "h-3 w-3" }: { visibility: VisibilityLevel | null | undefined; className?: string }) => {
  switch (visibility) {
    case 'organization':
      return <Building2 className={`${className} text-amber-600`} />;
    case 'hidden':
      return <EyeOff className={`${className} text-destructive`} />;
    default:
      return <Globe className={`${className} text-[hsl(var(--success-icon))]`} />;
  }
};

const getVisibilityLabel = (visibility: VisibilityLevel | null | undefined): string => {
  switch (visibility) {
    case 'organization': return 'Organization-only';
    case 'hidden': return 'Hidden';
    default: return 'Public';
  }
};

// Fallback IATI markers (12 official ones)
const FALLBACK_IATI_MARKERS: IATIPolicyMarker[] = [
  { id: '2', uuid: '2', code: '2', name: 'Aid to Environment', description: 'Activities that support environmental protection or enhancement', marker_type: 'environmental', vocabulary: '1', iati_code: '2', is_iati_standard: true },
  { id: '5', uuid: '5', code: '5', name: 'Biodiversity Convention', description: 'Activities that target biodiversity conservation objectives', marker_type: 'environmental', vocabulary: '1', iati_code: '5', is_iati_standard: true },
  { id: '6', uuid: '6', code: '6', name: 'Climate Mitigation', description: 'Activities that contribute to climate change mitigation', marker_type: 'environmental', vocabulary: '1', iati_code: '6', is_iati_standard: true },
  { id: '7', uuid: '7', code: '7', name: 'Climate Adaptation', description: 'Activities that contribute to climate change adaptation', marker_type: 'environmental', vocabulary: '1', iati_code: '7', is_iati_standard: true },
  { id: '8', uuid: '8', code: '8', name: 'Desertification Convention', description: 'Activities that target desertification objectives', marker_type: 'environmental', vocabulary: '1', iati_code: '8', is_iati_standard: true },
  { id: '1', uuid: '1', code: '1', name: 'Gender Equality', description: 'Activities that promote gender equality', marker_type: 'social_governance', vocabulary: '1', iati_code: '1', is_iati_standard: true },
  { id: '3', uuid: '3', code: '3', name: 'Participatory Development/Good Governance', description: 'Activities that promote participatory development and good governance', marker_type: 'social_governance', vocabulary: '1', iati_code: '3', is_iati_standard: true },
  { id: '9', uuid: '9', code: '9', name: 'RMNCH', description: 'Reproductive, Maternal, Newborn and Child Health', marker_type: 'social_governance', vocabulary: '1', iati_code: '9', is_iati_standard: true },
  { id: '11', uuid: '11', code: '11', name: 'Disability', description: 'Activities that promote inclusion of persons with disabilities', marker_type: 'social_governance', vocabulary: '1', iati_code: '11', is_iati_standard: true },
  { id: '12', uuid: '12', code: '12', name: 'Nutrition', description: 'Activities that address nutrition outcomes', marker_type: 'social_governance', vocabulary: '1', iati_code: '12', is_iati_standard: true },
  { id: '4', uuid: '4', code: '4', name: 'Trade Development', description: 'Activities that promote trade development', marker_type: 'other', vocabulary: '1', iati_code: '4', is_iati_standard: true },
  { id: '10', uuid: '10', code: '10', name: 'Disaster Risk Reduction (DRR)', description: 'Activities that address disaster risk reduction', marker_type: 'other', vocabulary: '1', iati_code: '10', is_iati_standard: true },
];

// Modal form state type
interface ModalFormState {
  selectedMarkerId: string | null;
  significance: number;
  rationale: string;
  visibility: VisibilityLevel | null;
  isCreatingCustom: boolean;
  customName: string;
  customCode: string;
  customDescription: string;
  customMarkerType: 'environmental' | 'social_governance' | 'other';
  customVocabulary: string;
  customVocabularyName: string;
  customVocabularyUri: string;
  customDefaultVisibility: VisibilityLevel;
}

const INITIAL_MODAL_FORM: ModalFormState = {
  selectedMarkerId: null,
  significance: 1,
  rationale: '',
  visibility: null,
  isCreatingCustom: false,
  customName: '',
  customCode: '',
  customDescription: '',
  customMarkerType: 'other',
  customVocabulary: '99',
  customVocabularyName: '',
  customVocabularyUri: '',
  customDefaultVisibility: 'public',
};

export default function PolicyMarkersSectionIATIWithCustom({ activityId, policyMarkers, onChange, setHasUnsavedChanges, readOnly = false }: PolicyMarkersSectionProps) {
  const { user } = useUser();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const policyMarkersAutosave = usePolicyMarkersAutosave(activityId, user?.id);

  const [availableMarkers, setAvailableMarkers] = useState<IATIPolicyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarkers, setSelectedMarkers] = useState<Map<string, ActivityPolicyMarker>>(new Map());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingMarkerUuid, setEditingMarkerUuid] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<ModalFormState>(INITIAL_MODAL_FORM);
  const [markerPopoverOpen, setMarkerPopoverOpen] = useState(false);
  const [savingModal, setSavingModal] = useState(false);

  // Initialize selected markers from props
  useEffect(() => {
    const markersMap = new Map<string, ActivityPolicyMarker>();
    policyMarkers.forEach(marker => {
      if (marker.significance > 0) {
        markersMap.set(marker.policy_marker_id, marker);
      }
    });
    setSelectedMarkers(markersMap);
  }, [policyMarkers]);

  // Fetch available IATI policy markers
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await apiFetch(`/api/policy-markers?activity_id=${activityId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        const markersWithDefaults = (Array.isArray(data) ? data : []).map((marker: any) => ({
          ...marker,
          uuid: marker.uuid || marker.id,
          vocabulary: marker.vocabulary || '1',
          iati_code: marker.iati_code || marker.code,
          is_iati_standard: marker.is_iati_standard !== undefined ? marker.is_iati_standard : true
        }));
        setAvailableMarkers(markersWithDefaults);
      } catch (error: any) {
        console.error('Error fetching IATI policy markers:', error);
        setAvailableMarkers(FALLBACK_IATI_MARKERS);
        toast.error(`Failed to load policy markers: ${error.message}. Using offline markers.`);
      } finally {
        setLoading(false);
      }
    };
    fetchMarkers();
  }, [activityId]);

  // ---- Autosave helper ----
  const triggerSave = (newSelectedMarkers: Map<string, ActivityPolicyMarker>) => {
    const markersArray = Array.from(newSelectedMarkers.values()).filter(m => m.significance > 0);
    onChange(markersArray);
    if (policyMarkersAutosave) {
      policyMarkersAutosave.triggerFieldSave(markersArray);
    }
    setHasUnsavedChanges?.(true);
  };

  // ---- Get effective visibility ----
  const getEffectiveVisibility = (marker: IATIPolicyMarker, activityMarker?: ActivityPolicyMarker): VisibilityLevel => {
    if (marker.is_iati_standard) return 'public';
    return activityMarker?.visibility ?? marker.default_visibility ?? 'public';
  };

  // ---- Visibility check for readOnly mode ----
  const isMarkerVisible = (marker: IATIPolicyMarker): boolean => {
    if (marker.is_iati_standard) return true;
    const markerUuid = marker.uuid || marker.id;
    const activityMarker = selectedMarkers.get(markerUuid);
    const visibility = getEffectiveVisibility(marker, activityMarker);
    if (!readOnly) return true;
    if (!user) return visibility === 'public';
    return visibility !== 'hidden';
  };

  // ---- Get display code for a marker ----
  const getDisplayCode = (marker: IATIPolicyMarker): string => {
    if (marker.is_iati_standard) return marker.iati_code;
    return marker.code.startsWith('CUSTOM_') ? marker.code.substring(7) : marker.code;
  };

  // ---- Get active markers grouped by type ----
  const getActiveMarkersForType = (type: string) => {
    const results: { marker: IATIPolicyMarker; activityMarker: ActivityPolicyMarker }[] = [];
    selectedMarkers.forEach((activityMarker, markerUuid) => {
      if (activityMarker.significance <= 0) return;
      const marker = availableMarkers.find(m => (m.uuid || m.id) === markerUuid);
      if (!marker) return;
      if (!isMarkerVisible(marker)) return;
      const markerType = marker.is_iati_standard ? marker.marker_type : 'custom';
      if (markerType === type) {
        results.push({ marker, activityMarker });
      }
    });
    return results.sort((a, b) => a.marker.name.localeCompare(b.marker.name));
  };

  // ---- Open modal for add ----
  const openAddModal = () => {
    setModalMode('add');
    setEditingMarkerUuid(null);
    setModalForm(INITIAL_MODAL_FORM);
    setModalOpen(true);
  };

  // ---- Open modal for edit ----
  const openEditModal = (markerUuid: string) => {
    const activityMarker = selectedMarkers.get(markerUuid);
    if (!activityMarker) return;
    const marker = availableMarkers.find(m => (m.uuid || m.id) === markerUuid);
    if (!marker) return;

    setModalMode('edit');
    setEditingMarkerUuid(markerUuid);
    setModalForm({
      ...INITIAL_MODAL_FORM,
      selectedMarkerId: markerUuid,
      significance: activityMarker.significance,
      rationale: activityMarker.rationale || '',
      visibility: activityMarker.visibility ?? null,
    });
    setModalOpen(true);
  };

  // ---- Remove marker ----
  const removeMarker = (markerUuid: string) => {
    const newSelectedMarkers = new Map(selectedMarkers);
    newSelectedMarkers.delete(markerUuid);
    setSelectedMarkers(newSelectedMarkers);
    triggerSave(newSelectedMarkers);
    toast.success('Policy marker removed');
  };

  // ---- Delete custom marker definition ----
  const deleteCustomMarker = async (markerId: string) => {
    if (!(await confirm({ title: 'Delete custom policy marker?', description: 'This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) return;
    try {
      const response = await apiFetch(`/api/policy-markers?id=${markerId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete custom policy marker');
      }
      setAvailableMarkers(prev => prev.filter(m => m.id !== markerId));
      const newSelectedMarkers = new Map(selectedMarkers);
      newSelectedMarkers.delete(markerId);
      setSelectedMarkers(newSelectedMarkers);
      triggerSave(newSelectedMarkers);
      toast.success('Custom policy marker deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete custom policy marker');
    }
  };

  // ---- Modal submit ----
  const handleModalSubmit = async () => {
    setSavingModal(true);
    try {
      let markerUuid = modalForm.selectedMarkerId;

      // If creating a custom marker, create it first
      if (modalForm.isCreatingCustom) {
        if (!modalForm.customName.trim()) {
          toast.error('Please enter a name for the custom policy marker');
          setSavingModal(false);
          return;
        }
        if (!modalForm.customCode.trim()) {
          toast.error('Please enter a code for the custom policy marker');
          setSavingModal(false);
          return;
        }
        const existingMarker = availableMarkers.find(m => m.code === modalForm.customCode.trim());
        if (existingMarker) {
          toast.error(`Code "${modalForm.customCode.trim()}" is already taken.`);
          setSavingModal(false);
          return;
        }

        const response = await apiFetch('/api/policy-markers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: modalForm.customName.trim(),
            description: modalForm.customDescription.trim(),
            marker_type: modalForm.customMarkerType,
            code: modalForm.customCode.trim(),
            vocabulary: modalForm.customVocabulary,
            vocabulary_name: modalForm.customVocabularyName.trim(),
            iati_code: modalForm.customCode.trim(),
            is_iati_standard: false,
            is_active: true,
            vocabulary_uri: modalForm.customVocabularyUri.trim() || null,
            default_visibility: modalForm.customDefaultVisibility
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.message?.includes('duplicate key') || errorData.message?.includes('already exists')) {
            toast.error(`Code "${modalForm.customCode.trim()}" is already taken.`);
          } else {
            toast.error(errorData.message || 'Failed to create custom policy marker');
          }
          setSavingModal(false);
          return;
        }

        const newMarker = await response.json();
        const markerWithDefaults = {
          ...newMarker,
          uuid: newMarker.uuid || newMarker.id,
          vocabulary: modalForm.customVocabulary,
          iati_code: modalForm.customCode.trim(),
          is_iati_standard: false,
          vocabulary_uri: modalForm.customVocabularyUri.trim() || null,
          vocabulary_name: modalForm.customVocabularyName.trim()
        };
        setAvailableMarkers(prev => [...prev, markerWithDefaults]);
        markerUuid = markerWithDefaults.uuid || markerWithDefaults.id;
        toast.success('Custom policy marker created');
      }

      if (!markerUuid) {
        toast.error('Please select a policy marker');
        setSavingModal(false);
        return;
      }

      if (modalForm.significance < 1) {
        toast.error('Please select a significance level');
        setSavingModal(false);
        return;
      }

      // Validate significance against marker rules
      const marker = availableMarkers.find(m => (m.uuid || m.id) === markerUuid);
      if (marker && modalForm.significance === 4 && marker.iati_code !== '9' && marker.is_iati_standard) {
        toast.error('Significance level 4 is only valid for RMNCH marker');
        setSavingModal(false);
        return;
      }

      // Save to selected markers
      const newSelectedMarkers = new Map(selectedMarkers);
      newSelectedMarkers.set(markerUuid, {
        policy_marker_id: markerUuid,
        significance: modalForm.significance as 0 | 1 | 2 | 3 | 4,
        rationale: modalForm.rationale.trim() || undefined,
        visibility: modalForm.visibility,
      });
      setSelectedMarkers(newSelectedMarkers);
      triggerSave(newSelectedMarkers);

      setModalOpen(false);
      setModalForm(INITIAL_MODAL_FORM);
      toast.success(modalMode === 'add' ? 'Policy marker added' : 'Policy marker updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save policy marker');
    } finally {
      setSavingModal(false);
    }
  };

  // ---- Get selected marker object for modal ----
  const getSelectedMarkerForModal = (): IATIPolicyMarker | null => {
    if (!modalForm.selectedMarkerId) return null;
    return availableMarkers.find(m => (m.uuid || m.id) === modalForm.selectedMarkerId) || null;
  };

  // ---- Count active markers ----
  const activeMarkerCount = Array.from(selectedMarkers.values()).filter(m => m.significance > 0).length;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-border p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Get marker groups that have active entries
  const groupTypes = ['environmental', 'social_governance', 'other', 'custom'] as const;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        {activeMarkerCount > 0 && (
          <div className="flex items-center border rounded-md flex-shrink-0">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none h-9"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-l-none h-9"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!readOnly && (
          <Button onClick={openAddModal} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Policy Marker
          </Button>
        )}
      </div>

      {/* Empty state */}
      {activeMarkerCount === 0 ? (
        <div className="text-center py-12">
          <img src="/images/empty-flag.webp" alt="No policy markers" className="h-32 mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-medium mb-2">No policy markers</h3>
          <p className="text-muted-foreground mb-4">
            Use the button above to add policy markers to this activity.
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="space-y-8">
          {groupTypes.map(type => {
            const markersInGroup = getActiveMarkersForType(type);
            if (markersInGroup.length === 0) return null;
            const groupColor = GROUP_COLORS[type] || '#64748b';

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  {MARKER_TYPE_ICONS[type]}
                  <h3 className="text-sm font-medium text-muted-foreground">{MARKER_TYPE_LABELS[type]}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {markersInGroup.map(({ marker, activityMarker }) => {
                    const markerUuid = marker.uuid || marker.id;
                    const IconComponent = getIconForMarker(marker.iati_code);
                    const isRMNCH = marker.iati_code === '9';
                    const significanceLabel = getSignificanceLabel(isRMNCH ? '9' : '0', activityMarker.significance);

                    return (
                      <CardShell
                        key={markerUuid}
                        ariaLabel={marker.name}
                        bannerColor={groupColor}
                        bannerContent={
                          <div className="h-full w-full flex items-center justify-center">
                            <IconComponent className="h-12 w-12 text-white/20" />
                          </div>
                        }
                        bannerOverlay={
                          <>
                            <div className="flex items-center gap-1.5 mb-1">
                              {marker.is_iati_standard ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">IATI</Badge>
                              ) : (
                                <Badge className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">Custom</Badge>
                              )}
                              <code className="text-xs px-1.5 py-0.5 bg-white/20 text-white/90 rounded font-mono">{getDisplayCode(marker)}</code>
                            </div>
                            <h2 className="text-sm font-bold text-white leading-tight">{marker.name}</h2>
                          </>
                        }
                      >
                        <div className="relative flex-1 p-5 flex flex-col bg-card">
                          {activityMarker.rationale ? (
                            <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                              {activityMarker.rationale}
                            </p>
                          ) : marker.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                              {marker.description}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 italic mb-3">No rationale provided</p>
                          )}
                          <div className="mt-auto pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                {activityMarker.significance}
                              </span>
                              <span className="text-sm font-medium truncate">{significanceLabel}</span>
                            </div>
                            {!readOnly && (
                              <div className="mt-2 flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(markerUuid)}
                                  className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                  aria-label={`Edit ${marker.name}`}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeMarker(markerUuid)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Remove ${marker.name}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardShell>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grouped table */
        <div className="rounded-md border w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '280px' }}>Policy Marker</TableHead>
                <TableHead style={{ width: '220px' }}>Significance</TableHead>
                <TableHead>Rationale</TableHead>
                {!readOnly && <TableHead style={{ width: '90px' }} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupTypes.map(type => {
                const markersInGroup = getActiveMarkersForType(type);
                if (markersInGroup.length === 0) return null;
                return (
                  <React.Fragment key={type}>
                    {/* Group header row */}
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={readOnly ? 3 : 4} className="py-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          {MARKER_TYPE_ICONS[type]}
                          {MARKER_TYPE_LABELS[type]}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Marker rows */}
                    {markersInGroup.map(({ marker, activityMarker }) => {
                      const markerUuid = marker.uuid || marker.id;
                      const effectiveVisibility = getEffectiveVisibility(marker, activityMarker);
                      return (
                        <TableRow key={markerUuid}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                {getDisplayCode(marker)}
                              </span>
                              <span className="font-medium text-sm">{marker.name}</span>
                              {!marker.is_iati_standard && (
                                <Badge variant="outline" className="text-xs">Custom</Badge>
                              )}
                              {!marker.is_iati_standard && (
                                <VisibilityIcon visibility={effectiveVisibility} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                {activityMarker.significance}
                              </span>
                              <span className="text-sm">
                                {getSignificanceLabel(marker.iati_code, activityMarker.significance)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {activityMarker.rationale ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{activityMarker.rationale}</p>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditModal(markerUuid)} className="hover:bg-blue-50 hover:text-blue-600">
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeMarker(markerUuid)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Policy Marker Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); setModalForm(INITIAL_MODAL_FORM); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b">
            <DialogTitle>{modalMode === 'add' ? 'Add Policy Marker' : 'Edit Policy Marker'}</DialogTitle>
            <DialogDescription>
              {modalMode === 'add'
                ? 'Select a policy marker and set its significance for this activity.'
                : 'Update the significance and rationale for this policy marker.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Marker Selection */}
            {modalMode === 'add' && !modalForm.isCreatingCustom && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Policy Marker <RequiredDot /></Label>
                  <HelpTextTooltip content="Select an IATI standard policy marker or a custom marker defined by your organisation. Policy markers identify whether an activity targets a particular policy objective such as gender equality, environment, or governance.">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HelpTextTooltip>
                </div>
                <Popover open={markerPopoverOpen} onOpenChange={setMarkerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between h-10 text-left px-3 py-2",
                        !modalForm.selectedMarkerId && "text-muted-foreground font-normal"
                      )}
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {modalForm.selectedMarkerId ? (
                          (() => {
                            const m = getSelectedMarkerForModal();
                            return m ? (
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                  {getDisplayCode(m)}
                                </span>
                                <span className="text-sm truncate">{m.name}</span>
                              </span>
                            ) : 'Select policy marker';
                          })()
                        ) : (
                          <span className="text-muted-foreground text-sm">Select policy marker</span>
                        )}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput placeholder="Search policy markers..." />
                      <CommandList>
                        <CommandEmpty>No policy markers found.</CommandEmpty>
                        {(['environmental', 'social_governance', 'other'] as const).map(type => {
                          const markers = availableMarkers.filter(m => m.marker_type === type && m.is_iati_standard);
                          if (markers.length === 0) return null;
                          return (
                            <CommandGroup key={type} heading={MARKER_TYPE_LABELS[type]}>
                              {markers.map(marker => {
                                const mUuid = marker.uuid || marker.id;
                                const isAlreadyAdded = selectedMarkers.has(mUuid);
                                return (
                                  <CommandItem
                                    key={mUuid}
                                    value={`${marker.code} ${marker.name}`}
                                    disabled={isAlreadyAdded}
                                    onSelect={() => {
                                      setModalForm(prev => ({ ...prev, selectedMarkerId: mUuid, significance: 1 }));
                                      setMarkerPopoverOpen(false);
                                    }}
                                    className={cn("flex items-center gap-3 px-4 py-2.5", isAlreadyAdded && "opacity-40")}
                                  >
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0 min-w-[28px] text-center">
                                      {marker.iati_code}
                                    </span>
                                    <span className="flex-1 text-sm">{marker.name}</span>
                                    {isAlreadyAdded && <span className="text-xs text-muted-foreground">(Added)</span>}
                                    {modalForm.selectedMarkerId === mUuid && <Check className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          );
                        })}

                        {/* Custom markers group */}
                        {availableMarkers.filter(m => !m.is_iati_standard).length > 0 && (
                          <CommandGroup heading="Custom Policy Markers">
                            {availableMarkers.filter(m => !m.is_iati_standard).map(marker => {
                              const mUuid = marker.uuid || marker.id;
                              const isAlreadyAdded = selectedMarkers.has(mUuid);
                              return (
                                <CommandItem
                                  key={mUuid}
                                  value={`${marker.code} ${marker.name}`}
                                  disabled={isAlreadyAdded}
                                  onSelect={() => {
                                    setModalForm(prev => ({ ...prev, selectedMarkerId: mUuid, significance: 1 }));
                                    setMarkerPopoverOpen(false);
                                  }}
                                  className={cn("flex items-center gap-3 px-4 py-2.5", isAlreadyAdded && "opacity-40")}
                                >
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0 min-w-[28px] text-center">
                                    {getDisplayCode(marker)}
                                  </span>
                                  <span className="flex-1 text-sm">{marker.name}</span>
                                  <Badge variant="outline" className="text-xs">Custom</Badge>
                                  {isAlreadyAdded && <span className="text-xs text-muted-foreground">(Added)</span>}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}

                        {/* Create custom marker option */}
                        <CommandGroup heading="">
                          <CommandItem
                            value="__create_custom__"
                            onSelect={() => {
                              setModalForm(prev => ({ ...prev, isCreatingCustom: true, selectedMarkerId: null }));
                              setMarkerPopoverOpen(false);
                            }}
                            className="px-4 py-2.5 text-sm text-primary font-medium"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create custom policy marker...
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Edit mode: show locked marker display */}
            {modalMode === 'edit' && modalForm.selectedMarkerId && (
              <div className="space-y-2">
                <Label>Policy Marker</Label>
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  {(() => {
                    const m = getSelectedMarkerForModal();
                    if (!m) return null;
                    return (
                      <>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {getDisplayCode(m)}
                        </span>
                        <span className="font-medium text-sm">{m.name}</span>
                        {!m.is_iati_standard && <Badge variant="outline" className="text-xs">Custom</Badge>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Custom marker creation fields */}
            {modalForm.isCreatingCustom && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">New Custom Marker</Label>
                  <Button variant="ghost" size="sm" onClick={() => setModalForm(prev => ({ ...prev, isCreatingCustom: false }))}>
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Name <RequiredDot /></Label>
                    <Input
                      value={modalForm.customName}
                      onChange={(e) => setModalForm(prev => ({ ...prev, customName: e.target.value }))}
                      placeholder="Marker name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Code <RequiredDot /></Label>
                    <Input
                      value={modalForm.customCode}
                      onChange={(e) => setModalForm(prev => ({ ...prev, customCode: e.target.value }))}
                      placeholder="Unique code"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={modalForm.customDescription}
                    onChange={(e) => setModalForm(prev => ({ ...prev, customDescription: e.target.value }))}
                    placeholder="Brief description"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={modalForm.customMarkerType} onValueChange={(value) => setModalForm(prev => ({ ...prev, customMarkerType: value as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="environmental">Environmental</SelectItem>
                        <SelectItem value="social_governance">Social & Governance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Visibility</Label>
                    <Select value={modalForm.customDefaultVisibility} onValueChange={(value) => setModalForm(prev => ({ ...prev, customDefaultVisibility: value as VisibilityLevel }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VISIBILITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <VisibilityIcon visibility={opt.value} />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Vocabulary Name</Label>
                    <Input
                      value={modalForm.customVocabularyName}
                      onChange={(e) => setModalForm(prev => ({ ...prev, customVocabularyName: e.target.value }))}
                      placeholder="Organization name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vocabulary URI</Label>
                    <Input
                      value={modalForm.customVocabularyUri}
                      onChange={(e) => setModalForm(prev => ({ ...prev, customVocabularyUri: e.target.value }))}
                      placeholder="http://example.com/vocab"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Significance */}
            {(modalForm.selectedMarkerId || modalForm.isCreatingCustom) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Significance <RequiredDot /></Label>
                  <HelpTextTooltip content="Indicates the degree to which the activity targets this policy objective. Typical values: 0 = not targeted, 1 = significant objective, 2 = principal objective. Some markers (e.g. RMNCH) use an extended 0–4 scale.">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HelpTextTooltip>
                </div>
                <Select
                  value={modalForm.significance.toString()}
                  onValueChange={(value) => setModalForm(prev => ({ ...prev, significance: parseInt(value) }))}
                >
                  <SelectTrigger>
                    {modalForm.significance >= 1 ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {modalForm.significance}
                        </span>
                        <span>
                          {getSignificanceLabel(
                            getSelectedMarkerForModal()?.iati_code === '9' ? '9' : '0',
                            modalForm.significance
                          )}
                        </span>
                      </span>
                    ) : (
                      <SelectValue placeholder="Select significance level" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const marker = getSelectedMarkerForModal();
                      const maxSig = marker ? getMaxSignificance(marker) : 4;
                      const isRMNCH = marker?.iati_code === '9';
                      const options = [];
                      for (let i = 1; i <= maxSig; i++) {
                        options.push(
                          <SelectItem key={i} value={i.toString()}>
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {i}
                              </span>
                              <span>{getSignificanceLabel(isRMNCH ? '9' : '0', i)}</span>
                            </span>
                          </SelectItem>
                        );
                      }
                      return options;
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rationale */}
            {(modalForm.selectedMarkerId || modalForm.isCreatingCustom) && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Rationale</Label>
                  <HelpTextTooltip content="Optional free-text explanation of why this significance level was chosen for the activity. Helps reviewers understand how the policy objective is addressed.">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HelpTextTooltip>
                </div>
                <Textarea
                  value={modalForm.rationale}
                  onChange={(e) => setModalForm(prev => ({ ...prev, rationale: e.target.value }))}
                  placeholder="Provide a short description or rationale for the selected significance..."
                  rows={3}
                />
              </div>
            )}

            {/* Visibility override (custom markers only, edit mode) */}
            {modalMode === 'edit' && (() => {
              const marker = getSelectedMarkerForModal();
              return marker && !marker.is_iati_standard;
            })() && (
              <div className="space-y-2">
                <Label>Visibility for this activity</Label>
                <Select
                  value={modalForm.visibility ?? 'default'}
                  onValueChange={(value) => setModalForm(prev => ({ ...prev, visibility: value === 'default' ? null : value as VisibilityLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Using default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <span className="text-muted-foreground">Use default</span>
                    </SelectItem>
                    {VISIBILITY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <VisibilityIcon visibility={opt.value} />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setModalOpen(false); setModalForm(INITIAL_MODAL_FORM); }}>
              Cancel
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={savingModal || (!modalForm.selectedMarkerId && !modalForm.isCreatingCustom) || modalForm.significance < 1}
            >
              {savingModal ? 'Saving...' : modalMode === 'add' ? 'Add Marker' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}
