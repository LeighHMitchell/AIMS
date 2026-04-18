"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RequiredDot } from "@/components/ui/required-dot";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const RequiredLabel = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
  <Label className="flex items-center gap-1.5">
    <span>{children}</span>
    <RequiredDot />
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </Label>
);

const OptionalLabel = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
  <Label className="flex items-center gap-1.5">
    <span>{children}</span>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </Label>
);
import {
  NationalPlan,
  NationalPriority,
  ActivityNationalPriority,
  AlignmentSignificance,
  ALIGNMENT_SIGNIFICANCE_LABELS,
  ALIGNMENT_SIGNIFICANCE_DESCRIPTIONS,
  PLAN_TYPE_LABELS,
  flattenPriorityTree,
  buildPriorityTree,
} from "@/types/national-priorities";
import { apiFetch } from '@/lib/api-fetch';

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
  const [plans, setPlans] = useState<NationalPlan[]>([]);
  const [availablePriorities, setAvailablePriorities] = useState<NationalPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<ActivityNationalPriority | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<ActivityNationalPriority | null>(null);

  // Form state for adding/editing an allocation
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>("");
  const [significance, setSignificance] = useState<AlignmentSignificance>("significant");
  const [rationale, setRationale] = useState<string>("");
  const [loadingPriorities, setLoadingPriorities] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchAllocations = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/national-priorities`);
      const result = await response.json();
      
      if (result.success) {
        setAllocations(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
    }
  }, [activityId]);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await apiFetch("/api/national-plans?activeOnly=true");
      const result = await response.json();
      if (result.success) {
        setPlans(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  }, []);

  // Fetch priorities for a specific plan (used in the add dialog)
  const fetchPrioritiesForPlan = useCallback(async (planId: string) => {
    try {
      setLoadingPriorities(true);
      const response = await apiFetch(`/api/national-priorities?planId=${planId}&asTree=false`);
      const result = await response.json();
      if (result.success) {
        setAvailablePriorities(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching priorities:", error);
    } finally {
      setLoadingPriorities(false);
    }
  }, []);

  // When plan selection changes in dialog, fetch that plan's priorities
  useEffect(() => {
    if (selectedPlanId) {
      setSelectedPriorityId("");
      fetchPrioritiesForPlan(selectedPlanId);
    } else {
      setAvailablePriorities([]);
    }
  }, [selectedPlanId, fetchPrioritiesForPlan]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAllocations(), fetchPlans()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAllocations, fetchPlans]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

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

  const handleEditAllocation = (allocation: ActivityNationalPriority) => {
    setEditingAllocation(allocation);
    setSelectedPlanId(""); // Not used in edit mode (plan/priority locked)
    setSelectedPriorityId(allocation.nationalPriorityId);
    setSignificance(allocation.significance);
    setRationale(allocation.rationale || "");
    setAddDialogOpen(true);
  };

  const handleAddAllocation = async () => {
    if (!selectedPriorityId) {
      toast.error("Select a priority from the list before adding an alignment.");
      return;
    }

    try {
      setSaving(true);

      const response = await apiFetch(`/api/activities/${activityId}/national-priorities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalPriorityId: selectedPriorityId,
          significance,
          rationale: rationale.trim() || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to add alignment");
      }

      toast.success("Plan alignment added");
      setAddDialogOpen(false);
      setSelectedPriorityId("");
      setSignificance("significant");
      setRationale("");
      await fetchAllocations();
      onChange?.();
    } catch (error: any) {
      console.error("Error adding allocation:", error);
      toast.error("Couldn't add the alignment. Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  // Re-create an allocation (used by Undo after delete)
  const restoreAllocation = async (snapshot: ActivityNationalPriority) => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/national-priorities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalPriorityId: snapshot.nationalPriorityId,
          significance: snapshot.significance,
          rationale: snapshot.rationale || null,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Failed to restore allocation");
      toast.success("Alignment restored");
      await fetchAllocations();
      onChange?.();
    } catch (error) {
      console.error("Error restoring allocation:", error);
      toast.error("Couldn't restore the alignment. Please add it again manually.");
    }
  };

  const handleDeleteAllocation = async () => {
    if (!selectedAllocation) return;
    const snapshot = selectedAllocation;

    try {
      setSaving(true);

      const response = await apiFetch(`/api/activities/${activityId}/national-priorities?allocationId=${selectedAllocation.id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to remove allocation");
      }

      toast.success("Priority allocation removed", {
        action: {
          label: "Undo",
          onClick: () => restoreAllocation(snapshot),
        },
      });
      setDeleteDialogOpen(false);
      setSelectedAllocation(null);
      await fetchAllocations();
      onChange?.();
    } catch (error: any) {
      console.error("Error deleting allocation:", error);
      toast.error("Couldn't remove the alignment. Please try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-end mb-4">
          {!disabled && (
            <Button
              size="sm"
              onClick={() => {
                setEditingAllocation(null);
                setSelectedPlanId("");
                setSelectedPriorityId("");
                setSignificance("significant");
                setRationale("");
                setAddDialogOpen(true);
              }}
              disabled={plans.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Alignment
            </Button>
          )}
        </div>

        {allocations.length === 0 ? (
          <div className="text-center py-12">
            <img src="/images/empty-tuning-fork.webp" alt="No plan alignments" className="h-32 mx-auto mb-4 opacity-50" />
            <h3 className="text-base font-medium mb-2">No plan alignments</h3>
            <p className="text-muted-foreground">
              Use the Add Alignment button to align this activity to a national plan or strategy.
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Plan</TableHead>
                    <TableHead className="w-[20%]">Priority</TableHead>
                    <TableHead className="w-[130px]">Significance</TableHead>
                    <TableHead>Rationale</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="text-sm whitespace-normal align-top">
                        {allocation.nationalPriority?.planName || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">
                          {allocation.nationalPriority?.code}
                        </span>
                        {allocation.nationalPriority?.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {allocation.significance === "principal" ? "1" : "2"}
                          </span>
                          {ALIGNMENT_SIGNIFICANCE_LABELS[allocation.significance]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-normal align-top">
                        {allocation.rationale || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {!disabled && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditAllocation(allocation)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setSelectedAllocation(allocation);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Allocation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setSelectedPlanId("");
          setSelectedPriorityId("");
          setEditingAllocation(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAllocation ? "Edit Alignment" : "Add Alignment"}</DialogTitle>
            <DialogDescription>
              {editingAllocation
                ? "Update the significance and rationale for this alignment."
                : "Select a plan, then choose a priority to align this activity to."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingAllocation ? (
              // Read-only plan + priority display in edit mode
              <div className="space-y-2">
                <Label>Plan & Priority</Label>
                <div className="p-3 border rounded-md bg-muted/30 text-sm">
                  <div className="text-muted-foreground text-xs mb-1">
                    {editingAllocation.nationalPriority?.planName || "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {editingAllocation.nationalPriority?.code}
                    </span>
                    <span>{editingAllocation.nationalPriority?.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {/* Plan selector */}
            <div className="space-y-2">
              <RequiredLabel tooltip="Select the national plan or strategy this activity aligns with.">Plan / Strategy</RequiredLabel>
              <Select
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <span className="flex items-center gap-2">
                        {plan.acronym && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {plan.acronym}
                          </span>
                        )}
                        <span>
                          {plan.name}
                          {plan.acronym && ` (${plan.acronym})`}
                          {plan.startDate && plan.endDate && (
                            <> {new Date(plan.startDate).getFullYear()}-{new Date(plan.endDate).getFullYear()}</>
                          )}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority selector (shown after plan is selected) */}
            {selectedPlanId && (
              <div className="space-y-2">
                <RequiredLabel tooltip="Choose the specific priority, outcome, or intervention from the selected plan.">Priority</RequiredLabel>
                {loadingPriorities ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
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
                          <SelectLabel>
                            {level === "1" ? "Pillar" : level === "2" ? "Outcome" : level === "3" ? "Intervention" : `Level ${level}`}
                          </SelectLabel>
                          {priorities.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">{p.code}</span>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      {unallocatedPriorities.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          All priorities from this plan are already allocated
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
              </>
            )}

            <div className="space-y-2">
              <RequiredLabel tooltip="Principal: a main objective of the activity. Significant: an important but secondary objective.">Significance</RequiredLabel>
              <Select
                value={significance}
                onValueChange={(val) => setSignificance(val as AlignmentSignificance)}
              >
                <SelectTrigger>
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {significance === "principal" ? "1" : "2"}
                      </span>
                      <span>{ALIGNMENT_SIGNIFICANCE_LABELS[significance]}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal" className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">1</span>
                        <span className="font-medium">Principal</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-7">{ALIGNMENT_SIGNIFICANCE_DESCRIPTIONS.principal}</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="significant" className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">2</span>
                        <span className="font-medium">Significant</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-7">{ALIGNMENT_SIGNIFICANCE_DESCRIPTIONS.significant}</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <OptionalLabel tooltip="Briefly explain how this activity contributes to the selected priority.">Rationale (optional)</OptionalLabel>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain how this activity supports the selected priority..."
                rows={3}
              />
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

