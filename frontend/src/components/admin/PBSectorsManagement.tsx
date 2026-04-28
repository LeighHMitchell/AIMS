"use client";

import { RequiredDot } from "@/components/ui/required-dot";
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
  Layers,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

// ============================================
// TYPES
// ============================================

interface PBSubSector {
  id: string;
  sector_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface PBSector {
  id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
  sub_sectors: PBSubSector[];
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PBSectorsManagement() {
  const [sectors, setSectors] = useState<PBSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Sector dialog
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<PBSector | null>(null);
  const [sectorForm, setSectorForm] = useState({ code: "", name: "" });
  const [saving, setSaving] = useState(false);

  // Sub-sector dialog
  const [subSectorDialogOpen, setSubSectorDialogOpen] = useState(false);
  const [editingSubSector, setEditingSubSector] = useState<PBSubSector | null>(null);
  const [parentSectorId, setParentSectorId] = useState<string | null>(null);
  const [subSectorForm, setSubSectorForm] = useState({ name: "" });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "sector" | "sub_sector";
    id: string;
    name: string;
    sectorId?: string;
  } | null>(null);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchSectors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/pb-sectors");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSectors(data);
      // Expand all by default on first load
      if (expandedIds.size === 0 && data.length > 0) {
        setExpandedIds(new Set(data.map((s: PBSector) => s.id)));
      }
    } catch (error) {
      console.error("Error fetching PB sectors:", error);
      toast.error("Failed to load Project Bank sectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
  }, [fetchSectors]);

