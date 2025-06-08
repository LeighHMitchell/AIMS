"use client"

import { useState, useEffect, useMemo, Suspense } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Plus, 
  Download, 
  Upload, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Users, 
  Info, 
  Filter, 
  Search, 
  Copy, 
  HelpCircle, 
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Transaction, LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction";
import { ActivityContributor } from "@/lib/activity-permissions";
import { cn } from "@/lib/utils";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ContributorDisplay } from "@/components/ContributorDisplay";
import ActivitySummaryCards from "@/components/ActivitySummaryCards";
import { SearchParamsHandler } from "@/components/SearchParamsHandler";

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
  organization?: { id: string; name: string; acronym: string | null }; // Organization details
  createdBy?: { id: string; name: string; role: string };
  contributors?: ActivityContributor[]; // Contributors with roles
};

type SortField = 'title' | 'createdBy' | 'activityStatus' | 'publicationStatus' | 'commitment' | 'disbursement' | 'createdAt' | 'updatedAt' | 'startDate';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50, 100, 'All'];
const DEFAULT_PAGE_SIZE = 20;

const getActivityStatusColor = (status: string): "default" | "secondary" | "success" | "destructive" => {
  const colors: Record<string, "default" | "secondary" | "success" | "destructive"> = {
    planning: "default",      // Blue
    implementation: "secondary",  // Yellow/Orange
    completed: "success",     // Green
    cancelled: "destructive", // Red
    "": "default",
  };
  return colors[status?.toLowerCase()] || "default";
};

const getPublicationStatusColor = (status: string): "secondary" | "success" => {
  return status?.toLowerCase() === "published" ? "success" : "secondary";
};

