"use client"

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Check,
  CheckCircle,
  X,
  Target,
  Sparkles,
  Zap,
  Circle,
  Loader2,
  Pencil,
  Trash2,
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
  const [modalGoalId, setModalGoalId] = useState<number | null>(null);
  const [targetSearch, setTargetSearch] = useState('');

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

    if (selectedGoalIds.includes(goalId)) {
      // Already selected — open the modal to edit
      setModalGoalId(goalId);
    } else {
      // Add goal with default mapping, then open modal
      setHasUserEdited(true);
      const newMapping: SDGMapping = {
        sdgGoal: goalId,
        sdgTarget: '',
        alignmentStrength: 'primary',
        notes: ''
      };
      setMappings(prev => [...prev, newMapping]);
      setModalGoalId(goalId);
    }
  };

  const removeGoal = (goalId: number) => {
    if (!canEdit) return;
    setHasUserEdited(true);
    setMappings(prev => prev.filter(m => m.sdgGoal !== goalId));
    if (modalGoalId === goalId) setModalGoalId(null);
  };

  const addTarget = (goalId: number, targetId: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    setMappings(prev => {
      const exists = prev.find(m => m.sdgGoal === goalId && m.sdgTarget === targetId);
      if (exists) return prev;
      const newMapping: SDGMapping = {
        sdgGoal: goalId,
        sdgTarget: targetId,
        alignmentStrength: 'secondary',
        notes: ''
      };
      return [...prev, newMapping];
    });
    setTargetPopoverOpen({ ...targetPopoverOpen, [goalId]: false });
  };

  const removeTarget = (goalId: number, targetId: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);
    setMappings(prev => prev.filter(m => !(m.sdgGoal === goalId && m.sdgTarget === targetId)));
  };

  const updateAlignmentStrength = (goalId: number, strength: AlignmentStrength) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    setMappings(prev => prev.map(m =>
      m.sdgGoal === goalId && m.sdgTarget === ''
        ? { ...m, alignmentStrength: strength }
        : m
    ));
  };

  const updateGoalNotes = (goalId: number, notes: string) => {
    if (!canEdit) return;
    setHasUserEdited(true);

    setMappings(prev => prev.map(m =>
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

      {/* Selected SDGs Summary Table */}
      {selectedGoalIds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selected SDGs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SDG</TableHead>
                  <TableHead>Alignment</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Notes</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGoalIds.sort((a, b) => a - b).map(goalId => {
                  const goal = SDG_GOALS.find(g => g.id === goalId)!;
                  const goalMapping = getGoalMapping(goalId);
                  const selectedTargets = getGoalTargetMappings(goalId);
                  const alignmentOption = ALIGNMENT_OPTIONS.find(o => o.value === (goalMapping?.alignmentStrength || 'primary'));

                  return (
                    <TableRow
                      key={goalId}
                      className="cursor-pointer"
                      onClick={() => setModalGoalId(goalId)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={getSDGImageURL(goalId)}
                            alt={`SDG ${goalId}`}
                            className="w-10 h-10 rounded flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-medium">Goal {goalId}</span>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{goal.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 font-normal">
                          {alignmentOption?.icon}
                          {alignmentOption?.label || 'Primary'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {selectedTargets.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedTargets.map(m => (
                              <Badge key={m.sdgTarget} variant="secondary" className="text-xs">
                                {m.sdgTarget}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm truncate block max-w-[200px]">
                          {goalMapping?.notes || '—'}
                        </span>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setModalGoalId(goalId); }}
                              className="hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); removeGoal(goalId); }}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SDG Configuration Modal */}
      {modalGoalId !== null && (() => {
        const goalId = modalGoalId;
        const goal = SDG_GOALS.find(g => g.id === goalId);
        if (!goal) return null;
        const goalMapping = getGoalMapping(goalId);
        const goalTargets = getTargetsForGoal(goalId);
        const selectedTargets = getGoalTargetMappings(goalId);

        return (
          <Dialog open={true} onOpenChange={(open) => { if (!open) setModalGoalId(null); }}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <img
                    src={getSDGImageURL(goalId)}
                    alt={`SDG ${goalId}: ${goal.name}`}
                    className="w-12 h-12 rounded-md shadow-sm flex-shrink-0"
                  />
                  <div>
                    <DialogTitle>Goal {goalId}: {goal.name}</DialogTitle>
                    <DialogDescription>
                      Configure alignment details for this SDG
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Alignment Strength */}
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
                      <span>
                        {ALIGNMENT_OPTIONS.find(o => o.value === (goalMapping?.alignmentStrength || 'primary'))?.label || 'Select alignment strength'}
                      </span>
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

                {/* Specific Targets */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Specific Targets
                  </label>
                  <Popover
                    open={targetPopoverOpen[goalId]}
                    onOpenChange={(open) => {
                      setTargetPopoverOpen({ ...targetPopoverOpen, [goalId]: open });
                      if (!open) setTargetSearch('');
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={targetPopoverOpen[goalId]}
                        className="w-full justify-start font-normal h-auto min-h-10 py-2"
                        disabled={!canEdit}
                      >
                        {selectedTargets.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedTargets.map(mapping => (
                              <Badge
                                key={mapping.sdgTarget}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                              >
                                {mapping.sdgTarget}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTarget(goalId, mapping.sdgTarget);
                                    }}
                                    className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search and add targets...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search targets..."
                          value={targetSearch}
                          onValueChange={setTargetSearch}
                          autoFocus
                        />
                        <CommandList className="max-h-72">
                          {(() => {
                            const query = targetSearch.toLowerCase().trim();
                            const filtered = query
                              ? goalTargets.filter(t => {
                                  const searchable = `target ${t.id} ${t.id} ${t.description} ${t.text || ''}`.toLowerCase();
                                  return searchable.includes(query);
                                })
                              : goalTargets;
                            if (filtered.length === 0) {
                              return <CommandEmpty>No target found.</CommandEmpty>;
                            }
                            return (
                              <CommandGroup>
                                {filtered.map(target => {
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
                            );
                          })()}
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
                    rows={3}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between pt-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoal(goalId)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Remove SDG
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setModalGoalId(null)}
                  className={cn(!canEdit && "ml-auto")}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

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