  // ============================================
  // EXPAND / COLLAPSE
  // ============================================

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(sectors.map((s) => s.id)));
  const collapseAll = () => setExpandedIds(new Set());

  // ============================================
  // SECTOR CRUD
  // ============================================

  const handleAddSector = () => {
    setEditingSector(null);
    setSectorForm({ code: "", name: "" });
    setSectorDialogOpen(true);
  };

  const handleEditSector = (sector: PBSector) => {
    setEditingSector(sector);
    setSectorForm({ code: sector.code, name: sector.name });
    setSectorDialogOpen(true);
  };

  const handleSaveSector = async () => {
    if (!sectorForm.code.trim() || !sectorForm.name.trim()) {
      toast.error("Code and name are required");
      return;
    }

    try {
      setSaving(true);

      if (editingSector) {
        const res = await apiFetch(`/api/pb-sectors/${editingSector.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: sectorForm.code.toUpperCase(),
            name: sectorForm.name,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update sector");
        }
        toast.success("Sector updated");
      } else {
        const maxOrder = sectors.reduce((max, s) => Math.max(max, s.display_order), 0);
        const res = await apiFetch("/api/pb-sectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: sectorForm.code.toUpperCase(),
            name: sectorForm.name,
            display_order: maxOrder + 1,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create sector");
        }
        toast.success("Sector created");
      }

      setSectorDialogOpen(false);
      fetchSectors();
    } catch (error: any) {
      toast.error(error.message || "Failed to save sector");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // SUB-SECTOR CRUD
  // ============================================

  const handleAddSubSector = (sectorId: string) => {
    setEditingSubSector(null);
    setParentSectorId(sectorId);
    setSubSectorForm({ name: "" });
    setSubSectorDialogOpen(true);
  };

  const handleEditSubSector = (subSector: PBSubSector) => {
    setEditingSubSector(subSector);
    setParentSectorId(subSector.sector_id);
    setSubSectorForm({ name: subSector.name });
    setSubSectorDialogOpen(true);
  };

  const handleSaveSubSector = async () => {
    if (!subSectorForm.name.trim() || !parentSectorId) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);

      if (editingSubSector) {
        // Update individual sub-sector via direct Supabase-style approach
        // The PUT /api/pb-sectors/[id] replaces all sub-sectors, so we update the full list
        const sector = sectors.find((s) => s.id === parentSectorId);
        if (!sector) throw new Error("Sector not found");

        const updatedSubs = sector.sub_sectors.map((ss) =>
          ss.id === editingSubSector.id ? { ...ss, name: subSectorForm.name } : ss
        );

        const res = await apiFetch(`/api/pb-sectors/${parentSectorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sub_sectors: updatedSubs.map((ss) => ({ name: ss.name })),
          }),
        });
        if (!res.ok) throw new Error("Failed to update sub-sector");
        toast.success("Sub-sector updated");
      } else {
        // Add new sub-sector — send full list + new one
        const sector = sectors.find((s) => s.id === parentSectorId);
        if (!sector) throw new Error("Sector not found");

        const newSubs = [
          ...sector.sub_sectors.map((ss) => ({ name: ss.name })),
          { name: subSectorForm.name },
        ];

        const res = await apiFetch(`/api/pb-sectors/${parentSectorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub_sectors: newSubs }),
        });
        if (!res.ok) throw new Error("Failed to add sub-sector");
        toast.success("Sub-sector added");
      }

      setSubSectorDialogOpen(false);
      fetchSectors();
    } catch (error: any) {
      toast.error(error.message || "Failed to save sub-sector");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE
  // ============================================

  const handleDeleteSector = (sector: PBSector) => {
    setDeleteTarget({ type: "sector", id: sector.id, name: sector.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubSector = (subSector: PBSubSector, sectorId: string) => {
    setDeleteTarget({
      type: "sub_sector",
      id: subSector.id,
      name: subSector.name,
      sectorId,
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);

      if (deleteTarget.type === "sector") {
        const res = await apiFetch(`/api/pb-sectors/${deleteTarget.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete sector");
        toast.success("Sector deactivated");
      } else {
        // Remove sub-sector by sending updated list without it
        const sector = sectors.find((s) => s.id === deleteTarget.sectorId);
        if (!sector) throw new Error("Sector not found");

        const remainingSubs = sector.sub_sectors
          .filter((ss) => ss.id !== deleteTarget.id)
          .map((ss) => ({ name: ss.name }));

        const res = await apiFetch(`/api/pb-sectors/${deleteTarget.sectorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub_sectors: remainingSubs }),
        });
        if (!res.ok) throw new Error("Failed to delete sub-sector");
        toast("Sub-sector removed");
      }

      setDeleteDialogOpen(false);
      fetchSectors();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // FILTERING
  // ============================================

  const filteredSectors = React.useMemo(() => {
    if (!searchQuery.trim()) return sectors;
    const q = searchQuery.toLowerCase();
    return sectors
      .filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sub_sectors.some((ss) => ss.name.toLowerCase().includes(q))
      )
      .map((s) => ({
        ...s,
        sub_sectors: s.sub_sectors.filter(
          (ss) =>
            ss.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        ),
      }));
  }, [sectors, searchQuery]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
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
                <Layers className="h-5 w-5" />
                Project Bank Sectors
              </CardTitle>
              <CardDescription className="mt-1">
                Manage sectors and sub-sectors used in the Project Bank intake
                form
              </CardDescription>
            </div>
            <Button onClick={handleAddSector}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sector
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {(() => {
                const anyExpanded = expandedIds.size > 0;
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={anyExpanded ? collapseAll : expandAll}
                    aria-label={anyExpanded ? 'Collapse all' : 'Expand all'}
                  >
                    {anyExpanded ? (
                      <>
                        <ChevronsDownUp className="h-4 w-4 mr-2" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                        Expand All
                      </>
                    )}
                  </Button>
                );
              })()}
              <Button variant="outline" size="sm" onClick={fetchSectors}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Header Row */}
          <div className="flex items-center gap-4 py-2 px-3 bg-muted/50 border-b font-medium text-body">
            <span className="w-5" />
            <span className="w-[80px]">Code</span>
            <span className="flex-1">Name</span>
            <span className="w-[100px]">Sub-sectors</span>
            <span className="w-[80px]">Status</span>
            <span className="w-[100px] text-right" />
          </div>

          {/* Sector Rows */}
          <div className="border rounded-md mt-2">
            {filteredSectors.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sectors found</p>
                <p className="text-body mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : 'Click "Add Sector" to create one'}
                </p>
              </div>
            ) : (
              filteredSectors.map((sector) => {
                const isExpanded = expandedIds.has(sector.id);
                const hasChildren = sector.sub_sectors.length > 0;

                return (
                  <div key={sector.id} className="border-b last:border-b-0">
                    {/* Sector row */}
                    <div
                      className={`flex items-center gap-4 py-2 px-3 hover:bg-muted/50 group ${
                        !sector.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleExpanded(sector.id)}
                        className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                          hasChildren
                            ? "cursor-pointer hover:bg-muted rounded"
                            : "cursor-default"
                        }`}
                      >
                        {hasChildren ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <span className="w-4" />
                        )}
                      </button>

                      <span className="w-[80px] flex-shrink-0">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {sector.code}
                        </span>
                      </span>

                      <span className="text-body font-medium flex-1 min-w-0">
                        {sector.name}
                      </span>

                      <span className="w-[100px] flex-shrink-0 text-body text-muted-foreground">
                        {sector.sub_sectors.length} sub-sector
                        {sector.sub_sectors.length !== 1 ? "s" : ""}
                      </span>

                      <span className="w-[80px] flex-shrink-0">
                        {sector.is_active ? (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </span>

                      <div className="w-[100px] flex-shrink-0 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditSector(sector)}
                            >
                              <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                              Edit Sector
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddSubSector(sector.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Sub-sector
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteSector(sector)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              Deactivate Sector
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Sub-sector rows */}
                    {isExpanded && hasChildren && (
                      <div>
                        {sector.sub_sectors.map((ss) => (
                          <div
                            key={ss.id}
                            className="flex items-center gap-4 py-1.5 px-3 hover:bg-muted/30 group border-t border-dashed"
                            style={{ paddingLeft: "56px" }}
                          >
                            <span className="w-[80px] flex-shrink-0" />
                            <span className="text-body flex-1 min-w-0 text-muted-foreground">
                              {ss.name}
                            </span>
                            <span className="w-[100px] flex-shrink-0" />
                            <span className="w-[80px] flex-shrink-0" />
                            <div className="w-[100px] flex-shrink-0 flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditSubSector(ss)}
                                  >
                                    <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                                    Edit Sub-sector
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteSubSector(ss, sector.id)
                                    }
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                    Remove Sub-sector
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Count */}
          <div className="mt-4 text-body text-muted-foreground">
            {sectors.length} sectors,{" "}
            {sectors.reduce((sum, s) => sum + s.sub_sectors.length, 0)}{" "}
            sub-sectors total
          </div>
        </CardContent>
      </Card>

      {/* Sector Add/Edit Dialog */}
      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>
              {editingSector ? "Edit Sector" : "Add Sector"}
            </DialogTitle>
            <DialogDescription>
              {editingSector
                ? "Update the sector details below"
                : "Create a new Project Bank sector"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sector-code">
                Code{" "}
                <RequiredDot />
              </Label>
              <Input
                id="sector-code"
                className="font-mono"
                value={sectorForm.code}
                onChange={(e) =>
                  setSectorForm({ ...sectorForm, code: e.target.value })
                }
                placeholder="e.g., TRAN, ENRG, HLTH"
                maxLength={8}
              />
              <p className="text-helper text-muted-foreground">
                Short uppercase code (auto-uppercased on save)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector-name">
                Name{" "}
                <RequiredDot />
              </Label>
              <Input
                id="sector-name"
                value={sectorForm.name}
                onChange={(e) =>
                  setSectorForm({ ...sectorForm, name: e.target.value })
                }
                placeholder="e.g., Transport, Energy, Health"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSectorDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSector} disabled={saving}>
              {saving
                ? "Saving..."
                : editingSector
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-sector Add/Edit Dialog */}
      <Dialog
        open={subSectorDialogOpen}
        onOpenChange={setSubSectorDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>
              {editingSubSector ? "Edit Sub-sector" : "Add Sub-sector"}
            </DialogTitle>
            <DialogDescription>
              {editingSubSector
                ? "Update the sub-sector name"
                : `Add a new sub-sector to "${
                    sectors.find((s) => s.id === parentSectorId)?.name || ""
                  }"`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="subsector-name">
                Name{" "}
                <RequiredDot />
              </Label>
              <Input
                id="subsector-name"
                value={subSectorForm.name}
                onChange={(e) =>
                  setSubSectorForm({ name: e.target.value })
                }
                placeholder="e.g., Roads & Highways, Power Generation"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubSectorDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSubSector} disabled={saving}>
              {saving
                ? "Saving..."
                : editingSubSector
                ? "Update"
                : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {deleteTarget?.type === "sector"
                ? "Deactivate Sector"
                : "Remove Sub-sector"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "sector" ? (
                <>
                  Are you sure you want to deactivate &ldquo;{deleteTarget?.name}
                  &rdquo;? It will no longer appear in the Project Bank intake
                  form. Existing projects using this sector will not be affected.
                </>
              ) : (
                <>
                  Are you sure you want to remove &ldquo;{deleteTarget?.name}
                  &rdquo;? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving
                ? "Processing..."
                : deleteTarget?.type === "sector"
                ? "Deactivate"
                : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
