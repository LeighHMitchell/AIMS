"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertCircle,
  Plus,
  Target,
  Globe
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
  contributionMode?: 'simple' | 'percentage'; // Default to 'simple'
  canEdit?: boolean;
  activityId?: string; // For saving to backend
}

export default function SDGAlignmentSection({ 
  sdgMappings = [], 
  onUpdate,
  contributionMode = 'simple',
  canEdit = true,
  activityId
}: SDGAlignmentSectionProps) {
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);
  const [mappings, setMappings] = useState<SDGMapping[]>(sdgMappings);
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [targetSearchOpen, setTargetSearchOpen] = useState<{ [key: number]: boolean }>({});
  
  // Save state tracking
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate total contribution percentage
  const totalContribution = mappings.reduce((sum, m) => sum + (m.contributionPercent || 0), 0);
  const isValidContribution = contributionMode === 'simple' || totalContribution === 100;

  // Debounced save function
  const debouncedSave = async (updatedMappings: SDGMapping[]) => {
    if (!activityId || !canEdit) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for debounced save
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
    }, 1000); // 1 second debounce
    
    setSaveTimeout(timeout);
  };

  // Update parent and trigger save when mappings change
  useEffect(() => {
    onUpdate(mappings);
    if (mappings.length > 0) {
      debouncedSave(mappings);
    }
  }, [mappings, activityId]);

  // Initialize selected goals from existing mappings
  useEffect(() => {
    const goals = Array.from(new Set(sdgMappings.map(m => m.sdgGoal)));
    setSelectedGoals(goals);
    setMappings(sdgMappings);
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

    if (selectedGoals.includes(goalId)) {
      // Remove goal and all its mappings
      setSelectedGoals(selectedGoals.filter(g => g !== goalId));
      setMappings(mappings.filter(m => m.sdgGoal !== goalId));
      if (expandedGoal === goalId) setExpandedGoal(null);
    } else {
      // Add goal
      setSelectedGoals([...selectedGoals, goalId]);
      setExpandedGoal(goalId);
      
      // Don't create a mapping yet - wait until a target is selected
      // This avoids the database constraint issue
    }
  };

  const addTargetMapping = (goalId: number, targetId: string) => {
    if (!canEdit) return;

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
    
    // Simply remove the target mapping
    setMappings(mappings.filter(m => !(m.sdgGoal === goalId && m.sdgTarget === targetId)));
    
    // Note: The goal remains selected in selectedGoals even if all targets are removed
  };

  const updateMappingContribution = (goalId: number, targetId: string, percent: number) => {
    if (!canEdit) return;

    setMappings(mappings.map(m => 
      m.sdgGoal === goalId && m.sdgTarget === targetId 
        ? { ...m, contributionPercent: percent }
        : m
    ));
  };

  const updateMappingNotes = (goalId: number, targetId: string, notes: string) => {
    if (!canEdit) return;

    setMappings(mappings.map(m => 
      m.sdgGoal === goalId && m.sdgTarget === targetId 
        ? { ...m, notes }
        : m
    ));
  };

  const getGoalMappings = (goalId: number) => {
    return mappings.filter(m => m.sdgGoal === goalId);
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

  // Success indicator component
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - SDG Goals Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Select Sustainable Development Goals
            </div>
            <SaveIndicator />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
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
                      <div className="w-full h-full p-2">
                        <SDGImageGrid 
                          sdgCodes={[goal.id]} 
                          size="xl"
                          showTooltips={false}
                          className="w-full h-full"
                        />
                        {selectedGoals.includes(goal.id) && (
                          <div className="absolute bottom-2 right-2 bg-blue-600 rounded-full p-1 shadow-lg">
                            <Check className="h-4 w-4 text-white" />
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

      {/* Right Column - Selected Goals and Targets */}
      <Card className={selectedGoals.length === 0 ? "opacity-50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                SDG Targets Selection
              </div>
              <SaveIndicator />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedGoals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select SDGs from the left to configure targets</p>
              </div>
            ) : (
              selectedGoals.map(goalId => {
              const goal = SDG_GOALS.find(g => g.id === goalId)!;
              const goalTargets = getTargetsForGoal(goalId);
              const goalTargetMappings = getGoalTargetMappings(goalId);

              return (
                <div key={goalId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16">
                        <SDGImageGrid 
                          sdgCodes={[goal.id]} 
                          size="lg"
                          showTooltips={false}
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold">Goal {goal.id}: {goal.name}</h4>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGoal(goalId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Popover open={targetSearchOpen[goalId]} onOpenChange={(open: boolean) => 
                        setTargetSearchOpen({ ...targetSearchOpen, [goalId]: open })
                      }>
                        <PopoverTrigger
                          className="justify-between w-full"
                          disabled={!canEdit}
                        >
                          <span>Add Target</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[600px] p-0">
                          <Command>
                            <CommandInput placeholder="Search targets..." />
                            <CommandList>
                              <CommandEmpty>No target found.</CommandEmpty>
                              <CommandGroup>
                                {goalTargets.map(target => (
                                  <CommandItem
                                    key={target.id}
                                    onSelect={() => {
                                      addTargetMapping(goalId, target.id);
                                      setTargetSearchOpen({ ...targetSearchOpen, [goalId]: false });
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        goalTargetMappings.find(m => m.sdgTarget === target.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">{target.id} - {target.text}</div>
                                      <div className="text-xs text-muted-foreground line-clamp-2">
                                        {target.description}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Selected Targets */}
                    {goalTargetMappings.length > 0 && (
                      <div className="space-y-2">
                        {goalTargetMappings.map(mapping => {
                          // Skip rendering goal-only mappings (empty targets)
                          if (!mapping.sdgTarget) return null;
                          
                          const target = SDG_TARGETS.find(t => t.id === mapping.sdgTarget);
                          if (!target) return null;
                          
                          return (
                            <div key={mapping.sdgTarget} className="border rounded p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    Target {target.id}: {target.text}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {target.description}
                                  </div>
                                </div>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTargetMapping(goalId, mapping.sdgTarget)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {contributionMode === 'percentage' && (
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium">Contribution %:</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={mapping.contributionPercent || 0}
                                    onChange={(e) => updateMappingContribution(
                                      goalId, 
                                      mapping.sdgTarget, 
                                      Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                    )}
                                    className="w-20"
                                    disabled={!canEdit}
                                  />
                                </div>
                              )}

                              <div>
                                <label className="text-sm font-medium">Notes (optional):</label>
                                <Textarea
                                  value={mapping.notes || ''}
                                  onChange={(e) => updateMappingNotes(goalId, mapping.sdgTarget, e.target.value)}
                                  placeholder="Add any specific notes about this target alignment..."
                                  className="mt-1"
                                  rows={2}
                                  disabled={!canEdit}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
            )}
          </CardContent>
        </Card>

    </div>
  );
} 