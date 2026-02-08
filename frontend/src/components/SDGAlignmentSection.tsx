"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  CheckCircle,
  X,
  Target,
  ChevronRight,
  Sparkles,
  Zap,
  Circle,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SDG_GOALS, SDG_TARGETS, getTargetsForGoal } from "@/data/sdg-targets";
import { toast } from "sonner";
import { apiFetch } from '@/lib/api-fetch';
import SDGIconHover from "@/components/ui/SDGIconHover";

// Alignment strength types
type AlignmentStrength = 'primary' | 'secondary' | 'indirect';

interface SDGMapping {
  id?: string;
  sdgGoal: number;
  sdgTarget: string;
  contributionPercent?: number;
  notes?: string;
  alignmentStrength?: AlignmentStrength;
}

interface SDGAlignmentSectionProps {
  sdgMappings: SDGMapping[];
  onUpdate: (mappings: SDGMapping[]) => void;
  contributionMode?: 'simple' | 'percentage';
  canEdit?: boolean;
  activityId?: string;
}

const ALIGNMENT_OPTIONS: { value: AlignmentStrength; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'primary',
    label: 'Primary',
    description: 'Core focus of this activity',
    icon: <Sparkles className="h-4 w-4" />
  },
  {
    value: 'secondary',
    label: 'Secondary',
    description: 'Significant but not main focus',
    icon: <Zap className="h-4 w-4" />
  },
  {
    value: 'indirect',
    label: 'Indirect',
    description: 'Contributing benefit',
    icon: <Circle className="h-4 w-4" />
  },
];

// Helper to get SDG image URL
function getSDGImageURL(goalNumber: number): string {
  const paddedNumber = goalNumber.toString().padStart(2, '0');
  return `/images/sdg/E_SDG_Icons-${paddedNumber}.jpg`;
}