export default function ActivitiesPage() {
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>("all");
  const [publicationStatusFilter, setPublicationStatusFilter] = useState<string>("all");
  const [contributorFilter, setContributorFilter] = useState<string>("all");
  const [contributorRoleFilter, setContributorRoleFilter] = useState<string>("all");
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Pagination state
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();
  const { user } = useUser();

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities");
      if (!res.ok) throw new Error("Failed to fetch activities");
      const data = await res.json();
      console.log("[AIMS Debug] Activities fetched:", data.length);
      setAllActivities(data);
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

  // Handle import parameter
  const handleImportParam = (shouldShow: boolean) => {
    if (shouldShow) {
      setShowBulkImport(true);
      // Clean up the URL by removing the query parameter
      router.replace('/activities');
    }
  };

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

  const getStartDate = (activity: Activity): string | null => {
    const status = activity.activityStatus?.toLowerCase() || "planning";
    
    // For pipeline/planning activities, show planned start date
    if (status === "planning" || status === "pipeline") {
      return activity.plannedStartDate || null;
    }
    
    // For implementing, completed, or cancelled activities, show actual start date
    if (["implementation", "implementing", "completed", "cancelled"].includes(status)) {
      return activity.actualStartDate || activity.plannedStartDate || null;
    }
    
    return activity.plannedStartDate || null;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-1" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-gray-700 ml-1" />
      : <ArrowDown className="h-4 w-4 text-gray-700 ml-1" />;
  };

  const exportActivities = () => {
    const dataToExport = filteredAndSortedActivities.map(activity => {
      const { commitment, disbursement } = calculateTotals(activity.transactions);
      const sectors = activity.sectors?.map(s => `${s.name} (${s.percentage}%)`).join("; ") || "";
      
      return {
        "Activity ID": activity.id,
        "IATI ID": activity.iatiId || "",
        "Partner ID": activity.partnerId || "",
        "Title": activity.title,
        "Description": activity.description || "",
        "Activity Status": activity.activityStatus || "planning",
        "Submission Status": activity.submissionStatus || "draft",
        "Publication Status": activity.publicationStatus || "draft",
        "Objectives": activity.objectives || "",
        "Target Groups": activity.targetGroups || "",
        "Collaboration Type": activity.collaborationType || "",
        "Sectors": sectors,
        "Total Commitment": commitment,
        "Total Disbursement": disbursement,
        "Created By Organization": activity.organization?.acronym || activity.organization?.name || "",
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

  // Enhanced filtering with search across multiple fields including UUID
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = allActivities.filter(activity => {
      // Enhanced search that includes UUID, multiple fields, and contributors
      const searchLower = search.toLowerCase();
      const contributorSearchMatch = activity.contributors?.some(c => 
        c.organizationName.toLowerCase().includes(searchLower) ||
        c.organizationAcronym?.toLowerCase().includes(searchLower)
      );
      
      const matchesSearch = !search || 
        activity.title.toLowerCase().includes(searchLower) ||
        activity.partnerId?.toLowerCase().includes(searchLower) ||
        activity.iatiId?.toLowerCase().includes(searchLower) ||
        activity.id.toLowerCase().includes(searchLower) ||
        activity.description?.toLowerCase().includes(searchLower) ||
        activity.organization?.name?.toLowerCase().includes(searchLower) ||
        activity.organization?.acronym?.toLowerCase().includes(searchLower) ||
        contributorSearchMatch;
      
      // Handle both legacy and new status fields
      const activityStatus = activity.activityStatus || 
        (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning");
      const publicationStatus = activity.publicationStatus || 
        (activity.status === "published" ? "published" : "draft");
      
      // Filter by activity status
      const matchesActivityStatus = activityStatusFilter === "all" || activityStatus === activityStatusFilter;
      
      // Filter by publication status  
      const matchesPublicationStatus = publicationStatusFilter === "all" || publicationStatus === publicationStatusFilter;
      
      // Filter by contributor organization
      const matchesContributor = contributorFilter === "all" || 
        activity.contributors?.some(c => c.organizationId === contributorFilter && c.status === 'accepted');
      
      // Filter by contributor role
      const matchesContributorRole = contributorRoleFilter === "all" || 
        activity.contributors?.some(c => c.role === contributorRoleFilter && c.status === 'accepted');
      
      return matchesSearch && matchesActivityStatus && matchesPublicationStatus && matchesContributor && matchesContributorRole;
    });

    // Sort activities
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdBy':
          aValue = a.organization?.name || '';
          bValue = b.organization?.name || '';
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
        case 'startDate':
          aValue = getStartDate(a) ? new Date(getStartDate(a)!).getTime() : 0;
          bValue = getStartDate(b) ? new Date(getStartDate(b)!).getTime() : 0;
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

    return filtered;
  }, [allActivities, search, activityStatusFilter, publicationStatusFilter, contributorFilter, contributorRoleFilter, sortField, sortOrder]);

  // Pagination logic
  const totalItems = filteredAndSortedActivities.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentActivities = filteredAndSortedActivities.slice(startIndex, endIndex);
  const hasMore = endIndex < totalItems;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get unique contributor organizations for filtering
  const getUniqueContributors = () => {
    const contributorMap = new Map<string, { name: string; acronym?: string }>();
    
    allActivities.forEach(activity => {
      activity.contributors?.forEach(contributor => {
        if (contributor.status === 'accepted') {
          contributorMap.set(contributor.organizationId, {
            name: contributor.organizationName,
            acronym: contributor.organizationAcronym
          });
        }
      });
    });
    
    return Array.from(contributorMap.entries()).map(([id, org]) => ({
      id,
      displayName: org.acronym ? `${org.acronym} • ${org.name}` : org.name
    })).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePageSizeChange = (newSize: string) => {
    if (newSize === 'All') {
      setPageSize(999999); // Set a very large number to show all
    } else {
      setPageSize(parseInt(newSize));
    }
    setCurrentPage(1); // Reset to first page
  };

  const handleBulkImport = async (data: any[]) => {
    try {
      // Transform CSV data to match activity format
      const activities = data.map((row, index) => {
        const sectorNames = row["Sectors (semicolon separated)"]?.split(";").map((s: string) => s.trim()).filter(Boolean) || [];
        const tagNames = row["Tags (semicolon separated)"]?.split(";").map((t: string) => t.trim()).filter(Boolean) || [];
        
        return {
          partnerId: row["Partner ID"] || "",
          iatiId: row["IATI ID"] || "",
          title: row["Title"],
          description: row["Description"] || "",
          activityStatus: row["Activity Status"] || "planning",
          plannedStartDate: row["Start Date (YYYY-MM-DD)"] || null,
          plannedEndDate: row["End Date (YYYY-MM-DD)"] || null,
          objectives: row["Objectives"] || "",
          targetGroups: row["Target Groups"] || "",
          collaborationType: row["Collaboration Type"] || "",
          sectors: sectorNames.map((name: string, i: number) => ({
            id: `temp-sector-${index}-${i}`,
            name,
            percentage: Math.floor(100 / sectorNames.length)
          })),
          tags: tagNames,
          user: user ? {
            id: user.id,
            name: user.name,
            role: user.role,
          } : undefined,
        };
      });

      // Send to API
      const res = await fetch("/api/activities/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import activities");
      }

      const result = await res.json();
      toast.success(`Successfully imported ${result.success} activities`);
      fetchActivities(); // Refresh the list
      return result;
    } catch (error: any) {
      console.error("[AIMS] Bulk import error:", error);
      throw error;
    }
  };

  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <SearchParamsHandler onImportParam={handleImportParam} />
      </Suspense>
      <MainLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="p-8 max-w-full mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">Activities</h1>
                <p className="text-muted-foreground mt-1">Manage and track all development activities</p>
              </div>
              <div className="flex gap-2">
                {allActivities.length > 0 && (
                  <Button variant="outline" onClick={exportActivities}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Activities
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Activities
                </Button>
                <Button onClick={() => router.push("/activities/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <ActivitySummaryCards
              allActivities={allActivities}
              filteredActivities={filteredAndSortedActivities}
              currentPageActivities={currentActivities}
              hasFiltersApplied={search !== "" || activityStatusFilter !== "all" || publicationStatusFilter !== "all" || contributorFilter !== "all" || contributorRoleFilter !== "all"}
            />

            {/* Enhanced Filter Bar */}
            <Card className="mb-4 shadow-sm border border-gray-200">
              <CardContent className="px-4 py-3">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, Partner ID, IATI ID, contributors..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10 h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={activityStatusFilter} onValueChange={(value) => {
                        setActivityStatusFilter(value);
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                          <SelectValue placeholder="Activity Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Activities</SelectItem>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="implementation">Implementation</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={publicationStatusFilter} onValueChange={(value) => {
                      setPublicationStatusFilter(value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[120px] h-9 text-sm">
                        <SelectValue placeholder="Publication" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={contributorFilter} onValueChange={(value) => {
                      setContributorFilter(value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Contributor Org" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contributors</SelectItem>
                        {getUniqueContributors().map(org => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={contributorRoleFilter} onValueChange={(value) => {
                      setContributorRoleFilter(value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[120px] h-9 text-sm">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="funder">Funder</SelectItem>
                        <SelectItem value="implementer">Implementer</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pagination Controls & Stats */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} activities
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Show:</label>
                  <Select value={pageSize >= 999999 ? 'All' : pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[70px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map(size => (
                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Activity Table */}
              {loading ? (
                <div className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading activities...
                </div>
              ) : currentActivities.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {search || activityStatusFilter !== "all" || publicationStatusFilter !== "all" || contributorFilter !== "all" || contributorRoleFilter !== "all" ? "No matching activities found" : "No activities yet"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50 min-w-[280px]"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center">
                            Activity
                            {getSortIcon('title')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('activityStatus')}
                        >
                          <div className="flex items-center">
                            Activity Status
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/60 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Indicates the current implementation stage of the activity</p>
                              </TooltipContent>
                            </Tooltip>
                            {getSortIcon('activityStatus')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('publicationStatus')}
                        >
                          <div className="flex items-center">
                            Publication Status
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/60 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Indicates whether the activity is published for reporting or internal use</p>
                              </TooltipContent>
                            </Tooltip>
                            {getSortIcon('publicationStatus')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('commitment')}
                        >
                          <div className="flex items-center justify-end">
                            Total Commitment
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/60 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Total funding pledged for the activity</p>
                              </TooltipContent>
                            </Tooltip>
                            {getSortIcon('commitment')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('disbursement')}
                        >
                          <div className="flex items-center justify-end">
                            Total Disbursement
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/60 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Funds transferred to date for the activity</p>
                              </TooltipContent>
                            </Tooltip>
                            {getSortIcon('disbursement')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('startDate')}
                        >
                          <div className="flex items-center">
                            Start Date
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/60 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Planned or actual start date, depending on status</p>
                              </TooltipContent>
                            </Tooltip>
                            {getSortIcon('startDate')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center">
                            Date Created
                            {getSortIcon('createdAt')}
                          </div>
                        </th>
                        <th 
                          className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:bg-gray-100/50"
                          onClick={() => handleSort('updatedAt')}
                        >
                          <div className="flex items-center">
                            Date Last Updated
                            {getSortIcon('updatedAt')}
                          </div>
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {currentActivities.map((activity, index) => {
                        const { commitment, disbursement } = calculateTotals(activity.transactions);
                        const activityStatus = activity.activityStatus || 
                          (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning");
                        const publicationStatus = activity.publicationStatus || 
                          (activity.status === "published" ? "published" : "draft");
                        const startDate = getStartDate(activity);

                        return (
                          <tr
                            key={activity.id}
                            className={cn(
                              "hover:bg-gray-50/50 transition-colors",
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                            )}
                          >
                            <td className="px-4 py-3">
                              <div 
                                className="cursor-pointer"
                                onClick={() => router.push(`/activities/${activity.id}`)}
                              >
                                <h3 className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                  {activity.title}
                                </h3>
                                <div className="mt-1">
                                  <ContributorDisplay 
                                    contributors={activity.contributors}
                                    maxDisplay={2}
                                    showRoles={false}
                                  />
                                  {(activity.partnerId || activity.iatiId) && (
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                      {activity.partnerId && `Partner ID: ${activity.partnerId}`}
                                      {activity.partnerId && activity.iatiId && ' • '}
                                      {activity.iatiId && `IATI ID: ${activity.iatiId}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Badge 
                                variant={getActivityStatusColor(activityStatus)}
                                className="capitalize text-xs rounded-md px-2 py-1"
                              >
                                {activityStatus}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              <Badge 
                                variant={getPublicationStatusColor(publicationStatus)}
                                className="capitalize text-xs rounded-md px-2 py-1"
                              >
                                {publicationStatus}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(commitment)}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(disbursement)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {startDate ? format(new Date(startDate), "dd MMM yyyy") : "Not set"}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {format(new Date(activity.createdAt), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {format(new Date(activity.updatedAt), "dd MMM yyyy")}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => router.push(`/activities/new?id=${activity.id}`)}
                                      className="h-7 w-7 p-0 hover:bg-gray-100"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit activity</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteActivityId(activity.id)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete activity</p>
                                  </TooltipContent>
                                </Tooltip>
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

            {/* Load More Button and Pagination Info */}
            {currentActivities.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-3">
                {hasMore && (
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="min-w-[120px] h-9 text-sm border-gray-200 hover:bg-gray-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                )}
                
                <div className="text-sm text-muted-foreground text-center">
                  Page {currentPage} of {totalPages} • {totalItems} total activities
                </div>
              </div>
            )}

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

            {/* Bulk Import Dialog */}
            <BulkImportDialog
              open={showBulkImport}
              onOpenChange={setShowBulkImport}
              onImport={handleBulkImport}
              entityType="activities"
            />
          </div>
        </div>
      </MainLayout>
    </TooltipProvider>
  );
} 