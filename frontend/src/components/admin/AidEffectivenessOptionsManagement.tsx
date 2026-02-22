"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Save,
  ListChecks,
  X,
} from "lucide-react";
import { apiFetch } from '@/lib/api-fetch';

interface MinistryRef {
  id: string;
  code: string;
  name: string;
}

interface AEOption {
  id: string;
  category: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  responsible_ministries: MinistryRef[];
  created_at: string;
  updated_at: string;
}

interface LineMinistry {
  id: string;
  code: string;
  name: string;
}

const CATEGORIES = [
  { value: "includedInNationalPlan", label: "National Development Plans" },
  { value: "linkedToGovFramework", label: "Government Results Frameworks" },
  { value: "mutualAccountabilityFramework", label: "Accountability Frameworks" },
  { value: "capacityDevFromNationalPlan", label: "National Capacity Plans" },
];

export function AidEffectivenessOptionsManagement() {
  const [options, setOptions] = useState<AEOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].value);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<AEOption | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formMinistries, setFormMinistries] = useState<MinistryRef[]>([]);

  // Line ministries from budget classifications
  const [lineMinistries, setLineMinistries] = useState<LineMinistry[]>([]);

  // Fetch options
  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/admin/aid-effectiveness-options?activeOnly=false");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch options");
      }

      setOptions(result.data || []);
    } catch (err) {
      console.error("Error fetching AE options:", err);
      setError(err instanceof Error ? err.message : "Failed to load options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Fetch line ministries (administrative budget classifications)
  useEffect(() => {
    const fetchMinistries = async () => {
      try {
        const response = await apiFetch("/api/admin/budget-classifications?type=administrative&flat=true&activeOnly=true");
        const result = await response.json();
        if (response.ok && result.data) {
          setLineMinistries(
            result.data.map((m: { id: string; code: string; name: string }) => ({
              id: m.id,
              code: m.code,
              name: m.name,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching line ministries:", err);
      }
    };
    fetchMinistries();
  }, []);

  // Filter options for current category
  const filteredOptions = options
    .filter(opt => opt.category === activeCategory)
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  // Reset form
  const resetForm = () => {
    setFormLabel("");
    setFormDescription("");
    setFormSortOrder(0);
    setFormIsActive(true);
    setFormMinistries([]);
    setEditingOption(null);
  };

  // Open dialog for adding
  const handleAdd = () => {
    resetForm();
    // Auto-set sort order to next available
    const maxSort = filteredOptions.reduce((max, opt) => Math.max(max, opt.sort_order), -1);
    setFormSortOrder(maxSort + 1);
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (option: AEOption) => {
    setEditingOption(option);
    setFormLabel(option.label);
    setFormDescription(option.description || "");
    setFormSortOrder(option.sort_order);
    setFormIsActive(option.is_active);
    setFormMinistries(option.responsible_ministries || []);
    setDialogOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formLabel.trim()) {
      toast.error("Label is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingOption
        ? `/api/admin/aid-effectiveness-options/${editingOption.id}`
        : "/api/admin/aid-effectiveness-options";
      const method = editingOption ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        label: formLabel.trim(),
        description: formDescription.trim() || null,
        sortOrder: formSortOrder,
        isActive: formIsActive,
        responsibleMinistries: formMinistries,
      };

      if (!editingOption) {
        body.category = activeCategory;
      }

      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save option");
      }

      toast.success(
        editingOption ? "Option updated successfully" : "Option created successfully"
      );
      setDialogOpen(false);
      resetForm();
      fetchOptions();
    } catch (err) {
      console.error("Error saving option:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save option");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (option: AEOption) => {
    if (!confirm(`Are you sure you want to delete "${option.label}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/aid-effectiveness-options/${option.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete option");
      }

      toast.success("Option deleted successfully");
      fetchOptions();
    } catch (err) {
      console.error("Error deleting option:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete option");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
        {CATEGORIES.map(cat => (
          <Button
            key={cat.value}
            variant="ghost"
            size="sm"
            className={cn(
              activeCategory === cat.value
                ? "bg-white shadow-sm text-slate-900 hover:bg-white"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredOptions.length} option{filteredOptions.length !== 1 ? 's' : ''} in this category
        </p>
        <Button onClick={handleAdd} size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Option
        </Button>
      </div>

      {/* List of options */}
      <div className="space-y-2">
        {filteredOptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No options defined for this category yet.</p>
            <p className="text-sm">Click &quot;Add Option&quot; to create one.</p>
          </div>
        ) : (
          filteredOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{option.label}</span>
                  {!option.is_active && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                {option.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {option.description}
                  </p>
                )}
                {option.responsible_ministries && option.responsible_ministries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {option.responsible_ministries.map((m) => (
                      <Badge key={m.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {m.name} ({m.code})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(option)}>
                    <Pencil className="h-4 w-4 mr-2 text-slate-500" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(option)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Edit Option" : "Add Option"}
            </DialogTitle>
            <DialogDescription>
              {editingOption
                ? "Update the dropdown option details."
                : `Add a new dropdown option for "${CATEGORIES.find(c => c.value === activeCategory)?.label}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="opt-label">
                Label <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
              </Label>
              <Input
                id="opt-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g., National Development Strategy 2025-2030"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opt-description">Description (optional)</Label>
              <Textarea
                id="opt-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of this option..."
                rows={2}
              />
            </div>

            {/* Responsible Ministry dropdown */}
            {lineMinistries.length > 0 && (
              <div className="space-y-2">
                <Label>Responsible Ministry</Label>
                {formMinistries.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formMinistries.map((m) => (
                      <Badge key={m.id} variant="secondary" className="text-xs gap-1 pr-1">
                        {m.name} ({m.code})
                        <button
                          type="button"
                          className="ml-0.5 hover:text-red-500"
                          onClick={() => setFormMinistries(prev => prev.filter(x => x.id !== m.id))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Select
                  value=""
                  onValueChange={(value) => {
                    const ministry = lineMinistries.find(m => m.id === value);
                    if (ministry && !formMinistries.some(m => m.id === ministry.id)) {
                      setFormMinistries(prev => [...prev, { id: ministry.id, code: ministry.code, name: ministry.name }]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a ministry..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lineMinistries
                      .filter(m => !formMinistries.some(s => s.id === m.id))
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="opt-sort">Sort Order</Label>
              <Input
                id="opt-sort"
                type="number"
                min="0"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                className="w-24"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="opt-active"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(checked === true)}
              />
              <Label htmlFor="opt-active" className="text-sm font-normal cursor-pointer">
                Active (visible in activity forms)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : editingOption ? (
                <Save className="h-4 w-4 mr-2" />
              ) : null}
              {editingOption ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
