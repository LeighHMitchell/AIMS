"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Download, Edit2, Trash2, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, Users } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Transaction, LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction";

type Activity = {
  id: string;
  title: string;
  activityStatus?: string; // IATI activity status (planning, implementation, etc.)
  publicationStatus?: string; // Publication status (draft, published)
  submissionStatus?: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published';
  submittedByName?: string;
  submittedAt?: string;
  status?: string; // Legacy status field for backward compatibility
  createdAt: string;
  updatedAt: string;
  partnerId?: string;
  iatiId?: string;
  description?: string;
  objectives?: string;
  targetGroups?: string;
  collaborationType?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  sectors?: any[];
  transactions?: Transaction[];
  createdByOrg?: string; // Organization that created the activity
  contributors?: any[]; // Added for contributors
};

type SortField = 'title' | 'partnerId' | 'activityStatus' | 'publicationStatus' | 'commitment' | 'disbursement' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const getActivityStatusColor = (status: string): "secondary" | "success" | "default" | "destructive" => {
  const colors: Record<string, "secondary" | "success" | "default" | "destructive"> = {
    draft: "secondary",
    published: "success",
    planning: "default",
    implementation: "default",
    completed: "success",
    cancelled: "destructive",
    "": "secondary",
  };
  return colors[status] || "default";
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [publicationFilter, setPublicationFilter] = useState<string>("all");
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const router = useRouter();
  const { user } = useUser();

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("Failed to fetch activities");
      const data = await res.json();
      console.log("[AIMS Debug] Activities fetched:", data.length);
      console.log("[AIMS Debug] First activity status:", data[0]?.status);
      console.log("[AIMS Debug] Activities with status:", data.map((a: Activity) => ({ id: a.id, title: a.title, status: a.status })));
      setActivities(data);
    } catch (error) {
      console.error("[AIMS] Error fetching activities:", error);
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  // Fetch activities on mount and when returning to this page
  useEffect(() => {
    fetchActivities();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role,
          } : undefined,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to delete activity");
      
      toast.success("Activity deleted successfully");
      setDeleteActivityId(null);
      fetchActivities();
    } catch (error) {
      console.error("[AIMS] Error deleting activity:", error);
      toast.error("Failed to delete activity");
    }
  };

  const calculateTotals = (transactions: Transaction[] = []) => {
    const actualTransactions = transactions.filter(t => t.status === "actual");
    
    // Helper function to normalize transaction type
    const normalizeType = (type: string): string => {
      return LEGACY_TRANSACTION_TYPE_MAP[type] || type;
    };
    
    const commitment = actualTransactions
      .filter(t => normalizeType(t.type) === "C") // Commitment
      .reduce((sum, t) => sum + t.value, 0);
    const disbursement = actualTransactions
      .filter(t => normalizeType(t.type) === "D") // Disbursement
      .reduce((sum, t) => sum + t.value, 0);
    
    return { commitment, disbursement };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-gray-700" />
      : <ChevronDown className="h-4 w-4 text-gray-700" />;
  };

  const exportActivities = () => {
    const dataToExport = activities.map(activity => {
      const { commitment, disbursement } = calculateTotals(activity.transactions);
      const sectors = activity.sectors?.map(s => `${s.name} (${s.percentage}%)`).join("; ") || "";
      
      return {
        "Activity ID": activity.id,
        "IATI ID": activity.iatiId || "",
        "Partner ID": activity.partnerId || "",
        "Title": activity.title,
        "Description": activity.description || "",
        "Status": activity.status,
        "Objectives": activity.objectives || "",
        "Target Groups": activity.targetGroups || "",
        "Collaboration Type": activity.collaborationType || "",
        "Sectors": sectors,
        "Total Commitment": commitment,
        "Total Disbursement": disbursement,
        "Created Date": format(new Date(activity.createdAt), "yyyy-MM-dd"),
        "Updated Date": format(new Date(activity.updatedAt), "yyyy-MM-dd"),
      };
    });

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === "string" && value.includes(",") 
            ? `"${value}"` 
            : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activities-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Activities exported successfully");
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(search.toLowerCase()) ||
                         activity.partnerId?.toLowerCase().includes(search.toLowerCase()) ||
                         activity.iatiId?.toLowerCase().includes(search.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(search.toLowerCase());
    
    // Handle both legacy and new status fields
    const activityStatus = activity.activityStatus || 
      (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning");
    const publicationStatus = activity.publicationStatus || 
      (activity.status === "published" ? "published" : "draft");
    
    // Filter by activity status
    const matchesActivityStatus = statusFilter === "all" || activityStatus === statusFilter;
    
    // Filter by publication status  
    const matchesPublicationStatus = publicationFilter === "all" || publicationStatus === publicationFilter;
    
    return matchesSearch && matchesActivityStatus && matchesPublicationStatus;
  });

  // Sort activities
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'partnerId':
        aValue = a.partnerId?.toLowerCase() || '';
        bValue = b.partnerId?.toLowerCase() || '';
        break;
      case 'activityStatus':
        aValue = a.activityStatus || (a.status && !["published", "draft"].includes(a.status) ? a.status : "planning");
        bValue = b.activityStatus || (b.status && !["published", "draft"].includes(b.status) ? b.status : "planning");
        break;
      case 'publicationStatus':
        aValue = a.publicationStatus || (a.status === "published" ? "published" : "draft");
        bValue = b.publicationStatus || (b.status === "published" ? "published" : "draft");
        break;
      case 'commitment':
        aValue = calculateTotals(a.transactions).commitment;
        bValue = calculateTotals(b.transactions).commitment;
        break;
      case 'disbursement':
        aValue = calculateTotals(a.transactions).disbursement;
        bValue = calculateTotals(b.transactions).disbursement;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Activities</h1>
              <p className="text-muted-foreground mt-1">Manage and track all development activities</p>
            </div>
            <div className="flex gap-2">
              {activities.length > 0 && (
                <Button variant="outline" onClick={exportActivities}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Activities
                </Button>
              )}
              {/* {user && ( */}
                <Button onClick={() => router.push("/activities/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </Button>
              {/* )} */}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Activity Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="implementation">Implementation</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={publicationFilter} onValueChange={setPublicationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Publication Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publication Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Activity Table */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading activities...</div>
            ) : sortedActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {search || statusFilter !== "all" || publicationFilter !== "all" ? "No matching activities found" : "No activities yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center gap-1">
                          Activity
                          {getSortIcon('title')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('activityStatus')}
                      >
                        <div className="flex items-center gap-1">
                          Activity Status
                          {getSortIcon('activityStatus')}
                        </div>
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submission Status
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('publicationStatus')}
                      >
                        <div className="flex items-center gap-1">
                          Publication Status
                          {getSortIcon('publicationStatus')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('commitment')}
                      >
                        <div className="flex items-center gap-1">
                          Total Commitment
                          {getSortIcon('commitment')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('disbursement')}
                      >
                        <div className="flex items-center gap-1">
                          Total Disbursement
                          {getSortIcon('disbursement')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Created
                          {getSortIcon('createdAt')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          Last Edited
                          {getSortIcon('updatedAt')}
                        </div>
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedActivities.map(activity => {
                      const { commitment, disbursement } = calculateTotals(activity.transactions);
                      return (
                        <tr
                          key={activity.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-2">
                            <div 
                              className="cursor-pointer"
                              onClick={() => router.push(`/activities/${activity.id}`)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-semibold">{activity.title}</h3>
                                <div className="flex gap-2">
                                  {activity.contributors && activity.contributors.length > 0 && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {activity.contributors.filter((c: any) => c.status === 'accepted').length} Contributors
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={activity.publicationStatus === "published" ? "success" : "secondary"}
                                  >
                                    {activity.publicationStatus === "published" ? "Published" : "Draft"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                {activity.partnerId && (
                                  <div>
                                    <span className="font-medium">Partner ID:</span> {activity.partnerId}
                                  </div>
                                )}
                                {activity.iatiId && (
                                  <div>
                                    <span className="font-medium">IATI ID:</span> {activity.iatiId}
                                  </div>
                                )}
                                {activity.createdByOrg && (
                                  <div className="text-gray-600">
                                    Created by: {activity.createdByOrg}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Badge 
                              variant={getActivityStatusColor(activity.activityStatus || 
                                (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning"))}
                              className="rounded-md"
                            >
                              {(activity.activityStatus || 
                                (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning")
                              ).charAt(0).toUpperCase() + 
                              (activity.activityStatus || 
                                (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning")
                              ).slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <Badge 
                              variant={
                                activity.submissionStatus === 'submitted' ? 'default' :
                                activity.submissionStatus === 'validated' ? 'success' :
                                activity.submissionStatus === 'rejected' ? 'destructive' : 'secondary'
                              }
                              className="rounded-md"
                            >
                              {activity.submissionStatus ? 
                                activity.submissionStatus.charAt(0).toUpperCase() + activity.submissionStatus.slice(1) 
                                : 'Draft'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <Badge 
                              variant={
                                (activity.publicationStatus === "published" || 
                                 (activity.status === "published" && !activity.publicationStatus)) 
                                  ? "success" : "secondary"
                              }
                              className="rounded-md"
                            >
                              {activity.publicationStatus === "published" || 
                               (activity.status === "published" && !activity.publicationStatus)
                                ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(commitment)}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(disbursement)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {format(new Date(activity.createdAt), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {format(new Date(activity.updatedAt), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/activities/${activity.id}?edit=true`)}
                                title="Edit activity"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteActivityId(activity.id)}
                                title="Delete activity"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Activity</DialogTitle>
                <DialogDesc>
                  Are you sure you want to delete this activity? This action cannot be undone.
                </DialogDesc>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteActivityId(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteActivityId && handleDelete(deleteActivityId)}
                >
                  Delete Activity
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  );
} 