"use client"

import { useState, useEffect, useRef } from "react";
import { usePreCache } from "@/hooks/use-pre-cached-data";
import { AsyncErrorBoundary } from "@/components/errors/AsyncErrorBoundary";
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
import { ActivityStatusFilterSelect } from "@/components/forms/ActivityStatusFilterSelect";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Plus, Download, Edit2, Trash2, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, Users, Grid3X3, TableIcon, Search, MoreVertical, Edit,
  PencilLine, BookOpenCheck, BookLock, CheckCircle2, AlertTriangle, Circle, Info, ReceiptText, Handshake, Shuffle, Link2,
  FileCheck, ShieldCheck, Globe, DatabaseZap, RefreshCw
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Transaction } from "@/types/transaction";
import { LEGACY_TRANSACTION_TYPE_MAP } from "@/utils/transactionMigrationHelper";
import { USER_ROLES } from "@/types/user";
import { ActivityListSkeleton } from '@/components/ui/skeleton-loader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from 'next/link';
import { IATISyncStatusIndicator, IATISyncStatusBadge } from '@/components/activities/IATISyncStatusIndicator';
import { apiFetch } from '@/lib/api-fetch';

// Aid Type mappings (simplified)
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'Official Development Assistance',
  '20': 'Other Official Flows',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Tied Status mappings
const TIED_STATUS_LABELS: Record<string, string> = {
  '3': 'Partially tied',
  '4': 'Tied',
  '5': 'Untied'
};

type Organization = {
  id: string;
  name: string;
  acronym?: string;
  type?: string;
  country?: string;
};

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
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  targetGroups?: string;
  collaborationType?: string;
  banner?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  sectors?: any[];
  transactions?: Transaction[];
  createdByOrg?: string; // Organization that created the activity
  createdBy?: { id: string; name: string; role: string }; // User who created the activity
  contributors?: any[]; // Added for contributors
  
  // Transaction summaries from API
  commitments?: number;
  disbursements?: number;
  expenditures?: number;
  inflows?: number;
  totalTransactions?: number;
  
  // Organization data
  funders?: Organization[];
  implementers?: Organization[];
  extendingOrganizations?: Organization[];
  transactionOrganizations?: Organization[];
  
  // IATI Sync fields
  iatiIdentifier?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'live' | 'pending' | 'outdated' | 'error' | 'never';
  autoSyncFields?: string[];
  
  // Default financial fields
  default_aid_type?: string;
  default_finance_type?: string;
  default_flow_type?: string;
  default_tied_status?: string;
  default_modality?: string;
  tied_status?: string; // Legacy field
};

type SortField = 'title' | 'partnerId' | 'createdBy' | 'commitments' | 'disbursements' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';


const getActivityStatusColor = (status: string): "secondary" | "success" | "default" | "destructive" => {
  const colors: Record<string, "secondary" | "success" | "default" | "destructive"> = {
    draft: "secondary",
    published: "success",
    "1": "default", // Pipeline / Identification
    "2": "default", // Implementation
    "3": "secondary", // Finalisation
    "4": "success", // Closed
    "5": "destructive", // Cancelled
    "6": "secondary", // Suspended
    // Legacy support
    planning: "default",
    implementation: "default",
    completed: "success",
    cancelled: "destructive",
    suspended: "secondary",
    "": "secondary",
  };
  return colors[status] || "default";
};

// Helper function to get status label from code
const getActivityStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    "1": "Pipeline / Identification",
    "2": "Implementation", 
    "3": "Finalisation",
    "4": "Closed",
    "5": "Cancelled",
    "6": "Suspended",
    // Legacy support
    planning: "Planning",
    implementation: "Implementation",
    completed: "Completed",
    cancelled: "Cancelled",
    suspended: "Suspended",
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

// Helper function to check if user can edit an activity
const canUserEditActivity = (user: any, activity: Activity): boolean => {
  if (!user) return false;
  
  // Superuser can edit all activities
  if (user.role === USER_ROLES.SUPER_USER) {
    return true;
  }
  
  // User associated with the organization that created the activity
  if (user.organizationId && activity.createdByOrg && user.organizationId === activity.createdByOrg) {
    return true;
  }
  
  return false;
};

