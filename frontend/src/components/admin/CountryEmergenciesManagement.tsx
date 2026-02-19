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
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  Lock,
  Unlock,
} from "lucide-react";
import {
  CountryEmergency,
  CountryEmergencyFormData,
} from "@/types/country-emergency";

export function CountryEmergenciesManagement() {
  const [emergencies, setEmergencies] = useState<CountryEmergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocked, setIsLocked] = useState(true);

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
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
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

      toast.success("Emergency deleted successfully");
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
          <div className="flex items-center justify-center py-12 text-red-600">
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
          {filteredEmergencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No country emergencies found</p>
              <p className="text-sm mb-4">
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
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-muted z-10">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[200px]">
                        Code
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">
                        Start Date
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[110px]">
                        End Date
                      </th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[150px]">
                        Location
                      </th>
                      <th className="h-12 px-4 py-3 text-center font-medium text-muted-foreground w-[80px]">
                        Active
                      </th>
                      <th className="h-12 px-4 py-3 text-right font-medium text-muted-foreground w-[60px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmergencies.map((emergency) => (
                      <tr key={emergency.id} className="border-b hover:bg-muted/20">
                        <td className="p-4">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {emergency.code}
                          </span>
                        </td>
                        <td className="p-4 font-medium">
                          {emergency.name}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {emergency.description || "—"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(emergency.startDate)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(emergency.endDate)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {emergency.location || "—"}
                        </td>
                        <td className="p-4 text-center">
                          <Badge
                            variant="outline"
                            className={
                              emergency.isActive
                                ? "border-green-300 text-green-700 bg-green-50"
                                : "border-gray-300 text-gray-500 bg-gray-50"
                            }
                          >
                            {emergency.isActive ? "Active" : "Inactive"}
                          </Badge>
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
                                <DropdownMenuItem onClick={() => handleEdit(emergency)}>
                                  <Pencil className="h-4 w-4 mr-2 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(emergency)}
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
            Showing {filteredEmergencies.length} emergenc{filteredEmergencies.length !== 1 ? "ies" : "y"}
          </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
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
                <Label htmlFor="code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="e.g., MMR-CYCLONE-2023"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
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
              <Label htmlFor="isActive">Active (available for selection in activity editor)</Label>
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
