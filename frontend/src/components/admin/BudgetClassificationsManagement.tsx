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
  Landmark,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderTree,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
} from "lucide-react";
import {
  BudgetClassification,
  ClassificationType,
  CLASSIFICATION_TYPE_LABELS,
  CLASSIFICATION_TYPE_DESCRIPTIONS,
  BudgetClassificationFormData,
} from "@/types/aid-on-budget";

type SortColumn = "code" | "name" | "nameLocal" | "status";
type SortDirection = "asc" | "desc";

interface TreeNodeProps {
  node: BudgetClassification & { children?: BudgetClassification[] };
  level: number;
  onEdit: (item: BudgetClassification) => void;
  onDelete: (item: BudgetClassification) => void;
  onAddChild: (parent: BudgetClassification) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  isLocked: boolean;
}

function TreeNode({
  node,
  level,
  onEdit,
  onDelete,
  onAddChild,
  expandedIds,
  toggleExpanded,
  isLocked,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="border-b last:border-b-0">
      <div
        className={`flex items-center gap-4 py-2 px-3 hover:bg-muted/50 group ${
          !node.isActive ? "opacity-60" : ""
        }`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && toggleExpanded(node.id)}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
            hasChildren ? "cursor-pointer" : "cursor-default"
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

        {/* Code */}
        <span className="w-[80px] flex-shrink-0">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded inline-block">
            {node.code}
          </span>
        </span>

        {/* Name */}
        <span className="text-sm truncate flex-1 min-w-0">{node.name}</span>

        {/* Local Name */}
        <span className="hidden md:block text-xs text-muted-foreground italic flex-1 min-w-0 truncate">
          {node.nameLocal || "—"}
        </span>

        {/* Description */}
        <span className="hidden lg:block text-xs text-muted-foreground flex-[2] min-w-0 truncate">
          {node.description || "—"}
        </span>

        {/* Status */}
        <span className="w-[100px] flex flex-shrink-0 pl-2">
          {!node.isActive ? (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
              Active
            </Badge>
          )}
        </span>

        {/* Type Badge */}
        <span className="w-[160px] flex flex-shrink-0 pl-2">
          <Badge
            variant="outline"
            className={`text-xs ${
              node.classificationType === "functional"
                ? "border-blue-300 text-blue-700"
                : node.classificationType === "functional_cofog"
                ? "border-cyan-300 text-cyan-700"
                : node.classificationType === "administrative"
                ? "border-green-300 text-green-700"
                : node.classificationType === "economic"
                ? "border-orange-300 text-orange-700"
                : node.classificationType === "revenue"
                ? "border-emerald-300 text-emerald-700"
                : node.classificationType === "liabilities"
                ? "border-rose-300 text-rose-700"
                : node.classificationType === "funding_sources"
                ? "border-indigo-300 text-indigo-700"
                : "border-purple-300 text-purple-700"
            }`}
          >
            {CLASSIFICATION_TYPE_LABELS[node.classificationType]}
          </Badge>
        </span>

        {/* Actions - only show when unlocked */}
        {!isLocked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(node)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(node)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="border-t border-dashed">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child as BudgetClassification & { children?: BudgetClassification[] }}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              isLocked={isLocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BudgetClassificationsManagement() {
  const [classifications, setClassifications] = useState<
    (BudgetClassification & { children?: BudgetClassification[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ClassificationType>("functional");
  const [showInactive, setShowInactive] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLocked, setIsLocked] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetClassification | null>(null);
  const [parentItem, setParentItem] = useState<BudgetClassification | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<BudgetClassificationFormData>({
    code: "",
    name: "",
    nameLocal: "",
    description: "",
    classificationType: "functional",
    parentId: undefined,
    isActive: true,
    sortOrder: 0,
  });

  // Fetch classifications
  const fetchClassifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("type", filterType);
      if (!showInactive) params.set("activeOnly", "true");

      const response = await fetch(
        `/api/admin/budget-classifications?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch classifications");
      }

      setClassifications(data.data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching classifications:", err);
      setError(err.message || "Failed to load classifications");
    } finally {
      setLoading(false);
    }
  }, [filterType, showInactive]);

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Expand all
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: BudgetClassification[]) => {
      items.forEach((item) => {
        allIds.add(item.id);
        if ((item as any).children) {
          collectIds((item as any).children);
        }
      });
    };
    collectIds(classifications);
    setExpandedIds(allIds);
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Toggle sort
  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Open modal for creating
  const handleAdd = (parent?: BudgetClassification) => {
    setEditingItem(null);
    setParentItem(parent || null);
    setFormData({
      code: "",
      name: "",
      nameLocal: "",
      description: "",
      classificationType: parent?.classificationType || "functional",
      parentId: parent?.id,
      isActive: true,
      sortOrder: 0,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (item: BudgetClassification) => {
    setEditingItem(item);
    setParentItem(null);
    setFormData({
      code: item.code,
      name: item.name,
      nameLocal: item.nameLocal || "",
      description: item.description || "",
      classificationType: item.classificationType,
      parentId: item.parentId,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setIsModalOpen(true);
  };

  // Delete classification
  const handleDelete = async (item: BudgetClassification) => {
    if (
      !confirm(
        `Are you sure you want to delete "${item.name}"? This will also delete all child classifications.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/budget-classifications/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete classification");
      }

      toast.success("Classification deleted successfully");
      fetchClassifications();
    } catch (err: any) {
      console.error("Error deleting classification:", err);
      toast.error(err.message || "Failed to delete classification");
    }
  };

  // Save classification
  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Code and name are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/budget-classifications/${editingItem.id}`
        : "/api/admin/budget-classifications";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save classification");
      }

      toast.success(
        editingItem
          ? "Classification updated successfully"
          : "Classification created successfully"
      );
      setIsModalOpen(false);
      fetchClassifications();
    } catch (err: any) {
      console.error("Error saving classification:", err);
      toast.error(err.message || "Failed to save classification");
    } finally {
      setSaving(false);
    }
  };

  // Sort function for classifications
  const sortNodes = (
    nodes: (BudgetClassification & { children?: BudgetClassification[] })[]
  ): (BudgetClassification & { children?: BudgetClassification[] })[] => {
    const sorted = [...nodes].sort((a, b) => {
      // Handle status sorting separately (boolean values)
      if (sortColumn === "status") {
        const aActive = a.isActive;
        const bActive = b.isActive;
        // Active comes before inactive in asc
        const comparison = aActive === bActive ? 0 : aActive ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle string sorting
      let aVal: string;
      let bVal: string;

      switch (sortColumn) {
        case "code":
          aVal = a.code;
          bVal = b.code;
          break;
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "nameLocal":
          aVal = a.nameLocal || "";
          bVal = b.nameLocal || "";
          break;
        default:
          aVal = a.code;
          bVal = b.code;
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    // Recursively sort children
    return sorted.map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children as any) : undefined,
    }));
  };

  // Filter and sort classifications
  const filteredClassifications = React.useMemo(() => {
    let result = classifications;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filterNodes = (
        nodes: (BudgetClassification & { children?: BudgetClassification[] })[]
      ): (BudgetClassification & { children?: BudgetClassification[] })[] => {
        return nodes
          .map((node) => {
            const matchesSelf =
              node.code.toLowerCase().includes(query) ||
              node.name.toLowerCase().includes(query) ||
              (node.nameLocal?.toLowerCase().includes(query) ?? false);

            const filteredChildren = node.children
              ? filterNodes(node.children as any)
              : [];

            if (matchesSelf || filteredChildren.length > 0) {
              return {
                ...node,
                children: filteredChildren.length > 0 ? filteredChildren : node.children,
              };
            }
            return null;
          })
          .filter(Boolean) as (BudgetClassification & { children?: BudgetClassification[] })[];
      };
      result = filterNodes(result);
    }

    // Apply sorting
    return sortNodes(result);
  }, [classifications, searchQuery, sortColumn, sortDirection]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Chart of Accounts
          </CardTitle>
          <CardDescription>
            Manage budget classifications for aid-on-budget reporting
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
            <Landmark className="h-5 w-5" />
            Chart of Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error: {error}</p>
              <Button onClick={fetchClassifications} variant="outline" className="mt-4">
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
                <Landmark className="h-5 w-5" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>
                Manage budget classifications for aid-on-budget reporting
              </CardDescription>
            </div>
            <Button onClick={() => handleAdd()} disabled={isLocked}>
              <Plus className="h-4 w-4 mr-2" />
              Add Classification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filterType}
                onValueChange={(value) =>
                  setFilterType(value as ClassificationType)
                }
              >
                <SelectTrigger className="w-[220px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional - National</SelectItem>
                  <SelectItem value="functional_cofog">Functional - COFOG</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                  <SelectItem value="economic">Economic</SelectItem>
                  <SelectItem value="programme">Programme</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="liabilities">Liabilities</SelectItem>
                  <SelectItem value="funding_sources">Funding Sources</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 px-3">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                  Show Inactive
                </Label>
              </div>

              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              <Button
                variant={isLocked ? "outline" : "default"}
                size="sm"
                onClick={() => setIsLocked(!isLocked)}
                className={isLocked ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
                title={isLocked ? "Click to unlock editing" : "Click to lock editing"}
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

          {/* Tree View */}
          {filteredClassifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <FolderTree className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No classifications found</p>
              <p className="text-sm mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first budget classification to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => handleAdd()} disabled={isLocked}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Classification
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
                <div className="flex items-center gap-4 py-3 px-3 text-sm font-medium text-muted-foreground">
                  <div className="w-5 flex-shrink-0" /> {/* Spacer for expand icon */}
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors w-[80px] flex-shrink-0"
                    onClick={() => toggleSort("code")}
                  >
                    Code
                    {sortColumn === "code" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors flex-1 min-w-0"
                    onClick={() => toggleSort("name")}
                  >
                    Name
                    {sortColumn === "name" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                  <button
                    className="hidden md:flex items-center gap-1 hover:text-foreground transition-colors flex-1 min-w-0"
                    onClick={() => toggleSort("nameLocal")}
                  >
                    Local Name
                    {sortColumn === "nameLocal" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                  <div className="hidden lg:flex flex-[2] min-w-0">Description</div>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors w-[100px] flex-shrink-0 pl-2"
                    onClick={() => toggleSort("status")}
                  >
                    Status
                    {sortColumn === "status" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                  <div className="w-[160px] flex-shrink-0 pl-2">Type</div>
                  <div className="w-8 flex-shrink-0" /> {/* Spacer for actions */}
                </div>
              </div>
              {/* Scrollable Content */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredClassifications.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddChild={handleAdd}
                    expandedIds={expandedIds}
                    toggleExpanded={toggleExpanded}
                    isLocked={isLocked}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredClassifications.length} classification
            {filteredClassifications.length !== 1 ? "s" : ""}
            {` (${CLASSIFICATION_TYPE_LABELS[filterType]})`}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Classification" : "Add Classification"}
            </DialogTitle>
            <DialogDescription>
              {parentItem
                ? `Adding child to: ${parentItem.name}`
                : editingItem
                ? "Update the budget classification details"
                : "Create a new budget classification"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g., 07"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classificationType">Type *</Label>
                <Select
                  value={formData.classificationType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      classificationType: value as ClassificationType,
                    })
                  }
                  disabled={!!parentItem}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(CLASSIFICATION_TYPE_LABELS) as ClassificationType[]
                    ).map((type) => (
                      <SelectItem key={type} value={type}>
                        <div>
                          <div>{CLASSIFICATION_TYPE_LABELS[type]}</div>
                          <div className="text-xs text-muted-foreground">
                            {CLASSIFICATION_TYPE_DESCRIPTIONS[type]}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Health"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameLocal">Local Name (Optional)</Label>
              <Input
                id="nameLocal"
                value={formData.nameLocal}
                onChange={(e) =>
                  setFormData({ ...formData, nameLocal: e.target.value })
                }
                placeholder="Name in local language"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this classification"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-4">
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

              <div className="flex items-center gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20"
                />
              </div>
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
    </>
  );
}
