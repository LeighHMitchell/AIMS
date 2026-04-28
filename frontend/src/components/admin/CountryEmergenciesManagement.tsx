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
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSortIcon } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  CountryEmergency,
  CountryEmergencyFormData,
} from "@/types/country-emergency";
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

export function CountryEmergenciesManagement() {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [emergencies, setEmergencies] = useState<CountryEmergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  type SortField = "name" | "description" | "startDate" | "endDate" | "location" | "isActive";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(20);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CountryEmergency | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CountryEmergencyFormData>({
    name: "",
    code: "",
    startDate: "",
    endDate: "",
    location: "",
    description: "",
    isActive: true,
  });

  // Fetch emergencies
  const fetchEmergencies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/country-emergencies");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch country emergencies");
      }

      setEmergencies(data.data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching emergencies:", err);
      setError(err.message || "Failed to load country emergencies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencies();
  }, [fetchEmergencies]);

  // Filter emergencies by search
  const filteredEmergencies = React.useMemo(() => {
    if (!searchQuery) return emergencies;

    const query = searchQuery.toLowerCase();
    return emergencies.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.code.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
    );
  }, [emergencies, searchQuery]);

  // Sort filtered results
  const sortedEmergencies = React.useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    const compare = (a: any, b: any) => {
      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;
      if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b) * dir;
      }
      return (a > b ? 1 : a < b ? -1 : 0) * dir;
    };
    return [...filteredEmergencies].sort((a, b) => {
      switch (sortField) {
        case "name":
          return compare(a.name?.toLowerCase(), b.name?.toLowerCase());
        case "description":
          return compare(a.description?.toLowerCase() ?? "", b.description?.toLowerCase() ?? "");
        case "startDate":
          return compare(a.startDate ? new Date(a.startDate).getTime() : null, b.startDate ? new Date(b.startDate).getTime() : null);
        case "endDate":
          return compare(a.endDate ? new Date(a.endDate).getTime() : null, b.endDate ? new Date(b.endDate).getTime() : null);
        case "location":
          return compare(a.location?.toLowerCase() ?? "", b.location?.toLowerCase() ?? "");
        case "isActive":
          return compare(a.isActive ? 1 : 0, b.isActive ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [filteredEmergencies, sortField, sortDirection]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Paginate
  const totalEmergencies = sortedEmergencies.length;
  const totalPages = Math.max(1, Math.ceil(totalEmergencies / pageLimit));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageLimit;
  const endIndex = startIndex + pageLimit;
  const pagedEmergencies = sortedEmergencies.slice(startIndex, endIndex);

  // Open modal for creating
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      code: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (item: CountryEmergency) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      location: item.location || "",
      description: item.description || "",
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  // Delete emergency
  const handleDelete = async (item: CountryEmergency) => {
    if (!(await confirm({ title: 'Delete this emergency?', description: `Are you sure you want to delete "${item.name}"?`, confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/country-emergencies/${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete emergency");
      }

      toast("Emergency deleted");
      fetchEmergencies();
    } catch (err: any) {
      console.error("Error deleting emergency:", err);
      toast.error(err.message || "Failed to delete emergency");
    }
  };

  // Save emergency
  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Name and code are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/admin/country-emergencies/${editingItem.id}`
        : "/api/admin/country-emergencies";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save emergency");
      }

      toast.success(
        editingItem
          ? "Emergency updated successfully"
          : "Emergency created successfully"
      );
      setIsModalOpen(false);
      fetchEmergencies();
    } catch (err: any) {
      console.error("Error saving emergency:", err);
      toast.error(err.message || "Failed to save emergency");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Country Emergencies
          </CardTitle>
          <CardDescription>
            Manage country-identified emergencies for humanitarian reporting
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
            <AlertTriangle className="h-5 w-5" />
            Country Emergencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-destructive">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error: {error}</p>
              <Button onClick={fetchEmergencies} variant="outline" className="mt-4">
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
                <AlertTriangle className="h-5 w-5" />
                Country Emergencies
              </CardTitle>
              <CardDescription>
                Manage country-identified emergencies for humanitarian scope vocabulary 98
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAdd} disabled={isLocked}>
                <Plus className="h-4 w-4 mr-2" />
                Add Emergency
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
                placeholder="Search by code, name, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
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
          {totalEmergencies === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No country emergencies found</p>
              <p className="text-body mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first country emergency to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleAdd} disabled={isLocked}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Emergency
                </Button>
              )}
            </div>
          ) : (
            <>
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-body">
                  <thead className="sticky top-0 bg-surface-muted z-10">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left align-top font-medium text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Emergency
                          {getSortIcon("name", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-left align-top font-medium text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleSort("description")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Description
                          {getSortIcon("description", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-left align-top font-medium text-muted-foreground w-[150px] min-w-[150px]">
                        <button
                          type="button"
                          onClick={() => handleSort("startDate")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Start Date
                          {getSortIcon("startDate", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-left align-top font-medium text-muted-foreground w-[150px] min-w-[150px]">
                        <button
                          type="button"
                          onClick={() => handleSort("endDate")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          End Date
                          {getSortIcon("endDate", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-left align-top font-medium text-muted-foreground w-[150px]">
                        <button
                          type="button"
                          onClick={() => handleSort("location")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Location
                          {getSortIcon("location", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-center align-top font-medium text-muted-foreground w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleSort("isActive")}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Active
                          {getSortIcon("isActive", sortField, sortDirection)}
                        </button>
                      </th>
                      <th className="h-12 px-4 py-3 text-right align-top font-medium text-muted-foreground w-[60px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEmergencies.map((emergency) => (
                      <tr key={emergency.id} className="border-b hover:bg-muted/20">
                        <td className="p-4 align-top">
                          <div className="flex items-start gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(emergency.name);
                                  toast.success("Name copied to clipboard");
                                } catch {
                                  toast.error("Failed to copy");
                                }
                              }}
                              className="font-medium text-left hover:underline focus:outline-none focus-visible:underline"
                              title="Click to copy"
                            >
                              {emergency.name}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(emergency.code);
                                  toast.success("Emergency ID copied to clipboard");
                                } catch {
                                  toast.error("Failed to copy");
                                }
                              }}
                              className="font-mono text-xs bg-muted hover:bg-muted/70 px-2 py-1 rounded whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                              title="Click to copy"
                            >
                              {emergency.code}
                            </button>
                          </div>
                        </td>
                        <td className="p-4 align-top text-body text-muted-foreground">
                          {emergency.description || "—"}
                        </td>
                        <td className="p-4 align-top text-body text-muted-foreground whitespace-nowrap w-[150px] min-w-[150px]">
                          {formatDate(emergency.startDate)}
                        </td>
                        <td className="p-4 align-top text-body text-muted-foreground whitespace-nowrap w-[150px] min-w-[150px]">
                          {formatDate(emergency.endDate)}
                        </td>
                        <td className="p-4 align-top text-body text-muted-foreground">
                          {emergency.location || "—"}
                        </td>
                        <td className="p-4 align-top text-center">
                          <Badge
                            variant={emergency.isActive ? "default" : "outline"}
                            className={
                              emergency.isActive
                                ? "bg-green-800"
                                : "border-input text-muted-foreground bg-muted"
                            }
                          >
                            {emergency.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-4 align-top text-right">
                          {!isLocked && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(emergency)}>
                                  <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(emergency)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
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

            {/* Pagination */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-4 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-body text-muted-foreground">
                  Showing {Math.min(startIndex + 1, totalEmergencies)} to {Math.min(endIndex, totalEmergencies)} of {totalEmergencies} emergenc{totalEmergencies !== 1 ? "ies" : "y"}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (safePage <= 3) {
                        pageNum = i + 1;
                      } else if (safePage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = safePage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 p-0 ${safePage === pageNum ? "bg-muted text-foreground" : ""}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                  >
                    Last
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-body text-muted-foreground">Items per page:</label>
                  <Select
                    value={pageLimit.toString()}
                    onValueChange={(value) => {
                      setPageLimit(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Country Emergency" : "Add Country Emergency"}
            </DialogTitle>
            <DialogDescription>
              Define a country-identified emergency for humanitarian scope reporting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <RequiredDot /></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Cyclone Mocha 2023"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code <RequiredDot /></Label>
              <Input
                id="code"
                className="font-mono"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="e.g., MMR-CYCLONE-2023"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(value) =>
                    setFormData({ ...formData, startDate: value })
                  }
                  placeholder="Select start date"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  value={formData.endDate}
                  onChange={(value) =>
                    setFormData({ ...formData, endDate: value })
                  }
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g., Rakhine State, Myanmar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed description of the emergency..."
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
              <Label htmlFor="isActive" className="flex items-center gap-1">
                Active
                <HelpTextTooltip content="When active, this emergency will be available for selection in the activity editor." />
              </Label>
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
      <ConfirmDialog />
    </>
  );
}