function ActivitiesPageContent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [filterValidation, setFilterValidation] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivitiesCount, setTotalActivitiesCount] = useState<number>(0);
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const fetchOrganizations = async () => {
    try {
      const res = await apiFetch("/api/organizations");
      if (res.ok) {
        const orgs = await res.json();
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error("[AIMS] Error fetching organizations:", error);
    }
  };

  const getOrganizationAcronyms = (activity: Activity): string[] => {
    const orgIds = new Set<string>();
    const acronyms: string[] = [];

    // Collect organization IDs from activity creator
    if (activity.createdByOrg) {
      orgIds.add(activity.createdByOrg);
    }
    
    // Collect from activity contributors
    if ((activity as any).activity_contributors) {
      (activity as any).activity_contributors.forEach((contributor: any) => {
        if (contributor.organization_id && (contributor.status === 'accepted' || contributor.status === 'active')) {
          orgIds.add(contributor.organization_id);
        }
      });
    }
    
    // Collect from transactions using organization_id
    activity.transactions?.forEach(transaction => {
      if ((transaction as any).organization_id) {
        orgIds.add((transaction as any).organization_id);
      }
    });

    // Convert IDs to acronyms using acronym field
    Array.from(orgIds).forEach(id => {
      const org = organizations.find(o => o.id === id);
      if (org && org.acronym) {
        acronyms.push(org.acronym);
      }
    });

    // Remove duplicates and sort alphabetically
    return Array.from(new Set(acronyms)).sort();
  };

  const formatOrganizationAcronyms = (acronyms: string[]): string => {
    if (acronyms.length === 0) return "";
    if (acronyms.length <= 3) return acronyms.join(", ");
    return `${acronyms.slice(0, 3).join(", ")} +${acronyms.length - 3} more`;
  };

  const getCreatorOrganization = (activity: Activity): string => {
    // Prefer acronym from activity fields if present
    if (activity.created_by_org_acronym) {
      return activity.created_by_org_acronym;
    }

    // Try to look up by ID in organizations list for acronym
    if (activity.createdByOrg) {
      const org = organizations.find(o => o.id === activity.createdByOrg);
      if (org && org.acronym) {
        return org.acronym;
      }
      if (org && org.name) {
        return org.name;
      }
    }

    // Fallback to name from activity fields
    if (activity.created_by_org_name) {
      return activity.created_by_org_name;
    }

    return "Unknown";
  };

  // AbortController ref for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Pre-caching for better performance
  const { preCacheActivityList } = usePreCache();
  
  // Initialize activity list pre-caching
  useEffect(() => {
    preCacheActivityList().catch(console.warn);
  }, [preCacheActivityList]);

  const fetchActivities = async (page: number = 1, fetchAll: boolean = false) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setFetchError(null); // Clear any previous errors
      // Add timestamp to bypass any caching
      const timestamp = new Date().getTime();
      // Always fetch up to 500 for client-side filtering, but respect the API's limit
      const limitParam = `limit=500`;
      const res = await apiFetch(`/api/activities-simple?page=1&${limitParam}&t=${timestamp}`, {
        cache: 'no-store',
        signal: abortControllerRef.current.signal, // Add abort signal
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[AIMS] API Error:", res.status, errorText);
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }
      const response = await res.json();
      
      // Handle pagination response
      if (response.pagination) {
        const { data, pagination } = response;
        setActivities(Array.isArray(data) ? data : []);
        // Store total count for pagination calculations
        setTotalActivitiesCount(pagination.total || 0);
        console.log(`[AIMS Debug] Fetched ${fetchAll ? 'all' : `page ${page} of ${pagination.totalPages}`}: ${data.length} activities (total: ${pagination.total})`);
      } else {
        // Fallback for non-paginated response
        const data = response.data || response;
        setActivities(Array.isArray(data) ? data : []);
        console.log("[AIMS Debug] Activities fetched:", Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      // Don't handle AbortError - it's expected when requests are cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AIMS] Request aborted');
        return;
      }

      console.error("[AIMS] Error fetching activities:", error);
      
      // Track the error for display
      let errorMessage = "Failed to load activities";
      if (error instanceof Error) {
        if (error.message.includes("fetch failed") || error.message.includes("Failed to fetch")) {
          errorMessage = "Unable to connect to database. Please check your connection and try again.";
          toast.error(errorMessage);
        } else {
          errorMessage = `Failed to load activities: ${error.message}`;
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
      
      setFetchError(errorMessage);
      // Set empty array so the UI shows appropriate message
      setActivities([]);
    }
  };

  // Load saved page limit preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('activities-page-limit');
    if (saved) {
      setPageLimit(Number(saved));
    }
  }, []);

  // Fetch activities and organizations in parallel on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Run both fetches in parallel
        await Promise.all([
          fetchActivities(), // Fetch up to 500 for client-side filtering
          fetchOrganizations()
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch data if user loading is complete
    // This prevents fetching with null user state before authentication is resolved
    if (!userLoading) {
      console.log('[AIMS] User loading complete, fetching activities with user:', user?.email || 'no user');
      fetchData();
    } else {
      console.log('[AIMS] Waiting for user to load before fetching activities...');
    }
  }, [userLoading]); // Add userLoading as dependency

  // Don't refetch on filter changes - we do client-side filtering
  // Only refetch if we need fresh data

  const handleDelete = async (id: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      // Only do optimistic update on first attempt
      if (retryCount === 0) {
        setActivities(prev => prev.filter(a => a.id !== id));
        setDeleteActivityId(null);
      }
      
      const res = await apiFetch("/api/activities", {
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
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        
        // If it's a 404, the activity is already gone
        if (res.status === 404) {
          console.log("[AIMS] Activity already deleted:", id);
          toast.success("Activity deleted successfully");
          return;
        }
        
        throw new Error(errorData.error || "Failed to delete activity");
      }
      
      toast.success("Activity deleted successfully");
      
      // Verify deletion by checking if it still exists
      setTimeout(async () => {
        try {
          const checkRes = await apiFetch(`/api/activities-simple?t=${Date.now()}`);
          if (checkRes.ok) {
            const data = await checkRes.json();
            const activities = data.data || data;
            const stillExists = activities.some((a: Activity) => a.id === id);
            
            if (stillExists) {
              console.warn("[AIMS] Activity still exists after deletion, refreshing...");
              fetchActivities(currentPage, false);
            }
          }
        } catch (error) {
          console.error("[AIMS] Error checking deletion:", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error(`[AIMS] Error deleting activity (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a network/connection error
      const isNetworkError = error instanceof Error && 
        (error.message.includes('fetch failed') || 
         error.message.includes('network') ||
         error.message.includes('Failed to fetch'));
      
      if (isNetworkError && retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        toast.error(`Connection error. Retrying in ${delay/1000}s...`);
        
        setTimeout(() => {
          handleDelete(id, retryCount + 1);
        }, delay);
      } else {
        // Max retries reached or non-network error
        fetchActivities(currentPage, false); // Restore the activity in the list
        toast.error(
          isNetworkError 
            ? "Unable to connect to database. Please check your internet connection and try again."
            : error instanceof Error ? error.message : "Failed to delete activity"
        );
      }
    }
  }

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
      const sectors = activity.sectors?.map(s => `${s.name} (${s.percentage}%)`).join("; ") || "";
      
      return {
        "Activity ID": activity.partnerId || "",
        "UUID": activity.id,
        "IATI ID": activity.iatiId || "",
        "Partner ID": activity.partnerId || "",
        "Title": activity.title,
        "Description": activity.description || "",
        "Activity Status": activity.activityStatus || activity.status || "",
        "Submission Status": activity.submissionStatus || "draft",
        "Publication Status": activity.publicationStatus || "draft",
        "Reported by Organization": activity.created_by_org_name || "",
          "Organization Acronym": activity.created_by_org_acronym || "",
        "Target Groups": activity.targetGroups || "",
        "Collaboration Type": activity.collaborationType || "",
        "Sectors": sectors,
        "Commitments (USD)": activity.commitments || 0,
        "Outflows (USD)": (activity.disbursements || 0) + (activity.expenditures || 0),
        "Inflows (USD)": activity.inflows || 0,
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
    const matchesSearch = activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.partnerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.iatiId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle both legacy and new status fields
    const activityStatus = activity.activityStatus || 
      (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "1");
    const publicationStatus = activity.publicationStatus || 
      (activity.status === "published" ? "published" : "draft");
    const submissionStatus = activity.submissionStatus || 'draft';
    
    // Filter by activity status
    const matchesActivityStatus = filterStatus === "all" || activityStatus === filterStatus;
    
    // Filter by publication status  

    
    // Filter by validation status
    const matchesValidationStatus = filterValidation === "all" || 
      (filterValidation === "validated" && submissionStatus === "validated") ||
      (filterValidation === "rejected" && submissionStatus === "rejected") ||
      (filterValidation === "pending" && !["validated", "rejected"].includes(submissionStatus));
    
    return matchesSearch && matchesActivityStatus && matchesValidationStatus;
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
      case 'commitments':
        aValue = a.commitments || 0;
        bValue = b.commitments || 0;
        break;
      case 'disbursements':
        aValue = (a.disbursements || 0) + (a.expenditures || 0);
        bValue = (b.disbursements || 0) + (b.expenditures || 0);
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      case 'createdBy':
        aValue = getCreatorOrganization(a).toLowerCase();
        bValue = getCreatorOrganization(b).toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Since we're filtering client-side, use the filtered count for pagination
  const totalActivities = filteredActivities.length; 
  const isShowingAll = false; // We removed the "All" option
  const effectiveLimit = pageLimit;
  const startIndex = (currentPage - 1) * pageLimit;
  const endIndex = Math.min(startIndex + pageLimit, totalActivities);
  const paginatedActivities = sortedActivities.slice(startIndex, endIndex); // Client-side pagination
  const totalPages = Math.ceil(totalActivities / pageLimit);

  // Reset to page 1 when page limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageLimit]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterValidation]);

  // Handle page limit change
  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    // Save preference to localStorage
    localStorage.setItem('activities-page-limit', newLimit.toString());
  };

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
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Activities</h1>
            <p className="text-slate-500">Manage and track all development activities</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setLoading(true);
                  // Clear browser cache
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                  }
                  // Force reload the page to clear any cached data
                  window.location.reload();
                } catch (error) {
                  console.error('Error clearing cache:', error);
                  window.location.reload();
                }
              }}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear Cache & Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportActivities}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Search, Filters, and View Controls - All in One Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4">
          {/* Left Side: Search + Filters + Page Size */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="w-full sm:w-auto sm:min-w-[240px] lg:min-w-[300px]">
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <ActivityStatusFilterSelect
                value={filterStatus}
                onValueChange={setFilterStatus}
                placeholder="Status"
                className="w-[140px]"
              />

              <Select value={filterValidation} onValueChange={setFilterValidation}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Validation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Validation</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Not Validated</SelectItem>
                </SelectContent>
              </Select>


              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Show:</span>
                <Select 
                  value={pageLimit.toString()} 
                  onValueChange={(value) => handlePageLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right Side: View Toggle + Results Count */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Results Summary */}
            <p className="text-sm text-slate-600 whitespace-nowrap">
              {totalActivities === 0 
                ? "No activities" 
                : paginatedActivities.length === 0
                ? "No activities on this page"
                : `Showing ${Math.min(startIndex + 1, totalActivities)}–${Math.min(endIndex, totalActivities)} of ${totalActivities}`}
            </p>
          </div>
        </div>
        
        {/* Performance Warning (if applicable) */}
        {totalActivities > 500 && pageLimit === 9999 && (
          <div className="text-xs text-amber-600 mt-2 px-4">
            ⚠️ Showing {totalActivities} items may affect performance
          </div>
        )}

        {/* Activities Content */}
        {loading || userLoading ? (
          <ActivityListSkeleton />
        ) : totalActivities === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            {fetchError ? (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Activities</h3>
                  <p className="text-slate-500 mb-4">{fetchError}</p>
                  <Button onClick={() => fetchActivities(1, true)} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : searchQuery || filterStatus !== "all" || filterValidation !== "all" ? (
              <div className="text-slate-500">No matching activities found</div>
            ) : (
              <div className="space-y-4">
                <div className="text-slate-500">No activities yet</div>
                <Button onClick={() => router.push("/activities/new")} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Activity
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden fade-in">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse min-w-[1300px]">
                <thead className="bg-muted border-b">
                  <tr>
                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-left cursor-pointer hover:bg-gray-200 w-[30%]"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        Activity
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-left w-[120px]">
                      Status
                    </th>
                    <th className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-center w-[120px]">
                      Data Source & Review
                    </th>
                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-left min-w-[140px] cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort('createdBy')}
                    >
                      <div className="flex items-center gap-1">
                        Reported by
                        {getSortIcon('createdBy')}
                      </div>
                    </th>
                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-right cursor-pointer hover:bg-gray-200 min-w-[120px]"
                      onClick={() => handleSort('commitments')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Commitments
                        <span className="ml-1 relative group cursor-pointer">
                          <Info className="inline h-4 w-4 text-muted-foreground" />
                          <span className="absolute z-10 hidden group-hover:block bg-white text-xs text-muted-foreground border border-gray-200 p-2 rounded-md shadow-md w-64 right-0 mt-1">
                            Outgoing funds formally obligated but not yet disbursed.
                          </span>
                        </span>
                        {getSortIcon('commitments')}
                      </div>
                    </th>
                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-right cursor-pointer hover:bg-gray-200 min-w-[100px]"
                      onClick={() => handleSort('disbursements')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Outflows
                        <span className="ml-1 relative group cursor-pointer">
                          <Info className="inline h-4 w-4 text-muted-foreground" />
                          <span className="absolute z-10 hidden group-hover:block bg-white text-xs text-muted-foreground border border-gray-200 p-2 rounded-md shadow-md w-64 right-0 mt-1">
                            Funds disbursed or spent — includes disbursements and expenditures.
                          </span>
                        </span>
                        {getSortIcon('disbursements')}
                      </div>
                    </th>

                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-right cursor-pointer hover:bg-gray-200 min-w-[100px]"
                      onClick={() => handleSort('updatedAt')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Last Edited
                        {getSortIcon('updatedAt')}
                      </div>
                    </th>
                    <th className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-center w-[120px]">
                      Default Aid Modality
                    </th>
                    <th className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-right w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedActivities.map(activity => {
                    const organizationAcronyms = getOrganizationAcronyms(activity);
                    const acronymsText = formatOrganizationAcronyms(organizationAcronyms);
                    const creatorOrg = getCreatorOrganization(activity);
                    const activityStatus = activity.activityStatus || activity.status || '1';
                    const publicationStatus = activity.publicationStatus || 'draft';
                    const submissionStatus = activity.submissionStatus || 'draft';
                    
                    return (
                      <tr
                        key={activity.id}
                        className="hover:bg-muted transition-colors"
                      >
                        <td className="px-4 py-2 text-sm text-foreground whitespace-normal break-words leading-tight">
                          <div 
                            className="cursor-pointer"
                            onClick={() => router.push(`/activities/${activity.id}`)}
                          >
                            <div className="space-y-1 pr-2">
                              <h3 className="font-medium text-foreground leading-tight line-clamp-2" title={activity.title}>
                                {activity.title}
                              </h3>
                              {(activity.partnerId || activity.iatiIdentifier) && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {activity.partnerId}
                                  {activity.partnerId && activity.iatiIdentifier && '  •  '}
                                  <span className="text-slate-400">{activity.iatiIdentifier}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-left">
                          {getActivityStatusLabel(activityStatus)}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <DatabaseZap className={`${publicationStatus === 'published' ? 'h-5 w-5' : 'h-4 w-4'} text-gray-500 hover:text-primary cursor-pointer mx-auto`} strokeWidth={publicationStatus === 'published' ? 2.5 : 1} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-2 p-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileCheck className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Published:</span> {publicationStatus === 'published' ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Validation:</span> {submissionStatus === 'validated' ? 'Validated' : submissionStatus === 'rejected' ? 'Rejected' : 'Pending'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Globe className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">IATI:</span> {activity.syncStatus === 'live' ? 'Synced' : activity.syncStatus === 'pending' ? 'Pending' : activity.syncStatus === 'error' ? 'Error' : 'Not synced'}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-left" style={{textAlign: 'left'}}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                <div>
                                  {creatorOrg}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    Reported by {activity.created_by_org_name || "Unknown Organization"}
                                  </div>
                                  {activity.createdBy?.name && (
                                    <div className="text-xs text-muted-foreground">
                                      Submitted by {activity.createdBy.name} on {format(new Date(activity.createdAt), "d MMMM yyyy 'at' h:mm a")}
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                          {formatCurrency(activity.commitments || 0)}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                          {formatCurrency((activity.disbursements || 0) + (activity.expenditures || 0))}
                        </td>

                        <td className="px-4 py-2 text-sm text-foreground whitespace-nowrap text-right">
                          {format(new Date(activity.updatedAt), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <ReceiptText className="h-4 w-4 text-gray-500 hover:text-primary cursor-pointer mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-2 p-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Handshake className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Aid Type:</span> {activity.default_aid_type ? AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type : 'Not specified'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Shuffle className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Flow Type:</span> {activity.default_flow_type ? FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type : 'Not specified'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Link2 className="h-4 w-4" />
                                    <span className="text-sm"><span className="font-semibold">Tied Status:</span> {activity.default_tied_status ? TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status : 'Not specified'}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canUserEditActivity(user, activity) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => router.push(`/activities/new?id=${activity.id}`)}
                                      className="p-1 hover:text-primary cursor-pointer transition-colors"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit Activity</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setDeleteActivityId(activity.id)}
                                    className="p-1 hover:text-primary cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete Activity</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Card View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in">
            {paginatedActivities.map(activity => {
              const organizationAcronyms = getOrganizationAcronyms(activity);
              const acronymsText = formatOrganizationAcronyms(organizationAcronyms);
              const creatorOrg = getCreatorOrganization(activity);
              
              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                  {/* Banner Image */}
                  <div className="relative">
                    {activity.banner ? (
                      <img
                        src={activity.banner}
                        alt={`Banner for ${activity.title}`}
                        className="w-full h-24 sm:h-32 object-cover rounded-t-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-24 sm:h-32 bg-slate-100 rounded-t-md';
                          target.parentNode?.appendChild(placeholder);
                        }}
                      />
                    ) : (
                      <div className="w-full h-24 sm:h-32 bg-slate-100 rounded-t-md" />
                    )}
                  </div>
                  
                  <CardHeader onClick={() => router.push(`/activities/${activity.id}`)}>
                    <CardTitle className="text-lg line-clamp-2">{activity.title}</CardTitle>
                    {(activity.partnerId || activity.iatiIdentifier) && (
                      <p className="text-sm text-slate-500">
                        {activity.partnerId}
                        {activity.partnerId && activity.iatiIdentifier && ' • '}
                        {activity.iatiIdentifier}
                      </p>
                    )}
                    {/* IATI Sync Status */}
                    <div className="mt-2">
                      <IATISyncStatusBadge 
                        syncStatus={activity.syncStatus}
                        lastSyncTime={activity.lastSyncTime}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="text-sm text-slate-500">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <div>
                              {creatorOrg}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">
                                Reported by {activity.created_by_org_name || "Unknown Organization"}
                              </div>
                              {activity.createdBy?.name && (
                                <div className="text-xs text-muted-foreground">
                                  Submitted by {activity.createdBy.name} on {format(new Date(activity.createdAt), "d MMMM yyyy 'at' h:mm a")}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs">Commitments</p>
                        <p className="font-medium">{formatCurrency(activity.commitments || 0)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Outflows</p>
                        <p className="font-medium">{formatCurrency((activity.disbursements || 0) + (activity.expenditures || 0))}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-slate-500">
                        Updated {format(new Date(activity.updatedAt), "dd MMM yyyy")}
                      </span>
                      <Popover>
                        <PopoverTrigger>
                          <Button 
                            variant="ghost" 
                            className="p-0 h-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 p-1">
                          {canUserEditActivity(user, activity) && (
                            <button 
                              className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/activities/new?id=${activity.id}`);
                              }}
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </button>
                          )}
                          <button 
                            className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-sm text-red-600 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteActivityId(activity.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isShowingAll && totalPages > 1 && totalActivities > 0 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
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
      </div>
    </MainLayout>
  );
}

export default function ActivitiesPage() {
  return (
    <AsyncErrorBoundary 
      fallback="page"
      onError={(error, errorInfo) => {
        console.error('Activities Page Error:', error, errorInfo);
      }}
    >
      <ActivitiesPageContent />
    </AsyncErrorBoundary>
  );
}
