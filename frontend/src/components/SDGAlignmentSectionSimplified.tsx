"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronsUpDown, 
  X, 
  Plus,
  Target,
  Globe,
  ChevronDown,
  ChevronRight,
  Info,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SDG_GOALS, SDG_TARGETS, getTargetsForGoal } from "@/data/sdg-targets";
import { SDGImageGrid } from "@/components/ui/SDGImageGrid";
import { toast } from "sonner";

interface SDGMapping {
  id?: string;
  sdgGoal: number;
  sdgTarget: string;
  contributionPercent?: number;
  notes?: string;
}

interface SDGAlignmentSectionProps {
  sdgMappings: SDGMapping[];
  onUpdate: (mappings: SDGMapping[]) => void;
  contributionMode?: 'simple' | 'percentage';
  canEdit?: boolean;
  activityId?: string;
}

export default function SDGAlignmentSectionSimplified({ 
  sdgMappings = [], 
  onUpdate,
  contributionMode = 'simple',
  canEdit = true,
  activityId
}: SDGAlignmentSectionProps) {
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);
  const [mappings, setMappings] = useState<SDGMapping[]>(sdgMappings);
  const [expandedGoals, setExpandedGoals] = useState<{ [key: number]: boolean }>({});
  const [targetSearchOpen, setTargetSearchOpen] = useState<{ [key: number]: boolean }>({});
  
  // Save state tracking
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  // Debounced save function
  const debouncedSave = async (updatedMappings: SDGMapping[]) => {
    if (!activityId || !canEdit) return;
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdgMappings: updatedMappings })
        });
        
        if (response.ok) {
          setLastSaved(new Date());
          toast.success('SDG mappings saved successfully', { 
            position: 'top-right',
            duration: 2000 
          });
        } else {
          throw new Error('Failed to save SDG mappings');
        }
      } catch (error) {
        console.error('Error saving SDG mappings:', error);
        toast.error('Failed to save SDG mappings', { position: 'top-right' });
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  // Update parent and trigger save when mappings change
  useEffect(() => {
    onUpdate(mappings);
    // Only save when user has made edits (not on initial load)
    if (hasUserEdited && mappings.length > 0) {
      debouncedSave(mappings);
    }
  }, [mappings, activityId, hasUserEdited]);

  // Initialize selected goals from existing mappings
  useEffect(() => {
    const goals = Array.from(new Set(sdgMappings.map(m => m.sdgGoal)));
    setSelectedGoals(goals);
    setMappings(sdgMappings);
    
    // Auto-expand goals that have targets
    const initialExpanded: { [key: number]: boolean } = {};
    goals.forEach(goalId => {
      const hasTargets = sdgMappings.some(m => m.sdgGoal === goalId && m.sdgTarget);
      initialExpanded[goalId] = hasTargets;
    });
    setExpandedGoals(initialExpanded);
    setHasInitialized(true);
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

    if (selectedGoals.includes(goalId)) {
      // Remove goal and all its mappings
      setSelectedGoals(selectedGoals.filter(g => g !== goalId));
      setMappings(mappings.filter(m => m.sdgGoal !== goalId));
      setExpandedGoals(prev => ({ ...prev, [goalId]: false }));
    } else {
      // Add goal and auto-expand
      setSelectedGoals([...selectedGoals, goalId]);
      setExpandedGoals(prev => ({ ...prev, [goalId]: true }));
    }
  };

  const toggleGoalExpansion = (goalId: number) => {
    setExpandedGoals(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const addTargetMapping = (goalId: number, targetId: string) => {
    if (!canEdit) return;

    setHasUserEdited(true);

    // Check if this target is already mapped
    const exists = mappings.find(m => m.sdgGoal === goalId && m.sdgTarget === targetId);
    if (exists) return;

    // Create new mapping
    const newMapping: SDGMapping = {
      sdgGoal: goalId,
      sdgTarget: targetId,
      contributionPercent: contributionMode === 'percentage' ? 0 : undefined,
      notes: ''
    };
    
    setMappings([...mappings, newMapping]);
  };

  const removeTargetMapping = (goalId: number, targetId: string) => {
    if (!canEdit) return;
    
    setHasUserEdited(true);
    setMappings(mappings.filter(m => !(m.sdgGoal === goalId && m.sdgTarget === targetId)));
  };

  const getGoalTargetMappings = (goalId: number) => {
    return mappings.filter(m => m.sdgGoal === goalId && m.sdgTarget !== '');
  };

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Save indicator component
  const SaveIndicator = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-1 text-orange-600">
          <div className="animate-spin h-3 w-3 border border-orange-600 border-t-transparent rounded-full"></div>
          <span className="text-xs">Saving...</span>
        </div>
      );
    }
    
    if (lastSaved) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">Saved {formatTimeAgo(lastSaved)}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* SDG Goals Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sustainable Development Goals
            </div>
            <SaveIndicator />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {SDG_GOALS.map(goal => (
              <TooltipProvider key={goal.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleGoal(goal.id)}
                      disabled={!canEdit}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 transition-all hover:scale-105 overflow-hidden bg-white",
                        selectedGoals.includes(goal.id)
                          ? "border-primary ring-2 ring-primary/20 shadow-lg"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="w-full h-full p-1">
                        <SDGImageGrid 
                          sdgCodes={[goal.id]} 
                          size="md"
                          showTooltips={false}
                          className="w-full h-full"
                        />
                        {selectedGoals.includes(goal.id) && (
                          <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-0.5 shadow-lg">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      <p className="font-semibold">Goal {goal.id}: {goal.name}</p>
                      <p className="max-w-xs text-sm">{goal.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Goals with Inline Target Selection */}
      {selectedGoals.length > 0 && (
        <div className="space-y-4">
          {selectedGoals.map(goalId => {
            const goal = SDG_GOALS.find(g => g.id === goalId)!;
            const goalTargets = getTargetsForGoal(goalId);
            const goalTargetMappings = getGoalTargetMappings(goalId);
            const isExpanded = expandedGoals[goalId];

            return (
              <Card key={goalId} className="border-l-4" style={{ borderLeftColor: goal.color }}>
                <CardContent className="p-4">
                  {/* Goal Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0">
                        <SDGImageGrid 
                          sdgCodes={[goal.id]} 
                          size="lg"
                          showTooltips={false}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">Goal {goal.id}: {goal.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {goalTargetMappings.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {goalTargetMappings.length} target{goalTargetMappings.length !== 1 ? 's' : ''} selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goalTargetMappings.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGoalExpansion(goalId)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGoal(goalId)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Add Target Dropdown */}
                  {canEdit && (
                    <div className="mb-3">
                      <Popover open={targetSearchOpen[goalId]} onOpenChange={(open: boolean) => 
                        setTargetSearchOpen({ ...targetSearchOpen, [goalId]: open })
                      }>
                        <PopoverTrigger 
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 justify-start w-full max-w-sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Target
                          <ChevronsUpDown className="ml-auto h-4 w-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[500px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search targets..." />
                            <CommandList>
                              <CommandEmpty>No target found.</CommandEmpty>
                              <CommandGroup>
                                {goalTargets.map(target => {
                                  const isSelected = goalTargetMappings.find(m => m.sdgTarget === target.id);
                                  return (
                                    <CommandItem
                                      key={target.id}
                                      onSelect={() => {
                                        if (!isSelected) {
                                          addTargetMapping(goalId, target.id);
                                        }
                                        setTargetSearchOpen({ ...targetSearchOpen, [goalId]: false });
                                      }}
                                      className={cn(isSelected && "opacity-50")}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          Target {target.id} – {target.text}
                                        </div>
                                      </div>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Eye className="h-4 w-4 text-muted-foreground ml-2" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-md">
                                            <p>{target.description}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Selected Targets - Collapsible */}
                  {goalTargetMappings.length > 0 && (
                    <div className={cn("space-y-2", !isExpanded && goalTargetMappings.length > 3 && "max-h-20 overflow-hidden")}>
                      {goalTargetMappings.map(mapping => {
                        const target = SDG_TARGETS.find(t => t.id === mapping.sdgTarget);
                        if (!target) return null;
                        
                        return (
                          <div key={mapping.sdgTarget} className="flex items-center justify-between gap-2">
                            <Badge variant="secondary" className="flex-1 justify-start max-w-none">
                              <span className="font-mono text-xs mr-2">{target.id}</span>
                              <span className="truncate">{target.text}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground ml-2 flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md">
                                    <p><strong>Target {target.id}:</strong> {target.text}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{target.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Badge>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTargetMapping(goalId, mapping.sdgTarget)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Show expand/collapse for long lists */}
                      {goalTargetMappings.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGoalExpansion(goalId)}
                          className="w-full mt-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4 mr-2" />
                              Show All {goalTargetMappings.length} Targets
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {selectedGoals.length === 0 && (
        <Card className="opacity-50">
          <CardContent className="text-center py-12">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No SDGs Selected</h3>
            <p className="text-muted-foreground">
              Select Sustainable Development Goals above to map this activity's alignment and contribution.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}