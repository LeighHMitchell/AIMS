"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  NationalPriority,
  ActivityNationalPriority,
  flattenPriorityTree,
  buildPriorityTree,
} from "@/types/national-priorities";

interface NationalPrioritiesSectionProps {
  activityId: string;
  disabled?: boolean;
  onChange?: () => void;
}

export function NationalPrioritiesSection({
  activityId,
  disabled = false,
  onChange,
}: NationalPrioritiesSectionProps) {
  const [allocations, setAllocations] = useState<ActivityNationalPriority[]>([]);
  const [availablePriorities, setAvailablePriorities] = useState<NationalPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<ActivityNationalPriority | null>(null);
  
  // Form state for adding new allocation
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>("");
  const [percentage, setPercentage] = useState<string>("100");

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchAllocations = useCallback(async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/national-priorities`);
      const result = await response.json();
      
      if (result.success) {
        setAllocations(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
    }
  }, [activityId]);

  const fetchPriorities = useCallback(async () => {
    try {
      const response = await fetch("/api/national-priorities?asTree=false");
      const result = await response.json();
      
      if (result.success) {
        setAvailablePriorities(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching priorities:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAllocations(), fetchPriorities()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAllocations, fetchPriorities]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const isValid = totalPercentage === 100 || allocations.length === 0;
  const isOverAllocated = totalPercentage > 100;
  const remainingPercentage = 100 - totalPercentage;

  // Get priorities not yet allocated
  const unallocatedPriorities = availablePriorities.filter(
    (p) => p.isActive && !allocations.some((a) => a.nationalPriorityId === p.id)
  );

  // Group priorities by level for better selection UI
  const groupedPriorities = React.useMemo(() => {
    const grouped: Record<number, NationalPriority[]> = {};
    unallocatedPriorities.forEach((p) => {
      if (!grouped[p.level]) {
        grouped[p.level] = [];
      }
      grouped[p.level].push(p);
    });
    return grouped;
  }, [unallocatedPriorities]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const handleAddAllocation = async () => {
    if (!selectedPriorityId) {
      toast.error("Please select a priority");
      return;
    }

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/activities/${activityId}/national-priorities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalPriorityId: selectedPriorityId,
          percentage: pct,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to add allocation");
      }

      toast.success("Priority allocation added");
      setAddDialogOpen(false);
      setSelectedPriorityId("");
      setPercentage("100");
      await fetchAllocations();
      onChange?.();
    } catch (error: any) {
      console.error("Error adding allocation:", error);
      toast.error(error.message || "Failed to add allocation");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePercentage = async (allocation: ActivityNationalPriority, newPercentage: number) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/national-priorities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalPriorityId: allocation.nationalPriorityId,
          percentage: newPercentage,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      await fetchAllocations();
      onChange?.();
    } catch (error: any) {
      console.error("Error updating allocation:", error);
      toast.error("Failed to update percentage");
    }
  };

  const handleDeleteAllocation = async () => {
    if (!selectedAllocation) return;

    try {
      setSaving(true);

      const response = await fetch(
        `/api/activities/${activityId}/national-priorities?allocationId=${selectedAllocation.id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to remove allocation");
      }

      toast.success("Priority allocation removed");
      setDeleteDialogOpen(false);
      setSelectedAllocation(null);
      await fetchAllocations();
      onChange?.();
    } catch (error: any) {
      console.error("Error deleting allocation:", error);
      toast.error(error.message || "Failed to remove allocation");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                National Priority Allocations
              </CardTitle>
              <CardDescription className="mt-1">
                Allocate this activity to national development priorities. Percentages should total 100%.
              </CardDescription>
            </div>
            {!disabled && (
              <Button
                size="sm"
                onClick={() => {
                  setPercentage(remainingPercentage > 0 ? remainingPercentage.toString() : "100");
                  setAddDialogOpen(true);
                }}
                disabled={unallocatedPriorities.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Priority
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {allocations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border rounded-lg border-dashed">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No priority allocations yet</p>
              <p className="text-xs mt-1">
                Click "Add Priority" to allocate this activity to national priorities
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Allocation rows */}
              {allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                >
                  {/* Priority info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">
                        {allocation.nationalPriority?.code}
                      </span>
                      <span className="font-medium text-sm truncate">
                        {allocation.nationalPriority?.name}
                      </span>
                    </div>
                    {allocation.nationalPriority?.fullPath && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {allocation.nationalPriority.fullPath}
                      </p>
                    )}
                  </div>

                  {/* Percentage input */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={allocation.percentage}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          handleUpdatePercentage(allocation, val);
                        }
                      }}
                      className="w-20 text-right"
                      disabled={disabled}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  {/* Delete button */}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => {
                        setSelectedAllocation(allocation);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Total row */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : isOverAllocated ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="text-sm font-medium">Total Allocation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isValid ? "default" : isOverAllocated ? "destructive" : "secondary"}
                    className={isValid ? "bg-green-600" : ""}
                  >
                    {totalPercentage.toFixed(1)}%
                  </Badge>
                  {!isValid && (
                    <span className="text-xs text-muted-foreground">
                      {isOverAllocated
                        ? `(${(totalPercentage - 100).toFixed(1)}% over)`
                        : `(${remainingPercentage.toFixed(1)}% remaining)`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Priority Allocation</DialogTitle>
            <DialogDescription>
              Select a national priority and specify the allocation percentage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>National Priority</Label>
              <Select
                value={selectedPriorityId}
                onValueChange={setSelectedPriorityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a priority..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedPriorities).map(([level, priorities]) => (
                    <SelectGroup key={level}>
                      <SelectLabel>Level {level}</SelectLabel>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-mono text-xs mr-2">{p.code}</span>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
                {remainingPercentage > 0 && remainingPercentage < 100 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPercentage(remainingPercentage.toString())}
                  >
                    Use remaining ({remainingPercentage.toFixed(1)}%)
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddAllocation} disabled={saving || !selectedPriorityId}>
              {saving ? "Adding..." : "Add Allocation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Priority Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the allocation to "
              {selectedAllocation?.nationalPriority?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllocation}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

