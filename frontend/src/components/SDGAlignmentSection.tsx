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
  ChevronsUpDown, 
  X, 
  AlertCircle,
  Plus,
  Target,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SDG_GOALS, SDG_TARGETS, getTargetsForGoal } from "@/data/sdg-targets";

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
}

export default function SDGAlignmentSection({ 
  sdgMappings = [], 
  onUpdate,
  contributionMode = 'simple',
  canEdit = true
}: SDGAlignmentSectionProps) {
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);
  const [mappings, setMappings] = useState<SDGMapping[]>(sdgMappings);
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null);
  const [targetSearchOpen, setTargetSearchOpen] = useState<{ [key: number]: boolean }>({});

  // Calculate total contribution percentage
  const totalContribution = mappings.reduce((sum, m) => sum + (m.contributionPercent || 0), 0);
  const isValidContribution = contributionMode === 'simple' || totalContribution === 100;

  // Update parent when mappings change
  useEffect(() => {
    onUpdate(mappings);
  }, [mappings]);

  // Initialize selected goals from existing mappings
  useEffect(() => {
    const goals = Array.from(new Set(sdgMappings.map(m => m.sdgGoal)));
    setSelectedGoals(goals);
    setMappings(sdgMappings);
  }, [sdgMappings]);

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
    }
  };

  const addTargetMapping = (goalId: number, targetId: string) => {
    if (!canEdit) return;

    // Check if this target is already mapped
    const exists = mappings.find(m => m.sdgGoal === goalId && m.sdgTarget === targetId);
    if (exists) return;

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
    
    setMappings(mappings.filter(m => !(m.sdgGoal === goalId && m.sdgTarget === targetId)));
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

  return (
    <div className="space-y-6">
      {/* SDG Goals Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Select Sustainable Development Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {SDG_GOALS.map(goal => (
              <TooltipProvider key={goal.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleGoal(goal.id)}
                      disabled={!canEdit}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 transition-all hover:scale-105",
                        selectedGoals.includes(goal.id)
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-gray-200 hover:border-gray-300",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                      style={{
                        backgroundColor: selectedGoals.includes(goal.id) ? goal.color + '20' : 'white'
                      }}
                    >
                      <div className="p-2 h-full flex flex-col items-center justify-center">
                        <div 
                          className="text-2xl font-bold rounded-full w-12 h-12 flex items-center justify-center text-white mb-1"
                          style={{ backgroundColor: goal.color }}
                        >
                          {goal.id}
                        </div>
                        <div className="text-xs text-center line-clamp-2">
                          {goal.name}
                        </div>
                        {selectedGoals.includes(goal.id) && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{goal.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Goals and Targets */}
      {selectedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              SDG Targets Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedGoals.map(goalId => {
              const goal = SDG_GOALS.find(g => g.id === goalId)!;
              const goalTargets = getTargetsForGoal(goalId);
              const goalMappings = getGoalMappings(goalId);

              return (
                <div key={goalId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="text-lg font-bold rounded-full w-10 h-10 flex items-center justify-center text-white"
                        style={{ backgroundColor: goal.color }}
                      >
                        {goal.id}
                      </div>
                      <div>
                        <h4 className="font-semibold">{goal.name}</h4>
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
                    <div className="flex items-center gap-2">
                      <Popover open={targetSearchOpen[goalId]} onOpenChange={(open: boolean) => 
                        setTargetSearchOpen({ ...targetSearchOpen, [goalId]: open })
                      }>
                        <PopoverTrigger
                          className="justify-between"
                          disabled={!canEdit}
                        >
                          <span>Add Target</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
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
                                        goalMappings.find(m => m.sdgTarget === target.id)
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
                    {goalMappings.length > 0 && (
                      <div className="space-y-2">
                        {goalMappings.map(mapping => {
                          const target = SDG_TARGETS.find(t => t.id === mapping.sdgTarget)!;
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
            })}
          </CardContent>
        </Card>
      )}

      {/* Contribution Summary (for percentage mode) */}
      {contributionMode === 'percentage' && mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contribution Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Contribution:</span>
                <span className={cn(
                  "font-bold",
                  totalContribution === 100 ? "text-green-600" : "text-red-600"
                )}>
                  {totalContribution}%
                </span>
              </div>
              <Progress value={totalContribution} max={100} className="h-2" />
              {!isValidContribution && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total contribution must equal 100%. Currently at {totalContribution}%.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary of Selected SDGs */}
      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>SDG Alignment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedGoals.map(goalId => {
                const goal = SDG_GOALS.find(g => g.id === goalId)!;
                const goalMappings = getGoalMappings(goalId);
                
                return (
                  <div key={goalId} className="flex items-start gap-3">
                    <Badge style={{ backgroundColor: goal.color }} className="text-white">
                      SDG {goal.id}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{goal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {goalMappings.length} target{goalMappings.length !== 1 ? 's' : ''} selected
                        {contributionMode === 'percentage' && (
                          <span className="ml-2">
                            ({goalMappings.reduce((sum, m) => sum + (m.contributionPercent || 0), 0)}% contribution)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 