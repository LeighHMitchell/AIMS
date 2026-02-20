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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FileCode2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  Upload,
  Download,
  ExternalLink,
  Star,
  Lock,
  Unlock,
} from "lucide-react";
import {
  ProjectReference,
  ReferenceType,
  REFERENCE_TYPE_LABELS,
  ProjectReferenceFormData,
  ProjectReferenceBulkImportResult,
} from "@/types/project-references";
import Link from "next/link";

export function ProjectReferencesManagement() {
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ReferenceType | "all">("all");
  const [isLocked, setIsLocked] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectReference | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportData, setBulkImportData] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProjectReferenceFormData>({
    activityId: "",
    referenceType: "government",
    code: "",
    name: "",
    vocabulary: "",
    vocabularyUri: "",
    isPrimary: false,
    notes: "",
  });

  // Activities for selection
  const [activities, setActivities] = useState<{ id: string; iati_identifier: string; title: string }[]>([]);
  const [activitySearch, setActivitySearch] = useState("");

  // Fetch references
  const fetchReferences = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("referenceType", filterType);

      const response = await fetch(
        `/api/admin/project-references?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch project references");
      }

      setReferences(data.data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching references:", err);
      setError(err.message || "Failed to load project references");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Fetch activities for dropdown
  const fetchActivities = async (search: string) => {
    if (!search || search.length < 2) {
      setActivities([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/activities?search=${encodeURIComponent(search)}&limit=20`
      );
      const data = await response.json();
      if (response.ok && data.activities) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivities(activitySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [activitySearch]);

  // Filter references by search
  const filteredReferences = React.useMemo(() => {
    if (!searchQuery) return references;

    const query = searchQuery.toLowerCase();
    return references.filter(
      (ref) =>
        ref.code.toLowerCase().includes(query) ||
        ref.name?.toLowerCase().includes(query) ||
        ref.vocabulary?.toLowerCase().includes(query) ||
        ref.activity?.iatiIdentifier?.toLowerCase().includes(query) ||
        ref.activity?.title?.toLowerCase().includes(query)
    );
  }, [references, searchQuery]);

  // Open modal for creating
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      activityId: "",
      referenceType: "government",
      code: "",
      name: "",
      vocabulary: "",
      vocabularyUri: "",
      isPrimary: false,
      notes: "",
    });
    setActivitySearch("");
    setActivities([]);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (item: ProjectReference) => {
    setEditingItem(item);
    setFormData({
      activityId: item.activityId,
      referenceType: item.referenceType,
      code: item.code,
      name: item.name || "",
      vocabulary: item.vocabulary || "",
      vocabularyUri: item.vocabularyUri || "",
      isPrimary: item.isPrimary,
      notes: item.notes || "",
    });
    setActivitySearch(item.activity?.iatiIdentifier || "");
    setIsModalOpen(true);
  };

  // Delete reference
  const handleDelete = async (item: ProjectReference) => {
    if (!confirm(`Are you sure you want to delete this reference?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/project-references/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete reference");
      }

      toast.success("Reference deleted successfully");
      fetchReferences();
    } catch (err: any) {
      console.error("Error deleting reference:", err);
      toast.error(err.message || "Failed to delete reference");
    }
  };

  // Save reference
  const handleSave = async () => {
    if (!formData.activityId || !formData.code) {
      toast.error("Activity and code are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/project-references/${editingItem.id}`
        : "/api/admin/project-references";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save reference");
      }

      toast.success(
        editingItem
          ? "Reference updated successfully"
          : "Reference created successfully"
      );
      setIsModalOpen(false);
      fetchReferences();
    } catch (err: any) {
      console.error("Error saving reference:", err);
      toast.error(err.message || "Failed to save reference");
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) {
      toast.error("Please paste CSV data");
      return;
    }

    setBulkImporting(true);
    try {
      // Parse CSV
      const lines = bulkImportData.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["activity_iati_id", "reference_type", "code"];
      for (const req of requiredHeaders) {
        if (!headers.includes(req)) {
          throw new Error(`Missing required column: ${req}`);
        }
      }

      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        return row;
      });

      const response = await fetch("/api/admin/project-references/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, updateExisting }),
      });

      const result: ProjectReferenceBulkImportResult = await response.json();

      if (result.created > 0 || result.updated > 0) {
        toast.success(
          `Import complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed`
        );
      }

      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
        toast.error(`${result.failed} rows failed. Check console for details.`);
      }

      setIsBulkImportOpen(false);
      setBulkImportData("");
      fetchReferences();
    } catch (err: any) {
      console.error("Bulk import error:", err);
      toast.error(err.message || "Failed to import");
    } finally {
      setBulkImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    const response = await fetch("/api/admin/project-references/bulk-import");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project_references_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeBadgeColor = (type: ReferenceType) => {
    switch (type) {
      case "government":
        return "border-green-300 text-green-700 bg-green-50";
      case "donor":
        return "border-blue-300 text-blue-700 bg-blue-50";
      case "internal":
        return "border-gray-300 text-gray-700 bg-gray-50";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            Project References
          </CardTitle>
          <CardDescription>
            Link activities to government and donor project codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="h-5 w-5" />
            Project References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error: {error}</p>
              <Button onClick={fetchReferences} variant="outline" className="mt-4">
                Retry
              </Button>
            </div>
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
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5" />
                Project References
              </CardTitle>
              <CardDescription>
                Link activities to government and donor project codes for budget reconciliation
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkImportOpen(true)}
                disabled={isLocked}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={handleAdd} disabled={isLocked}>
                <Plus className="h-4 w-4 mr-2" />
                Add Reference
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, or activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as ReferenceType | "all")}
              >
                <SelectTrigger className="w-[180px]">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={isLocked ? "outline" : "default"}
                size="sm"
                onClick={() => setIsLocked(!isLocked)}
                className={isLocked ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
              >
                {isLocked ? (
                  <>
                    <Lock className="h-4 w-4 mr-1" />
                    Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-1" />
                    Unlocked
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Table */}
          {filteredReferences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileCode2 className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No project references found</p>
              <p className="text-sm mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first project reference to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleAdd} disabled={isLocked}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reference
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-muted z-10">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">
                        Activity
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">
                        Type
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[150px]">
                        Code
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[150px]">
                        Vocabulary
                      </th>
                      <th className="h-12 px-4 py-3 text-center font-medium text-muted-foreground w-[80px]">
                        Primary
                      </th>
                      <th className="h-12 px-4 py-3 text-right font-medium text-muted-foreground w-[60px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferences.map((ref) => (
                      <tr key={ref.id} className="border-b hover:bg-muted/20">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <Link
                              href={`/activities/${ref.activityId}`}
                              className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {ref.activity?.title || "Untitled"}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <span className="text-xs text-muted-foreground font-mono">
                              {ref.activity?.iatiIdentifier || ref.activityId}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getTypeBadgeColor(ref.referenceType)}`}
                          >
                            {REFERENCE_TYPE_LABELS[ref.referenceType]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {ref.code}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          {ref.name || "—"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {ref.vocabulary || "—"}
                        </td>
                        <td className="p-4 text-center">
                          {ref.isPrimary && (
                            <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {!isLocked && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(ref)}>
                                  <Pencil className="h-4 w-4 mr-2 text-slate-500" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(ref)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredReferences.length} reference
            {filteredReferences.length !== 1 ? "s" : ""}
            {filterType !== "all" && ` (${REFERENCE_TYPE_LABELS[filterType]})`}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Project Reference" : "Add Project Reference"}
            </DialogTitle>
            <DialogDescription>
              Link an activity to a government or donor project code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Activity Search */}
            <div className="space-y-2">
              <Label htmlFor="activity">Activity <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                id="activity"
                value={activitySearch}
                onChange={(e) => {
                  setActivitySearch(e.target.value);
                  if (!e.target.value) {
                    setFormData({ ...formData, activityId: "" });
                  }
                }}
                placeholder="Search by IATI ID or title..."
                disabled={!!editingItem}
              />
              {activities.length > 0 && !editingItem && (
                <div className="border rounded-md max-h-[150px] overflow-auto">
                  {activities.map((a) => (
                    <button
                      key={a.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => {
                        setFormData({ ...formData, activityId: a.id });
                        setActivitySearch(a.iati_identifier);
                        setActivities([]);
                      }}
                    >
                      <div className="font-medium">{a.title || "Untitled"}</div>
                      <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded inline-block mt-1">
                        {a.iati_identifier}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceType">Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Select
                  value={formData.referenceType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      referenceType: value as ReferenceType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="donor">Donor</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g., PIP-2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Human-readable project name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vocabulary">Vocabulary</Label>
                <Input
                  id="vocabulary"
                  value={formData.vocabulary}
                  onChange={(e) =>
                    setFormData({ ...formData, vocabulary: e.target.value })
                  }
                  placeholder="e.g., national_pip"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vocabularyUri">Vocabulary URI</Label>
                <Input
                  id="vocabularyUri"
                  value={formData.vocabularyUri}
                  onChange={(e) =>
                    setFormData({ ...formData, vocabularyUri: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPrimary: checked })
                }
              />
              <Label htmlFor="isPrimary">Primary reference for this type</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Import Project References</DialogTitle>
            <DialogDescription>
              Paste CSV data to import multiple project references at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Required columns: activity_iati_id, reference_type, code
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <Textarea
              value={bulkImportData}
              onChange={(e) => setBulkImportData(e.target.value)}
              placeholder="Paste CSV data here..."
              rows={10}
              className="font-mono text-xs"
            />

            <div className="flex items-center gap-2">
              <Switch
                id="updateExisting"
                checked={updateExisting}
                onCheckedChange={setUpdateExisting}
              />
              <Label htmlFor="updateExisting">
                Update existing references (if code matches)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkImportOpen(false)}
              disabled={bulkImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={bulkImporting}>
              {bulkImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
