"use client"

/*
 * PERFORMANCE OPTIMIZED ACTIVITIES PAGE
 * 
 * Optimizations implemented:
 * 1. Server-side pagination with optimized API endpoint
 * 2. Debounced search to reduce API calls
 * 3. Request cancellation to prevent race conditions
 * 4. Smart caching for better UX
 * 5. Memoized components to prevent unnecessary re-renders
 * 
 * Backward compatibility: Maintains exact same UI/UX
 * Rollback: Set NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION=false
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePreCache } from "@/hooks/use-pre-cached-data";
import { useOptimizedActivities } from "@/hooks/use-optimized-activities";
import { AsyncErrorBoundary } from "@/components/errors/AsyncErrorBoundary";
import { PerformanceMetrics } from "@/components/optimization/OptimizedActivityList";
import { MainLayout } from "@/components/layout/main-layout";
import { ActivityList } from "@/components/activities/ActivityList";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CurrencyTooltip, InfoIconTooltip } from '@/components/ui/currency-tooltip';

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
  '1': 'Tied',
  '2': 'Partially tied',
  '3': 'Untied',
  '4': 'Not reported'
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
  submissionStatus?: string; // Changed to string to match interface
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
  
  // Budget summaries from API  
  totalPlannedBudgetUSD?: number;
  totalDisbursementsAndExpenditureUSD?: number;
  
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
  // Check if optimizations are enabled via environment variable
  const enableOptimization = true; // Force enable for debugging
  
  console.log('[Activities Page] Environment variable NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION:', process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION);
  console.log('[Activities Page] enableOptimization:', enableOptimization);
  console.log('[Activities Page] typeof env var:', typeof process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION);
  
  // Use optimized hook if enabled, otherwise fall back to original implementation
  const optimizedData = useOptimizedActivities({
    pageSize: 20,
    enableOptimization,
    onError: (error) => {
      console.error('[Activities Page] Optimization error:', error);
      // Could fall back to original implementation here if needed
    }
  });
  
  // Legacy state for backward compatibility when optimizations are disabled
  const [legacyActivities, setLegacyActivities] = useState<Activity[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  
  // Common state regardless of optimization
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [pageLimit, setPageLimit] = useState<number>(20);
  
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  // Track if we've ever successfully loaded data to prevent flash of empty state
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // Determine which data source to use
  const usingOptimization = enableOptimization;
  const activities = usingOptimization ? optimizedData.activities : legacyActivities;
  
  console.log('[Activities Page] usingOptimization:', usingOptimization);
  console.log('[Activities Page] optimizedData.activities length:', optimizedData.activities.length);
  console.log('[Activities Page] optimizedData.loading:', optimizedData.loading);
  console.log('[Activities Page] optimizedData.error:', optimizedData.error);
  console.log('[Activities Page] activities length:', activities.length);
  const loading = usingOptimization ? optimizedData.loading : legacyLoading;
  const error = usingOptimization ? optimizedData.error : legacyError;
  const searchQuery = usingOptimization ? optimizedData.searchQuery : '';
  const setSearchQuery = usingOptimization ? optimizedData.setSearchQuery : () => {};
  const currentPage = usingOptimization ? optimizedData.currentPage : 1;
  const totalActivitiesCount = usingOptimization ? optimizedData.totalCount : legacyActivities.length;
  const setCurrentPage = usingOptimization ? optimizedData.setPage : () => {};
  
  // Filter states - use optimized filters if available
  const filterStatus = usingOptimization ? optimizedData.filters.activityStatus : 'all';
  const setFilterStatus = usingOptimization ? optimizedData.filters.setActivityStatus : () => {};
  const filterType = usingOptimization ? optimizedData.filters.publicationStatus : 'all';
  const setFilterType = usingOptimization ? optimizedData.filters.setPublicationStatus : () => {};
  const filterValidation = usingOptimization ? optimizedData.filters.submissionStatus : 'all';
  const setFilterValidation = usingOptimization ? optimizedData.filters.setSubmissionStatus : () => {};

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });
      if (res.ok) {
        const orgs = await res.json();
        setOrganizations(orgs);
      } else {
        console.error("[AIMS] Organizations request failed:", res.status, res.statusText);
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

  // Removed duplicate - using memoized version below

  // Legacy AbortController for non-optimized requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Pre-caching for better performance (still useful for other data)
  const { preCacheActivityList } = usePreCache();
  
  // Initialize activity list pre-caching (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && !usingOptimization) {
      preCacheActivityList().catch(console.warn);
    }
  }, [preCacheActivityList, usingOptimization]);

  // Legacy fetch function for when optimizations are disabled
  const fetchActivities = useCallback(async (page: number = 1, fetchAll: boolean = false) => {
    console.log('[AIMS] fetchActivities called - usingOptimization:', usingOptimization);
    
    if (usingOptimization) {
      // Use optimized hook's refetch instead
      console.log('[AIMS] Using optimized refetch');
      optimizedData.refetch();
      return;
    }
    
    console.log('[AIMS] Using legacy fetch');
    
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setLegacyError(null);
      const timestamp = new Date().getTime();
      const limitParam = `limit=500`;
      const res = await fetch(`/api/activities-simple?page=1&${limitParam}&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'same-origin'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[AIMS] API Error:", res.status, errorText);
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }
      
      const response = await res.json();
      const data = response.data || response;
      setLegacyActivities(Array.isArray(data) ? data : []);
      console.log("[AIMS Debug] Legacy fetch - Activities:", Array.isArray(data) ? data.length : 0);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AIMS] Legacy request aborted');
        return;
      }

      console.error("[AIMS] Legacy fetch error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load activities";
      setLegacyError(errorMessage);
      toast.error(errorMessage);
      setLegacyActivities([]);
    }
  }, [usingOptimization, optimizedData]);

  // Load saved page limit preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('activities-page-limit');
    if (saved) {
      setPageLimit(Number(saved));
    }
  }, []);

  // Fetch organizations and legacy activities if needed
  useEffect(() => {
    const fetchData = async () => {
      if (!usingOptimization) {
        setLegacyLoading(true);
      }
      
      try {
        const promises = [fetchOrganizations()];
        
        // Only fetch activities if not using optimization
        if (!usingOptimization) {
          promises.push(fetchActivities());
        }
        
        await Promise.all(promises);
      } finally {
        if (!usingOptimization) {
          setLegacyLoading(false);
        }
      }
    };
    
    if (!userLoading) {
      console.log(`[AIMS] User loading complete, using ${usingOptimization ? 'optimized' : 'legacy'} implementation`);
      fetchData();
    }
  }, [userLoading, usingOptimization]);

  // Track when we've successfully loaded data at least once
  useEffect(() => {
    if (!loading && !userLoading && (totalActivitiesCount > 0 || error)) {
      setHasLoadedOnce(true);
    }
  }, [loading, userLoading, totalActivitiesCount, error]);

  // Don't refetch on filter changes - we do client-side filtering
  // Only refetch if we need fresh data

  const handleDelete = async (id: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      // Only close dialog on first attempt
      if (retryCount === 0) {
        setDeleteActivityId(null);
      }
      
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
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        
        // If it's a 404, the activity is already gone
        if (res.status === 404) {
          console.log("[AIMS] Activity already deleted:", id);
          toast.success("Activity deleted successfully");
          
          // Remove from list even if 404
          if (usingOptimization) {
            optimizedData.refetch();
          } else {
            setLegacyActivities(prev => prev.filter(activity => activity.id !== id));
          }
          return;
        }
        
        throw new Error(errorData.error || "Failed to delete activity");
      }
      
      toast.success("Activity deleted successfully");
      
      // Immediately remove the activity from the list
      if (usingOptimization) {
        // For optimized mode, refetch to get updated data
        optimizedData.refetch();
      } else {
        // For legacy mode, remove from local state
        setLegacyActivities(prev => prev.filter(activity => activity.id !== id));
      }
      
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
      const sectors = activity.sectors?.map((s: any) => `${s.name} (${s.percentage}%)`).join("; ") || "";
      
      return {
        "Activity ID": activity.id,
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
        "Planned Budget (USD)": activity.totalPlannedBudgetUSD || 0,
        "Disbursements & Expenditure (USD)": activity.totalDisbursementsAndExpenditureUSD || (activity.disbursements || 0) + (activity.expenditures || 0),
        "Inflows (USD)": activity.inflows || 0,
        "Default Currency": (activity as any).defaultCurrency || "USD",
        "Currency Note": "Financial amounts are aggregated in USD using historical exchange rates. For detailed transaction-level currency information, export individual activity transactions.",
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

  // Client-side filtering for legacy implementation only
  // Optimized implementation handles filtering on server-side
  const filteredActivities = useMemo(() => {
    if (usingOptimization) {
      // Server-side filtering already applied
      return activities;
    }
    
    // Legacy client-side filtering (search removed as it's now global)
    return activities.filter(activity => {
      const activityStatus = activity.activityStatus || 
        (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "1");
      const publicationStatus = activity.publicationStatus || 
        (activity.status === "published" ? "published" : "draft");
      const submissionStatus = activity.submissionStatus || 'draft';
      
      const matchesActivityStatus = filterStatus === "all" || activityStatus === filterStatus;
      const matchesPublicationStatus = filterType === "all" || publicationStatus === filterType;
      const matchesValidationStatus = filterValidation === "all" || 
        (filterValidation === "validated" && submissionStatus === "validated") ||
        (filterValidation === "rejected" && submissionStatus === "rejected") ||
        (filterValidation === "pending" && !["validated", "rejected"].includes(submissionStatus));
      
      return matchesActivityStatus && matchesPublicationStatus && matchesValidationStatus;
    });
  }, [usingOptimization, activities, filterStatus, filterType, filterValidation]);

  // Client-side sorting for legacy implementation only
  const sortedActivities = useMemo(() => {
    if (usingOptimization) {
      // Server-side sorting already applied
      return filteredActivities;
    }
    
    // Legacy client-side sorting
    return [...filteredActivities].sort((a, b) => {
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
          aValue = a.totalPlannedBudgetUSD || 0;
          bValue = b.totalPlannedBudgetUSD || 0;
          break;
        case 'disbursements':
          aValue = a.totalDisbursementsAndExpenditureUSD || (a.disbursements || 0) + (a.expenditures || 0);
          bValue = b.totalDisbursementsAndExpenditureUSD || (b.disbursements || 0) + (b.expenditures || 0);
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
  }, [filteredActivities, sortField, sortOrder, usingOptimization]);

  // Pagination logic - use server-side pagination for optimized, client-side for legacy
  const totalActivities = usingOptimization ? totalActivitiesCount : filteredActivities.length;
  const isShowingAll = false;
  const effectiveLimit = pageLimit;
  const totalPages = usingOptimization ? optimizedData.totalPages : Math.ceil(totalActivities / pageLimit);
  
  let paginatedActivities, startIndex, endIndex;
  
  if (usingOptimization) {
    // Server-side pagination already applied
    paginatedActivities = sortedActivities;
    startIndex = (currentPage - 1) * pageLimit;
    endIndex = Math.min(startIndex + sortedActivities.length, totalActivities);
  } else {
    // Legacy client-side pagination
    startIndex = (currentPage - 1) * pageLimit;
    endIndex = Math.min(startIndex + pageLimit, totalActivities);
    paginatedActivities = sortedActivities.slice(startIndex, endIndex);
  }

  // Page limit change handler
  const handlePageLimitChange = useCallback((newLimit: number) => {
    setPageLimit(newLimit);
    if (usingOptimization) {
      // This will be handled by the optimized hook
      optimizedData.setPage(1);
    } else {
      setCurrentPage(1);
    }
    localStorage.setItem('activities-page-limit', newLimit.toString());
  }, [usingOptimization, optimizedData]);
  
  // Legacy effects for non-optimized version
  useEffect(() => {
    if (!usingOptimization) {
      setCurrentPage(1);
    }
  }, [pageLimit, usingOptimization]);

  // Memoized helper functions for better performance
  const getCreatorOrganization = useCallback((activity: Activity): string => {
    if (activity.created_by_org_acronym) {
      return activity.created_by_org_acronym;
    }
    if (activity.createdByOrg) {
      const org = organizations.find(o => o.id === activity.createdByOrg);
      if (org && org.acronym) return org.acronym;
      if (org && org.name) return org.name;
    }
    if (activity.created_by_org_name) {
      return activity.created_by_org_name;
    }
    return "Unknown";
  }, [organizations]);

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
              onClick={exportActivities}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters and View Controls - All in One Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4">
          {/* Left Side: Filters + Page Size */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <ActivityStatusFilterSelect
                value={filterStatus}
                onValueChange={setFilterStatus}
                placeholder="Activity Status"
                className="w-[140px]"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Publication" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
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
            
            {/* Results Summary with Performance Metrics */}
            <div className="flex flex-col items-end gap-1">
              <p className="text-sm text-slate-600 whitespace-nowrap">
                {totalActivities === 0 
                  ? "No activities" 
                  : paginatedActivities.length === 0
                  ? "No activities on this page"
                  : `Showing ${Math.min(startIndex + 1, totalActivities)}–${Math.min(endIndex, totalActivities)} of ${totalActivities}`}
              </p>
            </div>
          </div>
        </div>
        

        {/* Activities Content */}
        {loading || userLoading || !hasLoadedOnce ? (
          <ActivityListSkeleton />
        ) : totalActivities === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            {error ? (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Activities</h3>
                  <p className="text-slate-500 mb-4">{error}</p>
                  <Button 
                    onClick={() => usingOptimization ? optimizedData.refetch() : fetchActivities(1, true)} 
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filterStatus !== "all" || filterType !== "all" || filterValidation !== "all" ? (
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
                        <InfoIconTooltip content="All values are displayed in USD. Original currency values are available by clicking on an activity or hovering over the amount.">
                          <Info className="inline h-4 w-4 text-muted-foreground cursor-help" />
                        </InfoIconTooltip>
                        {getSortIcon('commitments')}
                      </div>
                    </th>
                    <th 
                      className="bg-muted text-sm font-semibold text-muted-foreground px-4 py-2 text-right cursor-pointer hover:bg-gray-200 min-w-[100px]"
                      onClick={() => handleSort('disbursements')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Outflows
                        <InfoIconTooltip content="All values are displayed in USD. Original currency values are available by clicking on an activity or hovering over the amount.">
                          <Info className="inline h-4 w-4 text-muted-foreground cursor-help" />
                        </InfoIconTooltip>
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
                                <DatabaseZap className="h-4 w-4 text-gray-500 hover:text-primary cursor-pointer mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-2 p-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileCheck className="h-4 w-4" />
                                    <span className="text-sm">Published: {publicationStatus === 'published' ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-sm">Validation: {submissionStatus === 'validated' ? 'Validated' : submissionStatus === 'rejected' ? 'Rejected' : 'Pending'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Globe className="h-4 w-4" />
                                    <span className="text-sm">IATI: {activity.syncStatus === 'live' ? 'Synced' : activity.syncStatus === 'pending' ? 'Pending' : activity.syncStatus === 'error' ? 'Error' : 'Not synced'}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground">
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
                          {formatCurrency(activity.totalPlannedBudgetUSD || 0)}
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                          {formatCurrency(activity.totalDisbursementsAndExpenditureUSD || (activity.disbursements || 0) + (activity.expenditures || 0))}
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
                                    <span className="text-sm">Aid Type: {activity.default_aid_type ? AID_TYPE_LABELS[activity.default_aid_type] || activity.default_aid_type : 'Not specified'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Shuffle className="h-4 w-4" />
                                    <span className="text-sm">Flow Type: {activity.default_flow_type ? FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type : 'Not specified'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Link2 className="h-4 w-4" />
                                    <span className="text-sm">Tied Status: {activity.tied_status ? TIED_STATUS_LABELS[activity.tied_status] || activity.tied_status : 'Not specified'}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-2 text-sm text-foreground text-right">
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32">
                                {canUserEditActivity(user, activity) && (
                                  <DropdownMenuItem 
                                    onClick={() => router.push(`/activities/new?id=${activity.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <PencilLine className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => setDeleteActivityId(activity.id)}
                                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
          // Card View - Using new ActivityList component
          <ActivityList
            activities={paginatedActivities.map(activity => ({
              id: activity.id,
              title: activity.title,
              iati_id: activity.iatiIdentifier || activity.iatiId,
              description: activity.description,
              activity_status: activity.activityStatus,
              publication_status: activity.publicationStatus,
              planned_start_date: activity.plannedStartDate,
              planned_end_date: activity.plannedEndDate,
              updated_at: activity.updatedAt,
              partner_id: activity.partnerId,
              banner: activity.banner,
              icon: (activity as any).icon,
              sdgMappings: (activity as any).sdgMappings || []
            }))}
            loading={loading}
            onEdit={canUserEditActivity(user, {} as Activity) ? (activityId) => router.push(`/activities/new?id=${activityId}`) : undefined}
            onDelete={(activityId) => setDeleteActivityId(activityId)}
            className="fade-in"
          />
        )}

        {/* Pagination Controls */}
        {!isShowingAll && totalPages > 1 && totalActivities > 0 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                usingOptimization ? optimizedData.setPage(newPage) : setCurrentPage(newPage);
              }}
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
                    onClick={() => {
                      usingOptimization ? optimizedData.setPage(pageNum) : setCurrentPage(pageNum);
                    }}
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
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                usingOptimization ? optimizedData.setPage(newPage) : setCurrentPage(newPage);
              }}
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
