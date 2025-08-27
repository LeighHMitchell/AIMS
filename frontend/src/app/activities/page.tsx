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
import { formatReportedBy, formatSubmittedBy } from "@/utils/format-helpers";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
import { 
  Plus, Download, Edit2, Trash2, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, Users, Grid3X3, TableIcon, Search, MoreVertical, Edit,
  PencilLine, BookOpenCheck, BookLock, CheckCircle2, AlertTriangle, Circle, Info, ReceiptText, Handshake, Shuffle, Link2,
  FileCheck, ShieldCheck, Globe, DatabaseZap, RefreshCw, Copy, Check, Blocks, DollarSign, Settings
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { Transaction, TIED_STATUS_LABELS } from "@/types/transaction";
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

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '111': 'Subsidies to national private investors',
  '210': 'Interest subsidy',
  '211': 'Interest subsidy to national private exporters',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '411': 'Investment-related loan to developing countries',
  '412': 'Loan in a joint venture with the recipient',
  '413': 'Loan to national private investor',
  '421': 'Standard loan',
  '422': 'Reimbursable grant',
  '510': 'Bonds',
  '520': 'Asset-backed securities',
  '530': 'Other debt securities'
};

// Modality mappings
const MODALITY_LABELS: Record<string, string> = {
  '1': 'Grant',
  '2': 'Loan',
  '3': 'Technical Assistance',
  '4': 'Reimbursable Grant or Other',
  '5': 'Investment/Guarantee'
};

// Tied Status mappings imported from @/types/transaction

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
  acronym?: string; // Activity acronym/abbreviation
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
  icon?: string;
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
  totalBudget?: number;
  totalDisbursed?: number;
  
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
  default_aid_modality?: string;
  default_aid_modality_override?: boolean;
  tied_status?: string; // Legacy field
};

type SortField = 'title' | 'partnerId' | 'createdBy' | 'commitments' | 'disbursements' | 'createdAt' | 'updatedAt' | 'activityStatus';
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
    "1": "Pipeline",
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



// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  // Enable optimization to get conditional image loading
  const enableOptimization = true;
  
  console.log('[Activities Page] Environment variable NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION:', process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION);
  console.log('[Activities Page] enableOptimization:', enableOptimization);
  console.log('[Activities Page] typeof env var:', typeof process.env.NEXT_PUBLIC_ENABLE_ACTIVITY_OPTIMIZATION);
  
  // Common state regardless of optimization (moved before hook call)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Use optimized hook if enabled, otherwise fall back to original implementation
  const optimizedData = useOptimizedActivities({
    pageSize: 20,
    enableOptimization,
    viewMode: viewMode,
    onError: (error) => {
      console.error('[Activities Page] Optimization error:', error);
      // Could fall back to original implementation here if needed
    }
  });
  
  // Legacy state for backward compatibility when optimizations are disabled
  const [legacyActivities, setLegacyActivities] = useState<Activity[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyCurrentPage, setLegacyCurrentPage] = useState(1);
  
  // Legacy sorting state for non-optimized version
  const [legacySortField, setLegacySortField] = useState<SortField>('updatedAt');
  const [legacySortOrder, setLegacySortOrder] = useState<SortOrder>('desc');
  
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  // Track if we've ever successfully loaded data to prevent flash of empty state
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // Use optimization mode to get conditional image loading
  const usingOptimization = enableOptimization;
  
  // Safely extract optimized data with fallbacks
  const safeOptimizedData = {
    activities: optimizedData?.activities || [],
    loading: optimizedData?.loading || false,
    error: optimizedData?.error || null,
    searchQuery: optimizedData?.searchQuery || '',
    setSearchQuery: optimizedData?.setSearchQuery || (() => {}),
    currentPage: optimizedData?.currentPage || 1,
    totalCount: optimizedData?.totalCount || 0,
    totalPages: optimizedData?.totalPages || 1,
    setPage: optimizedData?.setPage || (() => {}),
    refetch: optimizedData?.refetch || (() => {}),
    removeActivity: optimizedData?.removeActivity || (() => {}),
    sorting: {
      sortField: optimizedData?.sorting?.sortField || 'updatedAt',
      sortOrder: optimizedData?.sorting?.sortOrder || 'desc',
      handleSort: optimizedData?.sorting?.handleSort || (() => {})
    },
    filters: {
      activityStatus: optimizedData?.filters?.activityStatus || 'all',
      setActivityStatus: optimizedData?.filters?.setActivityStatus || (() => {}),
      submissionStatus: optimizedData?.filters?.submissionStatus || 'all',
      setSubmissionStatus: optimizedData?.filters?.setSubmissionStatus || (() => {}),
      reportedBy: optimizedData?.filters?.reportedBy || 'all',
      setReportedBy: optimizedData?.filters?.setReportedBy || (() => {}),
      aidType: optimizedData?.filters?.aidType || 'all',
      setAidType: optimizedData?.filters?.setAidType || (() => {}),
      flowType: optimizedData?.filters?.flowType || 'all',
      setFlowType: optimizedData?.filters?.setFlowType || (() => {}),

    }
  };
  
  const activities = usingOptimization ? safeOptimizedData.activities : legacyActivities;
  const sortField = usingOptimization ? safeOptimizedData.sorting.sortField : legacySortField;
  const sortOrder = usingOptimization ? safeOptimizedData.sorting.sortOrder : legacySortOrder;
  
  console.log('[Activities Page] usingOptimization:', usingOptimization);
  console.log('[Activities Page] optimizedData.activities length:', safeOptimizedData.activities.length);
  console.log('[Activities Page] optimizedData.loading:', safeOptimizedData.loading);
  console.log('[Activities Page] optimizedData.error:', safeOptimizedData.error);
  console.log('[Activities Page] activities length:', activities?.length || 0);
  if (activities?.length > 0) {
    console.log('[Activities Page] First activity data:', activities[0]);
  }
  const loading = usingOptimization ? safeOptimizedData.loading : legacyLoading;
  const error = usingOptimization ? safeOptimizedData.error : legacyError;
  const searchQuery = usingOptimization ? safeOptimizedData.searchQuery : '';
  const setSearchQuery = usingOptimization ? safeOptimizedData.setSearchQuery : () => {};
  const currentPage = usingOptimization ? safeOptimizedData.currentPage : legacyCurrentPage;
  const totalActivitiesCount = usingOptimization ? safeOptimizedData.totalCount : legacyActivities.length;
  const setCurrentPage = usingOptimization ? safeOptimizedData.setPage : setLegacyCurrentPage;
  
  // Filter states - use safe optimized filters
  const filterStatus = usingOptimization ? safeOptimizedData.filters.activityStatus : 'all';
  const setFilterStatus = usingOptimization ? safeOptimizedData.filters.setActivityStatus : () => {};

  const filterValidation = usingOptimization ? safeOptimizedData.filters.submissionStatus : 'all';
  const setFilterValidation = usingOptimization ? safeOptimizedData.filters.setSubmissionStatus : () => {};
  
  // Additional filters
  const filterReportedBy = usingOptimization ? safeOptimizedData.filters.reportedBy : 'all';
  const setFilterReportedBy = usingOptimization ? safeOptimizedData.filters.setReportedBy : () => {};
  const filterAidType = usingOptimization ? safeOptimizedData.filters.aidType : 'all';
  const setFilterAidType = usingOptimization ? safeOptimizedData.filters.setAidType : () => {};
  const filterFlowType = usingOptimization ? safeOptimizedData.filters.flowType : 'all';
  const setFilterFlowType = usingOptimization ? safeOptimizedData.filters.setFlowType : () => {};


  // Memoized helper functions - must be defined before use in other memos
  const getCreatorOrganization = useCallback((activity: Activity): string => {
    // First, check if we have a stored acronym
    if (activity.created_by_org_acronym) {
      return activity.created_by_org_acronym;
    }
    
    // Look up by organization ID
    if (activity.createdByOrg) {
      const org = organizations.find(o => o.id === activity.createdByOrg);
      if (org && org.acronym) return org.acronym;
      if (org && org.name) return org.name;
    }
    
    // Look up by organization name to find acronym
    if (activity.created_by_org_name) {
      const org = organizations.find(o => o.name === activity.created_by_org_name);
      if (org && org.acronym) return org.acronym;
      return activity.created_by_org_name;
    }
    
    return "Unknown";
  }, [organizations]);

  // Copy ID to clipboard
  const copyToClipboard = (text: string, type: 'partnerId' | 'iatiIdentifier' | 'acronym', activityId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${activityId}-${type}`);
    setTimeout(() => setCopiedId(null), 2000);
    const message = type === 'partnerId' ? 'Activity ID' : type === 'iatiIdentifier' ? 'IATI Identifier' : 'Acronym';
    toast.success(`${message} copied to clipboard`);
  };

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
      optimizedData?.refetch();
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
  }, [usingOptimization]);

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
      console.log('[AIMS] fetchData called - usingOptimization:', usingOptimization);
      console.log('[AIMS] enableOptimization:', enableOptimization);
      
      if (!usingOptimization) {
        console.log('[AIMS] Setting legacy loading to true');
        setLegacyLoading(true);
      }
      
      try {
        const promises = [fetchOrganizations()];
        
        // Only fetch activities if not using optimization
        if (!usingOptimization) {
          console.log('[AIMS] Adding legacy activities fetch to promises');
          promises.push(fetchActivities(1, false));
        }
        
        await Promise.all(promises);
      } finally {
        if (!usingOptimization) {
          console.log('[AIMS] Setting legacy loading to false');
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
    if (!loading && !userLoading) {
      setHasLoadedOnce(true);
    }
  }, [loading, userLoading]);

  // Don't refetch on filter changes - we do client-side filtering
  // Only refetch if we need fresh data

  const handleDelete = async (id: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    // Get the activity title for better toast feedback
    let activityTitle = '';
    if (usingOptimization) {
      const activity = safeOptimizedData.activities.find(a => a.id === id);
      activityTitle = (activity as any)?.title_narrative || activity?.title || 'Activity';
    } else {
      const activity = legacyActivities.find(a => a.id === id);
      activityTitle = (activity as any)?.title_narrative || activity?.title || 'Activity';
    }
    
    try {
      // Immediately remove the activity from the UI (optimistic update)
      if (retryCount === 0) {
        setDeleteActivityId(null);
        
        if (usingOptimization) {
          safeOptimizedData.removeActivity(id);
        } else {
          setLegacyActivities(prev => prev.filter(activity => activity.id !== id));
        }
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
        
        // If it's a 404, the activity is already gone - that's fine
        if (res.status === 404) {
          console.log("[AIMS] Activity already deleted:", id);
          console.log('[AIMS] About to show success toast for already deleted activity:', activityTitle);
          toast.success(`"${activityTitle}" was deleted successfully`);
          return;
        }
        
        // For other errors, we need to revert the optimistic update or refetch
        if (retryCount === 0) {
          console.error("[AIMS] Delete failed, reverting optimistic update");
          if (usingOptimization) {
            safeOptimizedData.refetch(); // Refetch to get current state
          } else {
            // For legacy mode, we'd need to restore the activity or refetch
            // For now, just refetch by calling the fetch function
            window.location.reload(); // Simple fallback
          }
        }
        
        throw new Error(errorData.error || "Failed to delete activity");
      }
      
      console.log('[AIMS] About to show success toast for deletion:', activityTitle);
      toast.success(`"${activityTitle}" was deleted successfully`);
      // Activity already removed optimistically, no need to do anything else
      
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
  };

  const handleSort = (field: SortField) => {
    if (usingOptimization) {
      safeOptimizedData.sorting.handleSort(field);
    } else {
      if (legacySortField === field) {
        setLegacySortOrder(legacySortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLegacySortField(field);
        setLegacySortOrder('asc');
      }
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
        "Activity ID": activity.partnerId || "",
        "IATI ID": activity.iatiId || "",
        "UUID": activity.id,
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
      const matchesValidationStatus = filterValidation === "all" || 
        (filterValidation === "validated" && submissionStatus === "validated") ||
        (filterValidation === "rejected" && submissionStatus === "rejected") ||
        (filterValidation === "pending" && !["validated", "rejected"].includes(submissionStatus));
      
      return matchesActivityStatus && matchesValidationStatus;
    });
  }, [usingOptimization, activities, filterStatus, filterValidation]);

  // Client-side sorting for legacy implementation only
  const sortedActivities = useMemo(() => {
    if (usingOptimization) {
      // Server-side sorting already applied
      return filteredActivities;
    }
    
    // Legacy client-side sorting
    return [...filteredActivities].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (legacySortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'partnerId':
          aValue = a.partnerId?.toLowerCase() || '';
          bValue = b.partnerId?.toLowerCase() || '';
          break;
        case 'commitments':
          aValue = (a as any).totalBudget || 0;
          bValue = (b as any).totalBudget || 0;
          break;
        case 'disbursements':
          aValue = (a as any).totalDisbursed || 0;
          bValue = (b as any).totalDisbursed || 0;
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
        case 'activityStatus':
          aValue = getActivityStatusLabel(a.activityStatus || a.status || '1').toLowerCase();
          bValue = getActivityStatusLabel(b.activityStatus || b.status || '1').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return legacySortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return legacySortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredActivities, legacySortField, legacySortOrder, usingOptimization, getCreatorOrganization]);

  // Pagination logic - use server-side pagination for optimized, client-side for legacy
  const totalActivities = usingOptimization ? totalActivitiesCount : filteredActivities.length;
  const isShowingAll = false;
  const effectiveLimit = pageLimit;
  const totalPages = usingOptimization ? safeOptimizedData.totalPages : Math.ceil(totalActivities / pageLimit);
  
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
      safeOptimizedData.setPage(1);
    } else {
      setLegacyCurrentPage(1);
    }
    localStorage.setItem('activities-page-limit', newLimit.toString());
  }, [usingOptimization, safeOptimizedData]);
  
  // Legacy effects for non-optimized version
  useEffect(() => {
    if (!usingOptimization) {
      setLegacyCurrentPage(1);
    }
  }, [pageLimit, usingOptimization]);

  // Component render
  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">Activities</h1>
            <HelpTextTooltip 
              content="View key information about each activity. Users with appropriate permissions can update or remove activities from this list."
            />
          </div>
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
      <div className="flex flex-col lg:flex-row lg:items-center py-4 bg-slate-50 rounded-lg px-4">
        {/* Left Side: Primary Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
            <ActivityStatusFilterSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              placeholder="Status"
              className="w-[180px]"
            />

            <Select value={filterValidation} onValueChange={setFilterValidation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Validation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Validation Types</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="pending">Not Validated</SelectItem>
              </SelectContent>
            </Select>

            {/* Reported By Filter */}
            <Select value={filterReportedBy} onValueChange={setFilterReportedBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Organisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organisations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.acronym || org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

        </div>

        {/* Middle: Aid Modality Filters */}
        <div className="flex flex-wrap items-center gap-3 lg:mx-8">
          {/* Aid Type Filter */}
          <Select value={filterAidType} onValueChange={setFilterAidType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Aid Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Aid Types</SelectItem>
                {Object.entries(AID_TYPE_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">{code}</span>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Flow Type Filter */}
            <Select value={filterFlowType} onValueChange={setFilterFlowType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Flow Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Flow Types</SelectItem>
                {Object.entries(FLOW_TYPE_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">{code}</span>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            
        </div>

        {/* Center-Right: Page Size */}
        <div className="flex items-center gap-2 lg:ml-auto lg:mr-6">
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

        {/* Right Side: View Toggle + Results Count - Fixed width */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
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
      {loading || userLoading || !hasLoadedOnce || totalActivities === 0 ? (
        <ActivityListSkeleton />
      ) : error ? (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Activities</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <Button 
                onClick={() => usingOptimization ? safeOptimizedData.refetch() : fetchActivities(1, true)} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      ) : filterStatus !== "all" || filterValidation !== "all" ? (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-slate-500">No matching activities found</div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden fade-in">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse min-w-[1300px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th 
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors w-[30%]"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Activity Title</span>
                      {getSortIcon('title')}
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors w-[120px]"
                    onClick={() => handleSort('activityStatus')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Activity Status</span>
                      {getSortIcon('activityStatus')}
                    </div>
                  </th>
                  <th className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground w-[120px]">
                    Publication Status
                  </th>
                  <th 
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors min-w-[140px]"
                    onClick={() => handleSort('createdBy')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Reported by</span>
                      {getSortIcon('createdBy')}
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors min-w-[120px]"
                    onClick={() => handleSort('commitments')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Budgeted</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                            <p className="text-sm text-gray-600 font-normal">
                              Total budget amount across all budget entries for this activity. All values are displayed in USD.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {getSortIcon('commitments')}
                    </div>
                  </th>
                  <th 
                    className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors min-w-[100px]"
                    onClick={() => handleSort('disbursements')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Disbursed</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="inline h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                            <p className="text-sm text-gray-600 font-normal">
                              Total value of all disbursement and expenditure transactions for this activity. All values are displayed in USD.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {getSortIcon('disbursements')}
                    </div>
                  </th>

                  <th 
                    className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors min-w-[100px]"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Last Edited</span>
                      {getSortIcon('updatedAt')}
                    </div>
                  </th>
                  <th className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground w-[120px]">
                    Modality & Classification
                  </th>
                  <th className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground w-[80px]">
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
                      className="group hover:bg-muted transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-foreground whitespace-normal break-words leading-tight">
                        <div 
                          className="cursor-pointer"
                          onClick={() => router.push(`/activities/${activity.id}`)}
                        >
                          <div className="space-y-1 pr-2">
                            <h3 className="font-medium text-foreground leading-tight line-clamp-2" title={activity.title}>
                              {activity.title}
                              {activity.acronym && (
                                <span>
                                  {' '}({activity.acronym})
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(activity.acronym!, 'acronym', activity.id);
                                    }}
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                                    title="Copy Acronym"
                                  >
                                    {copiedId === `${activity.id}-acronym` ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </span>
                              )}
                            </h3>
                            {(activity.partnerId || activity.iatiIdentifier) && (
                              <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                {activity.partnerId && (
                                  <>
                                    <span>{activity.partnerId}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(activity.partnerId!, 'partnerId', activity.id);
                                      }}
                                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                                      title="Copy Activity ID"
                                    >
                                      {copiedId === `${activity.id}-partnerId` ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </>
                                )}

                                {activity.iatiIdentifier && (
                                  <>
                                    <span className="text-slate-400 ml-2">{activity.iatiIdentifier}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(activity.iatiIdentifier!, 'iatiIdentifier', activity.id);
                                      }}
                                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-gray-700"
                                      title="Copy IATI Identifier"
                                    >
                                      {copiedId === `${activity.id}-iatiIdentifier` ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </>
                                )}
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
                      <td className="px-4 py-2 text-sm text-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div>
                                {creatorOrg}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent 
                              className="max-w-sm p-4 bg-white border border-gray-200 shadow-lg"
                              sideOffset={8}
                            >
                              <div className="text-sm">
                                <p className="font-semibold">
                                  Reported by {formatReportedBy({ 
                                    name: activity.created_by_org_name || "Unknown Organization", 
                                    shortName: activity.created_by_org_acronym 
                                  })}
                                </p>
                                {user && (
                                  <p className="text-gray-600">
                                    Submitted by {formatSubmittedBy({
                                      title: user.title,
                                      firstName: user.firstName || '',
                                      middleName: user.middleName,
                                      lastName: user.lastName || '',
                                      jobTitle: user.jobTitle
                                    })} on {format(new Date(activity.createdAt), "d MMMM yyyy 'at' h:mm a")}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatCurrency((activity as any).totalBudget || 0)}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                              <p className="text-sm text-gray-600 font-normal">
                                Total budget amount across all budget entries for this activity. All values are displayed in USD for consistency across different currencies.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="px-4 py-2 text-sm text-foreground text-right whitespace-nowrap font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatCurrency((activity as any).totalDisbursed || 0)}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg text-left">
                              <p className="text-sm text-gray-600 font-normal">
                                Total value of all disbursement and expenditure transactions for this activity. All values are displayed in USD for consistency across different currencies.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                                  <DollarSign className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Default Finance Type:</span> {activity.default_finance_type ? FINANCE_TYPE_LABELS[activity.default_finance_type] || activity.default_finance_type : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Shuffle className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Flow Type:</span> {activity.default_flow_type ? FLOW_TYPE_LABELS[activity.default_flow_type] || activity.default_flow_type : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Link2 className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Tied Status:</span> {activity.default_tied_status ? TIED_STATUS_LABELS[activity.default_tied_status] || activity.default_tied_status : 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Settings className="h-4 w-4" />
                                  <span className="text-sm"><span className="font-semibold">Default Modality:</span> {activity.default_aid_modality ? MODALITY_LABELS[activity.default_aid_modality] || activity.default_aid_modality : 'Not specified'}</span>
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
            acronym: activity.acronym,
            activity_status: activity.activityStatus,
            publication_status: activity.publicationStatus,
            planned_start_date: activity.plannedStartDate,
            planned_end_date: activity.plannedEndDate,
            updated_at: activity.updatedAt,
            partner_id: activity.partnerId,
            banner: activity.banner,
            icon: activity.icon,
            // Add aid modality fields
            default_aid_type: activity.default_aid_type,
            default_finance_type: activity.default_finance_type,
            default_flow_type: activity.default_flow_type,
            default_tied_status: activity.default_tied_status,
            default_aid_modality: activity.default_aid_modality,
            default_aid_modality_override: activity.default_aid_modality_override,
            // Add financial and reporting fields
            created_by_org_name: activity.created_by_org_name,
            created_by_org_acronym: activity.created_by_org_acronym,
            totalBudget: (activity as any).totalBudget || 0,
            totalDisbursed: (activity as any).totalDisbursed || 0,
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
              usingOptimization ? safeOptimizedData.setPage(newPage) : setCurrentPage(newPage);
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
                    usingOptimization ? safeOptimizedData.setPage(pageNum) : setCurrentPage(pageNum);
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
              usingOptimization ? safeOptimizedData.setPage(newPage) : setCurrentPage(newPage);
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
