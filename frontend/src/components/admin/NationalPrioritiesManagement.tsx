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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Target,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderTree,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  NationalPriority,
  NationalPriorityFormData,
  buildPriorityTree,
} from "@/types/national-priorities";
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

// ============================================
// TREE NODE COMPONENT
// ============================================

interface TreeNodeProps {
  node: NationalPriority;
  level: number;
  onEdit: (item: NationalPriority) => void;
  onDelete: (item: NationalPriority) => void;
  onAddChild: (parent: NationalPriority) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  levelLabels: [string, string, string];
}

function TreeNode({
  node,
  level,
  onEdit,
  onDelete,
  onAddChild,
  expandedIds,
  toggleExpanded,
  levelLabels,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="border-b last:border-b-0">
      <div
        className={`flex items-start gap-4 py-2 px-3 hover:bg-muted/50 group ${
          !node.isActive ? "opacity-60" : ""
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && toggleExpanded(node.id)}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            hasChildren ? "cursor-pointer hover:bg-muted rounded" : "cursor-default"
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

        {/* Level label */}
        <span className="w-[80px] flex-shrink-0 text-body text-foreground">
          {levelLabels[node.level - 1] || `Level ${node.level}`}
        </span>

        {/* Code + Name */}
        <span className="text-body text-foreground flex-1 min-w-0 truncate">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">
            {node.code}
          </span>
          {node.name}
        </span>

        {/* Description */}
        <span className="text-body text-foreground flex-1 min-w-0 truncate">
          {node.description || ""}
        </span>

        {/* Status */}
        <span className="w-[60px] flex-shrink-0 text-body text-foreground">
          {node.isActive ? "Active" : "Inactive"}
        </span>

        {/* Actions */}
        <div className="w-[100px] flex-shrink-0 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                Edit
              </DropdownMenuItem>
              {node.level < 3 && (
                <DropdownMenuItem onClick={() => onAddChild(node)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Sub-Priority
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(node)}
              >
                <Trash2 className="h-4 w-4 mr-2 text-muted-foreground" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              levelLabels={levelLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface NationalPrioritiesManagementProps {
  planId?: string;
  levelLabels?: [string, string, string];
}

const DEFAULT_LEVEL_LABELS: [string, string, string] = ['Goal', 'Objective', 'Action'];

export function NationalPrioritiesManagement({ planId, levelLabels = DEFAULT_LEVEL_LABELS }: NationalPrioritiesManagementProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [priorities, setPriorities] = useState<NationalPriority[]>([]);
  const [flatPriorities, setFlatPriorities] = useState<NationalPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<NationalPriority | null>(null);
  const [parentForNew, setParentForNew] = useState<NationalPriority | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<NationalPriorityFormData>({
    planId: planId || "",
    code: "",
    name: "",
    nameLocal: "",
    description: "",
    parentId: null,
    isActive: true,
  });

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchPriorities = useCallback(async () => {
    if (!planId) {
      setPriorities([]);
      setFlatPriorities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeInactive: showInactive.toString(),
        asTree: "false", // Get flat list first
        planId,
      });

      const response = await apiFetch(`/api/national-priorities?${params}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch priorities");
      }

      setFlatPriorities(result.data);
      setPriorities(buildPriorityTree(result.data));
      
      // Expand first level by default
      const firstLevel = result.data.filter((p: NationalPriority) => p.level === 1);
      setExpandedIds(new Set(firstLevel.map((p: NationalPriority) => p.id)));
    } catch (error) {
      console.error("Error fetching priorities:", error);
      toast.error("Failed to load national priorities");
    } finally {
      setLoading(false);
    }
  }, [showInactive, planId]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  // ============================================
  // TREE OPERATIONS
  // ============================================

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(flatPriorities.map((p) => p.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const handleAddNew = (parent?: NationalPriority) => {
    setSelectedPriority(null);
    setParentForNew(parent || null);
    setFormData({
      planId: planId || "",
      code: "",
      name: "",
      nameLocal: "",
      description: "",
      parentId: parent?.id || null,
      isActive: true,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (priority: NationalPriority) => {
    setSelectedPriority(priority);
    setParentForNew(null);
    setFormData({
      planId: priority.planId || planId || "",
      code: priority.code,
      name: priority.name,
      nameLocal: priority.nameLocal || "",
      description: priority.description || "",
      parentId: priority.parentId || null,
      isActive: priority.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (priority: NationalPriority) => {
    setSelectedPriority(priority);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Code and name are required");
      return;
    }

    try {
      setSaving(true);

      const url = selectedPriority
        ? `/api/national-priorities/${selectedPriority.id}`
        : "/api/national-priorities";

      const method = selectedPriority ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save priority");
      }

      toast.success(
        selectedPriority
          ? "Priority updated successfully"
          : "Priority created successfully"
      );

      setEditDialogOpen(false);
      fetchPriorities();
    } catch (error: any) {
      console.error("Error saving priority:", error);
      toast.error(error.message || "Failed to save priority");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (force = false) => {
    if (!selectedPriority) return;

    try {
      setSaving(true);

      const url = `/api/national-priorities/${selectedPriority.id}${force ? "?force=true" : ""}`;
      const response = await fetch(url, { method: "DELETE" });
      const result = await response.json();

      if (!result.success) {
        if (result.requiresConfirmation) {
          // Show confirmation with details
          const proceed = await confirm({
            title: 'Delete priority with dependencies?',
            description: `This priority has ${result.childrenCount} sub-priorities and ${result.activitiesCount} linked activities. Are you sure you want to delete it?`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
          });
          if (proceed) {
            await handleConfirmDelete(true);
          }
          return;
        }
        throw new Error(result.error || "Failed to delete priority");
      }

      toast.success("Priority deleted successfully");
      setDeleteDialogOpen(false);
      fetchPriorities();
    } catch (error: any) {
      console.error("Error deleting priority:", error);
      toast.error(error.message || "Failed to delete priority");
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // FILTERING
  // ============================================

  const filteredPriorities = React.useMemo(() => {
    if (!searchQuery.trim()) return priorities;

    const query = searchQuery.toLowerCase();
    
    // Filter flat list
    const matchingIds = new Set(
      flatPriorities
        .filter(
          (p) =>
            p.code.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query) ||
            p.nameLocal?.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        )
        .map((p) => p.id)
    );

    // Include parents of matching items
    flatPriorities.forEach((p) => {
      if (matchingIds.has(p.id) && p.parentId) {
        let currentParentId: string | null | undefined = p.parentId;
        while (currentParentId) {
          matchingIds.add(currentParentId);
          const parent = flatPriorities.find((pp) => pp.id === currentParentId);
          currentParentId = parent?.parentId;
        }
      }
    });

    const filtered = flatPriorities.filter((p) => matchingIds.has(p.id));
    return buildPriorityTree(filtered);
  }, [priorities, flatPriorities, searchQuery]);

  // ============================================
  // RENDER
  // ============================================

  if (!planId) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-body font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Strategic Objectives
            </h3>
            <p className="text-helper text-muted-foreground mt-0.5">
              {levelLabels[0]}s, {levelLabels[1].toLowerCase()}s, and {levelLabels[2].toLowerCase()}s within this plan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm" onClick={() => handleAddNew()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Priority
            </Button>
          </div>
        </div>

        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search priorities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-body">
                Show Inactive
              </Label>
            </div>

          </div>

          {/* Header Row */}
          <div className="flex items-center gap-4 py-2 px-3 bg-muted/50 border-b font-medium text-body">
            <span className="w-5" /> {/* Expand button spacer */}
            <span className="w-[80px]">Type</span>
            <span className="flex-1">Name</span>
            <span className="flex-1">Description</span>
            <span className="w-[60px]">Status</span>
            <span className="w-[100px] text-right" />
          </div>

          {/* Tree Content */}
          <div className="border rounded-md mt-2">
            {filteredPriorities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No national priorities found</p>
                <p className="text-body mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Click \"Add Priority\" to create one"}
                </p>
              </div>
            ) : (
              filteredPriorities.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddChild={handleAddNew}
                  expandedIds={expandedIds}
                  toggleExpanded={toggleExpanded}
                  levelLabels={levelLabels}
                />
              ))
            )}
          </div>

        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPriority ? "Edit Priority" : "Add National Priority"}
            </DialogTitle>
            <DialogDescription>
              {parentForNew
                ? `Creating sub-priority under "${parentForNew.name}"`
                : selectedPriority
                ? "Update the priority details below"
                : "Create a new top-level national priority"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code <RequiredDot /></Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="e.g., SC, INF, ECO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name <RequiredDot /></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Social Capital"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameLocal">Local Name</Label>
              <Input
                id="nameLocal"
                value={formData.nameLocal || ""}
                onChange={(e) =>
                  setFormData({ ...formData, nameLocal: e.target.value })
                }
                placeholder="Name in local language"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this priority"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
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
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : selectedPriority ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              Delete Priority
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPriority?.name}"?
              {selectedPriority?.children && selectedPriority.children.length > 0 && (
                <span className="block mt-2 text-muted-foreground">
                  Warning: This will also delete all sub-priorities.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmDelete()}
              disabled={saving}
              className=""
            >
              {saving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDialog />
    </>
  );
}