export default function SDGAlignmentSection({
  sdgMappings = [],
  onUpdate,
  contributionMode = 'simple',
  canEdit = true,
  activityId
}: SDGAlignmentSectionProps) {
  const [mappings, setMappings] = useState<SDGMapping[]>(sdgMappings);
  const [targetPopoverOpen, setTargetPopoverOpen] = useState<{ [key: number]: boolean }>({});

  // Save state tracking
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [savedMappings, setSavedMappings] = useState<SDGMapping[]>([]);

  // Get selected goal IDs
  const selectedGoalIds = useMemo(() => {
    return Array.from(new Set(mappings.map(m => m.sdgGoal)));
  }, [mappings]);

  // Debounced save function
  const debouncedSave = async (updatedMappings: SDGMapping[]) => {
    if (!activityId || !canEdit) return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const response = await apiFetch(`/api/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdgMappings: updatedMappings })
        });

        if (response.ok) {
          setLastSaved(new Date());
          setSavedMappings([...updatedMappings]);
          toast.success('SDG mappings saved', {
            position: 'top-center',
            duration: 2000
          });
        } else {
          throw new Error('Failed to save SDG mappings');
        }
      } catch (error) {
        console.error('Error saving SDG mappings:', error);
        toast.error('Failed to save SDG mappings', { position: 'top-center' });
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    setSaveTimeout(timeout);
  };

  // Update parent and trigger save when mappings change
  useEffect(() => {
    onUpdate(mappings);
    if (hasUserEdited && mappings.length > 0 && mappings.some(m => m.sdgGoal)) {
      debouncedSave(mappings);
    }
  }, [mappings, activityId, hasUserEdited]);

  // Initialize from props
  useEffect(() => {
    setMappings(sdgMappings);
    setSavedMappings([...sdgMappings]);
  }, [sdgMappings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const toggleGoal = (goalId: number) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    if (selectedGoalIds.includes(goalId)) {
      // Remove goal and all its mappings
      setMappings(mappings.filter(m => m.sdgGoal !== goalId));
    } else {
      // Add goal with default mapping
      const newMapping: SDGMapping = {
        sdgGoal: goalId,
        sdgTarget: '',
        alignmentStrength: 'primary',
        notes: ''
      };
      setMappings([...mappings, newMapping]);
    }
  };

  const addTarget = (goalId: number, targetId: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    const exists = mappings.find(m => m.sdgGoal === goalId && m.sdgTarget === targetId);
    if (!exists) {
      const newMapping: SDGMapping = {
        sdgGoal: goalId,
        sdgTarget: targetId,
        alignmentStrength: 'secondary',
        notes: ''
      };
      setMappings([...mappings, newMapping]);
    }
    setTargetPopoverOpen({ ...targetPopoverOpen, [goalId]: false });
  };

  const removeTarget = (goalId: number, targetId: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);
    setMappings(mappings.filter(m => !(m.sdgGoal === goalId && m.sdgTarget === targetId)));
  };

  const updateAlignmentStrength = (goalId: number, strength: AlignmentStrength) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    setMappings(mappings.map(m =>
      m.sdgGoal === goalId && m.sdgTarget === ''
        ? { ...m, alignmentStrength: strength }
        : m
    ));
  };

  const updateGoalNotes = (goalId: number, notes: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    setMappings(mappings.map(m =>
      m.sdgGoal === goalId && m.sdgTarget === ''
        ? { ...m, notes }
        : m
    ));
  };

  const getGoalMapping = (goalId: number) => {
    return mappings.find(m => m.sdgGoal === goalId && m.sdgTarget === '');
  };

  const getGoalTargetMappings = (goalId: number) => {
    return mappings.filter(m => m.sdgGoal === goalId && m.sdgTarget !== '');
  };

  const isGoalSaved = (goalId: number): boolean => {
    const currentGoalMappings = mappings.filter(m => m.sdgGoal === goalId);
    const savedGoalMappings = savedMappings.filter(m => m.sdgGoal === goalId);

    if (currentGoalMappings.length === 0) {
      return savedGoalMappings.length === 0;
    }

    return currentGoalMappings.length === savedGoalMappings.length &&
           currentGoalMappings.every(current =>
             savedGoalMappings.some(saved =>
               saved.sdgGoal === current.sdgGoal &&
               saved.sdgTarget === current.sdgTarget &&
               saved.alignmentStrength === current.alignmentStrength &&
               saved.notes === current.notes
             )
           );
  };

  return (
    <div className="space-y-6">
      {/* Header with save status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            SDG Alignment
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select the Sustainable Development Goals this activity contributes to
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGoalIds.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {selectedGoalIds.length} SDG{selectedGoalIds.length !== 1 ? 's' : ''} selected
            </Badge>
          )}
          {isSaving && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
          {!isSaving && lastSaved && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
        </div>
      </div>

      {/* SDG Selection Grid - Full Width with Larger Icons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Click to select SDGs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-17 gap-3">
            {SDG_GOALS.map(goal => {
              const isSelected = selectedGoalIds.includes(goal.id);
              return (
                <TooltipProvider key={goal.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        disabled={!canEdit}
                        className={cn(
                          "relative aspect-square rounded-lg border-2 transition-all hover:scale-105 overflow-visible",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 shadow-lg"
                            : "border-gray-200 hover:border-gray-300",
                          !canEdit && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <SDGIconHover
                          src={getSDGImageURL(goal.id)}
                          alt={`SDG ${goal.id}: ${goal.name}`}
                          selected={isSelected}
                          className="w-full h-full rounded-md"
                        />
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1 shadow-md z-10">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">Goal {goal.id}: {goal.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected SDGs - 2-Column Grid of Cards */}
      {selectedGoalIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Configure selected SDGs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selectedGoalIds.sort((a, b) => a - b).map(goalId => {
                const goal = SDG_GOALS.find(g => g.id === goalId)!;
                const goalMapping = getGoalMapping(goalId);
                const goalTargets = getTargetsForGoal(goalId);
                const selectedTargets = getGoalTargetMappings(goalId);
                const isSaved = isGoalSaved(goalId);

                return (
                  <Card
                    key={goalId}
                    className="overflow-hidden"
                    style={{ borderLeftColor: goal.color, borderLeftWidth: '4px' }}
                  >
                    <CardContent className="p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <img
                            src={getSDGImageURL(goalId)}
                            alt={`SDG ${goalId}: ${goal.name}`}
                            className="w-14 h-14 rounded-md shadow-sm flex-shrink-0"
                          />
                          <div className="pt-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-base">Goal {goalId}</span>
                              {isSaved && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{goal.name}</p>
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGoal(goalId)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Alignment Strength Dropdown */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Alignment Strength
                        </label>
                        <Select
                          value={goalMapping?.alignmentStrength || 'primary'}
                          onValueChange={(value) => updateAlignmentStrength(goalId, value as AlignmentStrength)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select alignment strength" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALIGNMENT_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  {option.icon}
                                  <span>{option.label}</span>
                                  <span className="text-muted-foreground text-xs">- {option.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Specific Targets - Searchable Combobox */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Specific Targets <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <Popover
                          open={targetPopoverOpen[goalId]}
                          onOpenChange={(open) => setTargetPopoverOpen({ ...targetPopoverOpen, [goalId]: open })}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={targetPopoverOpen[goalId]}
                              className="w-full justify-between font-normal"
                              disabled={!canEdit}
                            >
                              <span className="text-muted-foreground">
                                {selectedTargets.length > 0
                                  ? `${selectedTargets.length} target${selectedTargets.length !== 1 ? 's' : ''} selected`
                                  : 'Search and add targets...'}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[500px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search targets..." />
                              <CommandList className="max-h-72">
                                <CommandEmpty>No target found.</CommandEmpty>
                                <CommandGroup>
                                  {goalTargets.map(target => {
                                    const isSelected = selectedTargets.some(m => m.sdgTarget === target.id);
                                    return (
                                      <CommandItem
                                        key={target.id}
                                        onSelect={() => {
                                          if (!isSelected) {
                                            addTarget(goalId, target.id);
                                          }
                                        }}
                                        className={cn(isSelected && "opacity-50")}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4 flex-shrink-0",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm">Target {target.id}</div>
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            {target.description}
                                          </div>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* Selected Targets Display */}
                        {selectedTargets.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {selectedTargets.map(mapping => {
                              const target = SDG_TARGETS.find(t => t.id === mapping.sdgTarget);
                              return target ? (
                                <div
                                  key={target.id}
                                  className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 rounded-md text-sm"
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <span className="font-medium">Target {target.id}:</span>{' '}
                                      <span className="text-gray-600">{target.description}</span>
                                    </div>
                                  </div>
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTarget(goalId, target.id)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          How does this activity contribute?
                        </label>
                        <Textarea
                          value={goalMapping?.notes || ''}
                          onChange={(e) => updateGoalNotes(goalId, e.target.value)}
                          placeholder="Briefly describe the contribution..."
                          className="resize-none"
                          rows={2}
                          disabled={!canEdit}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {selectedGoalIds.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No SDGs selected</p>
          <p className="text-sm">Click on the SDG icons above to get started</p>
        </div>
      )}
    </div>
  );
}
