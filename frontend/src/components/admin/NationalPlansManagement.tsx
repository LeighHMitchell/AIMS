"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { RequiredDot } from "@/components/ui/required-dot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ChevronsUpDown,
  Check,
  Search,
} from "lucide-react";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import {
  NationalPlan,
  NationalPlanFormData,
  NationalPlanRow,
  nationalPlanFromRow,
  PlanType,
  PLAN_TYPE_LABELS,
} from "@/types/national-priorities";
import { NationalPrioritiesManagement } from "./NationalPrioritiesManagement";
import { apiFetch } from "@/lib/api-fetch";

/** Format plan as "Name (ACRONYM) 2021-2030" */
export function formatPlanTitle(plan: NationalPlan): string {
  let title = plan.name;
  if (plan.acronym) title += ` (${plan.acronym})`;
  const startYear = plan.startDate ? new Date(plan.startDate).getFullYear() : null;
  const endYear = plan.endDate ? new Date(plan.endDate).getFullYear() : null;
  if (startYear && endYear) {
    title += ` ${startYear}-${endYear}`;
  } else if (startYear) {
    title += ` ${startYear}-`;
  } else if (endYear) {
    title += ` -${endYear}`;
  }
  return title;
}
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

export function NationalPlansManagement() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [plans, setPlans] = useState<NationalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NationalPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false);
  const [planSearch, setPlanSearch] = useState("");

  const [formData, setFormData] = useState<NationalPlanFormData>({
    name: "",
    acronym: "",
    nameLocal: "",
    description: "",
    planType: "national",
    level1Label: "Goal",
    level2Label: "Objective",
    level3Label: "Action",
    isPrimary: false,
    startDate: "",
    endDate: "",
    isActive: true,
  });

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/national-plans");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch plans");
      }

      setPlans(result.data);

      // Auto-select first plan if none selected
      if (!selectedPlanId && result.data.length > 0) {
        setSelectedPlanId(result.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load national plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const handleAddPlan = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      acronym: "",
      nameLocal: "",
      description: "",
      planType: "national",
      level1Label: "Goal",
      level2Label: "Objective",
      level3Label: "Action",
      isPrimary: false,
      startDate: "",
      endDate: "",
      isActive: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditPlan = (plan: NationalPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      acronym: plan.acronym || "",
      nameLocal: plan.nameLocal || "",
      description: plan.description || "",
      planType: plan.planType || "national",
      level1Label: plan.level1Label || "Goal",
      level2Label: plan.level2Label || "Objective",
      level3Label: plan.level3Label || "Action",
      isPrimary: plan.isPrimary || false,
      startDate: plan.startDate || "",
      endDate: plan.endDate || "",
      isActive: plan.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleDeletePlan = async (plan: NationalPlan) => {
    const proceed = await confirm({
      title: `Delete "${plan.name}"?`,
      description:
        "This will delete the plan and all its priorities, including any activity alignments. This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

    if (!proceed) return;

    try {
      const response = await fetch(
        `/api/national-plans/${plan.id}?force=true`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete plan");
      }

      toast.success("Plan deleted successfully");

      // Clear selection if deleted plan was selected
      if (selectedPlanId === plan.id) {
        setSelectedPlanId("");
      }

      fetchPlans();
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error(error.message || "Failed to delete plan");
    }
  };

  const handleSavePlan = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);

      const url = editingPlan
        ? `/api/national-plans/${editingPlan.id}`
        : "/api/national-plans";
      const method = editingPlan ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save plan");
      }

      toast.success(
        editingPlan ? "Plan updated successfully" : "Plan created successfully"
      );

      setEditDialogOpen(false);

      // If creating new, select it
      if (!editingPlan && result.data?.id) {
        setSelectedPlanId(result.data.id);
      }

      fetchPlans();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error(error.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Plans Management Card */}
        <Card>
          <CardHeader className="bg-surface-muted rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  National Plans & Strategies
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage national development plans and sectoral strategies.
                  Each plan has its own hierarchy of priorities that activities
                  can align to.
                </CardDescription>
              </div>
              <Button onClick={handleAddPlan}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {plans.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No plans or strategies created yet</p>
                <p className="text-body mt-1">
                  Click &quot;Add Plan&quot; to create your first national plan
                  or sectoral strategy
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Plan selector */}
                <div className="flex flex-col gap-1">
                  <Label className="text-helper text-muted-foreground">
                    Select plan to manage
                  </Label>
                  <Popover open={planSelectorOpen} onOpenChange={(open) => { setPlanSelectorOpen(open); if (!open) setPlanSearch(""); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={planSelectorOpen}
                        className={cn(
                          "w-full max-w-md justify-between font-normal h-10 text-body",
                          !selectedPlanId && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">
                          {selectedPlan ? formatPlanTitle(selectedPlan) : "Select a plan..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg border" align="start" sideOffset={4}>
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            placeholder="Search plans..."
                            value={planSearch}
                            onChange={(e) => setPlanSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setPlanSelectorOpen(false);
                                setPlanSearch("");
                              }
                            }}
                            className="flex h-10 w-full bg-transparent py-3 text-body outline-none placeholder:text-muted-foreground"
                            autoFocus
                          />
                        </div>
                        <CommandList>
                          <CommandGroup>
                            {plans
                              .filter((plan) => {
                                if (!planSearch) return true;
                                const q = planSearch.toLowerCase();
                                return (
                                  plan.name.toLowerCase().includes(q) ||
                                  plan.acronym?.toLowerCase().includes(q) ||
                                  plan.description?.toLowerCase().includes(q)
                                );
                              })
                              .map((plan) => (
                                <CommandItem
                                  key={plan.id}
                                  onSelect={() => {
                                    setSelectedPlanId(plan.id);
                                    setPlanSelectorOpen(false);
                                    setPlanSearch("");
                                  }}
                                  className={cn(
                                    "cursor-pointer py-2",
                                    selectedPlanId === plan.id && "bg-accent"
                                  )}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedPlanId === plan.id ? "opacity-100" : "opacity-0")} />
                                  <span className="truncate">
                                    {formatPlanTitle(plan)}
                                    {!plan.isActive && " (Inactive)"}
                                  </span>
                                </CommandItem>
                              ))}
                            {plans.filter((plan) => {
                              if (!planSearch) return true;
                              const q = planSearch.toLowerCase();
                              return plan.name.toLowerCase().includes(q) || plan.acronym?.toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="py-6 text-center text-body text-muted-foreground">
                                No plans found
                              </div>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Selected plan details */}
                {selectedPlan && (
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPlanTitle(selectedPlan)}</span>
                        {selectedPlan.isPrimary && (
                          <Badge variant="default" className="text-helper">
                            Primary
                          </Badge>
                        )}
                        <Badge variant="gray" className="text-helper">
                          {PLAN_TYPE_LABELS[selectedPlan.planType] || selectedPlan.planType}
                        </Badge>
                        <Badge variant="gray" className="text-helper">
                          {selectedPlan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {selectedPlan.description && (
                        <p className="text-body text-muted-foreground mt-1 truncate">
                          {selectedPlan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditPlan(selectedPlan)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDeletePlan(selectedPlan)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Priorities Tree (nested inside the plan) */}
                {selectedPlanId && selectedPlan && (
                  <div className="mt-4 pt-4 border-t">
                    <NationalPrioritiesManagement
                      planId={selectedPlanId}
                      levelLabels={[
                        selectedPlan.level1Label || "Goal",
                        selectedPlan.level2Label || "Objective",
                        selectedPlan.level3Label || "Action",
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Add National Plan or Strategy"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update the plan details below"
                : "Create a new national development plan or sectoral strategy"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name" className="flex items-center gap-1">
                  Name <RequiredDot />
                  <HelpTextTooltip text="The full official name of the plan or strategy document" size="sm" />
                </Label>
                <Input
                  id="plan-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g., "National Education Strategic Plan"'
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-acronym" className="flex items-center gap-1">
                  Acronym
                  <HelpTextTooltip text="Short abbreviation commonly used to refer to this plan" size="sm" />
                </Label>
                <Input
                  id="plan-acronym"
                  value={formData.acronym || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, acronym: e.target.value })
                  }
                  placeholder="e.g., NESP"
                  maxLength={20}
                  className="w-28"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-type" className="flex items-center gap-1">
                Type <RequiredDot />
                <HelpTextTooltip text="National: the overarching country development plan. Sectoral: a sector-specific strategy. Thematic: a cross-cutting theme strategy." size="sm" />
              </Label>
              <Select
                value={formData.planType}
                onValueChange={(value) =>
                  setFormData({ ...formData, planType: value as PlanType })
                }
              >
                <SelectTrigger id="plan-type">
                  <SelectValue>
                    {formData.planType && (
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {formData.planType === "national" ? "1" : formData.planType === "sectoral" ? "2" : "3"}
                        </span>
                        <span>{PLAN_TYPE_LABELS[formData.planType]}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national" className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                        <span className="font-medium">National</span>
                      </div>
                      <p className="text-helper text-muted-foreground mt-1 ml-7">Overarching national development plan or strategy</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="sectoral" className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                        <span className="font-medium">Sectoral</span>
                      </div>
                      <p className="text-helper text-muted-foreground mt-1 ml-7">Sector-specific strategy (e.g., education, health, agriculture)</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="thematic" className="py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">3</span>
                        <span className="font-medium">Thematic</span>
                      </div>
                      <p className="text-helper text-muted-foreground mt-1 ml-7">Cross-cutting theme (e.g., climate, gender, governance)</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description" className="flex items-center gap-1">
                Description
                <HelpTextTooltip text="A brief summary of the plan's scope and purpose" size="sm" />
              </Label>
              <Textarea
                id="plan-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this plan or strategy"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-body flex items-center gap-1">
                Hierarchy Labels
                <HelpTextTooltip text="Name the three levels used to structure this plan's objectives. For example, a national plan might use Pillar / Goal / Strategy, while a sector plan might use Priority Area / Objective / Action." size="sm" />
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-helper text-muted-foreground">Level 1</Label>
                  <Input
                    value={formData.level1Label}
                    onChange={(e) =>
                      setFormData({ ...formData, level1Label: e.target.value })
                    }
                    placeholder="e.g., Goal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-helper text-muted-foreground">Level 2</Label>
                  <Input
                    value={formData.level2Label}
                    onChange={(e) =>
                      setFormData({ ...formData, level2Label: e.target.value })
                    }
                    placeholder="e.g., Objective"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-helper text-muted-foreground">Level 3</Label>
                  <Input
                    value={formData.level3Label}
                    onChange={(e) =>
                      setFormData({ ...formData, level3Label: e.target.value })
                    }
                    placeholder="e.g., Action"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Start Year
                  <HelpTextTooltip text="The year this plan or strategy period begins" size="sm" />
                </Label>
                <Select
                  value={formData.startDate ? new Date(formData.startDate).getFullYear().toString() : ""}
                  onValueChange={(year) =>
                    setFormData({ ...formData, startDate: year ? `${year}-01-01` : "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => 2015 + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  End Year
                  <HelpTextTooltip text="The year this plan or strategy period ends" size="sm" />
                </Label>
                <Select
                  value={formData.endDate ? new Date(formData.endDate).getFullYear().toString() : ""}
                  onValueChange={(year) =>
                    setFormData({ ...formData, endDate: year ? `${year}-12-31` : "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => 2015 + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="plan-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="plan-isActive" className="flex items-center gap-1">
                  Active
                  <HelpTextTooltip text="Inactive plans are hidden from partners and dropdowns but preserved for historical records" size="sm" />
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="plan-isPrimary"
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPrimary: checked })
                  }
                />
                <Label htmlFor="plan-isPrimary" className="flex items-center gap-1">
                  Primary national plan
                  <HelpTextTooltip text="Only one plan can be primary. This identifies the overarching national development plan that the Project Bank aligns to. Toggling this on will automatically remove primary status from any other plan." size="sm" />
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving ? "Saving..." : editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </>
  );
}
