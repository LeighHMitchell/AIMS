"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Calendar,
  AlertCircle,
  Save,
} from "lucide-react";
import {
  CustomYear,
  CustomYearInput,
  YearSeparator,
  SecondYearFormat,
  MONTHS,
  getDaysForMonth,
  formatMonthDay,
  getCustomYearPreview,
  getCustomYearLabel,
  validateCustomYear,
} from "@/types/custom-years";
import { apiFetch } from '@/lib/api-fetch';

/**
 * Calculate the end date as the day before the start date (for a full 12-month year)
 * e.g., Start: Oct 1 → End: Sep 30
 *       Start: Jul 1 → End: Jun 30
 *       Start: Jan 15 → End: Jan 14
 */
function calculateEndDate(startMonth: number, startDay: number): { endMonth: number; endDay: number } {
  if (startDay === 1) {
    // End is last day of previous month
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endDay = getDaysForMonth(endMonth).length;
    return { endMonth, endDay };
  } else {
    // End is the day before in the same month
    return { endMonth: startMonth, endDay: startDay - 1 };
  }
}

export function CustomYearsManagement() {
  const [customYears, setCustomYears] = useState<CustomYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<CustomYear | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CustomYearInput>({
    name: "",
    shortName: "",
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
    isActive: true,
    isDefault: false,
    yearSeparator: "-",
    secondYearFormat: "short",
  });

  // Fetch custom years
  const fetchCustomYears = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/admin/custom-years?activeOnly=false");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch custom years");
      }

      setCustomYears(result.data || []);
    } catch (err) {
      console.error("Error fetching custom years:", err);
      setError(err instanceof Error ? err.message : "Failed to load custom years");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomYears();
  }, [fetchCustomYears]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      shortName: "",
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      isActive: true,
      isDefault: false,
      yearSeparator: "-",
      secondYearFormat: "short",
    });
    setEditingYear(null);
  };

  // Open dialog for adding
  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (year: CustomYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      shortName: year.shortName || "",
      startMonth: year.startMonth,
      startDay: year.startDay,
      endMonth: year.endMonth,
      endDay: year.endDay,
      isActive: year.isActive,
      isDefault: year.isDefault,
      yearSeparator: year.yearSeparator || "-",
      secondYearFormat: year.secondYearFormat || "short",
    });
    setDialogOpen(true);
  };

  // Check for duplicate dates (same start/end dates as another custom year)
  const checkForDuplicateDates = (): string | null => {
    const existingWithSameDates = customYears.find(
      (year) =>
        year.startMonth === formData.startMonth &&
        year.startDay === formData.startDay &&
        year.endMonth === formData.endMonth &&
        year.endDay === formData.endDay &&
        // If editing, exclude the current year from the check
        (editingYear ? year.id !== editingYear.id : true)
    );

    if (existingWithSameDates) {
      return `A custom year with these dates already exists: "${existingWithSameDates.name}" (${formatMonthDay(existingWithSameDates.startMonth, existingWithSameDates.startDay)} – ${formatMonthDay(existingWithSameDates.endMonth, existingWithSameDates.endDay)})`;
    }

    return null;
  };

  // Handle save (create or update)
  const handleSave = async () => {
    const validationError = validateCustomYear(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Check for duplicate dates
    const duplicateError = checkForDuplicateDates();
    if (duplicateError) {
      toast.error(duplicateError);
      return;
    }

    setSaving(true);
    try {
      const url = editingYear
        ? `/api/admin/custom-years/${editingYear.id}`
        : "/api/admin/custom-years";
      const method = editingYear ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save custom year");
      }

      toast.success(
        editingYear
          ? "Custom year updated successfully"
          : "Custom year created successfully"
      );
      setDialogOpen(false);
      resetForm();
      fetchCustomYears();
    } catch (err) {
      console.error("Error saving custom year:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save custom year");
    } finally {
      setSaving(false);
    }
  };

  // Handle set as default
  const handleSetDefault = async (year: CustomYear) => {
    try {
      const response = await apiFetch(`/api/admin/custom-years/${year.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set default");
      }

      toast.success(`${year.name} is now the default`);
      fetchCustomYears();
    } catch (err) {
      console.error("Error setting default:", err);
      toast.error(err instanceof Error ? err.message : "Failed to set default");
    }
  };

  // Handle delete
  const handleDelete = async (year: CustomYear) => {
    if (year.isDefault) {
      toast.error("Cannot delete the default year. Set another year as default first.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${year.name}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/admin/custom-years/${year.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete custom year");
      }

      toast.success("Custom year deleted successfully");
      fetchCustomYears();
    } catch (err) {
      console.error("Error deleting custom year:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete custom year");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading custom years...</span>
      </div>
    );
  }

  // Error state
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
      {/* Header with Add button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleAdd} size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Custom Year
        </Button>
      </div>

      {/* List of custom years */}
      <div className="space-y-2">
        {customYears.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No custom years defined yet.</p>
            <p className="text-sm">Click &quot;Add Custom Year&quot; to create one.</p>
          </div>
        ) : (
          customYears.map((year) => (
            <div
              key={year.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{year.name}</span>
                  {year.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  )}
                  {!year.isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {year.shortName && (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {year.shortName}
                    </span>
                  )}
                  <span>
                    {formatMonthDay(year.startMonth, year.startDay)} –{" "}
                    {formatMonthDay(year.endMonth, year.endDay)}
                  </span>
                  <span className="text-xs opacity-75">
                    (e.g., {getCustomYearLabel(year, new Date().getFullYear())})
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(year)}>
                    <Pencil className="h-4 w-4 mr-2 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                    Edit
                  </DropdownMenuItem>
                  {!year.isDefault && (
                    <DropdownMenuItem onClick={() => handleSetDefault(year)}>
                      <Star className="h-4 w-4 mr-2" />
                      Set as Default
                    </DropdownMenuItem>
                  )}
                  {!year.isDefault && (
                    <DropdownMenuItem
                      onClick={() => handleDelete(year)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                      Delete
                    </DropdownMenuItem>
                  )}
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
              {editingYear ? "Edit Custom Year" : "Add Custom Year"}
            </DialogTitle>
            <DialogDescription>
              Define a fiscal year period for reporting and analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Australian Fiscal Year"
              />
            </div>

            {/* Short Name */}
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name (for badges)</Label>
              <Input
                id="shortName"
                value={formData.shortName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, shortName: e.target.value })
                }
                placeholder="e.g., AU FY"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Add a trailing space if you want separation from the year (e.g., &quot;AU FY &quot; → &quot;AU FY 2026&quot;)
              </p>
            </div>

            {/* Year Format Options */}
            <div className="grid grid-cols-2 gap-3">
              {/* Year Separator */}
              <div className="space-y-2">
                <Label htmlFor="yearSeparator">Year Separator</Label>
                <Select
                  value={formData.yearSeparator || "-"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, yearSeparator: v as YearSeparator })
                  }
                >
                  <SelectTrigger id="yearSeparator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">Hyphen (-)</SelectItem>
                    <SelectItem value="/">Slash (/)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Second Year Format */}
              <div className="space-y-2">
                <Label htmlFor="secondYearFormat">Second Year</Label>
                <Select
                  value={formData.secondYearFormat || "short"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, secondYearFormat: v as SecondYearFormat })
                  }
                >
                  <SelectTrigger id="secondYearFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (27)</SelectItem>
                    <SelectItem value="full">Full (2027)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Period Definition */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">Period Definition</Label>

              {/* Start Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Month</Label>
                  <Select
                    value={String(formData.startMonth)}
                    onValueChange={(v) => {
                      const newStartMonth = parseInt(v);
                      const newStartDay = Math.min(
                        formData.startDay,
                        getDaysForMonth(newStartMonth).length
                      );
                      const { endMonth, endDay } = calculateEndDate(newStartMonth, newStartDay);
                      setFormData({
                        ...formData,
                        startMonth: newStartMonth,
                        startDay: newStartDay,
                        endMonth,
                        endDay,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Day</Label>
                  <Select
                    value={String(formData.startDay)}
                    onValueChange={(v) => {
                      const newStartDay = parseInt(v);
                      const { endMonth, endDay } = calculateEndDate(formData.startMonth, newStartDay);
                      setFormData({
                        ...formData,
                        startDay: newStartDay,
                        endMonth,
                        endDay,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getDaysForMonth(formData.startMonth).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Month</Label>
                  <Select
                    value={String(formData.endMonth)}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        endMonth: parseInt(v),
                        endDay: Math.min(
                          formData.endDay,
                          getDaysForMonth(parseInt(v)).length
                        ),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Day</Label>
                  <Select
                    value={String(formData.endDay)}
                    onValueChange={(v) =>
                      setFormData({ ...formData, endDay: parseInt(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getDaysForMonth(formData.endMonth).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Preview:</p>
                <p className="text-sm font-medium">
                  {getCustomYearPreview(formData)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Label: &quot;{getCustomYearLabel(formData, new Date().getFullYear())}&quot;
                </p>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
                Active (visible in chart dropdowns)
              </Label>
            </div>

            {/* Set as Default */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked === true })
                }
              />
              <Label htmlFor="isDefault" className="text-sm font-normal cursor-pointer">
                Set as system default
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
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingYear ? <Save className="h-4 w-4 mr-2" /> : null}
              {editingYear ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
